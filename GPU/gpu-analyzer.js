exports.analyze = function(source, mode) {
  var T = org.mozilla.javascript.Token
  var location = 0
  function kind(n) { return n == null ? "null" : String(n.getClass().getSimpleName()) }
  function requireShape(value, reason, node) {
    if (!value) {
      var error = new Error(reason)
      error.reason = reason
      error.line = node == null ? location : Number(node.getLineno())
      throw error
    }
  }
  function name(node) {
    requireShape(kind(node) == "Name", "identifier-required", node)
    return String(node.getIdentifier())
  }
  try {
    requireShape(source && source.length <= 65536, "source-unavailable-or-too-large")
    var env = new org.mozilla.javascript.CompilerEnvirons()
    env.initFromContext(org.mozilla.javascript.Context.getCurrentContext())
    var root = new org.mozilla.javascript.Parser(env).parse("(" + source + ")", "gpu-function", 1)
    var statement = root.getFirstChild()
    requireShape(kind(statement) == "ExpressionStatement" && statement.getNext() == null, "ordinary-function-required")
    var outer = statement.getExpression()
    requireShape(kind(outer) == "ParenthesizedExpression", "ordinary-function-required")
    var fn = outer.getExpression()
    requireShape(kind(fn) == "FunctionNode" && !fn.isGenerator() && !fn.isES6Generator()
      && !fn.hasRestParameter() && !fn.isMethod() && !fn.isExpressionClosure()
      && Number(fn.getFunctionType()) != 4, "ordinary-function-required", fn)
    requireShape(fn.getDefaultParams() == null || fn.getDefaultParams().isEmpty(), "default-parameters-unsupported", fn)
    var parameters = [], roles = Object.create(null)
    for (var p = 0; p < fn.getParams().size(); p++) {
      var param = name(fn.getParams().get(p))
      requireShape(parameters.indexOf(param) < 0 && param != "arguments" && param != "eval", "unsupported-parameter", fn)
      parameters.push(param)
    }
    requireShape(parameters.length >= 2 && parameters.length <= 16, "parameter-count-unsupported", fn)
    var loop = fn.getBody().getFirstChild()
    requireShape(kind(loop) == "ForLoop" && loop.getNext() == null, "single-for-loop-required", loop)
    location = Number(loop.getLineno())
    var init = loop.getInitializer()
    requireShape(kind(init) == "VariableDeclaration" && init.isVar() && init.getVariables().size() == 1, "canonical-loop-initializer-required", init)
    var variable = init.getVariables().get(0), index = name(variable.getTarget())
    requireShape(parameters.indexOf(index) < 0 && index != "arguments" && index != "eval", "induction-variable-conflict", variable)
    requireShape(kind(variable.getInitializer()) == "NumberLiteral" && Number(variable.getInitializer().getNumber()) == 0, "zero-loop-start-required", variable)
    var condition = loop.getCondition()
    requireShape(kind(condition) == "InfixExpression" && condition.getOperator() == T.LT
      && name(condition.getLeft()) == index, "canonical-loop-condition-required", condition)
    var bound = condition.getRight()
    requireShape(kind(bound) == "PropertyGet" && name(bound.getProperty()) == "length", "array-length-bound-required", bound)
    var boundIndex = parameters.indexOf(name(bound.getTarget()))
    requireShape(boundIndex >= 0, "free-variable-unsupported", bound)
    roles[parameters[boundIndex]] = "array"
    var increment = loop.getIncrement()
    requireShape(kind(increment) == "UpdateExpression" && increment.getOperator() == T.INC
      && name(increment.getOperand()) == index, "unit-loop-increment-required", increment)
    var body = loop.getBody(), store = body.getFirstChild()
    requireShape((kind(body) == "Scope" || kind(body) == "Block") && kind(store) == "ExpressionStatement"
      && store.getNext() == null, "single-element-store-required", body)
    var assignment = store.getExpression()
    requireShape(kind(assignment) == "Assignment" && assignment.getOperator() == T.ASSIGN, "simple-assignment-required", assignment)
    function parameter(node, role) {
      var identifier = name(node), position = parameters.indexOf(identifier)
      requireShape(position >= 0, "free-variable-unsupported", node)
      requireShape(!roles[identifier] || roles[identifier] == role, "conflicting-parameter-role", node)
      roles[identifier] = role
      return position
    }
    function element(node) {
      requireShape(kind(node) == "ElementGet" && kind(node.getElement()) == "Name"
        && name(node.getElement()) == index, "independent-index-required", node)
      return parameter(node.getTarget(), "array")
    }
    var output = element(assignment.getLeft())
    requireShape(output != boundIndex, "output-used-as-loop-bound", assignment)
    var nodes = 0
    function expression(node, depth) {
      requireShape(++nodes <= 256 && depth <= 32, "expression-too-complex", node)
      var k = kind(node)
      if (k == "ParenthesizedExpression") return expression(node.getExpression(), depth + 1)
      if (k == "ElementGet") {
        var pos = element(node)
        requireShape(pos != output, "output-read-unsupported", node)
        return { kind: "load", parameter: pos }
      }
      if (k == "Name") return { kind: "scalar", parameter: parameter(node, "scalar") }
      if (k == "NumberLiteral") {
        var value = Number(node.getNumber())
        requireShape(isFinite(value), "nonfinite-constant", node)
        if (mode == "strict") requireShape(Math.floor(value) == value && value >= 0 && value <= 4294967295, "constant-outside-int32-bits", node)
        return { kind: "constant", value: value }
      }
      if (k == "UnaryExpression") {
        var unary = Number(node.getOperator())
        if (mode == "strict" && unary == T.BITNOT) return { kind: "unary", operator: "~", value: expression(node.getOperand(), depth + 1) }
        if (unary == T.NEG && kind(node.getOperand()) == "NumberLiteral") {
          var negative = -Number(node.getOperand().getNumber())
          requireShape(mode == "fast" || (negative >= -2147483648 && Math.floor(negative) == negative), "constant-outside-int32-bits", node)
          return { kind: "constant", value: negative }
        }
        requireShape(false, "unsupported-unary-operator", node)
      }
      if (k == "InfixExpression") {
        var op = Number(node.getOperator()), operators = {}
        if (mode == "fast") { operators[T.ADD] = "+"; operators[T.SUB] = "-"; operators[T.MUL] = "*" }
        else { operators[T.BITAND] = "&"; operators[T.BITOR] = "|"; operators[T.BITXOR] = "^" }
        requireShape(operators[op], "operator-unsupported-in-" + mode + "-mode", node)
        return { kind: "binary", operator: operators[op], left: expression(node.getLeft(), depth + 1), right: expression(node.getRight(), depth + 1) }
      }
      requireShape(false, "unsupported-expression-" + k, node)
    }
    var ir = expression(assignment.getRight(), 0), arrayIndices = [], scalarIndices = []
    parameters.forEach(function(param, i) {
      requireShape(roles[param], "unused-parameter-unsupported", fn)
      if (roles[param] == "array") arrayIndices.push(i)
      else scalarIndices.push(i)
    })
    return { eligible: true, reason: "independent-elementwise-single-store", mode: mode,
      parameters: parameters, arrayIndices: arrayIndices, scalarIndices: scalarIndices,
      bound: boundIndex, output: output, expression: ir, compilerVersion: 1 }
  } catch (e) {
    return { eligible: false, mode: mode, reason: e.reason || "source-parse-failed", line: e.line || location }
  }
}
