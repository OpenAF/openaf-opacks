// Opt-in function verification; AWS CLI credentials and existing bucket are required.
var C = require((global.lambdaSource || getOPackPath('OpenAFLambda') || '.') + '/scripts/lib.js'),
  L = require(C.source() + '/tests/live-lib.js');
var PROBE =
  'global.liveInstance=isDef(global.liveInstance)?global.liveInstance:genUUID(); global.liveCount=isDef(global.liveCount)?global.liveCount+1:1; if(__pmIn.fail) throw new Error("Live verification deliberate failure"); __pmOut={name:__pmIn.name,instance:global.liveInstance,count:global.liveCount,requestId:__lambdaContext.awsRequestId,remainingMs:__lambdaContext.getRemainingTimeInMillis(),resource:io.readFileString("resource.txt"),java:String(java.lang.System.getProperty("java.version")),stream:getEnv("AWS_LAMBDA_LOG_STREAM_NAME"),aws:isDef(getOPackPath("AWS")),sharing:getEnv("OAF_JAVA_XSHARE")};';
var OJOB =
  'ojob:\n  sequential: true\n  logToConsole: false\ntodo:\n- Cleanup\n- Run\njobs:\n- name: Cleanup\n  type: shutdown\n  exec: |\n    __pmOut.cleanup=true;\n- name: Run\n  exec: |\n    if(args.fail) throw "Live oJob deliberate failure";\n    __pmOut={name:args.name,resource:io.readFileString("resource.txt"),requestId:__lambdaContext.awsRequestId};\n';
