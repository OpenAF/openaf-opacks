// Java ownership is lazy: explicit CPU wrappers never instantiate a native backend.
exports.runtime = function() {
  var backend, arrays
  var J = Packages.openaf.opacks.gpu
  function nativeBackend() {
    if (!backend) backend = new J.OpenCLBackend()
    return backend
  }
  return {
    source: function(fn) { return String(J.FunctionAccess.source(fn)) },
    validate: function(args, plan, mode) {
      if (!arrays) arrays = new J.TypedArrayAccess()
      return arrays.validate(args, plan.arrayIndices, plan.scalarIndices, plan.parameters.length, plan.bound, plan.output, mode)
    },
    probe: function() {
      var p = nativeBackend().probe(), devices = []
      for (var i = 0; i < p.devices.size(); i++) {
        var d = p.devices.get(i)
        devices.push({ id: String(d.id), name: String(d.name), vendor: String(d.vendor),
          type: "GPU", backend: "opencl", version: String(d.version), driver: String(d.driver),
          littleEndian: Boolean(d.littleEndian), fp64: Boolean(d.fp64), maxAllocation: Number(d.maxAllocation) })
      }
      return { available: Boolean(p.available), reason: String(p.reason), devices: devices }
    },
    execute: function(guard, source, key, device) {
      var r = nativeBackend().execute(guard, source, key, device)
      return { success: Boolean(r.success), compiled: Boolean(r.compiled), cacheHit: Boolean(r.cacheHit),
        commitStarted: Boolean(r.commitStarted), stage: String(r.stage), message: String(r.message),
        compileMs: Number(r.compileMs), marshalMs: Number(r.marshalMs),
        transferKernelReadMs: Number(r.transferKernelReadMs), commitMs: Number(r.commitMs),
        totalMs: Number(r.totalMs), transferBytes: Number(r.transferBytes) }
    },
    cache: function() { return { entries: backend ? Number(backend.cacheEntries()) : 0, bufferBytes: backend ? Number(backend.bufferBytes()) : 0 } },
    clearCache: function() { if (backend) backend.clearCache() },
    close: function() { if (backend) backend.close() }
  }
}
