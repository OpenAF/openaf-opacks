loadExternalJars(getOPackPath("jsoup") || ".")

var Jsoup = function() {
}

Jsoup.prototype.getURLDoc = function(aURL) {
    this.url = _$(aURL, "aURL").isString().$_()

    this.doc = Packages.org.jsoup.Jsoup.connect(this.url).get()
    return this.doc
}

Jsoup.prototype.getHTMLDoc = function(aHTMLFile, aURL) {
    aHTMLFile = _$(aHTMLFile, "aHTMLFile").isString().$_()
    aURL = _$(aURL, "aURL").isString().default(__)

    return this.getObj().parse(new java.io.File(aHTMLFile), "UTF-8", aURL)
}

Jsoup.prototype.cleanHTML = function(aHTML, aOption) {
    aHTML = _$(aHTML, "aHTML").isString().$_()
    aOption = _$(aOption, "aOption").isString().oneOf(["none", "basic", "basicWithImages", "relaxed", "simpleText"]).default("basic")

    return this.getObj().clean(aHTML, Packages.org.jsoup.safety.Safelist[aOption]())
}

Jsoup.prototype.getDoc = function() {
    return this.doc
}

Jsoup.prototype.getObj = function() {
    return Packages.org.jsoup.Jsoup
}