// Build contracts without network/Docker; actual architecture builds are separate.
var C = require((global.lambdaSource || getOPackPath('OpenAFLambda') || '.') + '/scripts/lib.js');
global.lambdaImport = true;
var B = require(C.source() + '/scripts/build.js');
function build(a) {
  return B.build(a, C);
}
function run() {
  var tmp = C.temp('lambda-build-regression-'),
    originalRun = C.run,
    calls = [],
    contexts = [];
  function rejects(fn, pattern) {
    var e;
    try {
      fn();
    } catch (error) {
      e = error;
    }
    C.assert(e && pattern.test(String(e)), 'Expected ' + pattern + ', got ' + e);
  }
  try {
    C.run = function (argv) {
      calls.push(argv);
      var context = argv[argv.length - 1];
      contexts.push(context);
      C.assert(C.exists(context + '/scripts/assemble.js'));
      C.assert(!C.exists(context + '/inputs/opacks/AWS/.git'));
      C.equal(C.read(context + '/inputs/function/main.js'), 'fixture');
      C.equal(C.read(context + '/inputs/openaf.jar'), 'selected jar');
      return { code: 0 };
    };
    C.write(tmp + '/workload/main.js', 'fixture');
    C.write(tmp + '/AWS/.package.yaml', 'name: AWS\nversion: 1\n');
    C.write(tmp + '/AWS/.git/config', 'ignored');
    C.write(tmp + '/selected.jar', 'selected jar');
    build({
      arch: 'both',
      workload: tmp + '/workload',
      jar: tmp + '/selected.jar',
      localOpacks: [tmp + '/AWS'],
      output: tmp + '/output path'
    });
    C.equal(calls.length, 2);
    C.assert(calls[0].indexOf('linux/amd64') >= 0 && calls[1].indexOf('linux/arm64') >= 0);
    C.assert(calls[0].indexOf('type=local,dest=' + tmp + '/output path') >= 0);
    contexts.forEach(function (p) {
      C.assert(!C.exists(p), 'Build context leaked');
    });
    [
      { arch: 'sparc' },
      { target: 'other' },
      { java: 24 },
      { dist: 'bad/path' },
      { opacks: 'AWS;bad' },
      { jreProvider: 'other' },
      { cds: 'on' },
      { target: 'microvm', arch: 'x86_64' }
    ].forEach(function (a) {
      rejects(function () {
        build(a);
      }, /Invalid|support arm64/);
    });
    C.copy(tmp + '/AWS', tmp + '/other/AWS');
    rejects(function () {
      build({
        arch: 'arm64',
        output: tmp + '/out',
        localOpacks: [tmp + '/AWS', tmp + '/other/AWS']
      });
    }, /basenames/);
    java.nio.file.Files.createSymbolicLink(
      C.path(tmp + '/workload/link'),
      C.path(tmp + '/selected.jar')
    );
    rejects(function () {
      build({ arch: 'arm64', output: tmp + '/out', workload: tmp + '/workload' });
    }, /symlink/);
    C.remove(tmp + '/workload/link');
    C.run = function (argv) {
      contexts.push(argv[argv.length - 1]);
      throw new Error('deliberate build failure');
    };
    rejects(function () {
      build({ arch: 'arm64', workload: tmp + '/workload', output: tmp + '/out' });
    }, /deliberate/);
    contexts.forEach(function (p) {
      C.assert(!C.exists(p), 'Failed build context leaked');
    });
    print(
      'Build contracts passed (arguments, both architectures, isolated inputs, validation, symlinks, failure cleanup)'
    );
  } finally {
    C.run = originalRun;
    C.remove(tmp);
  }
}
try {
  run();
} catch (e) {
  printErr(String(e));
  exit(1);
}
