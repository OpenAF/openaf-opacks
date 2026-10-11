// Historical planning POC. See GPU-POC-RESULTS.md; no production integration.
(function(){

var M=com.sun.jna.Memory, lib=com.sun.jna.NativeLibrary.getInstance("/System/Library/Frameworks/OpenCL.framework/OpenCL");
function I(v){return java.lang.Integer.valueOf(v)} function L(v){return java.lang.Long.valueOf(v)}
var mem=[], handles=[]; function alloc(n){var m=new M(n);mem.push(m);return m}
function call(n,a){var r=lib.getFunction(n).invokeInt(a);if(r!=0)throw n+": "+r;return r}
function ptr(n,a){var p=lib.getFunction(n).invokePointer(a);if(err.getInt(0)!=0||p==null)throw n+": "+err.getInt(0);return p}
function gpuPocNow(){return Number(java.lang.System.nanoTime())/1e6}
var err=alloc(4),ps=alloc(8),ds=alloc(8),count=alloc(4);
call("clGetPlatformIDs",[I(1),ps,count]);call("clGetDeviceIDs",[ps.getPointer(0),L(4),I(1),ds,count]);
var d=ds.getPointer(0),info=alloc(8192);call("clGetDeviceInfo",[d,I(4096),L(8),info,null]);var deviceType=Number(info.getLong(0));
call("clGetDeviceInfo",[d,I(4146),L(8),info,null]);var fp64=Number(info.getLong(0));
call("clGetDeviceInfo",[d,I(4141),L(8192),info,null]);var driver=String(info.getString(0));
var ctx,queue,program,kernel,bufs=[];
try {
var start=gpuPocNow();
ctx=ptr("clCreateContext",[null,I(1),ds,null,null,err]);
queue=ptr("clCreateCommandQueue",[ctx,d,L(2),err]);
var src="#pragma OPENCL FP_CONTRACT OFF\n__kernel void calc(__global const float* a,__global const float* b,__global float* c){size_t i=get_global_id(0);c[i]=a[i]*2.5f+b[i];}";
var sb=alloc(src.length+1);sb.setString(0,src);var spp=alloc(8);spp.setPointer(0,sb);
program=ptr("clCreateProgramWithSource",[ctx,I(1),spp,null,err]);var t=gpuPocNow();
var br=lib.getFunction("clBuildProgram").invokeInt([program,I(1),ds,"-cl-std=CL1.2",null,null]);
if(br!=0){call("clGetProgramBuildInfo",[program,d,I(4483),L(8192),info,null]);throw "build "+br+": "+info.getString(0)}
var buildMs=gpuPocNow()-t;kernel=ptr("clCreateKernel",[program,"calc",err]);
var n=262144,bytes=n*4,a=new Float32Array(n),b=new Float32Array(n),c=new Float32Array(n);
for(var i=0;i<n;i++){a[i]=(i%1024)*0.25;b[i]=i%31}
var ha=alloc(bytes),hb=alloc(bytes),hc=alloc(bytes);
var marsh=gpuPocNow();for(var i=0;i<n;i++){ha.setFloat(i*4,a[i]);hb.setFloat(i*4,b[i])}var marshalMs=gpuPocNow()-marsh;
for(var k=0;k<3;k++){var p=ptr("clCreateBuffer",[ctx,L(k<2?4:2),L(bytes),null,err]);bufs.push(p);var arg=alloc(8);arg.setPointer(0,p);call("clSetKernelArg",[kernel,I(k),L(8),arg])}
var global=alloc(8);global.setLong(0,L(n));var ev=alloc(8),stamp=alloc(8);
function run(){var wall=gpuPocNow();call("clEnqueueWriteBuffer",[queue,bufs[0],I(1),L(0),L(bytes),ha,I(0),null,null]);call("clEnqueueWriteBuffer",[queue,bufs[1],I(1),L(0),L(bytes),hb,I(0),null,null]);call("clEnqueueNDRangeKernel",[queue,kernel,I(1),null,global,null,I(0),null,ev]);call("clEnqueueReadBuffer",[queue,bufs[2],I(1),L(0),L(bytes),hc,I(0),null,null]);var total=gpuPocNow()-wall;call("clGetEventProfilingInfo",[ev.getPointer(0),I(4738),L(8),stamp,null]);var s=Number(stamp.getLong(0));call("clGetEventProfilingInfo",[ev.getPointer(0),I(4739),L(8),stamp,null]);var gpu=(Number(stamp.getLong(0))-s)/1e6;call("clReleaseEvent",[ev.getPointer(0)]);return {transferLaunchReadMs:total,kernelMs:gpu}}
var first=run(),warm=[];for(var r=0;r<5;r++)warm.push(run());
var copy=gpuPocNow();for(var i=0;i<n;i++)c[i]=hc.getFloat(i*4);var commitMs=gpuPocNow()-copy;
var f=function(a,b,c){for(var i=0;i<a.length;i++){c[i]=a[i]*2.5+b[i]}};
var expected=new Float32Array(n),cpu=[];for(var r=0;r<6;r++){var t=gpuPocNow();f(a,b,expected);cpu.push(gpuPocNow()-t)}
var mismatches=0;for(var i=0;i<n;i++)if(c[i]!==expected[i])mismatches++;
print(stringify({deviceType:deviceType,fp64:fp64,driver:driver,n:n,source:src,buildMs:buildMs,marshalMs:marshalMs,commitMs:commitMs,first:first,warm:warm,cpuMs:cpu,mismatches:mismatches,note:"Host per-element JNA marshaling measured separately; exact binary-fraction test inputs only"}));
}finally{
if(queue)lib.getFunction("clFinish").invokeInt([queue]);
bufs.reverse().forEach(function(p){lib.getFunction("clReleaseMemObject").invokeInt([p])});
if(kernel)lib.getFunction("clReleaseKernel").invokeInt([kernel]);
if(program)lib.getFunction("clReleaseProgram").invokeInt([program]);
if(queue)lib.getFunction("clReleaseCommandQueue").invokeInt([queue]);
if(ctx)lib.getFunction("clReleaseContext").invokeInt([ctx]);
mem.reverse().forEach(function(m){m.close()});
}

})()

