// Historical planning POC. See GPU-POC-RESULTS.md; no production integration.
(function(){

var probe=java.lang.Class.forName("com.sun.jna.NativeLibrary").getMethod("getInstance",[java.lang.Class.forName("java.lang.String")]);
var backendAvailable=true, failure="";
var task=new java.util.concurrent.FutureTask(new JavaAdapter(java.util.concurrent.Callable,{call:function(){return com.sun.jna.NativeLibrary.getInstance("/private/tmp/GPU-POC-intentionally-absent-library")}}));task.run();try{task.get()}catch(e){backendAvailable=false;failure=String(e.javaException.getCause().getClass().getName())}
var calls=0;var original=function(a,b,c){calls++;for(var i=0;i<a.length;i++)c[i]=a[i]*2.5+b[i];return this.marker};
var wrap=function(fn){return function(){if(!backendAvailable)return fn.apply(this,arguments);throw "unexpected backend"}};
var c=new Float32Array(3);var result=wrap(original).call({marker:17},new Float32Array([1,2,3]),new Float32Array([4,5,6]),c);
print(stringify({test:"missing-native-library-fallback",backendAvailable:backendAvailable,nativeFailure:failure,calls:calls,returnValue:result,output:Array.prototype.slice.call(c)}));
var side=0;var throwing=wrap(function(){side++;throw new Error("original-error")});try{throwing()}catch(e){print(stringify({test:"original-exception",message:String(e),calls:side}))}

})()

