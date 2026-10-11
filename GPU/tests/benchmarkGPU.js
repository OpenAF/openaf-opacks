// Run from GPU/: oaf -f tests/benchmarkGPU.js
// Requires a working GPU. Reports actual GPU execution, not a CPU fallback benchmark.
(function() {
  function time() { return Number(java.lang.System.nanoTime()) / 1e6 }
  function summary(values) {
    values.sort(function(a,b){return a-b})
    return { min:values[0], median:(values[14]+values[15])/2, p95:values[28], max:values[29] }
  }
  var gpu, backend = String(java.lang.System.getProperty("openaf.gpu.benchmarkBackend", "opencl"))
  try {
    loadLib("gpu.js")
    gpu = new OpenWrap.GPU()
    var before = time(), available = gpu.available(), discoveryMs = time()-before
    if (!available) { print(stringify({skipped:true,backends:gpu.backends()}));exit(2) }
    var transform = function(a,b,c) { for(var i=0;i<a.length;i++) { c[i]=a[i]*2.5+b[i] } }
    var rows = []
    ;[4096,65536,262144,1048576].forEach(function(n) {
      var a = new Float32Array(n), b = new Float32Array(n), cpuOut = new Float32Array(n), gpuOut = new Float32Array(n)
      for(var i=0;i<n;i++){a[i]=(i%1024)*0.25;b[i]=i%31}
      gpu.clearCache()
      var started = time()
      var accelerated = gpu.auto(transform,{backend:backend,mode:"fast"})
      accelerated(a,b,gpuOut)
      var coldMs = time()-started, cold = gpu.explain(accelerated)
      if (cold.lastCall.executedOn!="GPU") throw new Error("GPU execution failed: "+stringify(cold))
      for(var i=0;i<30;i++){transform(a,b,cpuOut);accelerated(a,b,gpuOut)}
      var cpuTimes = [], gpuTimes = []
      function cpuCall(){var t=time();transform(a,b,cpuOut);cpuTimes.push(time()-t)}
      function gpuCall(){var t=time();accelerated(a,b,gpuOut);gpuTimes.push(time()-t);if(gpu.explain(accelerated).lastCall.executedOn!="GPU")throw new Error("Measured call fell back to CPU")}
      for(var i=0;i<30;i++){if(i%2){gpuCall();cpuCall()}else{cpuCall();gpuCall()}}
      var mismatches=0
      for(var i=0;i<n;i++)if(cpuOut[i]!==gpuOut[i])mismatches++
      rows.push({elements:n,coldAutoAndCallMs:coldMs,compileMs:cold.compilation.compileMs,
        rhinoMs:summary(cpuTimes),gpuEndToEndMs:summary(gpuTimes),mismatches:mismatches,
        lastCall:gpu.explain(accelerated).lastCall})
      if(mismatches)throw new Error("Unexpected mismatch on exact-valued fixture")
    })
    var report = {openaf:getVersion(),java:String(java.lang.System.getProperty("java.version")),
      os:String(java.lang.System.getProperty("os.name")),arch:String(java.lang.System.getProperty("os.arch")),
      backend:backend,discoveryMs:discoveryMs,devices:gpu.devices(),warmup:30,samples:30,rows:rows,
      note:"Alternating CPU/GPU order. GPU wall time includes guards, byte conversion, transfers, synchronization, commit and diagnostics. Pipeline cached after warmup; Metal buffers allocated per call, OpenCL buffers reused; driver binary cache uncontrolled. No kernel-only claims."}
    var evidence = java.lang.System.getProperty("openaf.gpu.benchmarkEvidence")
    if (evidence) io.writeFileJSON(String(evidence),report)
    print(stringify(report))
  } catch(e) { printErr(e);exit(1) }
  finally { if(gpu)gpu.close() }
})()
