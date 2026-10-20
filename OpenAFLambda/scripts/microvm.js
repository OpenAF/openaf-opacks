var C = require((global.lambdaSource || getOPackPath('OpenAFLambda') || '.') + '/scripts/lib.js');
function packageRuntime(runtimeZip, output) {
  var z = C.zipOpen(runtimeZip),
    target = C.mkdir(output) + '/openaf-microvm-arm64.zip',
    manifest;
  try {
    var entries = C.safeEntries(z);
    manifest = JSON.parse(C.zipText(z, 'build-manifest.json'));
    C.assert(
      manifest.architecture === 'arm64',
      'Lambda MicroVM images currently require an arm64 runtime ZIP'
    );
    ['bootstrap', 'runtime/lambda.js', 'jre/bin/java', 'openaf/openaf.jar'].forEach(function (n) {
      C.assert(z.getEntry(n), 'Incomplete OpenAF runtime ZIP');
    });
    var replacements = {
      'runtime/lambda.js': C.bytes(C.read(C.source() + '/runtime/lambda.js')),
      'runtime/bootstrap': C.bytes(C.read(C.source() + '/runtime/bootstrap')),
      bootstrap: C.bytes(C.read(C.source() + '/runtime/bootstrap'))
    };
    var hash = java.security.MessageDigest.getInstance('SHA-256');
    entries
      .slice()
      .sort(function (a, b) {
        return String(a.getName()).localeCompare(String(b.getName()));
      })
      .forEach(function (e) {
        var n = String(e.getName());
        if (n.indexOf('runtime/') === 0 && !e.isDirectory()) {
          hash.update(C.bytes(n.substring(8)));
          hash.update(C.bytes('\0'));
          hash.update(
            java.security.MessageDigest.getInstance('SHA-256').digest(
              replacements[n] || C.zipRead(z, e)
            )
          );
        }
      });
    manifest.runtimeSha256 = String(
      Packages.org.apache.commons.codec.binary.Hex.encodeHexString(hash.digest())
    );
    replacements['build-manifest.json'] = C.bytes(JSON.stringify(manifest, null, 2) + '\n');
    C.zipWriter(target, function (add) {
      entries.forEach(function (e) {
        var n = String(e.getName());
        add('payload/' + n, replacements[n] || C.zipRead(z, e), Number(e.getUnixMode()));
      });
      add('Dockerfile', C.read(C.source() + '/microvm/Dockerfile'));
    });
  } finally {
    z.close();
  }
  C.json(target.replace(/\.zip$/, '.manifest.json'), {
    target: 'lambda-microvm-image-source',
    architecture: 'ARM_64',
    runtimeZipSha256: C.hash(runtimeZip),
    sha256: C.hash(target),
    bytes: Number(java.nio.file.Files.size(C.path(target))),
    runtime: manifest,
    ports: { application: 8080, hooks: 8081 }
  });
  print('MicroVM image source: ' + target);
  return target;
}
if (typeof exports !== 'undefined') Object.assign(exports, { package: packageRuntime });
if (!global.lambdaImport) {
  try {
    var a = C.args({ output: 'output' });
    C.assert(a.runtimeZip, 'runtimeZip is required');
    packageRuntime(a.runtimeZip, a.output);
  } catch (e) {
    printErr(String(e));
    exit(1);
  }
}
