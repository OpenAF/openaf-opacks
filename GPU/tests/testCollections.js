load('GPU/gpu.js'); ow.loadGPU()
var checks=0
function equal(a,b,label){if(JSON.stringify(a)!=JSON.stringify(b))throw new Error(label+': '+JSON.stringify(a)+' != '+JSON.stringify(b));checks++}
function map(v){return v^3}
var a=[];for(var i=0;i<256;i++)a.push(i-128)
var expected=a.map(map),metrics={}
for(var call=0;call<30;call++)equal(pForEach(a,map,undefined,false,undefined,{metrics:metrics,minElements:0}),expected,'map '+call)
equal(pForEach(a,map,undefined,false,undefined,{useGPU:false}),expected,'bypass')
var count=0;equal(pForEach([1,2,3],function(v,i){count++;return v+i},undefined,true),[1,3,5],'indexes');equal(count,3,'once')
var errors=[];equal(pForEach([1,2,3],function(v){if(v==2)throw 'bad';return v},function(e){errors.push(String(e))},true),[1,undefined,3],'errors');equal(errors.length,1,'error count')
var getterCount=0,accessor=[1,2];Object.defineProperty(accessor,'0',{get:function(){getterCount++;return 1}})
equal(pForEach(accessor,map),[2,1],'accessor fallback');equal(getterCount,1,'getter once')
var cpuPar=parallel4Array(a,map,undefined,undefined,{useGPU:false}),gpuPar=parallel4Array(a,map)
equal(cpuPar.slice().sort(function(a,b){return a-b}),gpuPar.slice().sort(function(a,b){return a-b}),'parallel multiset')
var cores=getNumberOfCores()+1,chunks=[]
for(var c=0;c<cores;c++){var lo=Math.round(a.length/cores*c),hi=Math.round(a.length/cores*(c+1));chunks.push(expected.slice(lo,hi).reverse())}
if(cores<a.length)equal(gpuPar,[].concat.apply([],chunks),'partition reversal')
var ctrl={};parallel4Array([1,2,3],map,2,ctrl);equal(typeof ctrl.__threads,'object','thread control')
;['sum','average','min','max'].forEach(function(op){
 var fallback=function(){return op=='sum'?a.reduce(function(x,y){return x+y},0):op=='average'?a.reduce(function(x,y){return x+y},0)/a.length:op=='min'?Math.min.apply(null,a):Math.max.apply(null,a)}
 for(var i=0;i<24;i++)equal(ow.gpu.aggregate(a,op,fallback,{minElements:0}),fallback(),'aggregate '+op)
 ;['opencl','metal'].forEach(function(route){var m={};equal(ow.gpu.aggregate(a,op,fallback,{execution:route,metrics:m}),fallback(),'explicit '+route+' '+op);print(JSON.stringify({operation:op,metrics:m}))})
})
load('../nLinq/dist/openafnlinq.js')
equal(nLinq(a).gpu({minElements:0}).sum(),-128,'nLinq sum')
equal(nLinq(a).greater(0).gpu().sum(),8128,'filter')
equal(nLinq([{v:1},{v:2}]).gpu().sum('v'),3,'keyed fallback')
equal(nLinq([0.1,0.2,0.3]).gpu().sum(),0.1+0.2+0.3,'float order')
equal(nLinq([]).gpu().average(),undefined,'empty average')
equal(1/nLinq([-0,0]).gpu().min() === -Infinity,true,'negative zero preserved')
print('Collections: '+checks+' checks passed; last map '+JSON.stringify(metrics))
