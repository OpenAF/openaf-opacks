var asciidoctor = require((getOPackPath("Asciidoc") || ".") + "/lib/asciidoctor.min.js")()

ow.loadServer()
OpenWrap.server.prototype.httpd.replyAsciidoc = function(aHTTPd, aBaseFilePath, aBaseURI, aURI, aOptions, notFoundFunction, documentRootArray, mapOfHeaders) {
	aOptions = _$(aOptions, "aOptions").isMap().default()
	aOptions = merge({ standalone: true, attributes: { 
		nofooter: true, 
		"safe": "server"
	} }, aOptions)

	if (isUnDef(this.__routes[aHTTPd.getPort()]["/_asciidoc/asciidoctor.css"])) this.__routes[aHTTPd.getPort()]["/_asciidoc/asciidoctor.css"]= function() { return aHTTPd.reply(io.readFileString((getOPackPath("Asciidoc") || ".") + "/lib/asciidoctor.css"), ow.server.httpd.mimes.CSS, ow.server.httpd.codes.OK, ow.server.httpd.cache.public) }
	if (isUnDef(this.__routes[aHTTPd.getPort()]["/_asciidoc/highlight.css"])) this.__routes[aHTTPd.getPort()]["/_asciidoc/highlight.css"]= function() { return aHTTPd.reply(io.readFileString((getOPackPath("Asciidoc") || ".") + "/lib/highlight.css"), ow.server.httpd.mimes.CSS, ow.server.httpd.codes.OK, ow.server.httpd.cache.public) }
	if (isUnDef(this.__routes[aHTTPd.getPort()]["/_asciidoc/highlight.js"])) this.__routes[aHTTPd.getPort()]["/_asciidoc/highlight.js"]= function() { return aHTTPd.reply(io.readFileString((getOPackPath("Asciidoc") || ".") + "/lib/highlight.min.js"), ow.server.httpd.mimes.JS, ow.server.httpd.codes.OK, ow.server.httpd.cache.public) }

	if (isUnDef(notFoundFunction)) {
		notFoundFunction = function() {
			return aHTTPd.reply("Not found!", ow.server.httpd.mimes.TXT, ow.server.httpd.codes.NOTFOUND);
		}
	}
	try {
		var baseFilePath = String((new java.io.File(aBaseFilePath)).getCanonicalPath()).replace(/\\/g, "/")
		var furi = String((new java.io.File(new java.io.File(baseFilePath),
			(new java.net.URI(aURI.replace(new RegExp("^" + aBaseURI), "") )).getPath())).getCanonicalPath()).replace(/\\/g, "/")
		
		if (isUnDef(documentRootArray)) documentRootArray = [ "index.adoc" ]

		// TODO:if io.fileExists is false to directories
		if (io.fileExists(furi) && io.fileInfo(furi).isDirectory) {
			for(var i in documentRootArray) {
				furi = String((new java.io.File(new java.io.File(baseFilePath),
					(new java.net.URI((aURI + documentRootArray[i]).replace(new RegExp("^" + aBaseURI), "") )).getPath())).getCanonicalPath())
				if (furi.match(new RegExp("^" + baseFilePath))) break
			}
		}

		if (!(furi.match(/[^/]+\.[^/]+$/))) furi = furi + ".adoc"

		if (furi.match(new RegExp("^" + baseFilePath))) {
			if (furi.match(/\.adoc$/)) {
				return aHTTPd.replyOKHTML(asciidoctor.convert(io.readFileString(furi), { 
					standalone: true, 
					attributes: { 
						nofooter: true 
					}
				}).replace('<link rel="stylesheet" href="./asciidoctor.css">', '<link rel="stylesheet" href="/_asciidoc/asciidoctor.css"><link rel="stylesheet" href="/_asciidoc/highlight.css"><script src="/_asciidoc/highlight.js"></script><script>hljs.initHighlightingOnLoad()</script>'))
			} else {
				return aHTTPd.replyBytes(io.readFileBytes(furi), ow.server.httpd.getMimeType(furi), __, mapOfHeaders)
			}
		} else {
			return notFoundFunction(aHTTPd, aBaseFilePath, aBaseURI, aURI)
		}
	} catch(e) { 
		return notFoundFunction(aHTTPd, aBaseFilePath, aBaseURI, aURI, e)
	}
}