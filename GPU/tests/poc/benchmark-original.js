// Historical planning POC. See GPU-POC-RESULTS.md; no production integration.
(function(){

function analyzePoc(fn){
 var env=new org.mozilla.javascript.CompilerEnvirons();env.initFromContext(org.mozilla.javascript.Context.getCurrentContext());
 var ast=new org.mozilla.javascript.Parser(env).parse("("+Function.prototype.toString.call(fn)+")","gpu-auto-poc",1),T=org.mozilla.javascript.Token;
 function kind(n){return n==null?"null":String(n.getClass().getSimpleName())}
 function must(v,r){if(!v)throw r}
 function name(n){must(kind(n)=="Name","expected-name");return String(n.getIdentifier())}
 try {
 var f=ast.getFirstChild().getExpression().getExpression(),params=[];
 for(var p=0;p<f.getParams().size();p++)params.push(name(f.getParams().get(p)));
 must(params.length==3&&params.join(",")=="a,b,c","POC-signature");
 var loop=f.getBody().getFirstChild();must(kind(loop)=="ForLoop"&&loop.getNext()==null,"single-for-loop-required");
 var init=loop.getInitializer();must(kind(init)=="VariableDeclaration"&&init.isVar()&&init.getVariables().size()==1,"loop-init");
 var vi=init.getVariables().get(0),idx=name(vi.getTarget());must(idx=="i"&&kind(vi.getInitializer())=="NumberLiteral"&&vi.getInitializer().getNumber()==0,"zero-start");
 var cond=loop.getCondition();must(kind(cond)=="InfixExpression"&&cond.getOperator()==T.LT&&name(cond.getLeft())==idx,"loop-condition");
 var bound=cond.getRight();must(kind(bound)=="PropertyGet"&&name(bound.getTarget())=="a"&&name(bound.getProperty())=="length","loop-bound");
 var up=loop.getIncrement();must(kind(up)=="UpdateExpression"&&up.getOperator()==T.INC&&name(up.getOperand())==idx,"unit-increment");
 var body=loop.getBody(),st=body.getFirstChild();must((kind(body)=="Scope"||kind(body)=="Block")&&kind(st)=="ExpressionStatement"&&st.getNext()==null,"single-store");
 var as=st.getExpression();must(kind(as)=="Assignment"&&as.getOperator()==T.ASSIGN,"simple-assignment");
 function elem(n){must(kind(n)=="ElementGet"&&name(n.getElement())==idx,"nonlocal-index");var a=name(n.getTarget());must(params.indexOf(a)>=0,"free-array");return a}
 must(elem(as.getLeft())=="c","output-c");
 var reads=[];
 function expr(n){
  var k=kind(n);
  if(k=="ElementGet"){var a=elem(n);must(a!="c","output-read");if(reads.indexOf(a)<0)reads.push(a);return a+"[i]"}
  if(k=="NumberLiteral"){var v=Number(n.getNumber());must(isFinite(v),"nonfinite-literal");return String(v)+(Math.floor(v)==v?".0f":"f")}
  if(k=="ParenthesizedExpression")return "("+expr(n.getExpression())+")";
  if(k=="InfixExpression"){var op=Number(n.getOperator()),ops={};ops[T.ADD]="+";ops[T.SUB]="-";ops[T.MUL]="*";must(ops[op],"unsupported-operator");return "("+expr(n.getLeft())+ops[op]+expr(n.getRight())+")"}
  throw "unsupported-expression:"+k;
 }
 var e=expr(as.getRight());
 return {eligible:true,mode:"fast",reason:"single independent element store; runtime types, length and alias guards still required",reads:reads,output:"c",kernel:"#pragma OPENCL FP_CONTRACT OFF\n__kernel void calc(__global const float* a,__global const float* b,__global float* c){size_t i=get_global_id(0);c[i]="+e+";}"};
 }catch(e){return {eligible:false,reason:String(e)}}
}

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
var candidate=function(a,b,c){for(var i=0;i<a.length;i++){c[i]=a[i]*2.5+b[i]}};
var analysis=analyzePoc(candidate);if(!analysis.eligible)throw stringify(analysis);print(stringify({analysis:analysis}));
var src=analysis.kernel;
var sb=alloc(src.length+1);sb.setString(0,src);var spp=alloc(8);spp.setPointer(0,sb);
program=ptr("clCreateProgramWithSource",[ctx,I(1),spp,null,err]);var t=gpuPocNow();
var br=lib.getFunction("clBuildProgram").invokeInt([program,I(1),ds,"-cl-std=CL1.2",null,null]);
if(br!=0){call("clGetProgramBuildInfo",[program,d,I(4483),L(8192),info,null]);throw "build "+br+": "+info.getString(0)}
var buildMs=gpuPocNow()-t;kernel=ptr("clCreateKernel",[program,"calc",err]);
var n=262144,bytes=n*4,a=new Float32Array(n),b=new Float32Array(n),c=new Float32Array(n);
for(var i=0;i<n;i++){a[i]=(i%1024)*0.25;b[i]=i%31}
var ha=alloc(bytes),hb=alloc(bytes),hc=alloc(bytes);
var backingMethod=java.lang.Class.forName("org.mozilla.javascript.typedarrays.NativeArrayBuffer").getMethod("getBuffer",[]);
var fa=java.lang.reflect.Array.newInstance(java.lang.Float.TYPE,n),fb=java.lang.reflect.Array.newInstance(java.lang.Float.TYPE,n),fc=java.lang.reflect.Array.newInstance(java.lang.Float.TYPE,n);
function backing(x){return backingMethod.invoke(x.buffer,[])}
function fview(x){return java.nio.ByteBuffer.wrap(backing(x)).order(java.nio.ByteOrder.BIG_ENDIAN).asFloatBuffer()}
function marshal(){fview(a).get(fa);fview(b).get(fb);ha.write(0,fa,0,n);hb.write(0,fb,0,n)}
var marsh=gpuPocNow();marshal();var marshalMs=gpuPocNow()-marsh;
for(var k=0;k<3;k++){var p=ptr("clCreateBuffer",[ctx,L(k<2?4:2),L(bytes),null,err]);bufs.push(p);var arg=alloc(8);arg.setPointer(0,p);call("clSetKernelArg",[kernel,I(k),L(8),arg])}
var global=alloc(8);global.setLong(0,L(n));var ev=alloc(8),stamp=alloc(8);
function run(){var wall=gpuPocNow();call("clEnqueueWriteBuffer",[queue,bufs[0],I(1),L(0),L(bytes),ha,I(0),null,null]);call("clEnqueueWriteBuffer",[queue,bufs[1],I(1),L(0),L(bytes),hb,I(0),null,null]);call("clEnqueueNDRangeKernel",[queue,kernel,I(1),null,global,null,I(0),null,ev]);call("clEnqueueReadBuffer",[queue,bufs[2],I(1),L(0),L(bytes),hc,I(0),null,null]);var total=gpuPocNow()-wall;call("clGetEventProfilingInfo",[ev.getPointer(0),I(4738),L(8),stamp,null]);var s=Number(stamp.getLong(0));call("clGetEventProfilingInfo",[ev.getPointer(0),I(4739),L(8),stamp,null]);var gpu=(Number(stamp.getLong(0))-s)/1e6;call("clReleaseEvent",[ev.getPointer(0)]);return {transferLaunchReadMs:total,kernelMs:gpu}}
var first=run();hc.read(0,fc,0,n);fview(c).put(fc);var coldWall=gpuPocNow()-start;var warm=[];for(var r=0;r<5;r++)warm.push(run());
var copy=gpuPocNow();hc.read(0,fc,0,n);fview(c).put(fc);var commitMs=gpuPocNow()-copy;
var endToEnd=[];for(var rr=0;rr<60;rr++){var tt=gpuPocNow();marshal();run();hc.read(0,fc,0,n);fview(c).put(fc);if(rr>=30)endToEnd.push(gpuPocNow()-tt)}
var f=function(a,b,c){for(var i=0;i<a.length;i++){c[i]=a[i]*2.5+b[i]}};
var expected=new Float32Array(n),cpu=[];for(var r=0;r<60;r++){var t=gpuPocNow();f(a,b,expected);if(r>=30)cpu.push(gpuPocNow()-t)}
var mismatches=0;for(var i=0;i<n;i++)if(c[i]!==expected[i])mismatches++;
function summary(v){v.sort(function(a,b){return a-b});return {min:v[0],median:(v[14]+v[15])/2,p95:v[28],max:v[29]}}
print(stringify({n:n,buildMs:buildMs,coldSetupAndFirstCallMs:coldWall,steadyGpuEndToEndMs:summary(endToEnd),steadyRhinoMs:summary(cpu),mismatches:mismatches,warmup:30,samples:30,note:"GPU and CPU measured in sequential batches; allocations reused; discovery and analysis excluded; cold setup includes test input creation"}));
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

