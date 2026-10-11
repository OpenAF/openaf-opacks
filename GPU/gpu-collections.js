// Optional core adapters. Useful calls, never duplicate callback executions, train the selector.
exports.attach = function(service, runtime, emitter) {
  var callbacks = new WeakMap(), aggregateHistories = new Map(), epoch = 0, closed = false
  var lock = new java.util.concurrent.locks.ReentrantLock()
  var descriptor = Object.getOwnPropertyDescriptor
  function locked(fn) { lock.lock(); try { return fn() } finally { lock.unlock() } }
  function now() { return runtime.now ? runtime.now() : Number(java.lang.System.nanoTime()) / 1000000 }
  function snapshot(values, fast) {
    if (!Packages.openaf.opacks.gpu.FunctionAccess.isPlainArray(values) || values.length > 16777216) return null
    var copy = new Array(values.length), max = 0
    for (var i = 0; i < values.length; i++) {
      var d = descriptor(values, String(i))
      if (!d || !Object.prototype.hasOwnProperty.call(d, "value")) return null
      var v = d.value
      if (typeof v != "number" || !isFinite(v) || (!fast && (v != (v | 0) || (v === 0 && 1/v === -Infinity)))) return null
      copy[i] = v; max = Math.max(max, Math.abs(v))
    }
    return { values: copy, max: max }
  }
  function analyze(fn, mode) {
    try {
      var T = org.mozilla.javascript.Token, env = new org.mozilla.javascript.CompilerEnvirons()
      env.initFromContext(org.mozilla.javascript.Context.getCurrentContext())
      var root = new org.mozilla.javascript.Parser(env).parse("(" + runtime.source(fn) + ")", "gpu-callback", 1)
      var f = root.getFirstChild().getExpression().getExpression()
      function kind(n) { return n == null ? "" : String(n.getClass().getSimpleName()) }
      if (kind(f) != "FunctionNode" || f.isGenerator() || f.isES6Generator() || f.hasRestParameter() || f.isMethod() ||
          (f.getDefaultParams() != null && !f.getDefaultParams().isEmpty()) || f.getParams().size() < 1 || f.getParams().size() > 2) return null
      var names = []
      for (var pi = 0; pi < f.getParams().size(); pi++) {
        var pn = f.getParams().get(pi)
        if (kind(pn) != "Name") return null
        var identifier = String(pn.getIdentifier())
        if (names.indexOf(identifier) >= 0 || identifier == "arguments" || identifier == "eval") return null
        names.push(identifier)
      }
      var param = f.getParams().get(0)
      if (kind(param) != "Name") return null
      var name = String(param.getIdentifier()), body = f.getBody(), node = body.getFirstChild()
      if (kind(node) == "ReturnStatement" && node.getNext() == null) node = node.getReturnValue()
      else if (Number(f.getFunctionType()) == 4 && kind(body) != "Block") node = body
      else return null
      var count = 0
      function expr(n, depth) {
        if (++count > 256 || depth > 32) throw "complex"
        var k = kind(n)
        if (k == "ParenthesizedExpression") return expr(n.getExpression(), depth + 1)
        if (k == "Name" && String(n.getIdentifier()) == name) return { kind: "load", parameter: 0 }
        if (k == "NumberLiteral") {
          var v = Number(n.getNumber())
          if (!isFinite(v) || (mode != "fast" && v != (v | 0))) throw "constant"
          return { kind: "constant", value: v }
        }
        if (k == "UnaryExpression" && mode != "fast" && n.getOperator() == T.BITNOT)
          return { kind: "unary", operator: "~", value: expr(n.getOperand(), depth + 1) }
        if (k == "InfixExpression") {
          var ops = {}
          if (mode == "fast") { ops[T.ADD] = "+"; ops[T.SUB] = "-"; ops[T.MUL] = "*" }
          else { ops[T.BITAND] = "&"; ops[T.BITOR] = "|"; ops[T.BITXOR] = "^" }
          if (ops[n.getOperator()]) return { kind: "binary", operator: ops[n.getOperator()], left: expr(n.getLeft(), depth + 1), right: expr(n.getRight(), depth + 1) }
        }
        throw "unsupported"
      }
      return { eligible: true, parameters: ["input", "output"], arrayIndices: [0, 1], scalarIndices: [],
        bound: 0, output: 1, expression: expr(node, 0), mode: mode }
    } catch(e) { return null }
  }
  function history(map, key) {
    if (!map.has(key)) {
      var candidates = [{ route: "sequential", samples: [] }, { route: "parallel", samples: [] }]
      map.set(key, { calls: 0, candidates: candidates, discovered: false })
      if (map.size > 64) map.delete(map.keys().next().value)
    }
    return map.get(key)
  }
  function choose(h, options, length) {
    if (options.execution && options.execution != "auto") {
      var requested = { route: options.execution, samples: [] }
      if (requested.route == "metal" || requested.route == "opencl") {
        try { var probe = runtime.probe(requested.route); if (probe.available && probe.devices.length) requested.device = probe.devices[0].id } catch(e) {}
      }
      return requested
    }
    if (!h.discovered && h.calls >= 4 && length >= (options.minElements === undefined ? 131072 : options.minElements)) {
      h.discovered = true
      ;["opencl", "metal"].forEach(function(kind) {
        try {
          var p = runtime.probe(kind)
          if (p.available && p.devices.length) h.candidates.push({ route: kind, device: p.devices[0].id, samples: [] })
        } catch(e) {}
      })
    }
    var pending = h.candidates.filter(function(c) { return !c.failed && c.samples.length < (c.route == "sequential" || c.route == "parallel" ? 8 : 3) })
    // Alternate the CPU candidates to let both warm up before estimating their costs.
    if (h.calls < 4) return h.candidates[h.calls % h.candidates.length]
    var gpuPending = pending.filter(function(c) { return c.route == "metal" || c.route == "opencl" })
    if (gpuPending.length) return gpuPending[0]
    if (pending.length) return pending[h.calls % pending.length]
    if (h.calls % 32 == 0) {
      var active = h.candidates.filter(function(c) { return !c.failed })
      return active[Math.floor(h.calls / 32) % active.length]
    }
    var best = h.candidates[0]
    h.candidates.forEach(function(c) { if (!c.failed && c.ms < best.ms * 0.9) best = c })
    return best
  }
  function observe(c, ms) {
    c.samples.push(ms)
    // Discard the first native sample (compilation), retain the latest three warm observations.
    var warm = c.samples.slice(c.route == "opencl" || c.route == "metal" ? 1 : 0).slice(-3).sort(function(a,b) { return a-b })
    c.ms = warm.length ? warm[Math.floor(warm.length / 2)] : ms
  }
  function options(input) {
    var o = input === undefined ? {} : input
    if (!o || typeof o != "object" || Array.isArray(o)) throw new TypeError("Collection options must be a map")
    if (o.minElements !== undefined && (typeof o.minElements != "number" || !isFinite(o.minElements) || o.minElements < 0 || Math.floor(o.minElements) != o.minElements)) throw new TypeError("minElements must be a nonnegative integer")
    if (o.maxWorkers !== undefined && (typeof o.maxWorkers != "number" || !isFinite(o.maxWorkers) || o.maxWorkers < 1 || Math.floor(o.maxWorkers) != o.maxWorkers)) throw new TypeError("maxWorkers must be a positive integer")
    if (o.mode !== undefined && ["strict", "fast"].indexOf(o.mode) < 0) throw new TypeError("mode must be strict or fast")
    if (o.execution !== undefined && ["auto", "sequential", "parallel", "opencl", "metal"].indexOf(o.execution) < 0) throw new TypeError("Unknown collection execution route")
    return o
  }
  function cpu(values, fn, err, seq, timeout, o, route) {
    if (runtime.cpu) return runtime.cpu(values, fn, err, seq, timeout, o, route)
    return pForEach(values, fn, err, seq, timeout, { useGPU: false, execution: route, maxWorkers: o.maxWorkers, metrics: o.metrics })
  }
  service.pForEach = function(values, fn, err, seq, timeout, input) {
    var o = options(input), budget = timeout === undefined ? __flags.PFOREACH.wait_timeout_ms : timeout
    if (!Array.isArray(values) || typeof fn != "function") return cpu(values, fn, err, seq, timeout, o)
    if (closed || o.useGPU === false || seq || __flags.PFOREACH.forceSeq || (typeof budget == "number" && budget > 0) || values.length < 2)
      return cpu(values, fn, err, seq, timeout, o, seq ? "sequential" : undefined)
    var started = now(), state = locked(function() {
      var entry = callbacks.get(fn)
      if (!entry || entry.epoch != epoch) { entry = { epoch: epoch, plans: {}, histories: new Map() }; callbacks.set(fn, entry) }
      var mode = o.mode || "strict"
      if (!Object.prototype.hasOwnProperty.call(entry.plans, mode)) entry.plans[mode] = analyze(fn, mode)
      return { plan: entry.plans[mode], entry: entry, mode: mode }
    })
    if (!state.plan) return cpu(values, fn, err, seq, timeout, o)
    var data = snapshot(values, state.mode == "fast")
    if (!data) return cpu(values, fn, err, seq, timeout, o)
    var h, candidate = locked(function() {
      h = history(state.entry.histories, state.mode + ":" + values.length + ":" + (o.maxWorkers || "") + ":" + o.minElements)
      var c = choose(h, o, values.length); h.calls++; return c
    }), route = candidate.route, result, failed = false
    if (route == "opencl" || route == "metal") {
      result = locked(function() {
        try {
          var Type = state.mode == "fast" ? Float32Array : Int32Array
          var a = new Type(data.values), b = new Type(a.length)
          var guard = runtime.validate([a,b], state.plan, state.mode)
          if (!guard.eligible) { candidate.failed = true; failed = true; return null }
          var source = emitter.emit(state.plan, state.mode == "fast" ? "float32" : "int32", route)
          var r = runtime.execute(guard, source, "collections-v1:" + route + ":" + source, candidate.device || "", route)
          if (!r.success) { candidate.failed = true; failed = true; return null }
          var out = new Array(b.length)
          for (var i = 0; i < b.length; i++) out[i] = b[i]
          return out
        } catch(e) { candidate.failed = true; failed = true; return null }
      })
      if (result == null) route = "sequential"
    }
    if (route == "sequential" || route == "parallel") {
      var metrics = {}, cpuOptions = { maxWorkers: o.maxWorkers, metrics: metrics }
      result = cpu(values, fn, err, false, timeout, cpuOptions, route)
      if (metrics.execution) route = metrics.execution
      if (route != candidate.route) candidate.failed = true
      if (metrics.timedOut) failed = true
    }
    var elapsed = now() - started
    locked(function() { if (!failed && route == candidate.route) observe(candidate, elapsed) })
    if (o.metrics) { o.metrics.execution = route; o.metrics.totalMs = elapsed; o.metrics.fallback = failed; o.metrics.calls = h.calls }
    return result
  }
  service.parallel4Array = function(values, fn, input) {
    var o = options(input)
    // Unsupported callbacks retain the legacy thread API, callback indexes and error behavior.
    if (closed || o.useGPU === false || !Array.isArray(values) || !analyze(fn, o.mode || "strict") || !snapshot(values, o.mode == "fast"))
      return parallel4Array(values, fn, undefined, undefined, { useGPU: false })
    // Original partitions reverse their individual results; completion order is unspecified.
    var mapped = service.pForEach(values, fn, function(e) { throw e }, false, undefined, o)
    var workers = getNumberOfCores() + 1, out = []
    if (workers >= values.length) return mapped
    for (var i = 0; i < workers; i++) {
      var lower = Math.round(values.length / workers * i), upper = Math.round(values.length / workers * (i + 1))
      for (var j = upper - 1; j >= lower; j--) out.push(mapped[j])
    }
    return out
  }
  var close = service.close, clear = service.clearCache
  service.close = function() { closed = true; locked(function() { runtime.close() }); return close.call(service) }
  service.clearCache = function() { locked(function() { epoch++; aggregateHistories.clear(); runtime.clearCache() }); return clear.call(service) }
  service._collectionRuntime = runtime
  service._collectionHelpers = { options: options, snapshot: snapshot, history: history, choose: choose, observe: observe, locked: locked, now: now, histories: aggregateHistories }
  return service
}
