loadExternalJars(getOPackPath("Jsoup") || ".")

/**
 * <odoc>
 * <key>Jsoup.Jsoup() : Jsoup</key>
 * Instantiates a new Jsoup object
 * </odoc>
 */
var Jsoup = function() {
}

/**
 * <odoc>
 * <key>Jsoup.getURLDoc(aURL) : Document</key>
 * Given aURL returns the Java Jsoup Document object
 * </odoc>
 */
Jsoup.prototype.getURLDoc = function(aURL) {
    this.url = _$(aURL, "aURL").isString().$_()

    this.doc = Packages.org.jsoup.Jsoup.connect(this.url).get()
    return this.doc
}

/**
 * <odoc>
 * <key>Jsoup.getHTMLDoc(aHTMLFile, aURL) : Document</key>
 * Given aHTMLFile and aURL returns the Java Jsoup Document object
 * </odoc>
 */
Jsoup.prototype.getHTMLDoc = function(aHTMLFile, aURL) {
    aHTMLFile = _$(aHTMLFile, "aHTMLFile").isString().$_()
    aURL = _$(aURL, "aURL").isString().default(__)

    return this.getObj().parse(new java.io.File(aHTMLFile), "UTF-8", aURL)
}

/**
 * <odoc>
 * <key>Jsoup.getHTMLDoc4Str(aString) : Document</key>
 * Given aString returns the Java Jsoup Document object
 * </odoc>
 */
Jsoup.prototype.getHTMLDoc4Str = function(aString) {
    aString = _$(aString, "aString").isString().$_()

    return this.getObj().parse(aString)
}

/**
 * <odoc>
 * <key>Jsoup.cleanHTML(aHTML, aOption) : Document</key>
 * Given aHTML and aOption returns the cleaned Java Jsoup Document object
 * </odoc>
 */
Jsoup.prototype.cleanHTML = function(aHTML, aOption) {
    if (isObject(aHTML)) aHTML = af.toTOON(aHTML)
    aHTML = _$(aHTML, "aHTML").isString().$_()
    aOption = _$(aOption, "aOption").isString().oneOf(["none", "basic", "basicWithImages", "relaxed", "simpleText"]).default("basic")

    return String(this.getObj().clean(aHTML, Packages.org.jsoup.safety.Safelist[aOption]()))
}

/**
 * <odoc>
 * <key>Jsoup.getDoc() : Document</key>
 * Returns the Java Jsoup Document object
 * </odoc>
 */
Jsoup.prototype.getDoc = function() {
    return this.doc
}

/**
 * <odoc>
 * <key>Jsoup.getObj() : Jsoup</key>
 * Returns the Java Jsoup object
 * </odoc>
 */
Jsoup.prototype.getObj = function() {
    return Packages.org.jsoup.Jsoup
}

/**
 * <odoc>
 * <key>Jsoup.getDocMap(aDoc) : Map</key>
 * Given aDoc returns a Map representation of the Java Jsoup Document object
 * </odoc>
 */
Jsoup.prototype.getDocMap = function(aDoc) {
    if (isUnDef(aDoc.children)) {
        //print("=== " + aDoc.getClass().getName())
        //return aDoc
        return "---> " + aDoc.getClass().getName()
    }
    return af.fromJavaArray(aDoc.children()).map(r => {
        try {
            if (r instanceof Packages.org.jsoup.nodes.Element) {
                return {
                    id : r.id(),
                    tag: r.tag(),
                    isBlock: r.isBlock(),
                    hasText: r.hasText(),
                    attrs: af.fromJavaArray( r.attributes().asList() ).map(atr => {
                        var _m = {}
                        _m[atr.getKey()] = atr.getValue()
                        return _m
                    }),
                    text: String(r.wholeOwnText()).trim(),
                    val : r.val(),
                    childs: af.fromJavaArray(r.children()).map(r => this.getDocMap(r)),
                    childsSize: r.children().size()
                }
            } else {
                return "=== " + aDoc.getClass().getName()
            }
        } catch(e) {
            return "Error: " + e
        }
    })
}
