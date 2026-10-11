// Deterministic internal-clock/backend injection: no GPU required.
(function() {
  var checks=0
  function check(value,message){checks++;if(!value)throw new Error(message)}
  try {
    loadLib("gpu.js")
    var factory=require(_gpuRoot+"/gpu-service.js"),analyzer=require(_gpuRoot+"/gpu-analyzer.js")
    var emitter=require(_gpuRoot+"/gpu-ir.js"),policy=require(_gpuRoot+"/gpu-policy.js")
    var nativeRuntime=require(_gpuRoot+"/gpu-opencl.js")
    var xor=function(a,b,c){for(var i=0;i<a.length;i++){c[i]=a[i]^b[i]}}
    var source=String(Packages.openaf.opacks.gpu.FunctionAccess.source(xor))
    function fixture(cpuMs,costs,options) {
      var time=0,cpuCalls=0,gpuCalls=0,probes=0,compile={},fail={},rt=nativeRuntime.runtime()
      rt.now=function(){return time}
      rt.source=function(){return source}
      rt.devices=function(){probes++;return Object.keys(costs).map(function(k){return {id:k+":0",backend:k}})}
      rt.probe=function(k){return {available:true,devices:[{id:k+":0",backend:k}]}}
      rt.execute=function(g,s,key,id,kind){
        gpuCalls++;time+=costs[kind]
        var cold=!compile[key];compile[key]=true
        if(cold)time+=100
        if(!fail[kind])xor(args[0],args[1],args[2])
        return {success:!fail[kind],compiled:true,cacheHit:!cold,compileMs:cold?100:0,
          commitStarted:fail[kind]=="commit",transferBytes:0,stage:"execute",message:"injected"}
      }
      rt.cache=function(){return {entries:0,bufferBytes:0}}
      rt.clearCache=function(){compile={}}
      rt.close=function(){}
      var service=factory.create(rt,analyzer,emitter,policy)
      var args=[new Int32Array([1,2,3]),new Int32Array([4,5,6]),new Int32Array(3)]
      var fn=service.auto(function(a,b,c){cpuCalls++;time+=cpuMs;xor(a,b,c)},options||{backend:"adaptive"})
      return {service:service,fn:fn,args:args,costs:costs,fail:fail,
        run:function(n){for(var i=0;i<n;i++)fn.apply(null,args)},
        cpu:function(){return cpuCalls},gpu:function(){return gpuCalls},probes:function(){return probes},
        cpuCost:function(n){cpuMs=n}}
    }
    var f=fixture(10,{opencl:4,metal:2})
    f.run(2);check(f.gpu()==0&&f.probes()==0,"Reuse calls do not probe GPU")
    f.run(6);check(f.gpu()==6,"Three useful calls trial each backend")
    f.run(15);var d=f.service.explain(f.fn)
    check(d.lastCall.selectedBackend=="metal","Fastest GPU selected")
    check(d.selection[0].candidates[1].ms==2,"Cold compilation excluded from warm choice")
    check(f.args[2][0]==5&&f.args[2][1]==7&&f.args[2][2]==5,"Correct selected output")
    check(f.cpu()+f.gpu()==23,"Successful calls execute exactly once")
    f.cpuCost(0.1);f.run(256)
    check(f.service.explain(f.fn).lastCall.executedOn=="CPU","Recalibration switches to faster CPU")
    f.cpuCost(20);f.costs.opencl=1;f.costs.metal=8;f.run(256)
    check(f.service.explain(f.fn).lastCall.selectedBackend=="opencl","Recalibration switches GPU backend")
    var oldGpu=f.gpu();f.service.clearCache();f.run(2)
    check(f.gpu()==oldGpu,"Clearing cache restarts learning")
    f.service.close()
    f=fixture(1,{opencl:4,metal:2});f.run(23)
    check(f.service.explain(f.fn).lastCall.executedOn=="CPU","CPU beats both GPUs")
    f.service.close()
    f=fixture(10,{opencl:4,metal:2});f.fail.opencl=true;f.run(21)
    check(f.service.explain(f.fn).lastCall.selectedBackend=="metal","Failure of one backend permits the other")
    var failed=f.service.explain(f.fn).selection[0].candidates[0]
    check(failed.failed&&failed.samples==0,"Failed backend suppressed")
    check(f.cpu()+f.gpu()==22,"Only failed precommit attempt adds a fallback execution")
    f.service.close()
    f=fixture(10,{opencl:4,metal:2});f.run(23)
    f.args[0]=new Int32Array(4);f.args[1]=new Int32Array(4);f.args[2]=new Int32Array(4)
    var before=f.gpu();f.run(2)
    check(f.gpu()==before&&f.service.explain(f.fn).selection.length==2,"New length learns independently")
    f.service.close()
    f=fixture(10,{metal:9.5});f.run(23)
    check(f.service.explain(f.fn).lastCall.executedOn=="CPU","Benefit margin avoids marginal GPU choice")
    f.service.close()
    f=fixture(10,{metal:2},{backend:"adaptive",minElements:100});f.run(9)
    check(f.gpu()==0&&f.probes()==0,"Explicit minimum retains CPU without probing")
    f.service.close()
    f=fixture(10,{opencl:4,metal:2},{backend:"adaptive",device:"metal:0"});f.run(20)
    check(f.service.explain(f.fn).lastCall.selectedBackend=="metal"&&f.service.explain(f.fn).selection[0].candidates.length==1,"Device restriction respected")
    f.service.close()
    f=fixture(100,{metal:2});f.run(2);f.cpuCost(0.1);f.run(18)
    check(f.service.explain(f.fn).lastCall.executedOn=="CPU","Warm CPU calibration replaces cold startup bias")
    f.service.close()
    f=fixture(10,{metal:2},{backend:"cpu"});f.run(4)
    check(f.gpu()==0&&f.probes()==0,"Explicit CPU does not discover adaptive backends")
    f.service.close()
    f=fixture(10,{opencl:4,metal:2});f.fail.opencl="commit";f.run(2)
    var caught=false;try{f.run(1)}catch(e){caught=true}
    check(caught&&f.cpu()==2,"Adaptive postcommit failure never reruns original")
    f.service.close()
    f=fixture(1,{metal:2})
    for(var length=1;length<=66;length++){
      f.args[0]=new Int32Array(length);f.args[1]=new Int32Array(length);f.args[2]=new Int32Array(length);f.run(2)
    }
    check(f.service.explain(f.fn).selection.length==64,"Workload learning is bounded")
    f.service.close()
    f=fixture(10,{});f.run(4)
    check(f.gpu()==0&&f.cpu()==4,"Missing GPUs use CPU")
    f.service.close()
    print(stringify({passed:checks,hardware:false}))
  }catch(e){printErr(e);exit(1)}
})()
