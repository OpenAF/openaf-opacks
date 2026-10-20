#!/usr/bin/env python3
"""Opt-in live Lambda verification with a cleanup journal and narrowly scoped temporary resources."""
import argparse
import base64
import datetime
import hashlib
import io
import json
import pathlib
import re
import shutil
import statistics
import subprocess
import time
import uuid
import zipfile

SOURCE = pathlib.Path(__file__).resolve().parents[1]


class AWSFailure(RuntimeError):
    pass


def sanitize(value):
    return re.sub(r'https?://[^\s"\']*[?][^\s"\']*', '[URL query redacted]', str(value))


def zip_bytes(entries):
    data = io.BytesIO()
    with zipfile.ZipFile(data, 'w', zipfile.ZIP_DEFLATED) as archive:
        for name, content in entries.items():
            archive.writestr(name, content)
    return data.getvalue()


def invocation_metrics(logs):
    report_lines = '\n'.join(line for line in logs.splitlines() if line.startswith('REPORT RequestId:'))
    failures = re.findall(r'INIT_REPORT Init Duration:\s*([0-9.]+)\s*ms\s+Phase: init\s+Status: timeout', logs)
    result = {'initPhaseTimeout': bool(failures)}
    if failures:
        result['failedInitMs'] = sum(float(value) for value in failures)
    for key, pattern in [('initMs', r'Init Duration:\s*([0-9.]+)\s*ms'),
                         ('durationMs', r'(?<!Init )(?<!Billed )Duration:\s*([0-9.]+)\s*ms'),
                         ('maxMemoryMiB', r'Max Memory Used:\s*([0-9.]+)\s*MB')]:
        matches = re.findall(pattern, report_lines)
        if matches:
            result[key] = float(matches[-1])
    return result


PROBE = '''global.liveInstance = isDef(global.liveInstance) ? global.liveInstance : genUUID();
global.liveCount = isDef(global.liveCount) ? global.liveCount + 1 : 1;
if (__pmIn.fail) throw new Error("Live verification deliberate failure");
__pmOut = { name: __pmIn.name, instance: global.liveInstance, count: global.liveCount,
  requestId: __lambdaContext.awsRequestId, remainingMs: __lambdaContext.getRemainingTimeInMillis(),
  resource: io.readFileString("resource.txt"), java: String(java.lang.System.getProperty("java.version")),
  stream: getEnv("AWS_LAMBDA_LOG_STREAM_NAME"), aws: isDef(getOPackPath("AWS")),
  sharing: getEnv("OAF_JAVA_XSHARE") };
'''
OJOB = '''ojob:
  sequential: true
  logToConsole: false
todo:
- Cleanup
- Run
jobs:
- name: Cleanup
  type: shutdown
  exec: |
    __pmOut.cleanup = true;
- name: Run
  exec: |
    if (args.fail) throw "Live oJob deliberate failure";
    __pmOut = { name: args.name, resource: io.readFileString("resource.txt"), requestId: __lambdaContext.awsRequestId };
'''
SINGLE = '__pmOut = { name: __pmIn.name, directScript: true, requestId: __lambdaContext.awsRequestId };\n'


