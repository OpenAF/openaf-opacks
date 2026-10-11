// Run from GPU/: oaf -f tests/testGPU.js
// Deterministic tests use an unavailable or injected backend; hardware is opt-in.
(function() {
  var checks = 0, hardwareChecks = 0, skipped = []
  function check(value, message) { checks++; if (!value) throw new Error(message) }
  function equal(a, b, message) { check(stringify(a) == stringify(b), message + ": " + stringify(a)) }
  function throws(fn, message) { var caught = false; try { fn() } catch (e) { caught = true }; check(caught, message) }
  function list(a) { return Array.prototype.slice.call(a) }
  try {
    loadLib("gpu.js")
    var root = _gpuRoot
    var analyzer = require(root + "/gpu-analyzer.js"), emitter = require(root + "/gpu-ir.js")
    var policy = require(root + "/gpu-policy.js"), factory = require(root + "/gpu-service.js")
    var nativeRuntime = require(root + "/gpu-opencl.js").runtime
    var J = Packages.openaf.opacks.gpu
    var xor = function(a, b, c) { for (var i = 0; i < a.length; i++) { c[i] = a[i] ^ b[i] } }
    var math = function(a, b, c) { for (var i = 0; i < a.length; i++) { c[i] = a[i] * 2.5 + b[i] } }
    function analyze(fn, mode) { return analyzer.analyze(String(J.FunctionAccess.source(fn)), mode || "strict") }
    check(analyze(xor).eligible, "strict xor eligible")
    check(analyze(math, "fast").eligible, "fast arithmetic eligible")
    check(!analyze(math).eligible, "strict arithmetic rejected")
    var unsupported = [
      function(a,b,c) { for(var i=0;i<a.length;i++) { c[i]=a[i-1]^b[i] } },
      function(a,b,c) { for(var i=0;i<a.length;i++) { c[i]=a[i]^external } },
      function(a,b,c) { for(var i=0;i<a.length;i++) { print(a[i]);c[i]=a[i] } },
      function(a,b,c) { for(var i=0;i<a.length;i++) { c[i]=Math.sin(a[i]) } },
      function(a,b,c) { for(var i=0;i<a.length;i++) { c[i]=c[i]^a[i] } },
      function(a,b,c) { for(var i=1;i<a.length;i++) { c[i]=a[i]^b[i] } },
      function(a,b,c) { for(var i=0;i<a.length;i+=2) { c[i]=a[i]^b[i] } },
      function(a,b,c) { for(var i=0;i<a.length;i++) { c[i]+=a[i] } },
      function(a,b,c) { for(var i=0;i<a.length;i++) { c[i]=this.value } },
      function(a,b,c) { for(var i=0;i<a.length;i++) { c[i]=arguments[0][i] } },
      function(a,b,c) { for(var i=0;i<a.length;i++) { c[i]=a[i] } return c },
      function(a,b,c) { for(var i=0;i<a.length;i++) { c[i]=(a[i]<<b[i]) } },
      function(a,b,c) { for(var i=0;i<a.length;i++) { c[i]=a[i]/b[i] } }
    ]
    unsupported.forEach(function(fn, i) { check(!analyze(fn).eligible, "unsafe construct rejected " + i) })
    check(!analyze(xor.bind(null)).eligible, "bound function rejected")
    check(!analyze(function(a,b,c=1) { for(var i=0;i<a.length;i++) { c[i]=a[i]^b[i] } }).eligible, "default parameter rejected")
    check(!analyze(function(a,...b) { for(var i=0;i<a.length;i++) { b[i]=a[i] } }).eligible, "rest parameter rejected")
    check(!analyze((a,b,c) => { for(var i=0;i<a.length;i++) { c[i]=a[i]^b[i] } }).eligible, "arrow rejected")
    var poisoned = function(a,b,c) { for(var i=0;i<a.length;i++) { c[i]=a[i]^b[i] } }
    poisoned.toString = function() { throw new Error("must not invoke") }
    check(analyze(poisoned).eligible, "source inspection does not call user toString")
    check(/uint/.test(emitter.emit(analyze(xor), "uint32")), "integer lowering uses unsigned bits")

    var arrayAccess = new J.TypedArrayAccess()
    function guard(fn, args, mode) {
      var p = analyze(fn, mode)
      return arrayAccess.validate(args, p.arrayIndices, p.scalarIndices, p.parameters.length, p.bound, p.output, mode || "strict")
    }
    var a = new Int32Array([0,-1,-2147483648,2147483647]), b = new Int32Array([1,3,7,-9]), c = new Int32Array(4)
    check(guard(xor, [a,b,c]).eligible, "normal arrays pass guards")
    equal(String(guard(xor, [a,b,a]).reason), "output-input-alias", "same-array output rejected")
    var storage = new ArrayBuffer(48)
    check(!guard(xor, [new Int32Array(storage,0,4),b,new Int32Array(storage,4,4)]).eligible, "overlapping views rejected")
    check(guard(xor, [new Int32Array(storage,0,4),b,new Int32Array(storage,16,4)]).eligible, "disjoint views allowed")
    check(!guard(xor, [a,new Int32Array(1),c]).eligible, "short input rejected")
    check(!guard(xor, [a,b,new Int32Array(1)]).eligible, "short output rejected")
    check(!guard(xor, [a,b,new Uint32Array(4)]).eligible, "mixed types rejected")
    check(!guard(xor, [[1,2,3,4],b,c]).eligible, "ordinary arrays rejected")
    check(!guard(xor, [new Float64Array(4),new Float64Array(4),new Float64Array(4)]).eligible, "float64 rejected")
    var scalarFn = function(a,s,c) { for(var i=0;i<a.length;i++) { c[i]=a[i]^s } }
    check(guard(scalarFn,[a,4294967295,c]).eligible, "integer scalar bits accepted")
    check(!guard(scalarFn,[a,1.5,c]).eligible, "fractional integer scalar rejected")
    check(!guard(scalarFn,[a,{valueOf:function(){throw "bad"}},c]).eligible, "scalar coercion rejected")
    var getterCalls = 0, custom = new Int32Array(4)
    Object.defineProperty(custom,"length",{get:function(){getterCalls++;return 4}})
    check(!guard(xor,[custom,b,c]).eligible, "custom length rejected")
    equal(getterCalls,0,"guards do not run caller getters")
    var protoArray = new Int32Array(4), originalProto = Object.getPrototypeOf(protoArray)
    var customProto = Object.create(originalProto)
    Object.defineProperty(customProto,"length",{get:function(){getterCalls++;return 4}})
    Object.setPrototypeOf(protoArray,customProto)
    check(!guard(xor,[protoArray,b,c]).eligible,"custom prototype getter rejected")
    equal(getterCalls,0,"prototype inspection does not run getter")

    var missing = new J.OpenCLBackend("/private/tmp/GPU-test-missing-library")
    check(!missing.probe().available,"missing native library contained in Java")
    check(String(missing.probe().reason).indexOf("UnsatisfiedLinkError")>=0,"native failure recorded")
    missing.close();missing.close()

    function mock() {
      var rt = nativeRuntime(), probes = 0, executions = 0
      rt.probe = function() { probes++;return {available:false,reason:"test-no-gpu",devices:[]} }
      var service = factory.create(rt,analyzer,emitter,policy)
      return { rt:rt, service:service, probes:function(){return probes}, executions:function(){return executions} }
    }
    var m = mock(), cpu = m.service.auto(math,{backend:"cpu"})
    var fc = new Float32Array(3)
    cpu(new Float32Array([1,2,3]),new Float32Array([4,5,6]),fc)
    equal(list(fc),[6.5,10,13.5],"explicit CPU output")
    equal(m.probes(),0,"explicit CPU does not probe OpenCL")
    var fallback = m.service.auto(xor,{backend:"opencl"})
    fallback(a,b,c)
    var reference = new Int32Array(4);xor(a,b,reference)
    equal(list(c),list(reference),"absent backend fallback correct")
    equal(m.service.explain(fallback).lastCall.executedOn,"CPU","fallback diagnostic")
    var calls = 0, original = function(x) { calls++;return this.marker+x }
    var ordinary = m.service.auto(original)
    equal(ordinary.call({marker:10},7),17,"receiver and return preserved")
    equal(calls,1,"original called once")
    var strictOriginal = function(){"use strict";return this}
    var strictReceiver = m.service.auto(strictOriginal)
    check(strictReceiver() === strictOriginal(),"plain strict call preserves Rhino receiver behavior")
    check(strictReceiver.call(undefined) === undefined,"strict explicit undefined receiver preserved")
    check(strictReceiver.call(null) === null,"strict null receiver preserved")
    var plainReceiver = m.service.auto(function(){return this})
    check(plainReceiver() === (function(){return this})(),"ordinary original preserves global receiver")
    var originalError = new Error("original-error"), thrown = m.service.auto(function(){throw originalError})
    try { thrown() } catch(e) { check(e === originalError,"exception identity preserved") }
    [null,false,3,[],{mode:"unsafe"},{backend:"metal"},{minElements:-1},{minElements:0.5},{device:1},{unexpected:true}].forEach(function(o){throws(function(){m.service.auto(xor,o)},"invalid options")})

    var trial = mock(), runCalls = 0, cpuCalls = 0
    trial.rt.source = function() { return String(J.FunctionAccess.source(xor)) }
    trial.rt.probe = function() { return {available:true,reason:"test",devices:[{id:"test-gpu",type:"GPU"}]} }
    function failureResult(commit) { return {success:false,compiled:true,cacheHit:false,commitStarted:commit,
      stage:commit?"commit":"readback",message:"injected",compileMs:0,transferBytes:0} }
    trial.rt.execute = function() { runCalls++;return failureResult(false) }
    var failWrapper = trial.service.auto(function(a,b,c){cpuCalls++;xor(a,b,c)},{minElements:0})
    failWrapper(a,b,c);failWrapper(a,b,c)
    equal(runCalls,0,"first two qualifying calls stay CPU")
    failWrapper(a,b,c)
    equal(runCalls,1,"third call tries GPU")
    equal(cpuCalls,3,"failed third call falls back once")
    equal(trial.service.explain(failWrapper).lastCall.error,"injected","fallback retains backend error")
    failWrapper(a,b,c)
    equal(runCalls,1,"failure is suppressed for automatic mode")
    trial.service.clearCache();failWrapper(a,b,c);failWrapper(a,b,c);failWrapper(a,b,c)
    equal(runCalls,2,"cache clear resets failed selection")
    trial.rt.execute = function() { runCalls++;return failureResult(true) }
    var commitWrapper = trial.service.auto(function(a,b,c){cpuCalls++;xor(a,b,c)},{backend:"opencl"})
    var previous = cpuCalls
    throws(function(){commitWrapper(a,b,c)},"commit failure surfaces")
    equal(cpuCalls,previous,"commit failure never reruns original")
    trial.service.close();commitWrapper(a,b,c)
    equal(cpuCalls,previous+1,"closed service uses original")

    var gpu = new OpenWrap.GPU()
    var useHardware = String(java.lang.System.getenv("OPENAF_GPU_TEST_HARDWARE")) == "1"
      || String(java.lang.System.getProperty("openaf.gpu.testHardware")) == "true"
    if (useHardware && gpu.available()) {
      var device = gpu.devices()[0]
      check(device.type=="GPU","selected device is GPU");hardwareChecks++
      function compare(fn, aa, bb, cc, opts) {
        var expected = new cc.constructor(cc.length)
        fn(aa,bb,expected)
        var accelerated = gpu.auto(fn,opts || {backend:"opencl"})
        accelerated(aa,bb,cc)
        equal(list(cc),list(expected),"GPU differential output")
        equal(gpu.explain(accelerated).lastCall.executedOn,"GPU","actual GPU execution")
        accelerated(aa,bb,cc)
        check(gpu.explain(accelerated).compilation.cacheHit,"compiled kernel cache reused")
        hardwareChecks += 3
        return accelerated
      }
      compare(xor,a,b,c)
      var rand = new java.util.Random(42), ra = new Uint32Array(4096), rb = new Uint32Array(4096)
      for(var i=0;i<ra.length;i++){ra[i]=Number(rand.nextInt())>>>0;rb[i]=Number(rand.nextInt())>>>0}
      compare(xor,ra,rb,new Uint32Array(ra.length))
      compare(function(a,b,c){for(var i=0;i<a.length;i++){c[i]=~(a[i]&b[i])|a[i]}},ra,rb,new Uint32Array(ra.length))
      compare(math,new Float32Array([1,2,3]),new Float32Array([4,5,6]),new Float32Array(3),{backend:"opencl",mode:"fast"})
      var scalarKernel = gpu.auto(scalarFn,{backend:"opencl"}), scalarOutput = new Int32Array(a.length)
      scalarKernel(a,-1,scalarOutput)
      var scalarExpected = new Int32Array(a.length);scalarFn(a,-1,scalarExpected)
      equal(list(scalarOutput),list(scalarExpected),"integer scalar argument marshaled")
      equal(gpu.explain(scalarKernel).lastCall.executedOn,"GPU","scalar GPU execution")
      var scalarMath = function(a,s,c){for(var i=0;i<a.length;i++){c[i]=a[i]*s}}
      var scalarFloat = gpu.auto(scalarMath,{backend:"opencl",mode:"fast"}), scalarFloatOut = new Float32Array(2)
      scalarFloat(new Float32Array([2,3]),2.5,scalarFloatOut)
      equal(list(scalarFloatOut),[5,7.5],"float scalar marshaled")
      var special = gpu.auto(math,{backend:"opencl",mode:"fast"}), specialOut = new Float32Array(5)
      special(new Float32Array([NaN,Infinity,-Infinity,-0,0]),new Float32Array([1,0,0,-0,0]),specialOut)
      check(isNaN(specialOut[0])&&specialOut[1]===Infinity&&specialOut[2]===-Infinity,"fast nonfinite values handled")
      hardwareChecks+=4
      var offsetA = new Int32Array(new ArrayBuffer(32),8,4);offsetA.set(a)
      var offsetC = new Int32Array(new ArrayBuffer(40),12,6);offsetC[5]=123
      var off = gpu.auto(xor,{backend:"opencl"});off(offsetA,b,offsetC)
      equal(list(offsetC).slice(0,4),list(reference),"offset views copied correctly")
      equal(offsetC[5],123,"output suffix preserved");hardwareChecks+=2
      var cancellation = gpu.auto(function(a,b,c){for(var i=0;i<a.length;i++){c[i]=(a[i]+b[i])-a[i]}},{backend:"opencl",mode:"fast"})
      var difference = new Float32Array(1)
      cancellation(new Float32Array([16777216]),new Float32Array([1]),difference)
      equal(difference[0],0,"fast intermediate precision is explicit");hardwareChecks++
      var alias = gpu.auto(xor,{backend:"opencl"}), expectedAlias = new Int32Array(a)
      xor(expectedAlias,b,expectedAlias);alias(a,b,a)
      equal(list(a),list(expectedAlias),"alias falls back to sequential semantics")
      equal(gpu.explain(alias).lastCall.reason,"output-input-alias","alias reason")
      var native = new J.OpenCLBackend()
      var failureOut = new Int32Array([91,92])
      var g = guard(xor,[new Int32Array([1,2]),new Int32Array([3,4]),failureOut])
      var failed = native.execute(g,"not OpenCL C","invalid","")
      check(!failed.success&&!failed.commitStarted,"compile failure remains precommit")
      equal(list(failureOut),[91,92],"compile failure preserves caller output")
      native.close();native.close()
      var concurrent = gpu.auto(xor,{backend:"opencl"})
      var jobs = []
      for(var i=0;i<8;i++)jobs.push({a:new Uint32Array([i,i+1]),b:new Uint32Array([7,9]),c:new Uint32Array(2)})
      var concurrentResults = parallel4Array(jobs,function(job){concurrent(job.a,job.b,job.c);return list(job.c)},4)
      equal(concurrentResults.length,8,"concurrent disjoint calls complete")
      jobs.forEach(function(job){equal(list(job.c),[job.a[0]^7,job.a[1]^9],"concurrent result correct")})
      hardwareChecks++
      check(gpu.stats().cache.entries>0,"cache populated")
      gpu.clearCache();equal(gpu.stats().cache.entries,0,"cache cleared")
      equal(gpu.stats().cache.bufferBytes,0,"pooled buffers released")
    } else {
      skipped.push(useHardware ? "hardware requested but no GPU available" : "hardware tests require OPENAF_GPU_TEST_HARDWARE=1")
      if (useHardware) print(stringify(gpu.backends()))
    }
    gpu.close();gpu.close();check(!gpu.available(),"closed backend unavailable")
    print(stringify({passed:checks,hardwareChecks:hardwareChecks,skipped:skipped}))
    if (useHardware && !hardwareChecks) exit(2)
  } catch (e) { printErr(e);exit(1) }
})()
