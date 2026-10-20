var C = require((global.lambdaSource || getOPackPath('OpenAFLambda') || '.') + '/scripts/lib.js');
var R = require(C.source() + '/tests/runtime-lib.js');
function benchmark(a) {
  C.assert(a.zip && a.output, 'zip and output are required');
  C.assert(
    /^\d+$/.test(String(a.runs)) &&
      /^\d+$/.test(String(a.warmEvents)) &&
      Number(a.runs) >= 2 &&
      Number(a.warmEvents) >= 1,
    'Use at least two runs and one warm event'
  );
  C.assert(['js', 'ojob'].indexOf(a.kind) >= 0, 'Invalid kind');
  var artifact = R.artifact(a),
    rows = [],
    diagnostic = '';
  try {
    for (var index = 0; index < Number(a.runs); index++)
      (index % 2 ? ['off', 'auto'] : ['auto', 'off']).forEach(function (mode) {
        var t = new R.Runtime(a, artifact);
        try {
          var code =
            '__pmOut={uptimeMs:Number(java.lang.management.ManagementFactory.getRuntimeMXBean().getUptime()),prepareJvmUptimeMs:io.readFileJSON(getEnv("OAF_LAMBDA_STATE")+"/runtime.json").prepareJvmUptimeMs};';
          var handler = a.kind === 'js' ? 'main.js' : 'main.json';
          if (a.kind === 'js') C.write(t.function + '/' + handler, code);
          else
            C.json(t.function + '/' + handler, {
              ojob: { sequential: true, logToConsole: false },
              todo: ['Run'],
              jobs: [{ name: 'Run', exec: code }]
            });
          var start = java.lang.System.nanoTime() / 1e9,
            events = [];
          for (var n = 0; n <= Number(a.warmEvents); n++) events.push({});
          t.start(events, null, 200, 202, { OAF_JAVA_XSHARE: mode, _HANDLER: handler });
          t.wait(events.length);
          C.assert(
            t.fixture.responses.every(function (r) {
              return r[0] === 'response';
            }),
            JSON.stringify(t.fixture.responses) + C.read(t.logs)
          );
          var first = t.fixture.responses[0][1];
          C.assert(
            isDef(first.prepareJvmUptimeMs),
            'Rebuild the ZIP with benchmark timing support'
          );
          var row = {
            mode: mode,
            run: index,
            coldWallMs: (t.fixture.receivedAt[0] - start) * 1000,
            coldJvmMs: first.uptimeMs + first.prepareJvmUptimeMs,
            prepareJvmMs: first.prepareJvmUptimeMs,
            invokeJvmMs: first.uptimeMs,
            warmMs: t.fixture.receivedAt.slice(1).map(function (r, i) {
              return (r - t.fixture.sentAt[i + 1]) * 1000;
            })
          };
          rows.push(row);
          print(JSON.stringify(row));
        } finally {
          t.close();
        }
      });
    var t = new R.Runtime(a, artifact);
    try {
      C.write(t.function + '/main.js', '__pmOut={ok:true};');
      t.start([{}], null, 200, 202, {
        OAF_JAVA_XSHARE: 'auto',
        JAVA_TOOL_OPTIONS: '-Xlog:cds=info'
      });
      t.wait();
      diagnostic = C.read(t.logs);
      C.assert(
        diagnostic.indexOf('.shared.oaf') >= 0 &&
          (diagnostic.match(/Mapped static\s+region #0/g) || []).length >= 2,
        'CDS mapping was not confirmed:\n' + diagnostic
      );
    } finally {
      t.close();
    }
  } finally {
    C.remove(artifact);
  }
  var z = C.zipOpen(a.zip),
    manifest,
    archiveBytes = 0;
  try {
    manifest = JSON.parse(C.zipText(z, 'build-manifest.json'));
    C.zipEntries(z).forEach(function (e) {
      if (/\.shared\.oaf$/.test(String(e.getName()))) archiveBytes += Number(e.getSize());
    });
  } finally {
    z.close();
  }
  var summary = {};
  ['auto', 'off'].forEach(function (mode) {
    var selected = rows.filter(function (r) {
        return r.mode === mode;
      }),
      warm = [];
    selected.forEach(function (r) {
      warm = warm.concat(r.warmMs);
    });
    function median(key) {
      return (
        Math.round(
          C.median(
            selected.map(function (r) {
              return r[key];
            })
          ) * 100
        ) / 100
      );
    }
    summary[mode] = {
      coldWallMedianMs: median('coldWallMs'),
      coldJvmMedianMs: median('coldJvmMs'),
      warmMedianMs: Math.round(C.median(warm) * 100) / 100
    };
  });
  C.json(a.output, {
    artifact: a.zip,
    architecture: a.arch,
    workload: a.kind,
    build: manifest,
    environment:
      'Docker Desktop AL2023, 512 MiB, 1 CPU; new processes, warm host filesystem; not live AWS Lambda',
    openafArchiveBytes: archiveBytes,
    summary: summary,
    samples: rows,
    cdsMappingVerified: true
  });
  C.write(a.output.replace(/\.[^.\/]+$/, '') + '.cds.log', diagnostic);
  print(JSON.stringify(summary, null, 2));
}
if (typeof exports !== 'undefined') exports.benchmark = benchmark;
if (!global.lambdaImport) {
  try {
    benchmark(C.args({ arch: 'arm64', runs: 7, warmEvents: 20, kind: 'ojob' }));
  } catch (e) {
    printErr(String(e));
    exit(1);
  }
}
