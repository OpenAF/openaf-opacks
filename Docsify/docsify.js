// Author: Nuno Aguiar

ow.loadServer();

/**
 * <odoc>
 * <key>ow.server.httpd.replyDocsify(aHTTPServer, aDocRootPath, aBaseURI, aRequest, options) : Map</key>
 * Returns everything necessary to reply a docsify content given aHTTPServer, the aDocRootPath where the markdown
 * documents are located, aBaseURI the current request and docsify options:\
 * \
 *    title   (String) \
 *    theme   (String) (can be set using ?t= on the request)\
 *    langs   (Array)  Defaults to yaml and markdown\
 *    plugins (Array)  Defaults to docsify-copy-code\
 * \
 * </odoc>
 */
ow.server.httpd.replyDocsify = function(aHs, docRoot, aURI, aRequest, options) {
    var pth = getOPackPath("Docsify") || ".";
    pth += "/";

    docRoot = _$(docRoot, "docRoot").isString().default(".");
    aURI    = _$(aURI, "URI").$_();
    options = _$(options, "options").isMap().default({});

    if (aURI[aURI.length -1] != "/") aURI += "/";

    if (aRequest.uri.endsWith(".md")) {
        return ow.server.httpd.replyFile(aHs, docRoot, aURI, aRequest.uri);
    } else {
        if (aRequest.uri.startsWith(aURI + "_d")) {
            return ow.server.httpd.replyFile(aHs, pth + "docsify", aURI + "_d", aRequest.uri);
        }

        if (aRequest.uri.startsWith(aURI + "_p")) {
            return ow.server.httpd.replyFile(aHs, pth + "prismjs", aURI + "_p", aRequest.uri);
        }

        var cont = templify(io.readFileString(pth + "index.hbs"), merge({
            uri    : aURI,
            title  : "",
            theme  : (isDef(aRequest.params) && isDef(aRequest.params.t) ? aRequest.params.t : "vue"),
            options: stringify({
                name: "",
                repo: ""
            }),
            langs  : [ "yaml", "markdown" ],
            plugins: [ "docsify-copy-code" ]
        }, options));
        return ow.server.httpd.reply(cont, 200, "text/html");
    }
};