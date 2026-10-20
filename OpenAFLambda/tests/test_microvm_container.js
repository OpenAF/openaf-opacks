var C = require((global.lambdaSource || getOPackPath('OpenAFLambda') || '.') + '/scripts/lib.js');
function docker(args) {
  return C.run(['docker'].concat(args), { capture: true }).stdout.trim();
}
function request(port, path, event) {
  return C.http('http://127.0.0.1:' + port + path, event);
}
function exercise(image, mode, script) {
  var options = [
    'run',
    '--detach',
    '--rm',
    '--platform',
    'linux/arm64',
    '--memory',
    '1g',
    '--cpus',
    '1',
    '-p',
    '127.0.0.1::8080',
    '-p',
    '127.0.0.1::8081',
    '-e',
    'OAF_JAVA_XSHARE=' + mode
  ];
  if (script)
    options = options.concat([
      '--mount',
      'type=bind,source=' + script + ',target=/var/task/function,readonly',
      '-e',
      'OJOB_ENTRYPOINT=main.js',
      '-e',
      'OAF_MICROVM_TIMEOUT=2'
    ]);
  var id = docker(options.concat([image]));
  try {
    var port = Number(docker(['port', id, '8080/tcp']).split(':').pop()),
      hooks = Number(docker(['port', id, '8081/tcp']).split(':').pop()),
      until = Date.now() + 120000,
      ready = false;
    while (Date.now() < until) {
      try {
        if (request(hooks, '/aws/lambda-microvms/runtime/v1/ready', {})[0] === 200) {
          ready = true;
          break;
        }
      } catch (e) {}
      C.sleep(200);
    }
    C.assert(ready, 'OpenAF did not become ready');
    C.equal(request(hooks, '/aws/lambda-microvms/runtime/v1/validate', {})[0], 200);
    C.equal(request(port, '/aws/lambda-microvms/runtime/v1/run', {})[0], 404);
    C.equal(request(port, '/invoke')[0], 405);
    var ids = [];
    for (var i = 0; i < 2; i++) {
      var r = request(port, '/invoke', { name: 'MicroVM' });
      C.equal(r[0], 200);
      C.equal(r[1].message, 'Hello MicroVM');
      ids.push(r[1].requestId);
      if (script) C.equal(r[1].count, i + 1);
    }
    C.assert(ids[0] !== ids[1]);
    if (script) {
      C.equal(request(port, '/invoke', { fail: true })[0], 500);
      var r = request(port, '/invoke', { name: 'MicroVM' });
      C.equal(r[0], 200);
      C.equal(r[1].count, 4);
      var executor = java.util.concurrent.Executors.newSingleThreadExecutor();
      var future = executor.submit(
        new java.util.concurrent.Callable({
          call: function () {
            return request(port, '/invoke', { name: 'MicroVM', wait: true });
          }
        })
      );
      try {
        C.sleep(150);
        C.equal(request(port, '/invoke', { name: 'Overlap' })[0], 409);
        C.equal(future.get(5, java.util.concurrent.TimeUnit.SECONDS)[0], 200);
      } finally {
        executor.shutdownNow();
      }
      C.equal(request(port, '/invoke', { timeout: true })[0], 408);
      C.equal(request(port, '/health')[0], 503);
      C.equal(request(port, '/invoke', {})[0], 503);
    }
    print((script ? 'script' : 'oJob') + ' ' + mode + ': passed');
  } catch (e) {
    print(docker(['logs', id]));
    throw e;
  } finally {
    docker(['rm', '--force', id]);
  }
}
function run(a) {
  var temp = C.temp('openaf-microvm-test-');
  try {
    C.write(
      temp + '/main.js',
      'global.microvmCount=(global.microvmCount||0)+1; if(__pmIn.fail) throw new Error("Expected fixture failure"); if(__pmIn.timeout) java.lang.Thread.sleep(10000); if(__pmIn.wait) java.lang.Thread.sleep(1000); __pmOut={message:"Hello "+__pmIn.name,count:global.microvmCount,requestId:__lambdaContext.awsRequestId};'
    );
    ['auto', 'off'].forEach(function (mode) {
      exercise(a.image, mode);
      exercise(a.image, mode, temp);
    });
  } finally {
    C.remove(temp);
  }
}
if (typeof exports !== 'undefined') exports.run = run;
if (!global.lambdaImport) {
  try {
    run(C.args({ image: 'openaf-microvm-test:local' }));
  } catch (e) {
    printErr(String(e));
    exit(1);
  }
}
