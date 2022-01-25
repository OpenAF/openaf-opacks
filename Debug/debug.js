// Author: Nuno Aguiar

var OAF_DEBUG_ARGS

function _debug(aCode, args) {
  if (isMap(OAF_DEBUG_ARGS) && isUnDef(args)) args = OAF_DEBUG_ARGS
  
  args = _$(args, "args").isMap().default({})
  args.lineColor = _$(args.lineColor, "lineColor").isString().default("FG(220)")
  args.textColor = _$(args.textColor, "textColor").isString().default("BG(230)")
  args.lineError = _$(args.lineError, "lineError").isString().default("FG(220)")
  args.textError = _$(args.textError, "textError").isString().default("BG_RED,WHITE,BOLD")
  args.theme     = _$(args.theme, "theme").isString().default("closedCurvedRect")
  args.emoticons = _$(args.emoticons, "emoticons").isBoolean().default(true)
  args.signs     = _$(args.signs, "signs").isMap().default({
    checkpoint: 0x1F37A,
    assert    : 0x1F44D,
    print     : 0x1F50E,
    error     : 0x1F621
  })
  args.includeTime = _$(args.includeTime, "includeTime").isBoolean().default(false)
  
  var code = io.readFileString(aCode)

  ow.loadFormat()
    
  var _m = (s, c) => {
    var _s = ";try{"
    if (isDef(c)) _s += "if(" + c + ") {"
    var _t = (args.includeTime ? "(new Date()).toISOString() +\" | \" + " : "")
    _s += "cprint(ow.format.withSideLine(" + _t + s + ", __, \"" + args.lineColor + "\", \"" + args.textColor + "\", ow.format.withSideLineThemes()." + args.theme + ")) "
    if (isDef(c)) _s += "}"
    _s += "}catch(__e_debug){cprint(ow.format.withSideLine(" + _t + "' " + sign.error + " ' + String(__e_debug), __, \"" + args.lineError + "\", \"" + args.textError + "\", ow.format.withSideLineThemes()." + args.theme + "))};"
    return _s
  }

  var sign
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

  code = code.split("\n").map(line => {
    var l

    // checkpoint equivalent
    l = line.trim().match(/\/\/\@ (.+)$/)
    if (isArray(l)) {
      var s = l[1]
      line = line.replace(/\/\/\@ (.+)$/, _m("\" " + sign.checkpoint + " " + s.replace(/\"/g, "\\\"") + "\""))
    }

    // assert equivalent
    l = line.trim().match(/\/\/\# (.+)$/)
    if (isArray(l)) {
      var s = l[1]
      line = line.replace(/\/\/\# (.+)$/, _m("\" " + sign.assert + " " + s + "\"", s))
    }

    // print equivalent
    l = line.trim().match(/\/\/\? (.+)$/)
    if (isArray(l)) {
      var s = l[1]
      line = line.replace(/\/\/\? (.+)$/, _m("\" "+ sign.print + " " + s + " = \" + stringify(" + s + ") + \"\""))
    }

    // slon print equivalent
    l = line.trim().match(/\/\/\?s (.+)$/)
    if (isArray(l)) {
      var s = l[1]
      line = line.replace(/\/\/\?s (.+)$/, _m("\" " + sign.print + " " + s + " = \" + af.toSLON(" + s + ") + \"\""))
    }

    // yaml print equivalent
    l = line.trim().match(/\/\/\?y (.+)$/)
    if (isArray(l)) {
      var s = l[1]
      line = line.replace(/\/\/\?y (.+)$/, _m("\" " + sign.print + " " + s + " = \\n\" + af.toYAML(" + s + ") + \"\""))
    }

    return line
  }).join("\n")

  af.eval(code)
}

var __scriptfile
if (isDef(__scriptfile)) { _debug(__scriptfile); exit(0) }