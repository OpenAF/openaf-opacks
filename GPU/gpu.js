// Bootstrap: loadLib("gpu.js"); ow.loadGPU()
var _gpuRoot = getOPackPath("GPU") || String(new java.io.File(__loadedfrom).getAbsoluteFile().getParent())
loadExternalJars(_gpuRoot + "/lib")

var _gpuAnalyzer = require(_gpuRoot + "/gpu-analyzer.js")
var _gpuEmitter = require(_gpuRoot + "/gpu-ir.js")
var _gpuPolicy = require(_gpuRoot + "/gpu-policy.js")
var _gpuRuntime = require(_gpuRoot + "/gpu-opencl.js")
var _gpuService = require(_gpuRoot + "/gpu-service.js")

OpenWrap.GPU = function() {
  return _gpuService.create(_gpuRuntime.runtime(), _gpuAnalyzer, _gpuEmitter, _gpuPolicy)
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
