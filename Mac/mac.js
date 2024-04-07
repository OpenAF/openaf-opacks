loadExternalJars(getOPackPath("Mac") || ".")

/**
 * <odoc>
 * <key>Mac.macSay(aMsg, aVoice, quiet) : String</key>
 * Tries to say aMsg using the mac "say" command. Optionally you can specify aVoice name.
 * </odoc>
 */
var macSay = (msg, voice, quiet) => { 
    quiet = _$(quiet, "quiet").isBoolean().default(false)
    var _args = ["say"]

    if (isString(voice)) {
        _args.push("-v")
        _args.push(voice)
    }

    _args.push(msg)
    if (!quiet) print(ansiColor("BOLD", "🎙  mac talking... "))
    $sh(["say", "-v", "Jamie", msg]).exec()

    return !quiet ? ansiColor("ITALIC", msg) : msg
}

/**
 * <odoc>
 * <key>af.fromPList(aStringOrStream) : Object</key>
 * Tries to convert aStringOrStream representation of a PList file into a javascript object.
 * </odoc>
 */
AF.prototype.fromPList = function(aObj) {
    var pl = Packages.com.dd.plist.PropertyListParser.parse(isString(aObj) ? af.fromString2InputStream(aObj) : aObj)
    if (pl != null) {
        var _o = pl.toJavaObject()
        var _r
        if (Object.prototype.toString.call(_o) == "[object JavaArray]") {
            _r = []
            for(var i = 0; i < _o.length; i++) {
                _r.push( af.fromJavaMap(_o[i]) )
            }
        } else {
            _r = af.fromJavaMap(_o)
        }
        traverse(_r, (aK, aV, aP, aO) => {
            if (isString(aV) && (aV.endsWith(" AM") || aV.endsWith(" PM"))) {
                aO[aK] = ow.format.toDate(aV.replace(" ", " "), "MMM d, yyyy, h:mm:ss a")
            }
        })
        return _r
    } else {
        return __
    }
}

/**
 * <odoc>
 * <key>io.readFilePList(aFile) : Object</key>
 * Tries to read a PList file and convert it into a javascript object.
 * </odoc>
 */
IO.prototype.readFilePList = function(aFile) {
    return af.fromPList(new java.io.File(aFile))
}

/**
 * <odoc>
 * <key>io.writeFilePList(aFile, aObj) : Object</key>
 * Tries to write a javascript object into a PList file.
 * </odoc>
 */
IO.prototype.writeFilePList = function(aFile, aObj) {
    var _o = Packages.com.dd.plist.NSObject.fromJavaObject(aObj)
    var os = io.writeFileStream(aFile)
    Packages.com.dd.plist.PropertyListParser.saveAsXML(_o, os)
    os.close()
}

/**
 * <odoc>
 * <key>io.writeFilePListBin(aFile, aObj) : Object</key>
 * Tries to write a javascript object into a binary PList file.
 * </odoc>
 */
IO.prototype.writeFilePListBin = function(aFile, aObj) {
    var _o = Packages.com.dd.plist.NSObject.fromJavaObject(aObj)
    var os = io.writeFileStream(aFile)
    Packages.com.dd.plist.PropertyListParser.saveAsBinary(_o, os)
    os.close()
}

/**
 * <odoc>
 * <key>af.toPList(aObj) : String</key>
 * Tries to convert a javascript object into a PList string representation.
 * </odoc>
 */
AF.prototype.toPList = function(aObj) {
    return String(Packages.com.dd.plist.NSObject.fromJavaObject(aObj).toXMLPropertyList())
}