// Small typed expression emitter. No general JavaScript rewriting takes place.
exports.emit = function(plan, type) {
  var floating = type == "float32"
  function expression(node) {
    if (node.kind == "load") return "p" + node.parameter + "[i]"
    if (node.kind == "scalar") return "p" + node.parameter
    if (node.kind == "constant") {
      if (!floating) return String(node.value >>> 0) + "u"
      var value = String(node.value)
      if (value.indexOf(".") < 0 && !/[eE]/.test(value)) value += ".0"
      return value + "f"
    }
    if (node.kind == "unary") return "(" + node.operator + expression(node.value) + ")"
    return "(" + expression(node.left) + node.operator + expression(node.right) + ")"
  }
  var scalar = floating ? "float" : "uint"
  var parameters = plan.parameters.map(function(p, i) {
    return plan.arrayIndices.indexOf(i) >= 0
      ? "__global " + (i == plan.output ? "" : "const ") + scalar + "* p" + i
      : scalar + " p" + i
  })
  return "#pragma OPENCL FP_CONTRACT OFF\n__kernel void calculate(" + parameters.join(",") +
    "){size_t i=get_global_id(0);p" + plan.output + "[i]=" + expression(plan.expression) + ";}"
}
