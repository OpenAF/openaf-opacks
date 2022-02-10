// Author: Nuno Aguiar
(function() {

  loadLib("debugFn.js")
  if (isFunction(__loadPreParser) && !__closed && isDef(_debug) && isUnDef(global.__debugLoadPreParser)) {
    global.__debugLoadPreParser = __loadPreParser.toString()
    __loadPreParser = function(code) {
      var _fn = eval(global.__debugLoadPreParser)
      return _fn(_debug(code, __, true))
    }
  }
  
  exports.load = function(aScript) { load(aScript) }
  exports.require = function(aScript, force) { return require(aScript, force) }
})();