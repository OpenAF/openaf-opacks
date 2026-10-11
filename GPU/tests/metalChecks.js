(function() {
  var service, checks = 0, hardware = 0
  function check(value, message) { checks++; if (!value) throw new Error(message) }
  function same(a,b,message) { check(stringify(Array.prototype.slice.call(a)) == stringify(Array.prototype.slice.call(b)),message) }
  try {
    var J = Packages.openaf.opacks.gpu
    var analyzer = require(_gpuRoot + "/gpu-analyzer.js"), emitter = require(_gpuRoot + "/gpu-ir.js")
    var policy = require(_gpuRoot + "/gpu-policy.js"), factory = require(_gpuRoot + "/gpu-service.js")
    var xor = function(a,b,c) { for(var i=0;i<a.length;i++) { c[i]=a[i]^b[i] } }
    var scalar = function(a,s,c) { for(var i=0;i<a.length;i++) { c[i]=~a[i]^s } }
    var math = function(a,b,c) { for(var i=0;i<a.length;i++) { c[i]=a[i]*2.5+b[i] } }
    var plan = analyzer.analyze(String(J.FunctionAccess.source(xor)),"strict")
    var source = emitter.emit(plan,"int32","metal")
    check(source.indexOf("[[buffer(0)]]")>=0 && source.indexOf("thread_position_in_grid")>=0,"Metal bindings emitted")
    check(source.indexOf("__global")<0 && source.indexOf("get_global_id")<0,"No OpenCL syntax in Metal")
    check(policy.select({backend:"metal"},1,{calls:0})=="gpu-trial","Explicit Metal bypasses reuse threshold")
    var missing = new J.MetalBackend("/private/tmp/GPU-test-missing-metal-library")
    check(!missing.probe().available,"Missing Metal bridge contained")
    missing.close(); missing.close()
    var rt = require(_gpuRoot + "/gpu-opencl.js").runtime(), probes = 0
    rt.probe = function(kind) { probes++;check(kind=="metal","Metal probe routed");return {available:false,devices:[],reason:"test-unavailable"} }
    service = factory.create(rt,analyzer,emitter,policy)
    var a = new Int32Array([0,-1,-2147483648,2147483647]), b = new Int32Array([1,3,7,-9]), c = new Int32Array(4), expected = new Int32Array(4)
    var fn = service.auto(xor,{backend:"metal"});fn(a,b,c);xor(a,b,expected)
    same(c,expected,"Unavailable Metal uses original")
    check(service.explain(fn).lastCall.executedOn=="CPU","Fallback diagnostic")
    service.close()
    var enabled = String(java.lang.System.getProperty("openaf.gpu.testMetal"))=="true"
    if (enabled) {
      service = new OpenWrap.GPU()
      var devices = service.devices().filter(function(d){return d.backend=="metal"})
      check(devices.length>0,"Hardware requested: Metal device required")
      check(service.available(),"Service reports available Metal hardware")
      function run(fn,args,mode) {
        var accelerated = service.auto(fn,{backend:"metal",mode:mode||"strict"})
        accelerated.apply(null,args)
        check(service.explain(accelerated).lastCall.executedOn=="GPU","Actual Metal execution: "+stringify(service.explain(accelerated)))
        check(service.explain(accelerated).lastCall.selectedBackend=="metal","Metal diagnostics")
        hardware++
        return accelerated
      }
      fn = run(xor,[a,b,c]);same(c,expected,"Integer boundaries")
      a[1]=123;fn(a,b,c);xor(a,b,expected);same(c,expected,"Cached pipeline refreshes inputs")
      check(service.explain(fn).compilation.cacheHit,"Pipeline cache reused")
      run(scalar,[a,4294967295,c]);scalar(a,4294967295,expected);same(c,expected,"Unsigned scalar bit pattern")
      var ua = new Uint32Array([0,4294967295,2147483648]), ub = new Uint32Array([1,3,7]), uc = new Uint32Array(3), ue = new Uint32Array(3)
      run(xor,[ua,ub,uc]);xor(ua,ub,ue);same(uc,ue,"Uint32 bits")
      var fa = new Float32Array([0,0.25,-2,16]), fb = new Float32Array([1,4,7,8]), fc = new Float32Array(4), fe = new Float32Array(4)
      run(math,[fa,fb,fc],"fast");math(fa,fb,fe);same(fc,fe,"Exact Float32 arithmetic")
      var sf = function(a,s,c) { for(var i=0;i<a.length;i++) { c[i]=a[i]*s } }
      run(sf,[fa,2.5,fc],"fast");sf(fa,2.5,fe);same(fc,fe,"Float32 scalar")
      var multiplyAdd = function(a,b,c,d) { for(var i=0;i<a.length;i++) { d[i]=a[i]*b[i]+c[i] } }
      var contractionOut = new Float32Array(1)
      run(multiplyAdd,[new Float32Array([1+Math.pow(2,-23)]),new Float32Array([1-Math.pow(2,-23)]),new Float32Array([-1]),contractionOut],"fast")
      check(contractionOut[0]===0,"Fused contraction disabled")
      var cancellation = function(a,c) { for(var i=0;i<a.length;i++) { c[i]=(a[i]+1)-a[i] } }
      var cancelOut = new Float32Array(1);run(cancellation,[new Float32Array([16777216]),cancelOut],"fast")
      check(cancelOut[0]==0,"Fast FP32 intermediate semantics")
      var random = new java.util.Random(42), ra = new Uint32Array(2048), rb = new Uint32Array(2048), rc = new Uint32Array(2048), re = new Uint32Array(2048)
      for(var i=0;i<ra.length;i++){ra[i]=Number(random.nextInt())>>>0;rb[i]=Number(random.nextInt())>>>0}
      var bits = function(a,b,c) { for(var i=0;i<a.length;i++) { c[i]=~(a[i]&b[i])|a[i] } }
      run(bits,[ra,rb,rc]);bits(ra,rb,re);same(rc,re,"Random strict bitwise differential")
      var copy = function(a,c) { for(var i=0;i<a.length;i++) { c[i]=a[i] } }
      var special = new Float32Array([NaN,Infinity,-Infinity,-0,0,1.401298464324817e-45]), specialOut = new Float32Array(6)
      run(copy,[special,specialOut],"fast")
      check(isNaN(specialOut[0]) && specialOut[1]===Infinity && specialOut[2]===-Infinity,"Copy special floating values")
      check(1/specialOut[3]===-Infinity && 1/specialOut[4]===Infinity && specialOut[5]===special[5],"Copy signed zero and subnormal")
      var rejected = service.auto(xor,{backend:"metal",device:"metal:missing"});rejected(a,b,c)
      check(service.explain(rejected).lastCall.reason=="requested-device-unavailable","Explicit invalid device falls back")
      var backing = new Int32Array(20);backing.fill(77)
      var out = backing.subarray(4,8);run(xor,[a,b,out]);xor(a,b,expected);same(out,expected,"Offset output")
      check(backing[3]==77 && backing[8]==77,"Output suffix/prefix preserved")
      var alias = service.auto(xor,{backend:"metal"});alias(a,b,a)
      check(service.explain(alias).lastCall.executedOn=="CPU","Alias guard preserved")
      var bridge = new J.MetalBackend(_gpuRoot+"/lib/libgpu-metal-"+String(java.lang.System.getProperty("os.arch"))+".dylib")
      var access = new J.TypedArrayAccess(), guard = access.validate([a,b,c],plan.arrayIndices,plan.scalarIndices,plan.parameters.length,plan.bound,plan.output,"strict")
      c.fill(99)
      var failure = bridge.execute(guard,"invalid Metal source","invalid","metal:0")
      check(!failure.success && !failure.commitStarted && String(failure.stage)=="compile","Invalid shader fails before commit")
      same(c,new Int32Array([99,99,99,99]),"Compile failure preserves caller output")
      bridge.close();bridge.close()
      for(var k=0;k<36;k++) {
        var generated = eval("(function(a,c){for(var i=0;i<a.length;i++){c[i]=a[i]^"+k+"}})")
        run(generated,[a,c]);check(c[0]==(a[0]^k),"Eviction output")
      }
      check(service.stats().cache.backends.metal.entries<=32,"Pipeline cache bounded")
      var concurrentResults = parallel4Array([0,1,2,3,4,5,6,7],function(n) {
        var x = new Int32Array([n,n+1]), y = new Int32Array([3,7]), z = new Int32Array(2)
        fn(x,y,z)
        if(z[0]!=(n^3)||z[1]!=((n+1)^7))throw new Error("Concurrent Metal result")
        return n
      })
      check(concurrentResults.length==8,"Concurrent disjoint Metal calls")
      service.clearCache();check(service.stats().cache.entries==0,"Cache released")
      fn(a,b,c);check(service.explain(fn).lastCall.executedOn=="GPU","Recompiles after clear")
      service.close();service.close();fn(a,b,c)
      check(service.explain(fn).lastCall.executedOn=="CPU","Closed service falls back")
    }
    print(stringify({checks:checks,hardwareCalls:hardware,skipped:enabled?[]:["Metal hardware (enable openaf.gpu.testMetal)"]}))
  } catch(e) { printErr(e);exit(1) }
  finally { if(service)service.close() }
})()
