var checks=0,clock=0,nativeCalls=0,cpuCalls=0,fail=false
function assert(v,label){if(!v)throw new Error(label);checks++}
var rt={now:function(){return clock},source:function(fn){return String(Packages.openaf.opacks.gpu.FunctionAccess.source(fn))},
 probe:function(kind){return {available:true,devices:[{id:kind}]}},validate:function(args){return {eligible:true,args:args}},
 execute:function(g,s,k,d,backend){nativeCalls++;clock+=backend=='metal'?2:4;if(fail)return {success:false};for(var i=0;i<g.args[0].length;i++)g.args[1][i]=g.args[0][i]^3;return {success:true}},
 cpu:function(a,fn,err,seq,timeout,o,route){cpuCalls++;clock+=route=='parallel'?20:10;if(o.metrics)o.metrics.execution=route;return a.map(fn)},close:function(){},clearCache:function(){}}
var service=require(_gpuRoot+'/gpu-collections.js').attach({close:function(){},clearCache:function(){}},rt,{emit:function(){return 'test'}})
var a=[1,2,3,4],m={},fn=function(v){return v^3},routes=[]
for(var i=0;i<30;i++){assert(JSON.stringify(service.pForEach(a,fn,undefined,false,undefined,{minElements:0,metrics:m}))=='[2,1,0,7]','results');routes.push(m.execution)}
assert(routes.slice(22).every(function(r){return r=='metal'}),'fastest Metal selected')
assert(nativeCalls+cpuCalls==30,'one useful execution per call')
var before=nativeCalls;service.pForEach(a,fn,undefined,false,undefined,{execution:'sequential'});assert(nativeCalls==before,'forced sequential')
service.clearCache();service.pForEach(a,fn,undefined,false,undefined,{minElements:0,metrics:m});assert(m.execution=='sequential'&&m.calls==1,'clear resets learning')
fail=true;before=cpuCalls;service.pForEach(a,fn,undefined,false,undefined,{execution:'metal',metrics:m});assert(cpuCalls==before+1&&m.fallback,'native failure falls back once')
var accessor=[1,2],gets=0;Object.defineProperty(accessor,'0',{get:function(){gets++;return 1}})
service.pForEach(accessor,fn);assert(gets==1,'getter only CPU execution')
var duplicate=function(v,v){return v^3},before=nativeCalls
assert(JSON.stringify(service.pForEach(a,duplicate))=='[3,2,1,0]','duplicate parameters retain callback semantics')
assert(nativeCalls==before,'duplicate parameters cannot reach GPU')
var probes=0;rt.probe=function(){probes++;throw 'driver'};service.clearCache();for(var i=0;i<8;i++)service.pForEach(a,fn,undefined,false,undefined,{minElements:0});assert(probes==2,'failed discovery attempted once per history')
assert(!Object.prototype.hasOwnProperty.call(m,'device'),'diagnostics usable')
print('Collection policy: '+checks+' checks passed')
