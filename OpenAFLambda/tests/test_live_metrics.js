var C = require((global.lambdaSource || getOPackPath('OpenAFLambda') || '.') + '/scripts/lib.js'),
  L = require(C.source() + '/tests/live-lib.js');
try {
  C.equal(
    L.metrics(
      'REPORT RequestId: test\tDuration: 100.50 ms\tBilled Duration: 601 ms\tMemory Size: 1024 MB\tMax Memory Used: 223 MB\tInit Duration: 500.25 ms'
    ),
    { initPhaseTimeout: false, initMs: 500.25, durationMs: 100.5, maxMemoryMiB: 223 }
  );
  var r = L.metrics(
    'INIT_REPORT Init Duration: 9999.35 ms\tPhase: init\tStatus: timeout\nREPORT RequestId: test\tDuration: 12701.20 ms\tBilled Duration: 12702 ms\tMemory Size: 512 MB\tMax Memory Used: 223 MB'
  );
  C.assert(isUnDef(r.initMs));
  C.equal(r.failedInitMs, 9999.35);
  C.assert(r.initPhaseTimeout);
  C.equal(r.durationMs, 12701.2);
  r = L.metrics(
    'REPORT RequestId: test\tDuration: 3.50 ms\tBilled Duration: 4 ms\tMax Memory Used: 224 MB'
  );
  C.assert(isUnDef(r.initMs));
  C.equal(r.durationMs, 3.5);
  print('3 passed');
} catch (e) {
  printErr(String(e));
  exit(1);
}