function Verification(args) {
  this.args = args;
  this.functions = {};
  if (args.resume) {
    this.directory = String(C.path(args.resume).getParent());
    this.journal = C.json(args.resume);
    this.report = C.json(this.directory + '/report.json');
    C.assert(
      this.journal.bucket === args.bucket && this.journal.region === args.region,
      'Resume bucket and region must match journal'
    );
    this.runId = this.journal.runId;
    this.name = this.journal.role.name.replace(/-role$/, '');
    this.keyRoot = this.journal.prefix;
    var self = this;
    this.journal.functions.forEach(function (n) {
      self.functions[(n.indexOf('-arm-') >= 0 ? 'arm64' : 'x86_64') + ',' + n.split('-').pop()] = n;
    });
    this.workloadSha = C.hash(this.directory + '/workload.zip');
    this.workloadKey = this.keyRoot + '/workloads/probe.zip';
    this.singleKey = this.keyRoot + '/workloads/single.js';
    this.deniedKey = this.keyRoot + '/denied/probe.zip';
    this.report.invocations.forEach(function (r) {
      r.memoryMiB = r.memoryMiB || 512;
      ['initMs', 'durationMs', 'maxMemoryMiB', 'initPhaseTimeout', 'failedInitMs'].forEach(
        function (k) {
          delete r[k];
        }
      );
      Object.assign(r, L.metrics(r.logs));
    });
    return;
  }
  this.runId = L.id('');
  this.name = 'nma-temp-test-' + this.runId;
  this.directory = C.mkdir(args.output + '/' + this.runId);
  this.keyRoot = args.prefix.replace(/^\/+|\/+$/g, '') + '/' + this.runId;
  this.journal = {
    runId: this.runId,
    region: args.region,
    bucket: args.bucket,
    prefix: this.keyRoot,
    functions: [],
    objects: [],
    role: null,
    policy: 'OpenAFLambdaVerification',
    cleanup: []
  };
  this.report = {
    runId: this.runId,
    region: args.region,
    checks: [],
    invocations: [],
    benchmarks: {},
    artifacts: {}
  };
  this.save();
}
Verification.prototype.save = function () {
  L.privateJSON(this.directory + '/journal.json', this.journal);
  C.json(this.directory + '/report.json', this.report);
};
Verification.prototype.aws = function (s, o, p, allowed, text) {
  return L.aws(this.args, s, o, p, allowed, text);
};
Verification.prototype.check = function (name, condition, details) {
  this.report.checks.push({ name: name, passed: !!condition, details: details });
  this.save();
  C.assert(condition, name + ': ' + JSON.stringify(details));
};
Verification.prototype.put = function (suffix, body) {
  var key = this.keyRoot + '/' + suffix;
  this.journal.objects.push({ key: key });
  this.save();
  var r = this.aws('s3api', 'put-object', {
    bucket: this.args.bucket,
    key: key,
    body: String(C.path(body))
  });
  this.journal.objects[this.journal.objects.length - 1].versionId = r.VersionId;
  this.save();
  return key;
};
Verification.prototype.configure = function (name, settings) {
  var env = Object.assign(
    {
      OJOB_JSONLOG: 'true',
      OAF_JAVA_XSHARE: /-off$/.test(name) ? 'off' : 'auto',
      OAF_LIVE_NONCE: genUUID()
    },
    settings
  );
  // Environment files are private and removed even when AWS rejects configuration.
  var p = this.directory + '/environment.json';
  L.privateJSON(p, { Variables: env });
  try {
    this.aws('lambda', 'update-function-configuration', {
      function_name: name,
      memory_size: this.args.memory,
      environment: 'file://' + p
    });
  } finally {
    C.remove(p);
  }
  this.wait(name, true);
};
Verification.prototype.wait = function (name, updating) {
  var until = Date.now() + 180000;
  while (Date.now() < until) {
    var c = this.aws('lambda', 'get-function-configuration', { function_name: name }),
      s = updating ? c.LastUpdateStatus : c.State;
    if (s === 'Successful' || s === 'Active') return;
    C.assert(s !== 'Failed', c.LastUpdateStatusReason || c.StateReason || 'Function failed');
    C.sleep(2000);
  }
  throw new Error('Function did not become ready: ' + name);
};
Verification.prototype.invoke = function (name, label, payload, error) {
  // invoke has a positional output argument; use a dedicated argv rather than a shell.
  var target = this.directory + '/response.json',
    a = this.args;
  var r = C.run(
    [
      'aws',
      '--profile',
      a.profile,
      '--region',
      a.region,
      '--no-cli-pager',
      '--cli-connect-timeout',
      '10',
      '--cli-read-timeout',
      '120',
      '--output',
      'json',
      'lambda',
      'invoke',
      '--function-name',
      name,
      '--log-type',
      'Tail',
      '--cli-binary-format',
      'raw-in-base64-out',
      '--payload',
      JSON.stringify(payload || {}),
      target
    ],
    { capture: true, allowFailure: true, timeout: 150 }
  );
  C.assert(r.code === 0, L.sanitize(r.stderr));
  var result = JSON.parse(r.stdout),
    logs = L.sanitize(
      String(
        new java.lang.String(java.util.Base64.getDecoder().decode(result.LogResult || ''), 'UTF-8')
      )
    ),
    body = C.json(target);
  var record = Object.assign(
    {
      function: name,
      label: label,
      memoryMiB: Number(a.memory),
      functionError: result.FunctionError,
      response: body,
      logs: logs
    },
    L.metrics(logs)
  );
  this.report.invocations.push(record);
  this.save();
  this.check(label + ' error contract', !!result.FunctionError === !!error, {
    functionError: result.FunctionError,
    response: body
  });
  return [body, record];
};
Verification.prototype.setup = function () {
  var self = this,
    a = this.args,
    account = this.aws('sts', 'get-caller-identity', {}).Account;
  this.report.account = account;
  var location = this.aws('s3api', 'get-bucket-location', { bucket: a.bucket }).LocationConstraint;
  this.check('bucket region', (location || 'us-east-1') === a.region, location);
  var roleName = this.name + '-role';
  this.journal.role = { name: roleName };
  this.save();
  var role = this.aws('iam', 'create-role', {
    role_name: roleName,
    assume_role_policy_document: {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { Service: 'lambda.amazonaws.com' },
          Action: 'sts:AssumeRole'
        }
      ]
    },
    tags: [
      { Key: 'Project', Value: 'OpenAFLambdaVerification' },
      { Key: 'RunId', Value: this.runId }
    ]
  }).Role;
  this.journal.role.arn = role.Arn;
  this.save();
  this.aws('iam', 'put-role-policy', {
    role_name: roleName,
    policy_name: this.journal.policy,
    policy_document: {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
          Resource:
            'arn:aws:logs:' +
            a.region +
            ':' +
            account +
            ':log-group:/aws/lambda/' +
            this.name +
            '-*:*'
        },
        {
          Effect: 'Allow',
          Action: 's3:GetObject',
          Resource: 'arn:aws:s3:::' + a.bucket + '/' + this.keyRoot + '/workloads/*'
        }
      ]
    }
  });
  var payload = C.bundle({
    'main.js': PROBE,
    'resource.txt': 'live S3 resource',
    'jobs/main.yaml': OJOB,
    'jobs/resource.txt': 'live oJob resource'
  });
  C.write(this.directory + '/workload.zip', payload);
  this.workloadSha = C.digest(payload);
  this.workloadKey = this.put('workloads/probe.zip', this.directory + '/workload.zip');
  C.write(
    this.directory + '/single.js',
    '__pmOut={name:__pmIn.name,directScript:true,requestId:__lambdaContext.awsRequestId};'
  );
  this.singleKey = this.put('workloads/single.js', this.directory + '/single.js');
  this.deniedKey = this.put('denied/probe.zip', this.directory + '/workload.zip');
  ['arm64', 'x86_64'].forEach(function (arch) {
    var original = a.artifacts + '/openaf-lambda-' + arch + '.zip',
      target = self.directory + '/deployment-' + arch + '.zip',
      z = C.zipOpen(original);
    try {
      C.zipWriter(target, function (add) {
        C.safeEntries(z).forEach(function (e) {
          var n = String(e.getName());
          if (n !== 'function/probe.js' && n !== 'function/resource.txt')
            add(n, C.zipRead(z, e), Number(e.getUnixMode()));
        });
        add('function/probe.js', PROBE);
        add('function/resource.txt', 'live embedded resource');
      });
    } finally {
      z.close();
    }
    self.report.artifacts[arch] = {
      deploymentSha256: C.hash(target),
      baseManifest: C.json(original.replace(/\.zip$/, '.manifest.json')),
      fixtureAdditions: ['function/probe.js', 'function/resource.txt']
    };
    var key = self.put('runtimes/' + String(C.path(target).getFileName()), target);
    ['auto', 'off'].forEach(function (mode) {
      var name = self.name + '-' + (arch === 'arm64' ? 'arm' : 'x86') + '-' + mode;
      self.journal.functions.push(name);
      self.functions[arch + ',' + mode] = name;
      self.save();
      var until = Date.now() + 90000;
      while (true) {
        try {
          self.aws('lambda', 'create-function', {
            function_name: name,
            runtime: 'provided.al2023',
            architectures: [arch],
            handler: 'main.yaml',
            memory_size: a.memory,
            timeout: 60,
            role: role.Arn,
            code: { S3Bucket: a.bucket, S3Key: key },
            environment: { Variables: { OJOB_JSONLOG: 'true', OAF_JAVA_XSHARE: mode } },
            tags: { Project: 'OpenAFLambdaVerification', RunId: self.runId }
          });
          break;
        } catch (e) {
          if (String(e).indexOf('cannot be assumed') < 0 || Date.now() > until) throw e;
          C.sleep(3000);
        }
      }
      self.wait(name);
      print('Created ' + name);
    });
  });
};
Verification.prototype.functional = function () {
  var self = this,
    a = this.args;
  Object.keys(this.functions).forEach(function (k) {
    var r = self.invoke(self.functions[k], k + ' embedded oJob', { name: 'LiveAWS' })[0];
    self.check(k + ' embedded response', r.message === 'Hello LiveAWS', r);
  });
  ['arm64', 'x86_64'].forEach(function (arch) {
    var name = self.functions[arch + ',auto'];
    [
      ['embedded script', { OJOB_ENTRYPOINT: 'probe.js' }, 'live embedded resource'],
      [
        'S3 bundle',
        {
          OJOB_METHOD: 's3',
          OJOB_CONFIG: 's3://' + a.bucket + '/' + self.workloadKey,
          OJOB_ENTRYPOINT: 'main.js',
          OJOB_SHA256: self.workloadSha
        },
        'live S3 resource'
      ]
    ].forEach(function (c) {
      self.configure(name, c[1]);
      var first = self.invoke(name, arch + ' ' + c[0] + ' first', { name: 'first' })[0],
        failed = self.invoke(name, arch + ' ' + c[0] + ' failure', { fail: true }, true)[0],
        second = self.invoke(name, arch + ' ' + c[0] + ' recovery', { name: 'second' })[0];
      self.check(
        arch + ' ' + c[0] + ' resource',
        first.resource === c[2] && first.aws === true,
        first
      );
      self.check(
        arch + ' ' + c[0] + ' error message',
        String(failed.errorMessage).indexOf('deliberate failure') >= 0,
        failed
      );
      self.check(
        arch + ' ' + c[0] + ' warm state',
        first.instance === second.instance &&
          first.count === 1 &&
          second.count === 3 &&
          second.name === 'second',
        [first, second]
      );
      self.check(
        arch + ' ' + c[0] + ' context',
        first.remainingMs > 0 && first.requestId !== second.requestId
      );
    });
    self.configure(name, {
      OJOB_METHOD: 's3',
      OJOB_CONFIG: self.singleKey,
      OJOB_S3_BUCKET: a.bucket
    });
    var body = self.invoke(name, arch + ' S3 standalone script', { name: 'single' })[0];
    self.check(
      arch + ' standalone response',
      body.directScript === true && body.name === 'single',
      body
    );
    self.configure(name, {
      OJOB_METHOD: 's3',
      OJOB_CONFIG: 's3://' + a.bucket + '/' + self.workloadKey,
      OJOB_ENTRYPOINT: 'jobs/main.yaml'
    });
    var first = self.invoke(name, arch + ' S3 oJob', { name: 'job' })[0];
    self.invoke(name, arch + ' S3 oJob failure', { fail: true }, true);
    var second = self.invoke(name, arch + ' S3 oJob recovery', { name: 'recovered' })[0];
    self.check(
      arch + ' S3 oJob resources and cleanup',
      first.resource === 'live oJob resource' &&
        first.cleanup === true &&
        second.name === 'recovered' &&
        second.cleanup === true,
      [first, second]
    );
  });
  var name = this.functions['arm64,auto'];
  [
    ['missing S3 object', this.keyRoot + '/workloads/missing.zip', {}, /HTTP (403|404)/],
    ['denied S3 object', this.deniedKey, {}, /HTTP 403/],
    [
      'incorrect integrity hash',
      this.workloadKey,
      { OJOB_SHA256: new Array(65).join('0') },
      /mismatch/
    ]
  ].forEach(function (c) {
    self.configure(
      name,
      Object.assign({ OJOB_METHOD: 's3', OJOB_CONFIG: 's3://' + a.bucket + '/' + c[1] }, c[2])
    );
    var r = self.invoke(name, c[0], {}, true)[0];
    self.check(c[0] + ' initialization error', c[3].test(r.errorMessage || ''), r);
  });
  var presign = C.run(
    [
      'aws',
      '--profile',
      a.profile,
      '--region',
      a.region,
      '--no-cli-pager',
      's3',
      'presign',
      's3://' + a.bucket + '/' + this.workloadKey,
      '--expires-in',
      '1800'
    ],
    { capture: true, allowFailure: true }
  );
  C.assert(!presign.code, L.sanitize(presign.stderr));
  this.configure(name, {
    OJOB_METHOD: 'http',
    OJOB_CONFIG: presign.stdout.trim(),
    OJOB_ENTRYPOINT: 'main.js',
    OJOB_SHA256: this.workloadSha
  });
  var r = this.invoke(name, 'HTTP presigned bundle', { name: 'http' })[0];
  this.check('HTTP bundle resource', r.resource === 'live S3 resource', r);
};
Verification.prototype.benchmark = function () {
  var self = this,
    a = this.args;
  ['arm64', 'x86_64'].forEach(function (arch) {
    var rows = { auto: [], off: [] };
    for (var i = 0; i < Number(a.runs); i++)
      (i % 2 ? ['off', 'auto'] : ['auto', 'off']).forEach(function (mode) {
        var name = self.functions[arch + ',' + mode],
          settings =
            a.benchmarkWorkload === 's3'
              ? {
                  OJOB_METHOD: 's3',
                  OJOB_CONFIG: 's3://' + a.bucket + '/' + self.workloadKey,
                  OJOB_ENTRYPOINT: 'jobs/main.yaml',
                  OJOB_SHA256: self.workloadSha
                }
              : { OJOB_METHOD: 'none', OJOB_ENTRYPOINT: 'main.yaml' };
        self.configure(name, settings);
        var cold = self.invoke(name, arch + ' ' + mode + ' cold ' + i, { name: 'benchmark' })[1];
        self.check(
          arch + ' ' + mode + ' cold initialization metric ' + i,
          isDef(cold.initMs) || cold.initPhaseTimeout,
          cold.logs
        );
        var warm = self.invoke(name, arch + ' ' + mode + ' warm ' + i, {
          name: 'benchmark-warm'
        })[1];
        rows[mode].push({
          initMs: isDef(cold.initMs) ? cold.initMs : null,
          failedInitMs: cold.failedInitMs || 0,
          initPhaseTimeout: cold.initPhaseTimeout || false,
          coldDurationMs: cold.durationMs,
          warmDurationMs: warm.durationMs,
          maxMemoryMiB: warm.maxMemoryMiB
        });
        print(arch + ' ' + mode + ' cold init: ' + (cold.initMs || 'retry') + ' ms');
      });
    self.report.benchmarks[arch] = {};
    ['auto', 'off'].forEach(function (mode) {
      var s = rows[mode];
      self.report.benchmarks[arch][mode] = {
        samples: s,
        initRetryCount: s.filter(function (r) {
          return r.initPhaseTimeout;
        }).length,
        medianInitMs: C.median(
          s
            .filter(function (r) {
              return r.initMs !== null;
            })
            .map(function (r) {
              return r.initMs;
            })
        ),
        medianColdTotalMs: C.median(
          s.map(function (r) {
            return (r.initMs || r.failedInitMs) + r.coldDurationMs;
          })
        ),
        medianWarmMs: C.median(
          s.map(function (r) {
            return r.warmDurationMs;
          })
        )
      };
    });
    self.report.benchmarkMemoryMiB = Number(a.memory);
    self.report.benchmarkWorkload = a.benchmarkWorkload;
    self.save();
  });
  ['arm64', 'x86_64'].forEach(function (arch) {
    var name = self.functions[arch + ',auto'];
    self.configure(name, { OJOB_ENTRYPOINT: 'probe.js', JAVA_TOOL_OPTIONS: '-Xlog:cds=info' });
    self.invoke(name, arch + ' CDS mapping diagnostic', { name: 'diagnostic' });
    var until = Date.now() + 45000,
      text = '';
    while (Date.now() < until) {
      var logs = self.aws(
        'logs',
        'filter-log-events',
        { log_group_name: '/aws/lambda/' + name, start_time: self.started },
        ['ResourceNotFoundException']
      );
      text = ((logs || {}).events || [])
        .map(function (e) {
          return L.sanitize(e.message);
        })
        .join('\n');
      if ((text.match(/Mapped static\s+region #0/g) || []).length >= 2) break;
      C.sleep(3000);
    }
    C.write(self.directory + '/' + arch + '-cloudwatch.log', text);
    self.check(
      arch + ' both JVMs map OpenAF CDS archive',
      text.indexOf('.shared.oaf') >= 0 &&
        (text.match(/Mapped static\s+region #0/g) || []).length >= 2
    );
  });
};
Verification.prototype.cleanup = function () {
  var errors = [],
    self = this,
    a = this.args;
  function remove(label, s, o, p, allowed) {
    try {
      self.aws(s, o, p, allowed);
      self.journal.cleanup.push({ resource: label, deleted: true });
    } catch (e) {
      errors.push(label + ': ' + L.sanitize(e));
      self.journal.cleanup.push({ resource: label, deleted: false, error: L.sanitize(e) });
    }
    self.save();
  }
  this.journal.functions.forEach(function (n) {
    remove(n, 'lambda', 'delete-function', { function_name: n }, ['ResourceNotFoundException']);
    remove('/aws/lambda/' + n, 'logs', 'delete-log-group', { log_group_name: '/aws/lambda/' + n }, [
      'ResourceNotFoundException'
    ]);
  });
  this.journal.objects.forEach(function (obj) {
    remove(obj.key, 's3api', 'delete-object', {
      bucket: a.bucket,
      key: obj.key,
      version_id: obj.versionId
    });
  });
  if (this.journal.role) {
    remove(
      'role policy',
      'iam',
      'delete-role-policy',
      { role_name: this.journal.role.name, policy_name: this.journal.policy },
      ['NoSuchEntity']
    );
    remove(this.journal.role.name, 'iam', 'delete-role', { role_name: this.journal.role.name }, [
      'NoSuchEntity'
    ]);
  }
  try {
    errors = errors.concat(this.verifyCleanup());
  } catch (e) {
    errors.push('Cleanup verification: ' + L.sanitize(e));
  }
  this.report.cleanupErrors = errors;
  this.save();
  return errors;
};
Verification.prototype.verifyCleanup = function () {
  var self = this,
    a = this.args,
    attempts = [],
    checks = [];
  for (var attempt = 0; attempt < 4; attempt++) {
    checks = [];
    this.journal.functions.forEach(function (n) {
      checks.push({
        resource: n,
        absent:
          self.aws('lambda', 'get-function', { function_name: n }, [
            'ResourceNotFoundException'
          ]) === null
      });
      var group = '/aws/lambda/' + n,
        groups = self.aws('logs', 'describe-log-groups', {
          log_group_name_prefix: group
        }).logGroups;
      var missing = !groups.some(function (g) {
        return g.logGroupName === group;
      });
      checks.push({ resource: group, absent: missing });
      if (!missing) {
        self.aws('logs', 'delete-log-group', { log_group_name: group }, [
          'ResourceNotFoundException'
        ]);
        self.journal.cleanup.push({ resource: group, deleted: true, lateLogGroup: true });
      }
    });
    if (this.journal.role)
      checks.push({
        resource: this.journal.role.name,
        absent:
          this.aws('iam', 'get-role', { role_name: this.journal.role.name }, ['NoSuchEntity']) ===
          null
      });
    var objects = this.aws('s3api', 'list-objects-v2', {
        bucket: a.bucket,
        prefix: this.keyRoot + '/'
      }),
      versions = this.aws('s3api', 'list-object-versions', {
        bucket: a.bucket,
        prefix: this.keyRoot + '/'
      });
    checks.push({
      resource: 's3://' + a.bucket + '/' + this.keyRoot,
      absent:
        !(objects.Contents || []).length &&
        !(versions.Versions || []).length &&
        !(versions.DeleteMarkers || []).length
    });
    attempts.push(checks);
    var passed = checks.every(function (c) {
      return c.absent;
    });
    C.json(this.directory + '/cleanup-verification.json', {
      verifiedAt: String(java.time.Instant.now()),
      checks: checks,
      attempts: attempts,
      passed: passed
    });
    this.report.cleanupVerified = passed;
    this.save();
    if (passed) return [];
    if (attempt < 3) C.sleep(3000);
  }
  return checks
    .filter(function (c) {
      return !c.absent;
    })
    .map(function (c) {
      return 'Resource still present: ' + c.resource;
    });
};
Verification.prototype.run = function () {
  this.started = Date.now();
  var failure;
  try {
    if (this.args.resume) {
      var self = this;
      this.journal.functions.forEach(function (n) {
        self.configure(n, {});
      });
    } else this.setup();
    if (!this.args.benchmarkOnly) this.functional();
    this.benchmark();
    this.report.passed = true;
  } catch (e) {
    this.report.passed = false;
    this.report.failure = L.sanitize(e);
    failure = e;
  } finally {
    this.save();
    if (!this.args.keep) {
      var errors = this.cleanup();
      if (errors.length && !failure) failure = new Error('Cleanup incomplete; see journal.json');
    }
    print('Evidence: ' + this.directory);
  }
  if (failure) throw failure;
};
function main(a) {
  C.assert(
    a.bucket &&
      /^\d+$/.test(String(a.runs)) &&
      Number(a.runs) >= 1 &&
      String(a.prefix).replace(/\//g, '') &&
      /^\d+$/.test(String(a.memory)) &&
      Number(a.memory) >= 128,
    'bucket, positive runs, nonempty prefix and memory >=128 are required'
  );
  C.assert(!a.benchmarkOnly || a.resume, 'benchmarkOnly requires resume');
  C.assert(['embedded', 's3'].indexOf(a.benchmarkWorkload) >= 0, 'Invalid benchmarkWorkload');
  new Verification(a).run();
}
if (typeof exports !== 'undefined')
  Object.assign(exports, { Verification: Verification, invocationMetrics: L.metrics, main: main });
if (!global.lambdaImport) {
  try {
    main(
      C.args({
        profile: 'default',
        region: 'eu-west-1',
        prefix: 'mvms',
        artifacts: C.source() + '/output',
        output: C.source() + '/output/live-aws',
        runs: 3,
        memory: 1024,
        benchmarkWorkload: 'embedded'
      })
    );
  } catch (e) {
    printErr(L.sanitize(e));
    exit(1);
  }
}
