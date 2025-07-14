//var asciinema = require((getOPackPath("asciinema") || ".")
var myPath = getOPackPath("asciinema") || "."

ow.loadServer()

__flags.HTTPD_CUSTOMURIS = merge(__flags.HTTPD_CUSTOMURIS, {
	"/js/asciinema-emb-player.js": function(aHTTPd) {
		return aHTTPd.reply(io.readFileString(myPath + "/libs/asciinema-emb-player.js"), ow.server.httpd.mimes.JS, ow.server.httpd.codes.OK, ow.server.httpd.cache.public)
	},
	"/css/asciinema-player.min.css": function(aHTTPd) {
		return aHTTPd.reply(io.readFileString(myPath + "/libs/asciinema-player.min.css"), ow.server.httpd.mimes.CSS, ow.server.httpd.codes.OK, ow.server.httpd.cache.public)
	},
	"/js/asciinema-player.min.js": function(aHTTPd) {
		return aHTTPd.reply(io.readFileString(myPath + "/libs/asciinema-player.min.js"), ow.server.httpd.mimes.JS, ow.server.httpd.codes.OK, ow.server.httpd.cache.public)
	}
})