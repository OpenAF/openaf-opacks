// Bootstrap: loadLib("gpu.js"); ow.loadGPU()
var _gpuSourceRoot = String(new java.io.File(__loadedfrom).getAbsoluteFile().getParent())
if (!io.fileExists(_gpuSourceRoot + "/gpu-service.js") && io.fileExists("gpu-service.js"))
  _gpuSourceRoot = String(new java.io.File(".").getCanonicalPath())
var _gpuRoot = io.fileExists(_gpuSourceRoot + "/gpu-service.js") ? _gpuSourceRoot : getOPackPath("GPU")
loadExternalJars(_gpuRoot + "/lib")

var _gpuAnalyzer = require(_gpuRoot + "/gpu-analyzer.js")
var _gpuEmitter = require(_gpuRoot + "/gpu-ir.js")
var _gpuPolicy = require(_gpuRoot + "/gpu-policy.js")
var _gpuRuntime = require(_gpuRoot + "/gpu-runtime.js")
var _gpuService = require(_gpuRoot + "/gpu-service.js")

OpenWrap.GPU = function() {
  var service = _gpuService.create(_gpuRuntime.runtime(_gpuRoot), _gpuAnalyzer, _gpuEmitter, _gpuPolicy)
  require(_gpuRoot + "/gpu-collections.js").attach(service, _gpuRuntime.runtime(_gpuRoot), _gpuEmitter)
  return require(_gpuRoot + "/gpu-aggregate.js").attach(service)
}

/**
 * <odoc>
 * <key>ow.loadGPU() : Object</key>
 * After loadLib("gpu.js"), lazily creates the optional GPU service.
 * auto(fn, options) uses strict integer kernels by default, or explicit mode:"fast"
 * for Float32 arithmetic. Unsupported calls execute the original Rhino function.
 * </odoc>
 */
OpenWrap.prototype.loadGPU = function() {
  if (isUnDef(ow.gpu)) ow.gpu = new OpenWrap.GPU()
  return ow.gpu
}
