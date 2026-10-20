var C = require((global.lambdaSource || getOPackPath('OpenAFLambda') || '.') + '/scripts/lib.js');
function Fixture(events, payload, status, responseStatus, container) {
  var f = this;
  f.events = (events || []).slice();
  f.payload = payload || C.bytes('');
  f.responses = [];
  f.downloads = [];
  f.posts = [];
  f.sentAt = [];
  f.receivedAt = [];
  f.done = new java.util.concurrent.atomic.AtomicBoolean(false);
  f.server = com.sun.net.httpserver.HttpServer.create(
    new java.net.InetSocketAddress('0.0.0.0', 0),
    0
  );
  f.executor = java.util.concurrent.Executors.newCachedThreadPool();
  f.server.setExecutor(f.executor);
  f.server.createContext(
    '/',
    new com.sun.net.httpserver.HttpHandler({
      handle: function (x) {
        try {
          var path = String(x.getRequestURI()),
            body = C.bytes(''),
            code = 200;
          if (String(x.getRequestMethod()) === 'POST') {
            var input = x.getRequestBody();
            var value;
            try {
              value = JSON.parse(String(new java.lang.String(input.readAllBytes(), 'UTF-8')));
            } finally {
              input.close();
            }
            f.posts.push([path, value]);
            if (path.indexOf('/invocation/') >= 0) {
              f.receivedAt.push(java.lang.System.nanoTime() / 1e9);
              f.responses.push([path.substring(path.lastIndexOf('/') + 1), value]);
            }
            code = responseStatus || 202;
          } else if (/\/invocation\/next$/.test(path)) {
            if (!f.events.length) {
              while (!f.done.get()) C.sleep(50);
              code = 503;
            } else {
              var index = f.responses.length;
              body = C.bytes(JSON.stringify(f.events.shift()));
              f.sentAt.push(java.lang.System.nanoTime() / 1e9);
              var h = x.getResponseHeaders();
              h.set('Lambda-Runtime-Aws-Request-Id', 'request-' + index);
              h.set('Lambda-Runtime-Invoked-Function-Arn', 'arn:aws:lambda:test:function:fixture');
              h.set('Lambda-Runtime-Deadline-Ms', String(Date.now() + 60000));
              h.set('Lambda-Runtime-Trace-Id', 'Root=trace-' + index);
            }
          } else {
            f.downloads.push([path, String(x.getRequestHeaders().getFirst('Authorization'))]);
            code = status || 200;
            body = f.payload;
          }
          x.sendResponseHeaders(code, body.length ? body.length : -1);
          if (body.length) x.getResponseBody().write(body);
        } catch (e) {
          if (!f.done.get()) printErr(String(e));
        } finally {
          x.close();
        }
      }
    })
  );
  f.server.start();
  f.address =
    (container ? 'host.docker.internal' : '127.0.0.1') + ':' + f.server.getAddress().getPort();
  f.url = 'http://' + f.address;
}
Fixture.prototype.close = function () {
  this.done.set(true);
  this.server.stop(0);
  this.executor.shutdownNow();
};
function Runtime(options, artifact) {
  C.assert(['arm64', 'x86_64'].indexOf(options.arch) >= 0, 'Invalid architecture');
  this.options = options;
  this.artifact = artifact;
  this.directory = C.temp('lambda-test-');
  this.root = this.directory + '/task';
  C.mkdir(this.root);
  C.copy((artifact || C.source()) + '/runtime', this.root + '/runtime');
  C.copy((artifact || C.source()) + '/runtime/bootstrap', this.root + '/bootstrap');
  if (options.zip) {
    C.mkdir(this.root + '/jre');
    C.mkdir(this.root + '/openaf');
  } else {
    java.nio.file.Files.createSymbolicLink(C.path(this.root + '/openaf'), C.path(options.openaf));
    C.mkdir(this.root + '/jre/bin');
    java.nio.file.Files.createSymbolicLink(
      C.path(this.root + '/jre/bin/java'),
      C.path(options.java)
    );
  }
  this.function = C.mkdir(this.root + '/function');
  this.logs = this.directory + '/logs';
  this.containerName = 'openaf-lambda-test-' + genUUID();
}
Runtime.prototype.start = function (events, payload, status, responseStatus, settings) {
  this.fixture = new Fixture(events, payload, status, responseStatus, !!this.options.zip);
  var env = Object.assign(
      { AWS_LAMBDA_RUNTIME_API: this.fixture.address, OJOB_JSONLOG: 'true', _HANDLER: 'main.js' },
      settings || {}
    ),
    self = this;
  Object.keys(env).forEach(function (k) {
    env[k] = String(env[k]).replace(/\{URL\}/g, self.fixture.url);
  });
  var command;
  if (this.options.zip) {
    command = [
      'docker',
      'run',
      '--rm',
      '--name',
      this.containerName,
      '--platform',
      'linux/' + (this.options.arch === 'x86_64' ? 'amd64' : 'arm64'),
      '--read-only',
      '--memory',
      '512m',
      '--cpus',
      '1',
      '--user',
      '1000:1000',
      '--tmpfs',
      '/tmp:rw,exec,size=512m,mode=1777',
      '--entrypoint',
      '/bin/sh',
      '-v',
      this.root + ':/var/task:ro'
    ];
    ['jre', 'openaf'].forEach(function (n) {
      command.push('-v', self.artifact + '/' + n + ':/var/task/' + n + ':ro');
    });
    Object.keys(env).forEach(function (k) {
      command.push('-e', k + '=' + env[k]);
    });
    command.push('public.ecr.aws/lambda/provided:al2023', '/var/task/bootstrap');
  } else {
    Object.assign(env, {
      OAF_LAMBDA_ROOT: this.root,
      OAF_HOME: this.directory + '/home',
      TMPDIR: this.directory
    });
    command = ['/bin/sh', this.root + '/bootstrap'];
  }
  this.process = C.start(command, { env: env, cleanEnv: true, log: this.logs });
};
Runtime.prototype.wait = function (count, initError, exited) {
  var until = Date.now() + (this.options.zip ? 120000 : 35000);
  count = count || 1;
  while (Date.now() < until) {
    var complete = initError
      ? this.fixture.posts.some(function (p) {
          return /\/init\/error$/.test(p[0]);
        })
      : this.fixture.responses.length >= count;
    if (exited) complete = !this.process.isAlive();
    if (complete) return;
    C.assert(this.process.isAlive(), 'Runtime exited unexpectedly:\n' + C.read(this.logs));
    C.sleep(50);
  }
  throw new Error('Runtime timed out:\n' + C.read(this.logs));
};
Runtime.prototype.close = function () {
  if (this.process) {
    if (this.options.zip)
      C.run(['docker', 'rm', '-f', this.containerName], { capture: true, allowFailure: true });
    this.process.destroy();
    if (!this.process.waitFor(10, java.util.concurrent.TimeUnit.SECONDS)) {
      this.process.destroyForcibly();
      this.process.waitFor();
    }
  }
  if (this.fixture) this.fixture.close();
  // Docker Desktop can release bind mounts shortly after docker rm returns.
  for (var attempt = 0; ; attempt++) {
    try {
      C.remove(this.directory);
      break;
    } catch (e) {
      if (attempt >= 40 || String(e).indexOf('AccessDeniedException') < 0) throw e;
      C.sleep(100);
    }
  }
};
function artifact(options) {
  if (!options.zip) return null;
  var p = C.temp('lambda-artifact-');
  try {
    C.extract(options.zip, p);
    return p;
  } catch (e) {
    C.remove(p);
    throw e;
  }
}
if (typeof exports !== 'undefined')
  Object.assign(exports, { Runtime: Runtime, Fixture: Fixture, artifact: artifact });
