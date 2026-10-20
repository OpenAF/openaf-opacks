var C = require((global.lambdaSource || getOPackPath('OpenAFLambda') || '.') + '/scripts/lib.js');
global.lambdaImport = true;
var P = require(C.source() + '/scripts/microvm.js'),
  Live = require(C.source() + '/tests/live_microvm.js');
function run() {
  var passed = 0;
  function test(name, fn) {
    var tmp = C.temp('microvm-regression-');
    try {
      fn(tmp);
      passed++;
      print('PASS ' + name);
    } finally {
      C.remove(tmp);
    }
  }
  function rejects(fn, pattern) {
    var error;
    try {
      fn();
    } catch (e) {
      error = e;
    }
    C.assert(
      error && pattern.test(String(error)),
      'Expected rejection ' + pattern + ', got ' + error
    );
  }
  test('package preserves executable and overlays current runtime', function (tmp) {
    ['arm64', 'x86_64'].forEach(function (arch) {
      C.zipWriter(tmp + '/runtime.zip', function (add) {
        add('build-manifest.json', JSON.stringify({ architecture: arch }));
        ['bootstrap', 'runtime/lambda.js', 'jre/bin/java', 'openaf/openaf.jar'].forEach(
          function (n) {
            add(n, 'fixture', 33261);
          }
        );
      });
      if (arch === 'arm64') {
        var target = P.package(tmp + '/runtime.zip', tmp + '/out'),
          z = C.zipOpen(target);
        try {
          C.assert(z.getEntry('Dockerfile'));
          C.assert(!z.getEntry('payload/microvm/server.py'));
          C.assert(C.zipText(z, 'Dockerfile').toLowerCase().indexOf('python') < 0);
          C.assert(C.zipText(z, 'payload/runtime/lambda.js').indexOf('runMicrovm') >= 0);
          C.assert(C.zipText(z, 'payload/bootstrap').indexOf('OAF_LAMBDA_TRANSPORT') >= 0);
          C.equal(Number(z.getEntry('payload/jre/bin/java').getUnixMode()) & 511, 493);
        } finally {
          z.close();
        }
      } else
        rejects(function () {
          P.package(tmp + '/runtime.zip', tmp + '/out');
        }, /arm64/);
    });
  });
  ['../escape', '/absolute', 'C:/escape'].forEach(function (name) {
    test('archive path rejected ' + name, function (tmp) {
      C.zipWriter(tmp + '/runtime.zip', function (add) {
        add('build-manifest.json', '{"architecture":"arm64"}');
        add(name, 'unsafe');
      });
      rejects(function () {
        P.package(tmp + '/runtime.zip', tmp + '/out');
      }, /Unsafe/);
    });
  });
  test('duplicate ZIP entries rejected', function (tmp) {
    C.zipWriter(tmp + '/runtime.zip', function (add) {
      add('build-manifest.json', '{"architecture":"arm64"}');
      add('bootstrap', 'one');
      add('bootstrap', 'two');
    });
    rejects(function () {
      P.package(tmp + '/runtime.zip', tmp + '/out');
    }, /duplicate/);
  });
  test('symlink ZIP entries rejected', function (tmp) {
    C.zipWriter(tmp + '/runtime.zip', function (add) {
      add('build-manifest.json', '{"architecture":"arm64"}');
      add('bootstrap', 'target', 41471);
    });
    rejects(function () {
      P.package(tmp + '/runtime.zip', tmp + '/out');
    }, /symlink/);
  });
  test('termination wait accepts transitional state', function (tmp) {
    var r = new Live.Run({ region: 'eu-west-1' }, tmp),
      states = ['TERMINATING', 'TERMINATED'];
    r.aws = function () {
      return { state: states.shift() };
    };
    r.sleep = function () {};
    C.equal(
      r.wait('get-microvm', 'microvm_identifier', 'fixture', ['TERMINATED']).state,
      'TERMINATED'
    );
  });
  test('legacy image names resolve and object versions deleted', function (tmp) {
    var r = new Live.Run(
        { profile: 'fixture', region: 'eu-west-1', bucket: 'fixture', prefix: 'tests' },
        tmp
      ),
      calls = [],
      listings = 0;
    Object.assign(r.journal, {
      images: ['fixture-image'],
      objects: ['tests/image.zip'],
      account: 'ACCOUNT'
    });
    r.aws = function (s, o, p) {
      calls.push([o, p]);
      if (o === 'get-microvm-image') return { state: 'DELETED' };
      if (o === 'list-object-versions') {
        listings++;
        return listings === 1
          ? { Versions: [{ Key: 'tests/image.zip', VersionId: 'version' }] }
          : {};
      }
      return {};
    };
    r.cleanup();
    C.equal(
      calls.filter(function (c) {
        return c[0] === 'delete-microvm-image';
      })[0][1].image_identifier,
      'arn:aws:lambda:eu-west-1:ACCOUNT:microvm-image:fixture-image'
    );
    C.assert(
      calls.some(function (c) {
        return c[0] === 'delete-object' && c[1].version_id === 'version';
      })
    );
    C.assert(r.journal.cleanupPassed);
  });
  test('cleanup failure remains journaled and fails', function (tmp) {
    var r = new Live.Run({ region: 'eu-west-1' }, tmp);
    r.journal.logs = ['fixture'];
    r.aws = function () {
      throw new Error('AccessDenied');
    };
    rejects(function () {
      r.cleanup();
    }, /Cleanup needs attention/);
    C.assert(!C.json(tmp + '/journal.json').cleanupPassed);
  });
  print(passed + ' passed');
}
if (typeof exports !== 'undefined') exports.run = run;
try {
  run();
} catch (e) {
  printErr(String(e));
  exit(1);
}
