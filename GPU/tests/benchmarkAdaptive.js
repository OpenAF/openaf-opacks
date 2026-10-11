// Live learning evidence: oaf -f tests/benchmarkAdaptive.js
(function() {
  var service
  try {
    loadLib("gpu.js")
    service=new OpenWrap.GPU()
    if(!service.available()){print(stringify({unavailable:true,backends:service.backends()}));exit(2)}
    var transform=function(a,b,c){for(var i=0;i<a.length;i++){c[i]=a[i]*2.5+b[i]}}
    var rows=[]
    ;[4096,65536,262144].forEach(function(n){
      var a=new Float32Array(n),b=new Float32Array(n),c=new Float32Array(n)
      for(var i=0;i<n;i++){a[i]=(i%1024)*0.25;b[i]=i%31}
      var fn=service.auto(transform,{backend:"adaptive",mode:"fast"}),last32={},early=[]
      for(var k=0;k<96;k++){
        fn(a,b,c)
        var d=service.explain(fn),call=d.lastCall
        if(k<9)early.push({backend:call.selectedBackend,reason:call.reason,totalMs:call.totalMs})
        var route=call.executedOn=="GPU"?call.selectedBackend:"cpu"
        if(k>=64)last32[route]=(last32[route]||0)+1
      }
      var mismatches=0
      for(var i=0;i<n;i++)if(c[i]!==a[i]*2.5+b[i])mismatches++
      if(mismatches)throw new Error("Adaptive output mismatch")
      rows.push({elements:n,early:early,last32:last32,selection:service.explain(fn).selection,mismatches:mismatches})
    })
    var report={openaf:getVersion(),java:String(java.lang.System.getProperty("java.version")),
      devices:service.devices(),callsPerSize:96,rows:rows,
      note:"Useful calls only; learning and periodic calibration included. Timings are local observations, not a guaranteed fastest choice."}
    var path=java.lang.System.getProperty("openaf.gpu.adaptiveEvidence")
    if(path)io.writeFileJSON(String(path),report)
    print(stringify(report))
  }catch(e){printErr(e);exit(1)}finally{if(service)service.close()}
})()
