// Opt-in AWS MicroVM verification. Resource identities remain in a private journal.
var C = require((global.lambdaSource || getOPackPath('OpenAFLambda') || '.') + '/scripts/lib.js'),
  L = require(C.source() + '/tests/live-lib.js');
function Run(config, directory) {
  this.config = config;
  this.directory = C.mkdir(directory);
  this.journalPath = this.directory + '/journal.json';
  this.journal = C.exists(this.journalPath)
    ? C.json(this.journalPath)
    : { config: config, images: [], microvms: [], objects: [], logs: [] };
  this.report = C.exists(this.directory + '/report.json')
    ? C.json(this.directory + '/report.json')
    : { region: config.region, samples: [], checks: [] };
  this.save();
}
Run.prototype.save = function () {
  L.privateJSON(this.journalPath, this.journal);
  C.json(this.directory + '/report.json', this.report);
};
Run.prototype.aws = function (service, operation, params) {
  return L.aws(this.config, service, operation, params);
};
Run.prototype.sleep = function (ms) {
  C.sleep(ms);
};
Run.prototype.http = function (url, event, headers, timeout) {
  return C.http(url, event, headers, timeout);
};
Run.prototype.wait = function (operation, parameter, id, states, timeout) {
  var until = Date.now() + (timeout || 1800) * 1000;
  while (Date.now() < until) {
    var p = {};
    p[parameter] = id;
    var result = this.aws('lambda-microvms', operation, p),
      state = result.state;
    if (states.indexOf(state) >= 0) return result;
    C.assert(
      state.indexOf('FAIL') < 0 &&
        !(['TERMINATING', 'TERMINATED'].indexOf(state) >= 0 && states.indexOf('TERMINATED') < 0),
      'MicroVM service entered ' + state
    );
    this.sleep(3000);
  }
  throw new Error(operation + ' timed out');
};
Run.prototype.verify = function (imageZip, runs) {
  var z = C.zipOpen(imageZip),
    manifest;
  try {
    manifest = JSON.parse(C.zipText(z, 'payload/build-manifest.json'));
  } finally {
    z.close();
  }
  C.assert(
    manifest.architecture === 'arm64' && manifest.cdsArchive && manifest.cdsArchive.validated,
    'The comparison requires an arm64 source bundle with a validated sharing archive'
  );
  Object.assign(this.report, {
    versions: manifest.versions,
    imageZipSha256: C.hash(imageZip),
    baselineMemoryMiB: 1024
  });
  var c = this.config,
    key = c.prefix.replace(/^\/+|\/+$/g, '') + '/' + c.name + '/image.zip',
    self = this;
  this.journal.objects.push(key);
  this.save();
  this.aws('s3api', 'put-object', { bucket: c.bucket, key: key, body: String(C.path(imageZip)) });
  this.journal.role = c.name + '-role';
  this.save();
  var role = this.aws('iam', 'create-role', {
    role_name: this.journal.role,
    assume_role_policy_document: {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { Service: 'lambda.amazonaws.com' },
          Action: ['sts:AssumeRole', 'sts:TagSession']
        }
      ]
    }
  }).Role.Arn;
  this.journal.account = role.split(':')[4];
  this.save();
  this.aws('iam', 'put-role-policy', {
    role_name: this.journal.role,
    policy_name: 'verification',
    policy_document: {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: ['s3:GetObject'],
          Resource: 'arn:aws:s3:::' + c.bucket + '/' + key
        },
        {
          Effect: 'Allow',
          Action: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
          Resource:
            'arn:aws:logs:' +
            c.region +
            ':' +
            this.journal.account +
            ':log-group:/aws/lambda-microvms/' +
            c.name +
            '-*:*'
        }
      ]
    }
  });
  this.sleep(10000);
  var regionArn = 'arn:aws:lambda:' + c.region + ':aws:';
  ['auto', 'off'].forEach(function (mode) {
    var name = c.name + '-' + mode,
      group = '/aws/lambda-microvms/' + name;
    self.journal.images.push(
      'arn:aws:lambda:' + c.region + ':' + self.journal.account + ':microvm-image:' + name
    );
    self.journal.logs.push(group);
    self.save();
    self.aws('logs', 'create-log-group', { log_group_name: group });
    print('Building MicroVM image (' + mode + ')');
    var start = Date.now();
    var created = self.aws('lambda-microvms', 'create-microvm-image', {
      name: name,
      code_artifact: { uri: 's3://' + c.bucket + '/' + key },
      base_image_arn: regionArn + 'microvm-image:al2023-1',
      build_role_arn: role,
      cpu_configurations: [{ architecture: 'ARM_64' }],
      resources: [{ minimumMemoryInMiB: 1024 }],
      environment_variables: { OAF_JAVA_XSHARE: mode },
      logging: { cloudWatch: { logGroup: group } },
      egress_network_connectors: [
        regionArn + 'network-connector:aws-network-connector:INTERNET_EGRESS'
      ],
      hooks: {
        port: 8081,
        microvmImageHooks: {
          ready: 'ENABLED',
          readyTimeoutInSeconds: 300,
          validate: 'ENABLED',
          validateTimeoutInSeconds: 60
        },
        microvmHooks: {
          run: 'ENABLED',
          runTimeoutInSeconds: 60,
          resume: 'ENABLED',
          resumeTimeoutInSeconds: 60
        }
      }
    });
    var image = self.wait('get-microvm-image', 'image_identifier', created.imageArn, [
        'CREATED',
        'UPDATED'
      ]),
      version = image.latestActiveImageVersion;
    C.equal(
      self.aws('lambda-microvms', 'get-microvm-image-version', {
        image_identifier: created.imageArn,
        image_version: version
      }).state,
      'SUCCESSFUL'
    );
    self.report.checks.push({
      mode: mode,
      imageBuildSeconds: (Date.now() - start) / 1000,
      versionSuccessful: true
    });
    self.save();
    for (var trial = 0; trial < runs; trial++) {
      start = Date.now();
      var vm = self.aws('lambda-microvms', 'run-microvm', {
        image_identifier: created.imageArn,
        image_version: version,
        execution_role_arn: role,
        maximum_duration_in_seconds: 600,
        ingress_network_connectors: [
          regionArn + 'network-connector:aws-network-connector:ALL_INGRESS'
        ],
        idle_policy: {
          autoResumeEnabled: true,
          maxIdleDurationSeconds: 300,
          suspendedDurationSeconds: 60
        },
        logging: { cloudWatch: { logGroup: group } }
      });
      var identifier = vm.microvmId;
      self.journal.microvms.push(identifier);
      self.save();
      var running = self.wait('get-microvm', 'microvm_identifier', identifier, ['RUNNING'], 180),
        launch = (Date.now() - start) / 1000;
      var token = self.aws('lambda-microvms', 'create-microvm-auth-token', {
        microvm_identifier: identifier,
        expiration_in_minutes: 10,
        allowed_ports: [{ port: 8080 }]
      }).authToken['X-aws-proxy-auth'];
      var url =
          'https://' +
          String(running.endpoint || vm.endpoint)
            .replace(/^https:\/\//, '')
            .replace(/\/$/, ''),
        headers = { 'X-aws-proxy-auth': token, 'X-aws-proxy-port': '8080' },
        probe = Date.now(),
        until = probe + 90000;
      while (true) {
        try {
          var health = self.http(url + '/health', undefined, headers, 15000);
          C.assert(health[0] === 200 && health[1].ready === true, 'MicroVM runtime health failed');
          break;
        } catch (e) {
          if (Date.now() >= until) {
            if (health) {
              self.journal.endpointFailure = {
                status: health[0],
                body: L.sanitize(JSON.stringify(health[1])).substring(0, 2000)
              };
              self.save();
            }
            throw e;
          }
          self.sleep(2000);
        }
      }
      var endpointReady = (Date.now() - probe) / 1000;
      function invoke() {
        var started = Date.now(),
          r = self.http(url + '/invoke', { name: 'MicroVM' }, headers);
        C.equal(r[0], 200);
        C.equal(r[1].message, 'Hello MicroVM');
        return [Date.now() - started, r[1].requestId];
      }
      var first = invoke(),
        warm = invoke();
      C.assert(first[1] !== warm[1], 'Invocation request IDs reused');
      self.aws('lambda-microvms', 'suspend-microvm', { microvm_identifier: identifier });
      self.wait('get-microvm', 'microvm_identifier', identifier, ['SUSPENDED'], 180);
      self.aws('lambda-microvms', 'resume-microvm', { microvm_identifier: identifier });
      self.wait('get-microvm', 'microvm_identifier', identifier, ['RUNNING'], 180);
      var resumed = invoke();
      C.assert(resumed[1] !== first[1] && resumed[1] !== warm[1], 'Request ID reused after resume');
      self.report.samples.push({
        mode: mode,
        trial: trial,
        launchControlPlaneSeconds: launch,
        endpointHealthWaitSeconds: endpointReady,
        firstRequestMs: first[0],
        warmRequestMs: warm[0],
        resumedRequestMs: resumed[0],
        suspendResumePassed: true
      });
      self.save();
      self.aws('lambda-microvms', 'terminate-microvm', { microvm_identifier: identifier });
      self.wait('get-microvm', 'microvm_identifier', identifier, ['TERMINATED'], 180);
      print('MicroVM ' + mode + ' trial ' + (trial + 1) + ' passed');
    }
  });
  this.report.medians = {};
  ['auto', 'off'].forEach(function (mode) {
    self.report.medians[mode] = {};
    ['launchControlPlaneSeconds', 'firstRequestMs', 'warmRequestMs', 'resumedRequestMs'].forEach(
      function (k) {
        self.report.medians[mode][k] = C.median(
          self.report.samples
            .filter(function (s) {
              return s.mode === mode;
            })
            .map(function (s) {
              return s[k];
            })
        );
      }
    );
  });
  this.save();
};
Run.prototype.cleanup = function () {
  var failures = [],
    self = this;
  function attempt(service, operation, p) {
    try {
      return self.aws(service, operation, p);
    } catch (e) {
      if (!/ResourceNotFound|NoSuchEntity|NoSuchKey|NotFoundException/.test(String(e)))
        failures.push(operation + ': ' + L.sanitize(e));
      return null;
    }
  }
  this.journal.logs.forEach(function (group, i) {
    var events = attempt('logs', 'filter-log-events', { log_group_name: group });
    if (events) C.json(self.directory + '/cloudwatch-' + i + '.json', events);
  });
  this.journal.microvms.forEach(function (id) {
    var current = attempt('lambda-microvms', 'get-microvm', { microvm_identifier: id });
    if (!current || current.state === 'TERMINATED') return;
    attempt('lambda-microvms', 'terminate-microvm', { microvm_identifier: id });
    try {
      self.wait('get-microvm', 'microvm_identifier', id, ['TERMINATED'], 180);
    } catch (e) {
      if (String(e).indexOf('ResourceNotFound') < 0) failures.push(String(e));
    }
  });
  this.journal.images.forEach(function (image) {
    if (image.indexOf('arn:') !== 0)
      image =
        'arn:aws:lambda:' +
        self.config.region +
        ':' +
        (self.journal.account || self.aws('sts', 'get-caller-identity', {}).Account) +
        ':microvm-image:' +
        image;
    attempt('lambda-microvms', 'delete-microvm-image', { image_identifier: image });
    var until = Date.now() + 300000,
      deleted = false;
    while (Date.now() < until) {
      try {
        var state = self.aws('lambda-microvms', 'get-microvm-image', {
          image_identifier: image
        }).state;
        if (state === 'DELETED') {
          deleted = true;
          break;
        }
        if (state === 'DELETION_FAILED') {
          failures.push('Image deletion failed');
          break;
        }
      } catch (e) {
        if (String(e).indexOf('ResourceNotFound') >= 0) deleted = true;
        else failures.push(String(e));
        break;
      }
      self.sleep(3000);
    }
    if (!deleted) failures.push('Image deletion incomplete');
  });
  this.journal.objects.forEach(function (key) {
    var v =
      attempt('s3api', 'list-object-versions', { bucket: self.config.bucket, prefix: key }) || {};
    (v.Versions || []).concat(v.DeleteMarkers || []).forEach(function (item) {
      if (item.Key === key)
        attempt('s3api', 'delete-object', {
          bucket: self.config.bucket,
          key: key,
          version_id: item.VersionId
        });
    });
  });
  var role = this.journal.role;
  if (role) {
    attempt('iam', 'delete-role-policy', { role_name: role, policy_name: 'verification' });
    attempt('iam', 'delete-role', { role_name: role });
  }
  this.journal.logs.forEach(function (group) {
    attempt('logs', 'delete-log-group', { log_group_name: group });
  });
  this.journal.objects.forEach(function (key) {
    var v =
      attempt('s3api', 'list-object-versions', { bucket: self.config.bucket, prefix: key }) || {};
    if (
      (v.Versions || []).concat(v.DeleteMarkers || []).some(function (i) {
        return i.Key === key;
      })
    )
      failures.push('Uploaded source object versions remain');
  });
  this.journal.logs.forEach(function (group) {
    var p = { log_group_name_prefix: group };
    var r = attempt('logs', 'describe-log-groups', p) || {};
    if (
      (r.logGroups || []).some(function (g) {
        return g.logGroupName === group;
      })
    )
      attempt('logs', 'delete-log-group', { log_group_name: group });
    r = attempt('logs', 'describe-log-groups', p) || {};
    if (
      (r.logGroups || []).some(function (g) {
        return g.logGroupName === group;
      })
    )
      failures.push('Temporary log group remains');
  });
  if (role) {
    try {
      this.aws('iam', 'get-role', { role_name: role });
      failures.push('Temporary role remains');
    } catch (e) {
      if (String(e).indexOf('NoSuchEntity') < 0) failures.push(String(e));
    }
  }
  Object.assign(this.journal, {
    cleanupErrors: failures,
    cleanupRequested: true,
    cleanupPassed: !failures.length
  });
  this.report.cleanupPassed = !failures.length;
  this.save();
  C.assert(!failures.length, 'Cleanup needs attention; see journal.json: ' + failures.join('; '));
};
function main(a) {
  if (a.cleanup) {
    var j = C.json(a.cleanup);
    new Run(j.config, String(C.path(a.cleanup).getParent())).cleanup();
    return;
  }
  C.assert(
    a.bucket &&
      /^\d+$/.test(String(a.runs)) &&
      Number(a.runs) >= 1 &&
      String(a.prefix).replace(/\//g, ''),
    'bucket, nonempty prefix and positive runs are required'
  );
  var name = L.id('nma-temp-test-mvm-'),
    dir = 'output/live-microvm/' + name,
    r = new Run(
      { profile: a.profile, region: a.region, bucket: a.bucket, prefix: a.prefix, name: name },
      dir
    );
  print('Evidence: ' + dir);
  try {
    r.verify(a.imageZip, Number(a.runs));
    r.report.status = 'passed';
  } catch (e) {
    r.report.status = 'failed';
    r.journal.failure = L.sanitize(e);
    r.save();
    throw e;
  } finally {
    r.cleanup();
  }
}
if (typeof exports !== 'undefined') Object.assign(exports, { Run: Run, main: main });
if (!global.lambdaImport) {
  try {
    main(
      C.args({
        imageZip: 'output/openaf-microvm-arm64.zip',
        prefix: 'mvms',
        profile: 'default',
        region: 'eu-west-1',
        runs: 3
      })
    );
  } catch (e) {
    printErr(L.sanitize(e));
    exit(1);
  }
}
