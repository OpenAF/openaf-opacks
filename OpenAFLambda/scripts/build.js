// oaf -f scripts/build.js -e 'arch=arm64 workload=examples/script'
var C = require((global.lambdaSource || getOPackPath('OpenAFLambda') || '.') + '/scripts/lib.js');
function build(a, utilities) {
  var C =
    utilities ||
    require((global.lambdaSource || getOPackPath('OpenAFLambda') || '.') + '/scripts/lib.js');
  var source = C.source();
  a = Object.assign(
    {
      arch: 'both',
      target: 'function',
      java: '25',
      jreProvider: 'temurin',
      dist: 'stable',
      cds: 'auto',
      opacks: 'AWS,oJob-common',
      output: 'output',
      localOpacks: []
    },
    a
  );
  C.assert(['function', 'microvm'].indexOf(a.target) >= 0, 'Invalid target');
  C.assert(['both', 'x86_64', 'arm64'].indexOf(a.arch) >= 0, 'Invalid architecture');
  if (a.target === 'microvm') {
    C.assert(a.arch !== 'x86_64', 'Lambda MicroVM images currently support arm64 only');
    a.arch = 'arm64';
  }
  C.assert(
    /^\d+$/.test(String(a.java)) && Number(a.java) >= 25 && /^[A-Za-z0-9_-]+$/.test(a.dist),
    'Invalid Java version or distribution'
  );
  C.assert(
    ['temurin', 'corretto'].indexOf(a.jreProvider) >= 0 && ['auto', 'off'].indexOf(a.cds) >= 0,
    'Invalid JRE provider or CDS mode'
  );
  C.assert(
    !a.opacks || /^[A-Za-z0-9_.-]+(?:,[A-Za-z0-9_.-]+)*$/.test(a.opacks),
    'Invalid opack list'
  );
  var out = C.mkdir(a.output),
    temp = C.temp('openaf-lambda-build-');
  try {
    C.copy(source + '/Dockerfile', temp + '/Dockerfile');
    C.copy(source + '/scripts', temp + '/scripts');
    C.copy(source + '/runtime', temp + '/runtime');
    C.mkdir(temp + '/inputs/opacks');
    if (a.jar) C.copy(a.jar, temp + '/inputs/openaf.jar');
    var names = {},
      local = typeof a.localOpacks === 'string' ? JSON.parse(a.localOpacks) : a.localOpacks;
    local.forEach(function (p) {
      var name = String(C.path(p).getFileName());
      C.assert(
        /^[A-Za-z0-9_.-]+$/.test(name) && !names[name],
        'Local opack basenames must be unique and safe'
      );
      names[name] = true;
      C.copy(p, temp + '/inputs/opacks/' + name, false, ['.git', '__pycache__']);
    });
    C.copy(a.workload || source + '/examples/ojob', temp + '/inputs/function', true);
    (a.arch === 'both' ? ['x86_64', 'arm64'] : [a.arch]).forEach(function (arch) {
      C.run([
        'docker',
        'buildx',
        'build',
        '--platform',
        'linux/' + (arch === 'x86_64' ? 'amd64' : 'arm64'),
        '--target',
        'artifacts',
        '--output',
        'type=local,dest=' + out,
        '--build-arg',
        'JAVA_VERSION=' + a.java,
        '--build-arg',
        'JRE_PROVIDER=' + a.jreProvider,
        '--build-arg',
        'OPENAF_DIST=' + a.dist,
        '--build-arg',
        'OPACKS=' + a.opacks,
        '--build-arg',
        'CDS_MODE=' + a.cds,
        temp
      ]);
    });
  } finally {
    C.remove(temp);
  }
  if (a.target === 'microvm')
    require(source + '/scripts/microvm.js').package(out + '/openaf-lambda-arm64.zip', out);
  print('Lambda artifacts: ' + out);
}
if (typeof exports !== 'undefined') Object.assign(exports, { build: build });
if (!global.lambdaImport) {
  try {
    build(C.args({}));
  } catch (e) {
    printErr(String(e));
    exit(1);
  }
}
