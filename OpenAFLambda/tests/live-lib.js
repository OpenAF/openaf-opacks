var C = require((global.lambdaSource || getOPackPath('OpenAFLambda') || '.') + '/scripts/lib.js');
function sanitize(v) {
  return String(v).replace(/https?:\/\/[^\s"']*\?[^\s"']*/g, '[URL query redacted]');
}
function aws(config, service, operation, params, allowed, text) {
  var command = [
    'aws',
    '--profile',
    config.profile,
    '--region',
    config.region,
    '--no-cli-pager',
    '--cli-connect-timeout',
    '10',
    '--cli-read-timeout',
    '120',
    '--output',
    'json',
    service,
    operation
  ];
  Object.keys(params || {}).forEach(function (k) {
    var v = params[k];
    if (isDef(v)) {
      command.push('--' + k.replace(/_/g, '-'));
      if (Array.isArray(v) && typeof v[0] === 'string') command = command.concat(v);
      else command.push(typeof v === 'object' ? JSON.stringify(v) : String(v));
    }
  });
  var r = C.run(command, { capture: true, allowFailure: true, timeout: 150 });
  if (r.code) {
    var error = sanitize(r.stderr);
    if (
      (allowed || []).some(function (code) {
        return error.indexOf(code) >= 0;
      })
    )
      return null;
    throw new Error(error);
  }
  return text ? r.stdout.trim() : JSON.parse(r.stdout.trim() || '{}');
}
function metrics(logs) {
  var report = logs
      .split('\n')
      .filter(function (l) {
        return l.indexOf('REPORT RequestId:') === 0;
      })
      .join('\n'),
    failed = [],
    re = /INIT_REPORT Init Duration:\s*([0-9.]+)\s*ms\s+Phase: init\s+Status: timeout/g,
    m;
  while ((m = re.exec(logs)) !== null) failed.push(Number(m[1]));
  var result = { initPhaseTimeout: failed.length > 0 };
  if (failed.length)
    result.failedInitMs = failed.reduce(function (a, b) {
      return a + b;
    }, 0);
  [
    ['initMs', /Init Duration:\s*([0-9.]+)\s*ms/g],
    ['durationMs', /Duration:\s*([0-9.]+)\s*ms/g],
    ['maxMemoryMiB', /Max Memory Used:\s*([0-9.]+)\s*MB/g]
  ].forEach(function (pair) {
    var text =
      pair[0] === 'durationMs' ? report.replace(/(?:Init|Billed) Duration:/g, 'Ignored:') : report;
    while ((m = pair[1].exec(text)) !== null) result[pair[0]] = Number(m[1]);
  });
  return result;
}
function id(prefix) {
  return (
    prefix +
    String(
      java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'")
        .withZone(java.time.ZoneOffset.UTC)
        .format(java.time.Instant.now())
    ) +
    '-' +
    genUUID().replace(/-/g, '').substring(0, 6)
  );
}
function privateJSON(path, value) {
  C.json(path, value);
  C.mode(path, 'rw-------');
}
if (typeof exports !== 'undefined')
  Object.assign(exports, {
    aws: aws,
    sanitize: sanitize,
    metrics: metrics,
    id: id,
    privateJSON: privateJSON
  });
