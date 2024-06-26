// Author: Nuno Aguiar
var OAF_DEBUG_ARGS

function _debug(aCode, args, returnCode) {
  if (isDef(getEnv("OAF_DEBUG_ARGS"))) OAF_DEBUG_ARGS = jsonParse(getEnv("OAF_DEBUG_ARGS"), true)
  if (isMap(OAF_DEBUG_ARGS) && isUnDef(args)) args = OAF_DEBUG_ARGS
  
  returnCode = _$(returnCode, "returnCode").isBoolean().default(false)
  
  args = _$(args, "args").isMap().default({})
  args.lineColor = _$(args.lineColor, "lineColor").isString().default("FG(220)")
  args.textColor = _$(args.textColor, "textColor").isString().default("BG(230),BLACK")
  args.lineError = _$(args.lineError, "lineError").isString().default("FG(220)")
  args.textError = _$(args.textError, "textError").isString().default("BG(196),FG(255),BOLD")
  args.theme     = _$(args.theme, "theme").isString().default("doubleLineBothSides")
  args.emoticons = _$(args.emoticons, "emoticons").toBoolean().isBoolean().default(true)
  args.signs     = _$(args.signs, "signs").isMap().default({
    checkpoint: 0x1F37A,
    assert    : 0x1F44D,
    print     : 0x1F50E,
    error     : 0x1F621,
    time      : "🕒"
  })
  args.includeTime = _$(args.includeTime, "includeTime").toBoolean().isBoolean().default(false)
  
  if (!isMap(global._debugData)) global._debugData = { p: { } }

  // Determine if code is a file or actual code
  var code
  if (aCode.indexOf("\n") >= 0) {
    code = aCode
  } else {
    if (io.fileExists(aCode)) {
      code = io.readFileString(aCode)
    } else {
      throw "File '" + aCode + "' not found."
    }
  }

  ow.loadFormat()
    
  var _m = (s, c) => {
    var _s = ";try{"
    if (isDef(c)) _s += "if(" + c + ") {"
    var _t = (args.includeTime ? "(new Date()).toISOString() +\" | \" + " : "")
    _s += "cprint(ow.format.withSideLine(" + _t + s + ", __, \"" + args.lineColor + "\", \"" + args.textColor + "\", ow.format.withSideLineThemes()." + args.theme + ")) "
    if (isDef(c)) _s += "}"
    _s += "}catch(__e_debug){cprint(ow.format.withSideLine(" + _t + "'" + sign.error + " ' + String(__e_debug), __, \"" + args.lineError + "\", \"" + args.textError + "\", ow.format.withSideLineThemes()." + args.theme + "))};"
    return _s
  }

  var sign = {}
  if (args.emoticons) {
    sign = args.signs
    if (isNumber(sign.checkpoint)) sign.checkpoint = ow.format.string.unicode(sign.checkpoint)
    if (isNumber(sign.assert)) sign.assert = ow.format.string.unicode(sign.assert)
    if (isNumber(sign.print)) sign.print = ow.format.string.unicode(sign.print)
    if (isNumber(sign.error)) sign.error = ow.format.string.unicode(sign.error)
  }
  sign.checkpoint = _$(sign.checkpoint).default("@")
  sign.assert     = _$(sign.assert).default("#")
  sign.print      = _$(sign.print).default("?")
  sign.error      = _$(sign.error).default("!")
  sign.time       = _$(sign.time).default(":")

  code = code.split("\n").map(line => {
    var l

    // checkpoint equivalent
    l = line.trim().match(/\/\/\@ (.+)$/)
    if (isArray(l)) {
      var s = l[1]
      line = line.replace(/\/\/\@ (.+)$/, _m("\"" + sign.checkpoint + " " + s.replace(/\"/g, "\\\"") + "\""))
    }

    // profile end equivalent
    l = line.trim().match(/\/\/\] (.+)$/)
    if (isArray(l)) {
      var s = l[1]
      line = line.replace(/\/\/\] (.+)$/, _m("\"" + sign.time + " " + s + ": \" + ow.format.elapsedTime4ms(now() - global._debugData['" + s + "'])"))
    }

    // profile begin equivalent
    l = line.trim().match(/\/\/\[ (.+)$/)
    if (isArray(l)) {
      var s = l[1]
      line = line.replace(/\/\/\[ (.+)$/, ";global._debugData['" + s + "']=now();")
    }

    // assert equivalent
    l = line.trim().match(/\/\/\# (.+)$/)
    if (isArray(l)) {
      var s = l[1]
      line = line.replace(/\/\/\# (.+)$/, _m("\"" + sign.assert + " " + s + "\"", s))
    }

    // print equivalent
    l = line.trim().match(/\/\/\? (.+)$/)
    if (isArray(l)) {
      var s = l[1]
      line = line.replace(/\/\/\? (.+)$/, _m("\""+ sign.print + " " + s + " = \" + stringify(" + s + ") + \"\""))
    }

    // slon print equivalent
    l = line.trim().match(/\/\/\?s (.+)$/)
    if (isArray(l)) {
      var s = l[1]
      line = line.replace(/\/\/\?s (.+)$/, _m("\"" + sign.print + " " + s + " = \" + af.toSLON(" + s + ") + \"\""))
    }

    // yaml print equivalent
    l = line.trim().match(/\/\/\?y (.+)$/)
    if (isArray(l)) {
      var s = l[1]
      line = line.replace(/\/\/\?y (.+)$/, _m("\"" + sign.print + " " + s + " = \\n\" + af.toYAML(" + s + ") + \"\""))
    }

    return line
  }).join("\n")

  if (returnCode) return code; else af.eval(code)
}