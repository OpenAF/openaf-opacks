// Mocked AWS contracts only; no account, credentials or service calls.
var C = require((global.lambdaSource || getOPackPath('OpenAFLambda') || '.') + '/scripts/lib.js');
global.lambdaImport = true;
var M = require(C.source() + '/tests/live_microvm.js'),
  A = require(C.source() + '/tests/live_aws.js');
function run() {
  var tmp = C.temp('live-harness-regression-');
  try {
    C.zipWriter(tmp + '/image.zip', function (add) {
      add(
        'payload/build-manifest.json',
        JSON.stringify({
          architecture: 'arm64',
          cdsArchive: { validated: true },
          versions: { java: '25' }
        })
      );
    });
    var r = new M.Run(
        {
          profile: 'fixture',
          region: 'eu-west-1',
          bucket: 'fixture',
          prefix: 'tests',
          name: 'nma-temp-test-fixture'
        },
        tmp + '/microvm'
      ),
      states = {},
      calls = [],
      seq = 0,
      request = 0,
      deleted = false;
    r.sleep = function () {};
    r.http = function (url, event, headers) {
      C.equal(headers['X-aws-proxy-auth'], 'private-token');
      return /health$/.test(url)
        ? [200, { ready: true }]
        : [200, { message: 'Hello MicroVM', requestId: 'request-' + ++request }];
    };
    r.aws = function (service, operation, p) {
      calls.push([service, operation, p]);
      if (operation === 'create-role')
        return { Role: { Arn: 'arn:aws:iam::ACCOUNT:role/fixture' } };
      if (operation === 'create-microvm-image')
        return { imageArn: 'arn:aws:lambda:eu-west-1:ACCOUNT:microvm-image:' + p.name };
      if (operation === 'get-microvm-image')
        return { state: deleted ? 'DELETED' : 'CREATED', latestActiveImageVersion: '1' };
      if (operation === 'get-microvm-image-version') return { state: 'SUCCESSFUL' };
      if (operation === 'run-microvm') {
        var id = 'vm-' + ++seq;
        states[id] = 'RUNNING';
        return { microvmId: id, endpoint: 'fixture.example' };
      }
      if (operation === 'get-microvm')
        return { state: states[p.microvm_identifier], endpoint: 'fixture.example' };
      if (operation === 'create-microvm-auth-token')
        return { authToken: { 'X-aws-proxy-auth': 'private-token' } };
      if (operation === 'suspend-microvm') states[p.microvm_identifier] = 'SUSPENDED';
      if (operation === 'resume-microvm') states[p.microvm_identifier] = 'RUNNING';
      if (operation === 'terminate-microvm') states[p.microvm_identifier] = 'TERMINATED';
      if (operation === 'delete-microvm-image') deleted = true;
      if (operation === 'get-role') throw new Error('NoSuchEntity');
      return {};
    };
    r.verify(tmp + '/image.zip', 1);
    C.equal(r.report.samples.length, 2);
    C.equal(request, 6);
    C.assert(
      r.report.samples.every(function (s) {
        return s.suspendResumePassed;
      })
    );
    C.assert(
      C.read(r.directory + '/journal.json').indexOf('private-token') < 0 &&
        C.read(r.directory + '/report.json').indexOf('private-token') < 0
    );
    r.cleanup();
    C.assert(r.journal.cleanupPassed);
    C.equal(
      calls.filter(function (c) {
        return c[1] === 'suspend-microvm';
      }).length,
      2
    );
    print('PASS mocked MicroVM image, lifecycle, suspend/resume and cleanup');
    var v = new A.Verification({
        bucket: 'fixture',
        region: 'eu-west-1',
        profile: 'fixture',
        output: tmp + '/aws',
        prefix: 'tests',
        memory: 1024
      }),
      awsCalls = [],
      nonce;
    v.wait = function (name, updating) {
      C.assert(updating);
    };
    v.aws = function (s, o, p) {
      awsCalls.push([s, o, p]);
      if (o === 'update-function-configuration') {
        var env = C.json(p.environment.substring(7)).Variables;
        C.equal(env.OAF_JAVA_XSHARE, 'off');
        C.equal(env.OJOB_CONFIG, 'https://fixture/?private=query');
        nonce = env.OAF_LIVE_NONCE;
      }
      return {};
    };
    v.configure('fixture-off', { OJOB_CONFIG: 'https://fixture/?private=query' });
    C.assert(nonce && !C.exists(v.directory + '/environment.json'));
    print('PASS function configuration selects sharing and removes private environment file');
    v.aws = function () {
      throw new Error('denied');
    };
    var failed = false;
    try {
      v.configure('fixture-off', {});
    } catch (e) {
      failed = true;
    }
    C.assert(failed && !C.exists(v.directory + '/environment.json'));
    v.journal.functions = ['fixture-function'];
    v.journal.objects = [{ key: v.keyRoot + '/workloads/file', versionId: 'version' }];
    v.journal.role = { name: 'fixture-role' };
    v.aws = function (s, o, p) {
      awsCalls.push([s, o, p]);
      if (o === 'get-function' || o === 'get-role') return null;
      if (o === 'describe-log-groups') return { logGroups: [] };
      return {};
    };
    C.equal(v.cleanup(), []);
    C.assert(v.report.cleanupVerified);
    C.assert(
      awsCalls.some(function (c) {
        return c[1] === 'delete-object' && c[2].version_id === 'version';
      })
    );
    print('PASS function cleanup deletes exact versions and verifies absence');
  } finally {
    C.remove(tmp);
  }
}
try {
  run();
} catch (e) {
  printErr(String(e));
  exit(1);
}
