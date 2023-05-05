loadLib((getOPackPath("PEG") || ".") + "/lib/peggy.min.js");

/**
 * <odoc>
 * <key>PEG.PEG(aGrammar, aOptions)</key>
 * Creates an instace of Peggy (https://github.com/peggyjs/peggy) optionally with the provided aGrammar and aOptions (see PEG.setGrammar for more details)
 * </odoc>
 */
var PEG = function(aGrammar, aOptions) {
    this.grammar = aGrammar;
    this.options = aOptions;

    if (isDef(this.grammar)) {
        this.setGrammar(aGrammar, aOptions);
    }

    this.path = getOPackPath("PEG") || ".";
    this.plugins = [];
}

/**
 * <odoc>
 * <key>PEG.setGrammar(aGrammar, aOptions)</key>
 * Sets a PEG aGrammar to be used with optional aOptions. If addPlugin was used and aOptions it not provided
 * the plugins entry will be passed to the Peggy library.
 * </odoc>
 */
PEG.prototype.setGrammar = function(aGrammar, aOptions) {
    _$(aGrammar, "aGrammar").$_();

    this.grammar = aGrammar;
    this.options = _$(aOptions, "aOptions").isMap().default({});

    if (isUnDef(this.options.plugins)) {
        if (this.plugins.length > 0) {
            this.options.plugins = this.plugins;
        }
    }

    try {
        this._p = peggy.generate(this.grammar, this.options);
        return {};
    } catch(e) {
        this._p = __;
        return e;
    }
}

/**
 * <odoc>
 * <key>PEG.addPlugin(aName, aOptions)</key>
 * Adds aName plugin from the plugins folder or adds a custom plugin if aName is a filepath. Optionally aOptions
 * can be provided to be provided as the argument when instantiating aName. Custom plugins are required to have a function
 * with the same aName internally.
 * </odoc>
 */
PEG.prototype.addPlugin = function(aName, aOptions) {
    _$(aName, "aName").isString().$_();
    aOptions = _$(aOptions, "aOptions").isMap().default(__);

    var path = this.path + "/plugins/" + aName + ".js";

    if (io.fileExists(path)) loadLib(path);
    this.plugins.push(new (af.eval(aName))(aOptions));
}

/**
 * <odoc>
 * <key>PEG.clearPlugins()</key>
 * Clears the current list of plugins added with PEG.addPlugin
 * </odoc>
 */
PEG.prototype.clearPlugins = function() {
    this.plugins = [];
}

/**
 * <odoc>
 * <key>PEG.loadGrammar(aName, aOptions)</key>
 * Loads aName grammar from the grammars folder or, if aName is a filepath, a custom pegjs grammar file. 
 * Optionally providing aOptions.
 * </odoc>
 */
PEG.prototype.loadGrammar = function(aName, aOptions) {
    _$(aName, "aName").isString().$_();

    var included = [];
    var _l = aP => {
        var path;
        if (io.fileExists(aP)) { 
            path = aP;
        } else {
            path = this.path + "/grammars/" + aP + (aP.endsWith(".pegjs") ? "" : ".pegjs");
            if (!io.fileExists(path)) {
               throw new Error("Grammar '" + aP + "' not found in '" + this.path + "'");
            }
        }
        if (included.indexOf(path) >= 0) return;
        included.push(path);
        var s = io.readFileString(path);
        return s + "\n" + javaRegExp(s).match("(?<= \@append )(.+)", "g").map(_l).join("\n");
    }

    return this.setGrammar(_l(aName), aOptions);
}

/**
 * <odoc>
 * <key>PEG.parse(aInput, aOptions) : Map</key>
 * After setting a pegjs grammar aInput string can be provided to be parsed by the previously provided
 * grammar. The parse output will be returned. Optionally you can provide aOptions for the parse function.
 * </odoc>
 */
PEG.prototype.parse = function(aInput, aOptions) {
    _$(aInput, "aInput").isString().$_();

    if (isUnDef(this._p)) throw new Error("Grammar not set yet.");
    return this._p.parse(aInput, aOptions);
}

/**
 * <odoc>
 * <key>PEG.generateCode(aOptions) : String</key>
 * After setting a pegjs grammar it will output javascript code intended to be saved in a js file and 
 * loaded afterwards with "var myparser = require('myparser.js')". The returned object will have a standalone
 * parse function. Optionally additional aOptions can be provided.
 * </odoc>
 */
PEG.prototype.generateCode = function(aOptions) {
    return peggy.generate(this.grammar, merge({ format: "commonjs", output: "source" }, aOptions))
}
