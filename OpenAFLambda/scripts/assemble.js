// Runs inside the target AL2023 builder, using the selected Java/OpenAF.
var C = require('/builder/scripts/lib.js');
var root = '/var/task',
  jar = root + '/openaf/openaf.jar',
  javaBin = root + '/jre/bin/java';
var vm = [
  '--enable-native-access=ALL-UNNAMED',
  '--add-opens=java.base/java.util=ALL-UNNAMED',
  '-XX:+UseCompactObjectHeaders'
];
function runAF(args, capture) {
  return C.run([javaBin, '-Xshare:off'].concat(vm, ['-jar', jar], args), {
    cwd: root + '/openaf',
    env: { OAF_HOME: root + '/openaf' },
    capture: !!capture
  });
}
function install() {
  var arch = String(getEnv('TARGETARCH')) === 'amd64' ? 'x86_64' : 'arm64',
    cds = String(getEnv('CDS_MODE') || 'off');
  var inputs = {
    jre: { source: C.read('/tmp/jre-source'), sha256: C.hash('/tmp/jre.tgz') },
    openaf: { source: C.read('/tmp/openaf-source'), sha256: C.hash(jar) },
    opacks: []
  };
  var local = C.children('/inputs/opacks'),
    localNames = {};
  local.forEach(function (p) {
    var metadata;
    if (C.dir(p))
      metadata = C.exists(p + '/.package.yaml')
        ? io.readFileYAML(p + '/.package.yaml')
        : C.json(p + '/.package.json');
    else {
      var z = C.zipOpen(p);
      try {
        metadata = z.getEntry('.package.yaml')
          ? af.fromYAML(C.zipText(z, '.package.yaml'))
          : JSON.parse(C.zipText(z, '.package.json'));
      } finally {
        z.close();
      }
    }
    localNames[String(metadata.name).toLowerCase()] = true;
    inputs.opacks.push({
      source: String(C.path(p).getFileName()),
      sha256: C.dir(p) ? C.treeHash(p) : C.hash(p)
    });
  });
  var packages = String(getEnv('OPACKS') || 'AWS,oJob-common')
    .split(',')
    .filter(function (p) {
      return p;
    });
  if (
    !packages.some(function (p) {
      return p.toLowerCase() === 'aws';
    })
  )
    packages.unshift('AWS');
  packages.forEach(function (p) {
    if (!localNames[p.toLowerCase()]) runAF(['--opack', '-e', 'install ' + p]);
  });
  local.forEach(function (p) {
    runAF(['--opack', '-e', 'install ' + p + ' -force']);
  });
  C.write(
    '/tmp/manifest.js',
    'loadLib("aws_s3.js"); if (!isFunction(AWS.prototype.S3_GetPresignedURL)) throw "AWS opack lacks S3 presigning support"; io.writeFileJSON("/tmp/versions.json", {openaf:getVersion(),distribution:getDistribution(),java:String(java.lang.System.getProperty("java.version")),opacks:Object.keys(getOPackLocalDB()).map(function(k) { return {name:getOPackLocalDB()[k].name,version:getOPackLocalDB()[k].version}; })});'
  );
  runAF(['-f', '/tmp/manifest.js']);
  var versions = C.json('/tmp/versions.json');
  var installed = {};
  versions.opacks.forEach(function (p) {
    installed[p.name.toLowerCase()] = true;
  });
  packages.concat(Object.keys(localNames)).forEach(function (p) {
    C.assert(installed[p.toLowerCase()], 'Opack failed to install: ' + p);
  });
  var shared = root + '/openaf/.shared.oaf';
  if (cds === 'auto') {
    runAF(['-c', "require(getOpenAFJar() + '::js/repackCDS.js').create()"]);
    C.assert(C.exists(shared), 'OpenAF did not generate .shared.oaf');
    var check = C.run(
      [javaBin].concat(vm, [
        '-Xshare:on',
        '-XX:SharedArchiveFile=' + shared,
        '-XX:+PrintSharedArchiveAndExit',
        '-jar',
        jar
      ]),
      {
        capture: true,
        allowFailure: true,
        cwd: root + '/openaf',
        env: { OAF_HOME: root + '/openaf' }
      }
    );
    C.write('/tmp/cds-validation.log', check.stdout + check.stderr);
    C.assert(
      check.code === 0 && (check.stdout + check.stderr).indexOf('archive is valid') >= 0,
      'OpenAF archive does not match Lambda JVM flags: ' + check.stdout + check.stderr
    );
  }
  C.walk(root + '/jre')
    .filter(function (f) {
      return /\.jsa$/.test(f);
    })
    .forEach(C.remove);
  C.remove(root + '/jre/man');
  C.remove(root + '/openaf/openaf.jar.orig');
  var manifest = {
    architecture: arch,
    runtime: 'provided.al2023',
    cds: cds,
    jreProvider: String(getEnv('JRE_PROVIDER')),
    builtAt: String(java.time.Instant.now()),
    inputs: inputs,
    versions: versions,
    installedJarSha256: C.hash(jar)
  };
  if (cds === 'auto')
    manifest.cdsArchive = {
      sha256: C.hash(shared),
      bytes: Number(java.nio.file.Files.size(C.path(shared))),
      validated: true
    };
  C.json(root + '/build-manifest.json', manifest);
}
function packageRuntime() {
  var manifest = C.json(root + '/build-manifest.json');
  C.copy('/builder/runtime', root + '/runtime');
  C.write(root + '/runtime/xshare', manifest.cds + '\n');
  C.copy(root + '/runtime/bootstrap', root + '/bootstrap');
  C.mode(root + '/bootstrap', 'rwxr-xr-x');
  C.copy('/inputs/function', root + '/function', true);
  manifest.runtimeSha256 = C.treeHash(root + '/runtime');
  manifest.workloadSha256 = C.treeHash(root + '/function');
  C.json(root + '/build-manifest.json', manifest);
  var target = '/output/openaf-lambda-' + manifest.architecture + '.zip',
    total = 0;
  try {
    C.zipWriter(
      target,
      function (add) {
        C.walk(root).forEach(function (f) {
          if (java.nio.file.Files.isSymbolicLink(C.path(f)))
            C.assert(
              String(C.path(f).toRealPath()).indexOf(root + '/jre/') === 0 && !C.dir(f),
              'Deployment package contains unsupported symlink: ' + f
            );
          C.assert(!C.dir(f), 'Unsupported directory symlink: ' + f);
          var size = Number(java.nio.file.Files.size(C.path(f)));
          total += size;
          C.assert(
            total <= 250 * 1024 * 1024,
            "Uncompressed deployment exceeds Lambda's 250 MiB limit: " + total
          );
          add(
            String(C.path(root).relativize(C.path(f))),
            java.nio.file.Files.readAllBytes(C.path(f)),
            java.nio.file.Files.isExecutable(C.path(f)) ? 33261 : 33188
          );
        });
      },
      9
    );
  } catch (e) {
    C.remove(target);
    throw e;
  }
  manifest.uncompressedBytes = total;
  manifest.compressedBytes = Number(java.nio.file.Files.size(C.path(target)));
  manifest.sha256 = C.hash(target);
  C.json(target.replace(/\.zip$/, '.manifest.json'), manifest);
  print(JSON.stringify(manifest, null, 2));
}
try {
  var a = C.args({ phase: 'install' });
  if (a.phase === 'package') packageRuntime();
  else {
    C.assert(a.phase === 'install', 'Invalid phase');
    install();
  }
} catch (e) {
  printErr(String(e));
  exit(1);
}
