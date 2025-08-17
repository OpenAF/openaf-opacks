ow.loadObj()
loadLib("jsoup.js")

var WebSearch = function() {

}

/**
 * <odoc>
 * <key>WebSearch.getURL(aURL, aStyle) : String</key>
 * Given aURL returns, for aStyle:\
 * - "html": the raw HTML\
 * - "basic": a basic cleaned version of the HTML\
 * - "text": a simple text version of the HTML\
 * - "map": a JSON map representation of the HTML
 * </odoc>
 */
WebSearch.prototype.getURL = function(aURL, aStyle) {
    aURL = _$(aURL, "aURL").isString().$_()
    aStyle = _$(aStyle, "aStyle").oneOf([ "html", "basic", "text", "map" ]).default("basic")

    var soup = new Jsoup()
    switch(aStyle) {
    case "html":
        return $rest().get(aURL)
    case "basic":
        return soup.cleanHTML($rest().get(aURL), "basic")
    case "text":
        return soup.cleanHTML($rest().get(aURL), "simpleText")
    case "map" :
        var soup = new Jsoup()
        return soup.getDocMap(soup.getHTMLDoc4Str(soup.cleanHTML($rest().get(aURL), "basic")))
    }
}

/**
 * <odoc>
 * <key>WebSearch.search(aSearchPrompt, aLimit, aSearchEngine) : Map</key>
 * Uses aSearchEngine (e.g. google) to perform a web search using aSearchPrompt with an optional aLimit (12) results.
 * </odoc>
 */
WebSearch.prototype.search = function(aSearchPrompt, aLimit, aSearchEngine) {
    aSearchPrompt = _$(aSearchPrompt, "aSearchPrompt").isString().$_()
    aSearchEngine = _$(aSearchEngine, "aSearchEngine").isString().default("google")
    var aStart = 0
    aLimit = _$(aLimit, "aLimit").isNumber().default(12)

    var res
    const fnUA = () => {
        return [`Lynx/${ow.obj.randomRange(2, 3)}.${ow.obj.randomRange(8,9)}.${ow.obj.randomRange(0, 2)}`,
                `libwww-FM/${ow.obj.randomRange(2, 3)}.${ow.obj.randomRange(13, 15)}`,
                `SSL-MM/${ow.obj.randomRange(1, 2)}.${ow.obj.randomRange(3, 5)}`,
                `OpenSSL/${ow.obj.randomRange(1, 3)}.${ow.obj.randomRange(0, 4)}.${ow.obj.randomRange(0, 9)}`
               ].join(" ")
    }

    switch(aSearchEngine) {
    case "google":
        // Based on https://github.com/Nv7-GitHub/googlesearch


        res = $rest({
            uriQuery      : true,
            requestHeaders: {
                "User-Agent": fnUA(),
                "Accept": "*\/*"
            }
        }).get("https://www.google.com/search", {
            q: aSearchPrompt,
            num: aLimit,
            hl: "en",
            start: aStart,
            safe: "active",
            gl: "None"
        })

        //res = res.substring(res.indexOf("<html "))
        //res = res.replace(/&nbsp;/g, " ")
        var soup = new Jsoup()

        soup = soup.getHTMLDoc4Str(res)
        var ar = soup.select(".ezO2md")
        res = []
        var link, title, description
        for(var ari in ar) {
            var doc = ar[ari]
            var link_tag = doc.select("a[href]")
            var title_tag = link_tag.select("span.CVA68e")
            var description_tag = doc.select("span.FrIlee")

            var link = ""
            if (link_tag.length > 0 && title_tag.length > 0 && description_tag.length > 0) {
                link = String(link_tag.attr("href")).split("&")[0].replace("/url?q=", "")
            }
            link = String(link_tag.attr("href")).split("&")[0].replace("/url?q=", "")
            title = title_tag.text()
            description = description_tag.text()
            
            res.push({
                title: title,
                description: description,
                link: link
            })
        }
        
    }

    return {
        start: aStart,
        limit: aLimit,
        results: res
    }
}