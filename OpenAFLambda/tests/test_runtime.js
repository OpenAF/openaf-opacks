var C = require((global.lambdaSource || getOPackPath('OpenAFLambda') || '.') + '/scripts/lib.js');
var R = require(C.source() + '/tests/runtime-lib.js');
function run(options) {
  var artifact = R.artifact(options),
    passed = 0,
    skipped = 0;
  function test(name, fn) {
    if (options.filter && name.indexOf(options.filter) < 0) return;
    var t = new R.Runtime(options, artifact);
    try {
      fn(t);
      passed++;
      print('PASS ' + name);
    } finally {
      t.close();
    }
  }
  function response(t, n, value) {
    C.equal(t.fixture.responses[n], ['response', value]);
  }
  function bytes(n) {
    var a = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, n);
    for (var i = 0; i < n; i++) a[i] = i % 256 > 127 ? (i % 256) - 256 : i % 256;
    return a;
  }
  try {
    test('script warm state context and output reset', function (t) {
      C.write(
        t.function + '/main.js',
        'global.count = isDef(global.count) ? global.count + 1 : 1; if (__pmIn.fail) throw new Error("deliberate"); if (__pmIn.fresh) __pmOut.seen = isUnDef(__pmOut.previous); else __pmOut.previous = true; __pmOut.count=global.count; __pmOut.id=__lambdaContext.awsRequestId; __pmOut.remaining=__lambdaContext.getRemainingTimeInMillis(); __pmOut.trace=getEnv("_X_AMZN_TRACE_ID");'
      );
      t.start([{}, { fail: true }, { fresh: true }]);
      t.wait(3);
      var r = t.fixture.responses;
      C.equal(r[0][1].count, 1);
      C.equal(r[1][0], 'error');
      C.assert(r[1][1].errorMessage.indexOf('deliberate') >= 0);
      C.equal(r[2][0], 'response');
      C.equal(r[2][1].count, 3);
      C.assert(r[2][1].seen);
      C.equal(r[2][1].id, 'request-2');
      C.equal(r[2][1].trace, 'Root=trace-2');
      C.assert(r[2][1].remaining > 0);
    });
    test('local ZIP nested entrypoint and binary resource', function (t) {
      var data = C.bundle({
        'nested/main.js':
          '__pmOut={value:io.readFileString("data.txt"),length:io.readFileBytes("binary.dat").length};',
        'nested/data.txt': 'relative works',
        'nested/binary.dat': bytes(256)
      });
      C.write(t.function + '/payload.zip', data);
      t.start([{}], null, 200, 202, {
        OJOB_METHOD: 'LOCAL',
        OJOB_CONFIG: 'payload.zip',
        OJOB_ENTRYPOINT: 'nested/main.js',
        OJOB_SHA256: C.digest(data)
      });
      t.wait();
      response(t, 0, { value: 'relative works', length: 256 });
    });
    test('HTTP ZIP download once auth and integrity', function (t) {
      var data = C.bundle({
        'main.js': '__pmOut={bytes:io.readFileBytes("binary.dat").length};',
        'binary.dat': bytes(76800)
      });
      t.start([{}, {}], data, 200, 202, {
        OJOB_METHOD: 'http',
        OJOB_CONFIG: '{URL}/package.zip?version=1',
        login: 'user',
        pass: 'password',
        OJOB_HASH: C.digest(data, 'SHA-1'),
        OJOB_SHA256: C.digest(data)
      });
      t.wait(2);
      C.equal(t.fixture.downloads.length, 1);
      C.equal(t.fixture.downloads[0][1], 'Basic dXNlcjpwYXNzd29yZA==');
      response(t, 0, { bytes: 76800 });
      response(t, 1, { bytes: 76800 });
    });
    test('HTTP standalone script', function (t) {
      t.start([{ name: 'test' }], C.bytes('__pmOut={hello:__pmIn.name};'), 200, 202, {
        OJOB_METHOD: 'http',
        OJOB_CONFIG: '{URL}/hello.js'
      });
      t.wait();
      response(t, 0, { hello: 'test' });
    });
    test('local file preserves siblings and load', function (t) {
      C.write(
        t.function + '/main.js',
        'load("helper.js"); __pmOut={value:helper+io.readFileString("resource")};'
      );
      C.write(t.function + '/helper.js', 'global.helper="loaded ";');
      C.write(t.function + '/resource', 'resource');
      t.start([{}], null, 200, 202, { OJOB_METHOD: 'local', OJOB_CONFIG: 'main.js' });
      t.wait();
      response(t, 0, { value: 'loaded resource' });
    });
    test('YAML oJob failure then success', function (t) {
      C.write(
        t.function + '/main.yaml',
        'ojob:\n  sequential: true\n  logToConsole: false\ntodo:\n- Cleanup\n- Run\njobs:\n- name: Cleanup\n  type: shutdown\n  exec: |\n    __pmOut.cleanup = true;\n- name: Run\n  exec: |\n    if (args.fail) throw "ojob deliberate failure";\n    __pmOut = {name: args.name, id: __lambdaContext.awsRequestId};\n'
      );
      t.start([{ fail: true }, { name: 'second' }, { name: 'third' }], null, 200, 202, {
        _HANDLER: 'main.yaml'
      });
      t.wait(3);
      C.equal(t.fixture.responses[0][0], 'error');
      response(t, 1, { name: 'second', id: 'request-1', cleanup: true });
      response(t, 2, { name: 'third', id: 'request-2', cleanup: true });
    });
    test('JSON oJob', function (t) {
      C.json(t.function + '/main.json', {
        ojob: { sequential: true, logToConsole: false },
        todo: ['Run'],
        jobs: [{ name: 'Run', exec: '__pmOut={value:args.value};' }]
      });
      t.start([{ value: 42 }], null, 200, 202, { _HANDLER: 'main.json' });
      t.wait();
      response(t, 0, { value: 42 });
    });
    test('S3 presigning and binary transport', function (t) {
      var path = t.root + '/runtime/lambda.js',
        code = C.read(path);
      if (!options.zip) {
        C.mkdir(t.root + '/runtime/aws');
        ['aws_core.js', 'aws_s3.js'].forEach(function (n) {
          C.copy(C.source() + '/../AWS/' + n, t.root + '/runtime/aws/' + n);
        });
        code = code.replace(
          'loadLib("aws_s3.js");',
          'load(root + "/runtime/aws/aws_core.js"); load(root + "/runtime/aws/aws_s3.js");'
        );
      }
      code = code.replace(
        'download(aws.S3_GetPresignedURL(region, bucket, key, 300), source);',
        'var signed=aws.S3_GetPresignedURL(region,bucket,key,300); download(env("OAF_TEST_DOWNLOAD","")+"?"+signed.split("?")[1],source);'
      );
      C.write(path, code);
      t.start(
        [{}],
        C.bundle({
          'main.js': '__pmOut={length:io.readFileBytes("binary.dat").length};',
          'binary.dat': bytes(256)
        }),
        200,
        202,
        {
          OJOB_METHOD: 's3',
          OJOB_CONFIG: 's3://fixture-bucket/jobs/space name.zip',
          AWS_REGION: 'eu-west-1',
          AWS_ACCESS_KEY_ID: 'DUMMYACCESS',
          AWS_SECRET_ACCESS_KEY: 'dummy-secret',
          AWS_SESSION_TOKEN: 'dummy-session',
          OAF_TEST_DOWNLOAD: '{URL}/s3.zip'
        }
      );
      t.wait();
      response(t, 0, { length: 256 });
      var q = {};
      t.fixture.downloads[0][0]
        .split('?')[1]
        .split('&')
        .forEach(function (p) {
          var s = p.split('=');
          q[decodeURIComponent(s[0])] = decodeURIComponent(s[1]);
        });
      C.equal(q['X-Amz-Security-Token'], 'dummy-session');
      C.assert(
        q['X-Amz-Credential'].indexOf('DUMMYACCESS/') >= 0 &&
          q['X-Amz-Credential'].indexOf('/eu-west-1/s3/aws4_request') >= 0
      );
      C.equal(q['X-Amz-Signature'].length, 64);
    });
    if (options.zip)
      test('packaged opack discovery', function (t) {
        C.write(
          t.function + '/main.js',
          'loadLib("aws_s3.js"); __pmOut={aws:isFunction(AWS.prototype.S3_GetPresignedURL),common:isDef(getOPackPath("oJob-common"))};'
        );
        t.start([{}]);
        t.wait();
        response(t, 0, { aws: true, common: true });
      });
    else {
      skipped++;
      print('SKIP packaged opack discovery (requires ZIP)');
    }
    [
      [{ '../escape': 'bad', 'main.js': '' }, {}, 'escapes'],
      [{ '/absolute': 'bad', 'main.js': '' }, {}, 'Invalid workload path'],
      [{ 'other.js': '' }, {}, 'entrypoint'],
      [{ 'main.js': '' }, { OJOB_SHA256: new Array(65).join('0') }, 'mismatch'],
      [{ 'main.js': new Array(3001).join('x') }, { OJOB_MAX_BYTES: '2000' }, 'OJOB_MAX_BYTES']
    ].forEach(function (c) {
      test('initialization error ' + c[2], function (t) {
        t.start(
          [],
          C.bundle(c[0]),
          200,
          202,
          Object.assign({ OJOB_METHOD: 'http', OJOB_CONFIG: '{URL}/bad.zip' }, c[1])
        );
        t.wait(1, true);
        C.assert(
          t.fixture.posts[0][1].errorMessage.indexOf(c[2]) >= 0,
          JSON.stringify(t.fixture.posts)
        );
        C.equal(t.fixture.responses, []);
      });
    });
    test('download HTTP error redacts URL', function (t) {
      t.start([], C.bytes('denied'), 403, 202, {
        OJOB_METHOD: 'http',
        OJOB_CONFIG: '{URL}/bad.zip?secret=do-not-log'
      });
      t.wait(1, true);
      C.assert(t.fixture.posts[0][1].errorMessage.indexOf('403') >= 0);
      C.assert(C.read(t.logs).indexOf('do-not-log') < 0);
    });
    [
      [C.bytes('not a zip'), 'zip'],
      [C.bundle({ 'a/../main.js': '', 'main.js': '' }), 'duplicate']
    ].forEach(function (c) {
      test('malformed archive ' + c[1], function (t) {
        t.start([], c[0], 200, 202, { OJOB_METHOD: 'http', OJOB_CONFIG: '{URL}/bad.zip' });
        t.wait(1, true);
        C.assert(
          t.fixture.posts[0][1].errorMessage.toLowerCase().indexOf(c[1]) >= 0,
          JSON.stringify(t.fixture.posts)
        );
        C.equal(t.fixture.responses, []);
      });
    });
    test('response delivery failure does not reexecute', function (t) {
      C.write(t.function + '/main.js', '__pmOut={ok:true};');
      t.start([{}, {}], null, 200, 500);
      t.wait(1, false, true);
      C.equal(t.fixture.responses.length, 1);
      C.equal(t.fixture.posts.length, 1);
    });
  } finally {
    if (artifact) C.remove(artifact);
  }
  print(passed + ' passed, ' + skipped + ' skipped');
}
if (typeof exports !== 'undefined') Object.assign(exports, { run: run });
if (!global.lambdaImport) {
  try {
    run(
      C.args({
        openaf: String(C.path(getOpenAFJar()).getParent()),
        java: String(java.lang.System.getProperty('java.home')) + '/bin/java',
        arch: 'arm64'
      })
    );
  } catch (e) {
    printErr(String(e));
    exit(1);
  }
}
