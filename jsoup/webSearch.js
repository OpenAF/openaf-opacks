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
 * Performs a web search using DuckDuckGo with aSearchPrompt and returns up to aLimit results (default: 12).\
 * \
 * Supported search engines:\
 * - "duckduckgo" or "ddg" (default)\
 * \
 * Returns a map with:\
 * - start: Starting position (always 0)\
 * - limit: Maximum number of results requested\
 * - results: Array of search results, each containing:\
 *   - title: Page title\
 *   - description: Snippet/description of the page\
 *   - link: Direct URL to the page\
 * \
 * Example:\
 *   var ws = new WebSearch();\
 *   var results = ws.search("OpenAF", 5);\
 *   results.results.forEach(r => print(r.title + ": " + r.link));\
 * </odoc>
 */
WebSearch.prototype.search = function(aSearchPrompt, aLimit, aSearchEngine) {
    aSearchPrompt = _$(aSearchPrompt, "aSearchPrompt").isString().$_()
    aSearchEngine = _$(aSearchEngine, "aSearchEngine").isString().default("duckduckgo")
    var aStart = 0
    aLimit = _$(aLimit, "aLimit").isNumber().default(12)

    // Based on https://github.com/nickclyde/duckduckgo-mcp-server
    var res = $rest({
        uriQuery: true,
        requestHeaders: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
    }).get("https://html.duckduckgo.com/html/", {
        q: aSearchPrompt
    })

    var soup = new Jsoup()
    soup = soup.getHTMLDoc4Str(res)

    var results = soup.select(".result")
    var searchResults = []

    for(var i in results) {
        var result = results[i]

        // Get the main link (result__a)
        var linkElem = result.select(".result__a")
        if (linkElem.length == 0) continue

        var title = linkElem.text()
        var link = linkElem.attr("href")

        // Skip empty links or ads (links containing y.js)
        if (!link || link.indexOf("y.js") >= 0) continue

        // Clean up DuckDuckGo redirect URLs
        if (link.indexOf("//duckduckgo.com/l/?uddg=") >= 0 || link.indexOf("//duckduckgo.com/l/?kh=-1&uddg=") >= 0) {
            try {
                var uddgMatch = link.match(/uddg=([^&]+)/)
                if (uddgMatch && uddgMatch[1]) {
                    link = decodeURIComponent(uddgMatch[1])
                }
            } catch(e) {
                // If decoding fails, keep the original link
            }
        }

        // Get description/snippet
        var snippetElem = result.select(".result__snippet")
        var description = snippetElem.length > 0 ? snippetElem.text() : ""

        searchResults.push({
            title: title,
            description: description,
            link: link
        })

        // Limit results
        if (searchResults.length >= aLimit) break
    }

    return {
        start: aStart,
        limit: aLimit,
        results: searchResults
    }
}