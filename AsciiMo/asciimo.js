var AsciiMo = function() {
    this._asciimo = require("lib_asciimo.js").Figlet
}

AsciiMo.prototype.write = function(txt, fnt) {
    _$(txt, "txt").isString().$_()
    fnt = _$(fnt, "fnt").isString().default("Banner")

    if (txt.length == 0) return ""

    var o
    this._asciimo.write(txt, fnt, t => o = t)
    return o
}

AsciiMo.prototype.listFonts = function() {
    plugin("ZIP")
    var zip = new ZIP()

    var r = $from(zip.list((getOPackPath("AsciiMo") || ".") + "/fonts.zip"))
            .ends("name", ".flf")
            .sort("name") 
            .select(r => r.name.replace("fonts/", "").replace(".flf", ""))

    return r
}

AsciiMo.prototype.getFontsMap = function(aSample) {
    aSample = _$(aSample, "aSample").isString().default("abc123")

    return this.listFonts().map(r => ({
        name: r,
        text: this.write(aSample, r)
    }))
}