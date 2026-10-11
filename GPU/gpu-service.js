// Internal factory is separately loadable for deterministic backend/failure tests.
exports.create = function(runtime, analyzer, emitter, policy) {
  var wrappers = new WeakMap(), analyses = new Map(), closed = false, cacheEpoch = 0
  var counters = { calls: 0, cpuCalls: 0, gpuCalls: 0, failures: 0, cacheHits: 0,
    compilations: 0, compileMs: 0, cpuMs: 0, gpuMs: 0, transferBytes: 0, reasons: {} }
  // Capture a bound intrinsic: Rhino's Reflect.apply currently converts null receivers.
  var invoke = Function.prototype.call.bind(Function.prototype.apply)
  var lock = new java.util.concurrent.locks.ReentrantLock()
  function nowMs() { return Number(java.lang.System.nanoTime()) / 1000000 }
  function copy(value) { return JSON.parse(JSON.stringify(value)) }
  function locked(fn) { lock.lock(); try { return fn() } finally { lock.unlock() } }
  function reason(value) { counters.reasons[value] = (counters.reasons[value] || 0) + 1 }
  function options(input) {
    if (input === undefined) input = {}
    if (typeof input != "object" || Array.isArray(input)) throw new TypeError("GPU options must be a map")
    var allowed = ["mode", "backend", "device", "minElements"]
    Object.keys(input).forEach(function(k) { if (allowed.indexOf(k) < 0) throw new TypeError("Unknown GPU option: " + k) })
    var o = { mode: input.mode === undefined ? "strict" : input.mode,
      backend: input.backend === undefined ? "auto" : input.backend,
      device: input.device === undefined ? "" : input.device,
      minElements: input.minElements === undefined ? 131072 : input.minElements }
    if (["strict", "fast"].indexOf(o.mode) < 0) throw new TypeError("GPU mode must be strict or fast")
    if (["auto", "cpu", "opencl"].indexOf(o.backend) < 0) throw new TypeError("GPU backend must be auto, cpu or opencl")
    if (typeof o.device != "string") throw new TypeError("GPU device must be a device id string")
    if (typeof o.minElements != "number" || !isFinite(o.minElements) || o.minElements < 0 || Math.floor(o.minElements) != o.minElements) throw new TypeError("GPU minElements must be a nonnegative integer")
    return o
  }
  function analyze(fn, mode) {
    try {
      var source = runtime.source(fn), key = mode + ":" + source
      if (analyses.has(key)) return analyses.get(key)
      var result = analyzer.analyze(source, mode)
      analyses.set(key, result)
      if (analyses.size > 64) analyses.delete(analyses.keys().next().value)
      return result
    }
    catch (e) { return { eligible: false, mode: mode, reason: "source-inspection-failed" } }
  }
  function diagnostic(plan) {
    return { static: { eligible: plan.eligible, reason: plan.reason, mode: plan.mode, line: plan.line },
      specialization: null, compilation: { status: "not-attempted", cacheHit: false }, lastCall: null }
  }
  var service = {
    available: function() { return !closed && runtime.probe().available },
    devices: function() { return closed ? [] : copy(runtime.probe().devices) },
    backends: function() {
      var p = closed ? { available: false, reason: "closed" } : runtime.probe()
      return [{ name: "cpu", available: true, reason: "original-rhino" },
        { name: "opencl", available: p.available, reason: p.reason }]
    },
    auto: function(fn, input) {
      if (typeof fn != "function") throw new TypeError("GPU auto requires a function")
      var o = options(input), plan = analyze(fn, o.mode), histories = new Map(), diag = diagnostic(plan), epoch = cacheEpoch
      var wrapper = function() {
        "use strict"
        var receiver = this, args = arguments, started = nowMs(), history, decision, guard, selectedDevice, failure = false, attempt, cpuDiagnostic
        // Only selection/runtime state is locked. Original user code runs outside the lock.
        var action = locked(function() {
          counters.calls++
          if (epoch != cacheEpoch) { histories.clear(); epoch = cacheEpoch }
          diag.compilation = { status: "not-attempted", cacheHit: false }
          diag.specialization = null
          if (closed) decision = "closed"
          else if (o.backend == "cpu") decision = "explicit-cpu"
          else if (!plan.eligible) decision = plan.reason
          else {
            try { guard = runtime.validate(args, plan, o.mode) }
            catch (e) { guard = { eligible: false, reason: "array-inspection-failed" } }
            diag.specialization = { mode: o.mode, type: guard.type ? String(guard.type) : null,
              guardsPassed: Boolean(guard.eligible), reason: String(guard.reason) }
            if (!guard.eligible) decision = String(guard.reason)
            else {
              var type = String(guard.type), bucket = type + ":" + policy.bucket(Number(guard.length))
              history = histories.get(bucket)
              if (!history) {
                history = { calls: 0, cpuCount: 0, gpuCount: 0, cpuMs: 0, gpuMs: 0, failed: false }
                histories.set(bucket, history)
              }
              decision = policy.select(o, Number(guard.length), history)
              history.calls++
              if (decision == "gpu-trial") {
                var p = runtime.probe()
                selectedDevice = p.devices.filter(function(d) { return !o.device || d.id == o.device })[0]
                if (!p.available || !selectedDevice) decision = o.device ? "requested-device-unavailable" : "gpu-unavailable"
                else {
                  var source = emitter.emit(plan, type)
                  var key = "gpu-v1:" + o.mode + ":" + type + ":" + source
                  var result = runtime.execute(guard, source, key, selectedDevice.id)
                  attempt = result
                  diag.compilation = { status: result.compiled ? "compiled" : "failed",
                    cacheHit: result.cacheHit, compileMs: result.compileMs }
                  if (result.compiled && !result.cacheHit) counters.compilations++
                  if (result.cacheHit) counters.cacheHits++
                  counters.compileMs += result.compileMs
                  counters.transferBytes += result.transferBytes
                  if (result.success) {
                    var elapsed = nowMs() - started
                    // Exclude only compilation from warm selection; complete call cost remains observable.
                    var warm = Math.max(0, elapsed - result.compileMs)
                    history.gpuMs = history.gpuCount ? history.gpuMs * 0.75 + warm * 0.25 : warm
                    history.gpuCount++
                    counters.gpuCalls++; counters.gpuMs += elapsed
                    reason("gpu-completed")
                    diag.lastCall = { selectedBackend: "opencl", executedOn: "GPU", device: selectedDevice.id,
                      completed: true, fallback: false, reason: "gpu-completed", totalMs: elapsed, timings: result }
                    return { gpu: true }
                  }
                  counters.failures++; failure = true; history.failed = true
                  decision = "backend-failure-" + result.stage
                  diag.lastCall = { selectedBackend: "opencl", executedOn: null, device: selectedDevice.id,
                    completed: false, fallback: false, reason: decision, error: result.message, timings: result }
                  if (result.commitStarted) throw new Error("GPU output commit failed; original function was not rerun: " + result.message)
                }
              }
            }
          }
          counters.cpuCalls++; reason(decision)
          cpuDiagnostic = { selectedBackend: selectedDevice ? "opencl" : "cpu", executedOn: "CPU",
            completed: false, fallback: failure || (o.backend != "cpu" && decision != "empty-workload"
              && ["below-workload-threshold", "waiting-for-reuse", "cpu-calibration", "observed-cpu-faster"].indexOf(decision) < 0), reason: decision }
          if (attempt) { cpuDiagnostic.error = attempt.message; cpuDiagnostic.timings = attempt }
          diag.lastCall = cpuDiagnostic
          return { gpu: false }
        })
        if (action.gpu) return undefined
        var cpuStart = nowMs(), completed = false
        try {
          var value = invoke(fn, receiver, args)
          completed = true
          return value
        } finally {
          var elapsed = nowMs() - cpuStart
          locked(function() {
            counters.cpuMs += elapsed
            if (history) {
              history.cpuMs = history.cpuCount ? history.cpuMs * 0.75 + elapsed * 0.25 : elapsed
              history.cpuCount++
            }
            cpuDiagnostic.completed = completed
            cpuDiagnostic.totalMs = nowMs() - started
            cpuDiagnostic.cpuMs = elapsed
          })
        }
      }
      wrappers.set(wrapper, { plan: plan, diag: diag, histories: histories })
      return wrapper
    },
    explain: function(fn) {
      if (typeof fn != "function") throw new TypeError("GPU explain requires a function")
      return locked(function() {
        var record = wrappers.get(fn)
        return copy(record ? record.diag : diagnostic(analyze(fn, "strict")))
      })
    },
    stats: function() { return locked(function() { var out = copy(counters); out.cache = runtime.cache(); out.closed = closed; return out }) },
    clearCache: function() { locked(function() { runtime.clearCache(); analyses.clear(); cacheEpoch++ }) },
    close: function() { locked(function() { if (!closed) runtime.close(); closed = true }) }
  }
  return service
}
