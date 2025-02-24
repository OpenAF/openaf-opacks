ow.loadServer()
ow.loadTemplate()

ow.server.httpd.customLibs["mermaid.js"] = function(aHTTPd) { 
    var path = getOPackPath("Mermaid") || "."
    return aHTTPd.reply(io.readFileString(path + "/lib/mermaid.min.js"), ow.server.httpd.mimes.JS, ow.server.httpd.codes.OK, ow.server.httpd.cache.public)
}

let htmlExtras = [
    { t: "`mermaid", e: '<script src=\"/js/mermaid.js\"></script>"' },
    { t: "`mermaid", e: '"<script>mermaid.initialize({ startOnLoad: true })</script>"' }
].forEach(l => {
    if (isDef(ow.template.__mdHTMLTExtras)) {
        if ($from(ow.template.__mdHTMLTExtras).equals("t", l.t).equals("e", l.e).none())
            ow.template.__mdHTMLTExtras.push(l)
    } else {
        if (ow.template.__mdHTMLExtras.indexOf(l.e) < 0) ow.template.__mdHTMLExtras.push(l.e)
    }
})

if (isDef(ow.template.__srcPath)) ow.template.__srcPath["/js/mermaid.js"] = (getOPackPath("Mermaid") || ".") + "/lib/mermaid.min.js"