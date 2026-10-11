loadLib("gpu.js")
ow.loadGPU()
print(stringify(ow.gpu.backends()))
print(stringify(ow.gpu.devices()))
var combine=ow.gpu.auto(function(a,b,c) {
  for(var i=0;i<a.length;i++) {
    c[i]=a[i]^b[i]
  }
},{backend:"opencl"})
var out=new Uint32Array(3)
combine(new Uint32Array([1,2,3]),new Uint32Array([4,5,6]),out)
print(stringify(Array.prototype.slice.call(out)))
print(stringify(ow.gpu.explain(combine)))
print(stringify(ow.gpu.stats()))
ow.gpu.clearCache()
ow.gpu.close()
