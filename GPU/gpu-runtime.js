// Defaults retain OpenCL; Metal is initialized only when explicitly selected or listed.
exports.runtime = function(root) {
  var factory = require(root + "/gpu-opencl.js"), opencl = factory.runtime(), metal
  function get(kind) {
    if (kind != "metal") return opencl
    if (!metal) metal = factory.runtime("metal", root)
    return metal
  }
  return {
    source: opencl.source, validate: opencl.validate,
    available: function() { return opencl.probe().available || get("metal").probe().available },
    probe: function(kind) { return get(kind).probe() },
    backends: function() {
      return ["opencl", "metal"].map(function(kind) {
        var p = get(kind).probe()
        return { name: kind, available: p.available, reason: p.reason }
      })
    },
    devices: function() { return opencl.probe().devices.concat(get("metal").probe().devices) },
    execute: function(guard, source, key, device, kind) { return get(kind).execute(guard, source, key, device) },
    cache: function() {
      var a = opencl.cache(), b = metal ? metal.cache() : { entries: 0, bufferBytes: 0 }
      return { entries: a.entries + b.entries, bufferBytes: a.bufferBytes + b.bufferBytes,
        backends: { opencl: a, metal: b } }
    },
    clearCache: function() { opencl.clearCache(); if (metal) metal.clearCache() },
    close: function() { opencl.close(); if (metal) metal.close() }
  }
}
