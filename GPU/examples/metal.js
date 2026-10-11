// Explicit opt-in; inspect diagnostics to distinguish GPU execution from fallback.
loadLib("gpu.js")
var gpu = new OpenWrap.GPU()
try {
  print(stringify(gpu.backends()))
  var combine = gpu.auto(function(a,b,c) {
    for(var i=0;i<a.length;i++) { c[i]=a[i]^b[i] }
  },{backend:"metal"})
  var out = new Uint32Array(3)
  combine(new Uint32Array([1,2,3]),new Uint32Array([4,5,6]),out)
  print(stringify(Array.prototype.slice.call(out)))
  print(stringify(gpu.explain(combine)))
} finally { gpu.close() }
