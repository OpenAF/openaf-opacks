loadLib('gpu.js');ow.loadGPU()
function fn(v){return v^12345}
var evidence=[]
;[512,65536,262144].forEach(function(n){
 var a=[];for(var i=0;i<n;i++)a.push(i%8192)
 var counts={},last={},costs=[]
 for(var call=0;call<48;call++){
  var m={},result=pForEach(a,fn,undefined,false,undefined,{minElements:0,metrics:m})
  if(result.length!=n||result[0]!=fn(a[0])||result[n-1]!=fn(a[n-1]))throw 'mismatch'
  if(call>=32){counts[m.execution]=(counts[m.execution]||0)+1;costs.push(m.totalMs)}
  last=m
 }
 evidence.push({length:n,last16:counts,completeCallMs:costs,last:last});print(JSON.stringify(evidence[evidence.length-1]))
})
var file=java.lang.System.getProperty('openaf.gpu.collectionEvidence');if(file)io.writeFileJSON(String(file),evidence)
