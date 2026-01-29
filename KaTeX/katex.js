ow.loadServer()
ow.loadTemplate()

var KATEX_PATH = getOPackPath("KaTeX") || "."

ow.server.httpd.customLibs["katex.min.js"] = function(aHTTPd) {
    return aHTTPd.reply(
        io.readFileString(KATEX_PATH + "/lib/katex.min.js"),
        ow.server.httpd.mimes.JS,
        ow.server.httpd.codes.OK,
        ow.server.httpd.cache.public
    )
}

ow.server.httpd.customLibs["auto-render.min.js"] = function(aHTTPd) {
    return aHTTPd.reply(
        io.readFileString(KATEX_PATH + "/lib/auto-render.min.js"),
        ow.server.httpd.mimes.JS,
        ow.server.httpd.codes.OK,
        ow.server.httpd.cache.public
    )
}

ow.server.httpd.customLibs["katex.min.css"] = function(aHTTPd) {
    return aHTTPd.reply(
        io.readFileString(KATEX_PATH + "/lib/katex.min.css"),
        ow.server.httpd.mimes.CSS,
        ow.server.httpd.codes.OK,
        ow.server.httpd.cache.public
    )
}

var htmlExtras = [
    { t: "$", e: '<link rel="stylesheet" href="/css/katex.min.css">' },
    { t: "$", e: '<script src="/js/katex.min.js"></script>' },
    { t: "$", e: '<script src="/js/auto-render.min.js"></script>' },
    { t: "$", e: '<script>window.addEventListener("DOMContentLoaded", function() { if (typeof renderMathInElement !== "function") return; renderMathInElement(document.body, { delimiters: [{ left: "$$", right: "$$", display: true }, { left: "\\[", right: "\\]", display: true }, { left: "$", right: "$", display: false }, { left: "\\(", right: "\\)", display: false }], throwOnError: false, trust: false }); });</script>' }
].forEach(l => {
    if (isDef(ow.template.__mdHTMLTExtras)) {
        if ($from(ow.template.__mdHTMLTExtras).equals("t", l.t).equals("e", l.e).none())
            ow.template.__mdHTMLTExtras.push(l)
    } else {
        if (ow.template.__mdHTMLExtras.indexOf(l.e) < 0) ow.template.__mdHTMLExtras.push(l.e)
    }
})

if (isDef(ow.template.__srcPath)) {
    ow.template.__srcPath["/js/katex.min.js"] = KATEX_PATH + "/lib/katex.min.js"
    ow.template.__srcPath["/js/auto-render.min.js"] = KATEX_PATH + "/lib/auto-render.min.js"
    ow.template.__srcPath["/css/katex.min.css"] = KATEX_PATH + "/lib/katex.min.css"

    var fontsPath = KATEX_PATH + "/lib/fonts"
    if (io.fileExists(fontsPath)) {
        io.listFiles(fontsPath).files.forEach(f => {
            ow.template.__srcPath["/css/fonts/" + f.filename] = f.canonicalPath
        })
    }
}
