ow.loadFormat();

/**
 * <odoc>
 * <key>DebugPlugin()</key>
 * The DebugPlugin will add an action to all pegjs Terms to output the term, the parsed text and the
 * corresponding location.\
 * \
 * p.loadGrammar("myGrammar", { plugins: [ new DebugPlugin() ]})\
 * \
 * </odoc>
 */
function DebugPlugin( options ) { 
  this.options = options;
}

DebugPlugin.prototype.use = function(config) {
  config.passes.transform.push((ast, options) => {
    ast.rules = ast.rules.map(rule => {
      //rule.expression = { type: "labeled", label: "children", expression: rule.expression };
      var code = "print(ansiColor('BOLD', '" + rule.name + "') + '\\n' + ow.format.withSideLine(text() + '\\n', __, __, 'CYAN') + '\\n' + ow.format.withSideLine(ansiColor('ITALIC', ow.format.toSLON(location()))) + '\\n' ); ";
      rule.expression = { type: "action", code: code, expression: rule.expression };
      return rule;
    });
  });
};
