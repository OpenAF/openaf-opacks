loadLib("gpu.js")
ow.loadGPU()
try {
  var calculate=ow.gpu.auto(function(a,b,c) {
    for(var i=0;i<a.length;i++) { c[i]=a[i]*2.5+b[i] }
  },{backend:"adaptive",mode:"fast"})
  var a=new Float32Array(262144),b=new Float32Array(262144),c=new Float32Array(262144)
  // Repeated useful work lets the wrapper learn CPU/OpenCL/Metal complete-call costs.
  for(var step=0;step<32;step++){a[0]=step;calculate(a,b,c)}
  print(stringify(ow.gpu.explain(calculate)))
}finally{ow.gpu.close()}
