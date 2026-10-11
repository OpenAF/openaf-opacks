// Exact signed-int32 reductions. Floating-point inputs retain JavaScript reduction order on CPU.
exports.attach = function(service) {
  var runtime = service._collectionRuntime, h = service._collectionHelpers
  service.aggregate = function(values, operation, fallback, input) {
    var o = h.options(input)
    if (["sum", "average", "min", "max"].indexOf(operation) < 0) throw new TypeError("Unknown aggregate")
    var started = h.now(), data = h.snapshot(values, false)
    // A conservative absolute-sum bound guarantees every partial sum is exact and fits int32.
    if (!data || !values.length || ((operation == "sum" || operation == "average") && data.max * values.length > 2147483647) || o.useGPU === false)
      return fallback()
    var state, candidate = h.locked(function() {
      state = h.history(h.histories, operation + ":" + values.length + ":" + o.minElements)
      // Aggregates have one CPU implementation; no arbitrary reducer is sent to workers.
      if (state.calls == 0) state.candidates = [{ route: "sequential", samples: [] }]
      var c = h.choose(state, o, values.length); state.calls++; return c
    }), route = candidate.route, result, failed = false
    if (route == "metal" || route == "opencl") {
      result = h.locked(function() {
        try {
          var a = new Int32Array(data.values), b = new Int32Array(a.length)
          var plan = { parameters: ["a", "b", "n"], arrayIndices: [0,1], scalarIndices: [2], bound: 0, output: 1 }
          var guard = runtime.validate([a,b,a.length], plan, "strict")
          if (!guard.eligible) throw "guard"
          var metal = route == "metal", combine = operation == "min" ? "v=min(v,x);" : operation == "max" ? "v=max(v,x);" : "v+=x;"
          var source = (metal ? "#include <metal_stdlib>\nusing namespace metal;\nkernel void calculate(device const int* a [[buffer(0)]],device int* b [[buffer(1)]],constant uint& n [[buffer(2)]],uint i [[thread_position_in_grid]]){" :
            "__kernel void calculate(__global const int* a,__global int* b,uint n){uint i=get_global_id(0);") +
            "uint start=i*256u;int v=0;if(start<n){v=" + ((operation == "min" || operation == "max") ? "a[start]" : "0") +
            ";for(uint j=start" + ((operation == "min" || operation == "max") ? "+1u" : "") + ";j<min(start+256u,n);j++){int x=a[j];" + combine + "}}b[i]=v;}"
          var r = runtime.execute(guard, source, "aggregate-v1:" + route + ":" + operation, candidate.device || "", route)
          if (!r.success) throw r.message
          var v = b[0], chunks = Math.ceil(a.length / 256)
          for (var i = 1; i < chunks; i++) v = operation == "min" ? Math.min(v,b[i]) : operation == "max" ? Math.max(v,b[i]) : v+b[i]
          return { value: operation == "average" ? v/a.length : v }
        } catch(e) { candidate.failed = true; candidate.error = String(e); failed = true; return null }
      })
    }
    var value
    if (result) value = result.value
    else { route = "sequential"; value = fallback() }
    var elapsed = h.now() - started
    h.locked(function() { if (!failed && route == candidate.route) h.observe(candidate, elapsed) })
    if (o.metrics) { o.metrics.execution = route; o.metrics.totalMs = elapsed; o.metrics.fallback = failed; if (failed) o.metrics.reason = candidate.error }
    return value
  }
  delete service._collectionRuntime
  delete service._collectionHelpers
  return service
}
