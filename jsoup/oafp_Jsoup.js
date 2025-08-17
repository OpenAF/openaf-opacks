;(function() {
    loadLib("jsoup.js")
    const soup = new Jsoup()

    exports.oafplib = function(params, _$o, $o, oafp) {
        var _r = {
            fileExtensions: [ { ext: ".html", type: "html" } ],
            input         : [ {
                type: "websearch",
                fn: (r, options) => {
                    oafp._showTmpMsg()

                    loadLib("webSearch.js")
                    const webSearch = new WebSearch()
                    if (!isString(r)) r = stringify(r, __, "")
                    var _limit = __
                    if (isDef(params.inwebsearchlimit)) _limit = params.inwebsearchlimit

                    var res = webSearch.search(r, _limit)
                    if (isMap(res) && isDef(res.results)) res = res.results

                    _$o(res, options)
                }
            },{ 
                type: "html", 
                fn: (r, options) => {
                    oafp._showTmpMsg()
                    var html = r
                    if (isDef(params.inhtmlfilter)) {
                        switch(params.inhtmlfilter) {
                        case "basic"            : html = soup.cleanHTML(html, "basic"); break
                        case "basic-with-images": html = soup.cleanHTML(html, "basicWithImages"); break
                        case "relaxed"          : html = soup.cleanHTML(html, "relaxed"); break
                        case "simpletext"       : html = soup.cleanHTML(html, "simpleText"); break
                        case "none"             : html = soup.cleanHTML(html, "none"); break
                        default                 : oafp._exit(-1, "Unknown inhtmlfilter: " + params.inhtmlfilter)
                        }
                    }

                    var _res
                    if (toBoolean(params.inhtmlraw)) {
                        _res = String(html.toString())
                    } else {
                        _res = soup.getDocMap(soup.getHTMLDoc4Str(html))
                    }

                    _$o(_res, options)
                }
            } ],
            help          : 
`# Jsoup oafp lib

## ⬇️  Jsoup input types:

Extra input types added by the Jsoup lib:

| Input type | Description |
|------------|-------------|
| html       | HTML input  |
| websearch  | Search terms on a web search engine |

---

### 🧾 HTML input option

Use with _in=html_:

| Option | Type | Description |
|--------|------|-------------|
| inhtmlfilter | String | Filter to apply to the HTML input (e.g. "basic", "basic-with-images", "simpletext", "relaxed", "none") |
| inhtmlraw | Boolean | If true instead of converting to a map the HTML filtered or unfiltered |

---

### 🧾 WebSearch input option

Use with _in=websearch_:

| Option | Type | Description |
|--------|------|-------------|
| inwebsearchlimit | Number | Limit the number of results returned by the web search |

The input data should be a string containing the search query.

`
        }

        return _r
    }
})();