class Verification:
    def __init__(self, args):
        self.args = args
        if args.resume:
            self.directory = args.resume.resolve().parent
            self.journal = json.loads(args.resume.read_text())
            self.report = json.loads((self.directory / 'report.json').read_text())
            if self.journal['bucket'] != args.bucket or self.journal['region'] != args.region:
                raise ValueError('Resume bucket and region must match the journal')
            self.run_id = self.journal['runId']
            self.name = self.journal['role']['name'].removesuffix('-role')
            self.key_root = self.journal['prefix']
            self.functions = {}
            for name in self.journal['functions']:
                self.functions[('arm64' if '-arm-' in name else 'x86_64', name.rsplit('-', 1)[-1])] = name
            self.workload_sha = hashlib.sha256((self.directory / 'workload.zip').read_bytes()).hexdigest()
            self.workload_key = self.key_root + '/workloads/probe.zip'
            self.single_key = self.key_root + '/workloads/single.js'
            self.denied_key = self.key_root + '/denied/probe.zip'
            for record in self.report['invocations']:
                record.setdefault('memoryMiB', 512)
                for key in ('initMs', 'durationMs', 'maxMemoryMiB', 'initPhaseTimeout', 'failedInitMs'):
                    record.pop(key, None)
                record.update(invocation_metrics(record['logs']))
            return
        self.run_id = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-' + uuid.uuid4().hex[:6]
        self.name = 'nma-temp-test-' + self.run_id
        self.directory = args.output / self.run_id
        self.directory.mkdir(parents=True)
        self.key_root = args.prefix.strip('/') + '/' + self.run_id
        self.journal = {'runId': self.run_id, 'region': args.region, 'bucket': args.bucket, 'prefix': self.key_root,
                        'functions': [], 'objects': [], 'role': None, 'policy': 'OpenAFLambdaVerification', 'cleanup': []}
        self.report = {'runId': self.run_id, 'region': args.region, 'checks': [], 'invocations': [], 'benchmarks': {}, 'artifacts': {}}
        self.save()

    def save(self):
        (self.directory / 'journal.json').write_text(json.dumps(self.journal, indent=2) + '\n')
        (self.directory / 'report.json').write_text(json.dumps(self.report, indent=2) + '\n')

    def progress(self, message):
        print(message, flush=True)

    def cli(self, *arguments, text=False, allowed=()):
        command = ['aws', '--profile', self.args.profile, '--region', self.args.region, '--no-cli-pager',
                   '--cli-connect-timeout', '10', '--cli-read-timeout', '120', '--output', 'json', *arguments]
        process = subprocess.run(command, capture_output=True, text=True)
        if process.returncode:
            error = sanitize(process.stderr.strip())
            if any(code in error for code in allowed):
                return None
            raise AWSFailure(error)
        if text:
            return process.stdout.strip()
        return json.loads(process.stdout) if process.stdout.strip() else {}

    def file(self, name, content):
        target = self.directory / name
        target.write_text(json.dumps(content))
        return 'file://' + str(target.resolve())

    def check(self, name, condition, details=None):
        self.report['checks'].append({'name': name, 'passed': bool(condition), 'details': details})
        self.save()
        if not condition:
            raise AssertionError(name + ': ' + str(details))

    def put(self, suffix, body):
        key = self.key_root + '/' + suffix
        response = self.cli('s3api', 'put-object', '--bucket', self.args.bucket, '--key', key, '--body', str(body))
        self.journal['objects'].append({'key': key, 'versionId': response.get('VersionId')})
        self.save()
        return key

    def configure(self, name, settings):
        env = {'OJOB_JSONLOG': 'true', 'OAF_JAVA_XSHARE': 'off' if name.endswith('-off') else 'auto',
               'OAF_LIVE_NONCE': uuid.uuid4().hex, **settings}
        try:
            self.cli('lambda', 'update-function-configuration', '--function-name', name,
                     '--memory-size', str(self.args.memory),
                     '--environment', self.file('environment.json', {'Variables': env}))
        finally:
            # Do not retain a presigned URL even if configuration fails.
            (self.directory / 'environment.json').unlink(missing_ok=True)
        self.wait(name, updating=True)

    def wait(self, name, updating=False):
        deadline = time.monotonic() + 180
        while time.monotonic() < deadline:
            config = self.cli('lambda', 'get-function-configuration', '--function-name', name)
            status = config.get('LastUpdateStatus') if updating else config.get('State')
            if status in ('Successful', 'Active'):
                return
            if status == 'Failed':
                raise AWSFailure(config.get('LastUpdateStatusReason', config.get('StateReason', 'Function failed')))
            time.sleep(2)
        raise TimeoutError('Function did not become ready: ' + name)

    def invoke(self, name, label, payload=None, error=False):
        target = self.directory / 'response.json'
        response = self.cli('lambda', 'invoke', '--function-name', name, '--log-type', 'Tail',
                            '--cli-binary-format', 'raw-in-base64-out', '--payload', json.dumps(payload or {}), str(target))
        logs = sanitize(base64.b64decode(response.get('LogResult', '')).decode(errors='replace'))
        body = json.loads(target.read_text())
        record = {'function': name, 'label': label, 'memoryMiB': self.args.memory,
                  'functionError': response.get('FunctionError'), 'response': body, 'logs': logs}
        # A failed INIT_REPORT is not a successful initialization metric.
        record.update(invocation_metrics(logs))
        self.report['invocations'].append(record)
        self.save()
        self.check(label + ' error contract', bool(response.get('FunctionError')) == error,
                   {'functionError': response.get('FunctionError'), 'response': body})
        return body, record

    def setup(self):
        identity = self.cli('sts', 'get-caller-identity')
        account = identity['Account']
        self.report['account'] = account
        location = self.cli('s3api', 'get-bucket-location', '--bucket', self.args.bucket).get('LocationConstraint')
        self.check('bucket region', (location or 'us-east-1') == self.args.region, location)
        role_name = self.name + '-role'
        trust = {'Version': '2012-10-17', 'Statement': [{'Effect': 'Allow', 'Principal': {'Service': 'lambda.amazonaws.com'}, 'Action': 'sts:AssumeRole'}]}
        role = self.cli('iam', 'create-role', '--role-name', role_name,
                        '--assume-role-policy-document', self.file('trust.json', trust),
                        '--tags', 'Key=Project,Value=OpenAFLambdaVerification', 'Key=RunId,Value=' + self.run_id)['Role']
        self.journal['role'] = {'name': role_name, 'arn': role['Arn']}
        self.save()
        policy = {'Version': '2012-10-17', 'Statement': [
            {'Effect': 'Allow', 'Action': ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
             'Resource': 'arn:aws:logs:' + self.args.region + ':' + account + ':log-group:/aws/lambda/' + self.name + '-*:*'},
            {'Effect': 'Allow', 'Action': 's3:GetObject', 'Resource': 'arn:aws:s3:::' + self.args.bucket + '/' + self.key_root + '/workloads/*'}]}
        self.cli('iam', 'put-role-policy', '--role-name', role_name, '--policy-name', self.journal['policy'],
                 '--policy-document', self.file('permissions.json', policy))
        self.progress('Created scoped execution role ' + role_name)
        payload = zip_bytes({'main.js': PROBE, 'resource.txt': 'live S3 resource', 'jobs/main.yaml': OJOB, 'jobs/resource.txt': 'live oJob resource'})
        (self.directory / 'workload.zip').write_bytes(payload)
        self.workload_sha = hashlib.sha256(payload).hexdigest()
        self.workload_key = self.put('workloads/probe.zip', self.directory / 'workload.zip')
        (self.directory / 'single.js').write_text(SINGLE)
        self.single_key = self.put('workloads/single.js', self.directory / 'single.js')
        self.denied_key = self.put('denied/probe.zip', self.directory / 'workload.zip')
        self.functions = {}
        for arch in ('arm64', 'x86_64'):
            original = self.args.artifacts / ('openaf-lambda-' + arch + '.zip')
            target = self.directory / ('deployment-' + arch + '.zip')
            # Add only fixture files; preserve every original runtime/JRE ZIP entry.
            shutil.copy2(original, target)
            with zipfile.ZipFile(target, 'a', zipfile.ZIP_DEFLATED) as archive:
                archive.writestr('function/probe.js', PROBE)
                archive.writestr('function/resource.txt', 'live embedded resource')
            digest = hashlib.sha256()
            with target.open('rb') as stream:
                for data in iter(lambda: stream.read(1024 * 1024), b''):
                    digest.update(data)
            self.report['artifacts'][arch] = {'deploymentSha256': digest.hexdigest(),
                'baseManifest': json.loads(original.with_suffix('.manifest.json').read_text()),
                'fixtureAdditions': ['function/probe.js', 'function/resource.txt']}
            key = self.put('runtimes/' + target.name, target)
            self.progress('Uploaded ' + arch + ' deployment ZIP')
            for mode in ('auto', 'off'):
                name = self.name + '-' + ('arm' if arch == 'arm64' else 'x86') + '-' + mode
                deadline = time.monotonic() + 90
                while True:
                    try:
                        self.cli('lambda', 'create-function', '--function-name', name, '--runtime', 'provided.al2023',
                                 '--architectures', arch, '--handler', 'main.yaml', '--memory-size', str(self.args.memory), '--timeout', '60',
                                 '--role', role['Arn'], '--code', 'S3Bucket=' + self.args.bucket + ',S3Key=' + key,
                                 '--environment', self.file('environment.json', {'Variables': {'OJOB_JSONLOG': 'true', 'OAF_JAVA_XSHARE': mode}}),
                                 '--tags', 'Project=OpenAFLambdaVerification,RunId=' + self.run_id)
                        break
                    except AWSFailure as failure:
                        if 'cannot be assumed' not in str(failure) or time.monotonic() > deadline:
                            raise
                        time.sleep(3)
                self.journal['functions'].append(name)
                self.functions[(arch, mode)] = name
                self.save()
                self.wait(name)
                self.progress('Created ' + name)

    def functional(self):
        for (arch, mode), name in self.functions.items():
            body, _ = self.invoke(name, arch + '-' + mode + ' embedded oJob', {'name': 'LiveAWS'})
            self.check(arch + '-' + mode + ' embedded response', body.get('message') == 'Hello LiveAWS', body)
        for arch in ('arm64', 'x86_64'):
            name = self.functions[(arch, 'auto')]
            self.progress('Functional checks: ' + arch)
            for source, settings, resource in [
                ('embedded script', {'OJOB_ENTRYPOINT': 'probe.js'}, 'live embedded resource'),
                ('S3 bundle', {'OJOB_METHOD': 's3', 'OJOB_CONFIG': 's3://' + self.args.bucket + '/' + self.workload_key,
                               'OJOB_ENTRYPOINT': 'main.js', 'OJOB_SHA256': self.workload_sha}, 'live S3 resource')]:
                self.configure(name, settings)
                first, _ = self.invoke(name, arch + ' ' + source + ' first', {'name': 'first'})
                failed, _ = self.invoke(name, arch + ' ' + source + ' failure', {'fail': True}, error=True)
                second, _ = self.invoke(name, arch + ' ' + source + ' recovery', {'name': 'second'})
                self.check(arch + ' ' + source + ' resource', first.get('resource') == resource and first.get('aws') is True, first)
                self.check(arch + ' ' + source + ' error message', 'deliberate failure' in failed.get('errorMessage', ''), failed)
                self.check(arch + ' ' + source + ' warm state', first.get('instance') == second.get('instance') and
                           first.get('count') == 1 and second.get('count') == 3 and second.get('name') == 'second', [first, second])
                self.check(arch + ' ' + source + ' context', first.get('remainingMs', 0) > 0 and first.get('requestId') != second.get('requestId'))
            self.configure(name, {'OJOB_METHOD': 's3', 'OJOB_CONFIG': self.single_key, 'OJOB_S3_BUCKET': self.args.bucket})
            body, _ = self.invoke(name, arch + ' S3 standalone script', {'name': 'single'})
            self.check(arch + ' standalone response', body.get('directScript') is True and body.get('name') == 'single', body)
            self.configure(name, {'OJOB_METHOD': 's3', 'OJOB_CONFIG': 's3://' + self.args.bucket + '/' + self.workload_key, 'OJOB_ENTRYPOINT': 'jobs/main.yaml'})
            first, _ = self.invoke(name, arch + ' S3 oJob', {'name': 'job'})
            self.invoke(name, arch + ' S3 oJob failure', {'fail': True}, error=True)
            second, _ = self.invoke(name, arch + ' S3 oJob recovery', {'name': 'recovered'})
            self.check(arch + ' S3 oJob resources and cleanup', first.get('resource') == 'live oJob resource' and first.get('cleanup') is True and
                       second.get('name') == 'recovered' and second.get('cleanup') is True, [first, second])
        name = self.functions[('arm64', 'auto')]
        for label, key, extra, expected in [
            ('missing S3 object', self.key_root + '/workloads/missing.zip', {}, r'HTTP (403|404)'),
            ('denied S3 object', self.denied_key, {}, r'HTTP 403'),
            ('incorrect integrity hash', self.workload_key, {'OJOB_SHA256': '0' * 64}, r'mismatch')]:
            self.configure(name, {'OJOB_METHOD': 's3', 'OJOB_CONFIG': 's3://' + self.args.bucket + '/' + key, **extra})
            body, _ = self.invoke(name, label, error=True)
            self.check(label + ' initialization error', bool(re.search(expected, body.get('errorMessage', ''))), body)
        url = self.cli('s3', 'presign', 's3://' + self.args.bucket + '/' + self.workload_key, '--expires-in', '1800', text=True)
        self.configure(name, {'OJOB_METHOD': 'http', 'OJOB_CONFIG': url, 'OJOB_ENTRYPOINT': 'main.js', 'OJOB_SHA256': self.workload_sha})
        body, _ = self.invoke(name, 'HTTP presigned bundle', {'name': 'http'})
        self.check('HTTP bundle resource', body.get('resource') == 'live S3 resource', body)

    def benchmark(self):
        for arch in ('arm64', 'x86_64'):
            rows = {'auto': [], 'off': []}
            for index in range(self.args.runs):
                for mode in (('auto', 'off') if index % 2 == 0 else ('off', 'auto')):
                    name = self.functions[(arch, mode)]
                    settings = {'OJOB_METHOD': 'none', 'OJOB_ENTRYPOINT': 'main.yaml'}
                    if self.args.benchmark_workload == 's3':
                        settings = {'OJOB_METHOD': 's3', 'OJOB_CONFIG': 's3://' + self.args.bucket + '/' + self.workload_key,
                                    'OJOB_ENTRYPOINT': 'jobs/main.yaml', 'OJOB_SHA256': self.workload_sha}
                    self.configure(name, settings)
                    _, cold = self.invoke(name, arch + ' ' + mode + ' cold ' + str(index), {'name': 'benchmark'})
                    self.check(arch + ' ' + mode + ' cold initialization metric ' + str(index),
                               'initMs' in cold or cold.get('initPhaseTimeout'), cold.get('logs'))
                    _, warm = self.invoke(name, arch + ' ' + mode + ' warm ' + str(index), {'name': 'benchmark-warm'})
                    rows[mode].append({'initMs': cold.get('initMs'), 'failedInitMs': cold.get('failedInitMs', 0),
                                       'initPhaseTimeout': cold.get('initPhaseTimeout', False), 'coldDurationMs': cold.get('durationMs'),
                                       'warmDurationMs': warm.get('durationMs'), 'maxMemoryMiB': warm.get('maxMemoryMiB')})
                    self.progress(arch + ' ' + mode + ' cold init: ' + str(cold.get('initMs', 'retry')) + ' ms')
            self.report['benchmarks'][arch] = {mode: {'samples': samples,
                'initRetryCount': sum(row['initPhaseTimeout'] for row in samples),
                'medianInitMs': statistics.median([row['initMs'] for row in samples if row['initMs'] is not None])
                    if any(row['initMs'] is not None for row in samples) else None,
                'medianColdTotalMs': statistics.median((row['initMs'] or row['failedInitMs']) + row['coldDurationMs'] for row in samples),
                'medianWarmMs': statistics.median(row['warmDurationMs'] for row in samples)} for mode, samples in rows.items()}
            self.report['benchmarkMemoryMiB'] = self.args.memory
            self.report['benchmarkWorkload'] = self.args.benchmark_workload
            self.save()
        # Run CDS logging separately from timed samples.
        for arch in ('arm64', 'x86_64'):
            name = self.functions[(arch, 'auto')]
            self.configure(name, {'OJOB_ENTRYPOINT': 'probe.js', 'JAVA_TOOL_OPTIONS': '-Xlog:cds=info'})
            self.invoke(name, arch + ' CDS mapping diagnostic', {'name': 'diagnostic'})
            events = []
            deadline = time.monotonic() + 45
            while time.monotonic() < deadline:
                logs = self.cli('logs', 'filter-log-events', '--log-group-name', '/aws/lambda/' + name,
                                '--start-time', str(int(self.started * 1000)), allowed=('ResourceNotFoundException',))
                events = logs.get('events', []) if logs else []
                text = '\n'.join(sanitize(event['message']) for event in events)
                if len(re.findall(r'Mapped static\s+region #0', text)) >= 2:
                    break
                time.sleep(3)
            (self.directory / (arch + '-cloudwatch.log')).write_text(text)
            self.check(arch + ' both JVMs map OpenAF CDS archive', '.shared.oaf' in text and len(re.findall(r'Mapped static\s+region #0', text)) >= 2)

    def cleanup(self):
        self.progress('Cleaning temporary AWS resources')
        errors = []
        def remove(label, *arguments, allowed=()):
            try:
                self.cli(*arguments, allowed=allowed)
                self.journal['cleanup'].append({'resource': label, 'deleted': True})
            except Exception as error:
                errors.append(label + ': ' + sanitize(error))
                self.journal['cleanup'].append({'resource': label, 'deleted': False, 'error': sanitize(error)})
            self.save()
        for name in self.journal['functions']:
            remove(name, 'lambda', 'delete-function', '--function-name', name, allowed=('ResourceNotFoundException',))
            remove('/aws/lambda/' + name, 'logs', 'delete-log-group', '--log-group-name', '/aws/lambda/' + name, allowed=('ResourceNotFoundException',))
        for obj in self.journal['objects']:
            arguments = ['s3api', 'delete-object', '--bucket', self.args.bucket, '--key', obj['key']]
            if obj.get('versionId'):
                arguments += ['--version-id', obj['versionId']]
            remove(obj['key'], *arguments)
        role = self.journal['role']
        if role:
            remove('role policy', 'iam', 'delete-role-policy', '--role-name', role['name'], '--policy-name', self.journal['policy'], allowed=('NoSuchEntity',))
            remove(role['name'], 'iam', 'delete-role', '--role-name', role['name'], allowed=('NoSuchEntity',))
        try:
            errors.extend(self.verify_cleanup())
        except Exception as error:
            errors.append('Cleanup verification: ' + sanitize(error))
        self.report['cleanupErrors'] = errors
        self.save()
        return errors

    def verify_cleanup(self):
        attempts = []
        for attempt in range(4):
            checks = []
            for name in self.journal['functions']:
                missing = self.cli('lambda', 'get-function', '--function-name', name, allowed=('ResourceNotFoundException',)) is None
                checks.append({'resource': name, 'absent': missing})
                group = '/aws/lambda/' + name
                groups = self.cli('logs', 'describe-log-groups', '--log-group-name-prefix', group)['logGroups']
                missing = not any(value['logGroupName'] == group for value in groups)
                checks.append({'resource': group, 'absent': missing})
                if not missing:
                    # A queued logging delivery can recreate a group after the first deletion pass.
                    self.cli('logs', 'delete-log-group', '--log-group-name', group, allowed=('ResourceNotFoundException',))
                    self.journal['cleanup'].append({'resource': group, 'deleted': True, 'lateLogGroup': True})
            role = self.journal['role']
            if role:
                missing = self.cli('iam', 'get-role', '--role-name', role['name'], allowed=('NoSuchEntity',)) is None
                checks.append({'resource': role['name'], 'absent': missing})
            objects = self.cli('s3api', 'list-objects-v2', '--bucket', self.args.bucket, '--prefix', self.key_root + '/')
            versions = self.cli('s3api', 'list-object-versions', '--bucket', self.args.bucket, '--prefix', self.key_root + '/')
            checks.append({'resource': 's3://' + self.args.bucket + '/' + self.key_root,
                           'absent': not objects.get('Contents') and not versions.get('Versions') and not versions.get('DeleteMarkers')})
            attempts.append(checks)
            passed = all(check['absent'] for check in checks)
            evidence = {'verifiedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                        'checks': checks, 'attempts': attempts, 'passed': passed}
            (self.directory / 'cleanup-verification.json').write_text(json.dumps(evidence, indent=2) + '\n')
            self.report['cleanupVerified'] = passed
            self.save()
            if passed:
                return []
            if attempt < 3:
                time.sleep(3)
        return ['Resource still present: ' + check['resource'] for check in checks if not check['absent']]

    def run(self):
        self.started = time.time()
        try:
            if self.args.resume:
                self.progress('Resuming journaled resources at ' + str(self.args.memory) + ' MiB')
                for name in self.journal['functions']:
                    self.configure(name, {})
            else:
                self.setup()
            if not self.args.benchmark_only:
                self.functional()
            self.benchmark()
            self.report['passed'] = True
        except BaseException as error:
            self.report['passed'] = False
            self.report['failure'] = sanitize(error)
            self.progress('Verification failed: ' + sanitize(error))
            raise
        finally:
            self.save()
            if not self.args.keep:
                errors = self.cleanup()
                if errors:
                    self.progress('Cleanup incomplete; see journal.json')
            self.progress('Evidence: ' + str(self.directory))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--profile', default='default')
    parser.add_argument('--region', default='eu-west-1')
    parser.add_argument('--bucket', required=True)
    parser.add_argument('--prefix', default='mvms')
    parser.add_argument('--artifacts', type=pathlib.Path, default=SOURCE / 'output')
    parser.add_argument('--output', type=pathlib.Path, default=SOURCE / 'output/live-aws')
    parser.add_argument('--runs', type=int, default=3)
    parser.add_argument('--memory', type=int, default=1024, help='Function memory in MiB')
    parser.add_argument('--resume', type=pathlib.Path, help='Resume existing resources from a retained/interrupted run journal')
    parser.add_argument('--benchmark-only', action='store_true', help='Skip functional checks when resuming an existing run')
    parser.add_argument('--benchmark-workload', choices=('embedded', 's3'), default='embedded')
    parser.add_argument('--keep', action='store_true', help='Retain created AWS resources instead of cleaning up')
    args = parser.parse_args()
    if args.runs < 1 or not args.prefix.strip('/') or args.memory < 128:
        parser.error('runs must be positive and prefix must be nonempty')
    if args.benchmark_only and not args.resume:
        parser.error('--benchmark-only requires --resume')
    Verification(args).run()


if __name__ == '__main__':
    main()
