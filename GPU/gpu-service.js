// Internal factory is separately loadable for deterministic backend/failure tests.
exports.create = function(runtime, analyzer, emitter, policy) {
  var wrappers = new WeakMap(), analyses = new Map(), closed = false, cacheEpoch = 0
  var counters = { calls: 0, cpuCalls: 0, gpuCalls: 0, failures: 0, cacheHits: 0,
    compilations: 0, compileMs: 0, cpuMs: 0, gpuMs: 0, transferBytes: 0, reasons: {} }
  // Capture a bound intrinsic: Rhino's Reflect.apply currently converts null receivers.
  var invoke = Function.prototype.call.bind(Function.prototype.apply)
  var lock = new java.util.concurrent.locks.ReentrantLock()
  function nowMs() { return runtime.now ? runtime.now() : Number(java.lang.System.nanoTime()) / 1000000 }
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
      minElements: input.minElements === undefined ? (input.backend == "adaptive" ? 0 : 131072) : input.minElements }
    if (["strict", "fast"].indexOf(o.mode) < 0) throw new TypeError("GPU mode must be strict or fast")
    if (["auto", "adaptive", "cpu", "opencl", "metal"].indexOf(o.backend) < 0) throw new TypeError("GPU backend must be auto, adaptive, cpu, opencl or metal")
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
    available: function() { return !closed && (runtime.available ? runtime.available() : runtime.probe().available) },
    devices: function() { return closed ? [] : copy(runtime.devices ? runtime.devices() : runtime.probe().devices) },
    backends: function() {
      if (runtime.backends) return [{ name: "cpu", available: true, reason: "original-rhino" }].concat(
        closed ? ["opencl", "metal"].map(function(name) { return { name: name, available: false, reason: "closed" } }) : runtime.backends())
      var p = closed ? { available: false, reason: "closed" } : runtime.probe()
      return [{ name: "cpu", available: true, reason: "original-rhino" },
        { name: "opencl", available: p.available, reason: p.reason }]
    },
    auto: function(fn, input) {
      if (typeof fn != "function") throw new TypeError("GPU auto requires a function")
      var o = options(input), configuredBackend = o.backend == "metal" ? "metal" : "opencl", plan = analyze(fn, o.mode), histories = new Map(), diag = diagnostic(plan), epoch = cacheEpoch
      var wrapper = function() {
        "use strict"
        var receiver = this, args = arguments, started = nowMs(), history, decision, guard, backend = configuredBackend, candidate, probeMs = 0, selectedDevice, failure = false, attempt, cpuDiagnostic
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
              var type = String(guard.type), bucket = type + ":" + (o.backend == "adaptive" ? Number(guard.length) : policy.bucket(Number(guard.length)))
              history = histories.get(bucket)
              if (!history) {
                history = { calls: 0, cpuCount: 0, gpuCount: 0, cpuMs: 0, gpuMs: 0, failed: false, candidates: null, refresh: 0, cpuWarmSamples: 0, cpuWarmCosts: [] }
                histories.set(bucket, history)
                if (histories.size > 64) histories.delete(histories.keys().next().value)
              }
              decision = policy.select(o, Number(guard.length), history)
              if (o.backend == "adaptive" && Number(guard.length) > 0 && Number(guard.length) >= o.minElements && history.calls >= 2) {
                if (!history.candidates) {
                  var probeStart = nowMs()
                  var devices = runtime.devices ? runtime.devices() : runtime.probe().devices
                  var seenBackends = {}
                  history.candidates = devices.filter(function(d) {
                    var kind = d.backend || "opencl"
                    if (o.device) return d.id == o.device
                    // OpenCL owns one context: probing different devices would repeatedly discard its cache.
                    if (seenBackends[kind]) return false
                    seenBackends[kind] = true
                    return true
                  }).map(function(d) {
                    return { backend: d.backend || "opencl", device: d.id, samples: 0, ms: 0, failed: false }
                  })
                  probeMs = nowMs() - probeStart
                }
                var selection = policy.adaptive(history)
                decision = !history.candidates.length && o.device ? "requested-device-unavailable" : selection.reason; candidate = selection.candidate
                if (candidate) backend = candidate.backend
              }
              history.calls++
              if (decision == "gpu-trial") {
                var p = runtime.probe(backend)
                selectedDevice = p.devices.filter(function(d) { return candidate ? d.id == candidate.device : (!o.device || d.id == o.device) })[0]
                if (!p.available || !selectedDevice) {
                  if (candidate) candidate.failed = true
                  decision = o.device ? "requested-device-unavailable" : "gpu-unavailable"
                }
                else {
                  var source = emitter.emit(plan, type, backend)
                  var key = "gpu-v1:" + backend + ":" + o.mode + ":" + type + ":" + source
                  var result = runtime.execute(guard, source, key, selectedDevice.id, backend)
                  attempt = result
                  diag.compilation = { status: result.compiled ? "compiled" : "failed",
                    cacheHit: result.cacheHit, compileMs: result.compileMs }
                  if (result.compiled && !result.cacheHit) counters.compilations++
                  if (result.cacheHit) counters.cacheHits++
                  counters.compileMs += result.compileMs
                  counters.transferBytes += result.transferBytes
                  if (result.success) {
                    var elapsed = nowMs() - started
                    // Exclude cold compilation/discovery from warm selection; actual complete call cost stays observable.
                    var warm = Math.max(0, elapsed - result.compileMs - probeMs)
                    history.gpuMs = history.gpuCount ? history.gpuMs * 0.75 + warm * 0.25 : warm
                    history.gpuCount++
                    if (candidate) {
                      candidate.ms = candidate.samples > 1 ? candidate.ms * 0.5 + warm * 0.5 : warm
                      candidate.samples++
                    }
                    counters.gpuCalls++; counters.gpuMs += elapsed
                    reason("gpu-completed")
                    diag.lastCall = { selectedBackend: backend, executedOn: "GPU", device: selectedDevice.id,
                      completed: true, fallback: false, reason: "gpu-completed", totalMs: elapsed, timings: result }
                    return { gpu: true }
                  }
                  counters.failures++; failure = true; history.failed = true
                  if (candidate) candidate.failed = true
                  decision = "backend-failure-" + result.stage
                  diag.lastCall = { selectedBackend: backend, executedOn: null, device: selectedDevice.id,
                    completed: false, fallback: false, reason: decision, error: result.message, timings: result }
                  if (result.commitStarted) throw new Error("GPU output commit failed; original function was not rerun: " + result.message)
                }
              }
            }
          }
          counters.cpuCalls++; reason(decision)
          cpuDiagnostic = { selectedBackend: selectedDevice ? backend : "cpu", executedOn: "CPU",
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
            if (history && (o.backend != "adaptive" || (!attempt && completed))) {
              var observed = o.backend == "adaptive" ? Math.max(0, nowMs() - started - probeMs) : elapsed
              if (o.backend == "adaptive" && decision == "cpu-calibration" && history.cpuWarmSamples < 14) {
                // Median post-trial calls replace cold Rhino startup, rather than perpetuating its bias.
                history.cpuWarmCosts.push(observed)
                if (history.cpuWarmCosts.length > 3) history.cpuWarmCosts.shift()
                var warmCPU = history.cpuWarmCosts.slice().sort(function(a,b) { return a-b })
                history.cpuMs = warmCPU[Math.floor(warmCPU.length/2)]
              } else history.cpuMs = history.cpuCount ? history.cpuMs * 0.75 + observed * 0.25 : observed
              if (o.backend == "adaptive" && decision == "cpu-calibration") history.cpuWarmSamples++
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
        var out = copy(record ? record.diag : diagnostic(analyze(fn, "strict")))
        if (record) out.selection = Array.from(record.histories.entries()).map(function(entry) {
          var h = entry[1]
          return { specialization: entry[0], calls: h.calls, cpuMs: h.cpuMs, cpuSamples: h.cpuCount, cpuWarmSamples: h.cpuWarmSamples, candidates: h.candidates }
        })
        return copy(out)
      })
    },
    stats: function() { return locked(function() { var out = copy(counters); out.cache = runtime.cache(); out.closed = closed; return out }) },
    clearCache: function() { locked(function() { runtime.clearCache(); analyses.clear(); cacheEpoch++ }) },
    close: function() { locked(function() { if (!closed) runtime.close(); closed = true }) }
  }
  return service
}
