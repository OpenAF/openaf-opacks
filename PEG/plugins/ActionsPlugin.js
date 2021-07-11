/**
 * <odoc>
 * <key>ActionsPlugin(aActions)</key>
 * aActions is a map where each key is a pegjs rule and the corresponding value a function 
 * that receives, as arguments, the parsed text and a location object. The function should return
 * the received parsed text and will be added to the top of the chain of actions for that rule.\
 * \
 * Example:\
 * \
 * p.loadGrammar("myGrammar", { plugins: [ new ActionsPlugin({ MyRule: t => { print(t); return t; }})]})\
 * \
 * </odoc>
 */
function ActionsPlugin(aActions) { 
  _$(aActions, "aActions").isMap().$_();

  this.actions = aActions;
}

ActionsPlugin.prototype.use = function(config) {
  config.passes.transform.unshift((ast, options) => {
    ast.rules = ast.rules.map(rule => {
      if (isDef(this.actions[rule.name])) {
        var code = "return (" + this.actions[rule.name].toSource() + ")(text(), location()); ";
        rule.expression = { type: "action", code: code, expression: rule.expression };
      }

      return rule;
    });
  });
};