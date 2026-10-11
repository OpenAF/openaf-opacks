loadLib("gpu.js")
ow.loadGPU()
var calculate = ow.gpu.auto(function(a,b,c) {
  for(var i=0;i<a.length;i++) {
    c[i]=a[i]*2.5+b[i]
  }
},{mode:"fast"})
var a=new Float32Array(262144),b=new Float32Array(262144),c=new Float32Array(262144)
a[0]=2;b[0]=3
calculate(a,b,c)
calculate(a,b,c)
calculate(a,b,c)
print(c[0])
print(stringify(ow.gpu.explain(calculate)))
ow.gpu.close()
