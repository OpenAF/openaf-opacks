ow.loadServer()
ow.loadTemplate()

ow.server.httpd.customLibs["mermaid.js"] = function(aHTTPd) { 
    var path = getOPackPath("Mermaid") || "."
    return aHTTPd.reply(io.readFileString(path + "/lib/mermaid.min.js"), ow.server.httpd.mimes.JS, ow.server.httpd.codes.OK, ow.server.httpd.cache.public)
}

let htmlExtras = [
    "<script src=\"/js/mermaid.js\"></script>",
    "<script>mermaid.initialize({ startOnLoad: true })</script>"
].forEach(l => {
    if (ow.template.__mdHTMLExtras.indexOf(l) < 0) ow.template.__mdHTMLExtras.push(l)
})

if (isDef(ow.template.__srcPath)) ow.template.__srcPath["/js/mermaid.js"] = (getOPackPath("Mermaid") || ".") + "/lib/mermaid.min.js"