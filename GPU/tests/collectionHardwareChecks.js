// Explicit hardware proof: a fallback is a failure in this script.
var checks=0,calls=0
function check(v,label){checks++;if(!v)throw new Error(label)}
;['opencl','metal'].forEach(function(route){
 ;[37,513,4097].forEach(function(n){
  var a=[];for(var i=0;i<n;i++)a.push((i%97)-48)
  var m={},out=ow.gpu.pForEach(a,function(v){return v^12345},undefined,false,undefined,{execution:route,metrics:m})
  check(m.execution==route&&!m.fallback,route+' map executed on GPU');calls++
  for(var i=0;i<n;i++)check(out[i]==(a[i]^12345),route+' map '+i)
  ;['sum','average','min','max'].forEach(function(op){
   var total=a.reduce(function(x,y){return x+y},0)
   var expected=op=='sum'?total:op=='average'?total/n:op=='min'?Math.min.apply(null,a):Math.max.apply(null,a)
   var fallbackCalls=0,m={},actual=ow.gpu.aggregate(a,op,function(){fallbackCalls++;return expected},{execution:route,metrics:m})
   check(m.execution==route&&!m.fallback,route+' '+op+' executed on GPU');calls++
   check(actual===expected,route+' '+op+' exact');check(fallbackCalls==0,'no fallback replay')
  })
 })
 var a=[0.25,1.5,-4.125],m={},out=ow.gpu.pForEach(a,v=>v*2.5+3,undefined,false,undefined,{execution:route,mode:'fast',metrics:m})
 check(m.execution==route&&!m.fallback,route+' fast arrow callback');calls++
 for(var i=0;i<a.length;i++)check(out[i]===Math.fround(Math.fround(a[i]*2.5)+3),'FP32 result')
})
print(JSON.stringify({checks:checks,hardwareCalls:calls}))
