// Author: Nuno Aguiar

ow.loadServer();

var Docsify = function() {
    this.pth = getOPackPath("Docsify") || ".";
    this.pth = io.fileInfo(this.pth).canonicalPath;
    this.pth += "/";
};

Docsify.prototype.startLiveServer = function(aPort, aHost, aPath, aMap) {
    var ws = [], state = -1;
    var hs = ow.server.httpd.start(aPort, aHost, void 0, void 0, void 0, {
        onOpen     : _ws => { ws.push(_ws); }, 
        onClose    : (_ws, code, reason, hIBR) => { ws = deleteFromArray(ws, ws.indexOf(_ws)); },
        onMessage  : (_ws, aMsg) => { }, 
        onPong     : (_ws, aPong) => { }, 
        onException: (_ws, e) => { /*sprintErr("exception: " + e);*/ }
    }, 60000 * 60);
    hs.addWS("/ws");
    ow.server.httpd.route(hs, { 
        "/" : function(r, aHs) { 
            return ow.server.httpd.replyDocsify(aHs, aPath, "/", r, merge(aMap, { liveupdate: true }));
        } 
    });

    ow.server.daemon(500, () => {
        var tstate = 0;
        listFilesRecursive(aPath).map(r => { tstate += r.lastModified });
        if (tstate != state) {
            if (state < 0) {
                state = tstate;
            } else {
                state = tstate;
                ws.map(r => r.send("reload"));
            }
        }
    });
};

/**
 * <odoc>
 * <key>Docsify.genStaticVersion(aMapMDs, options) : String</key>
 * Tries to generate a static "all-in" version with docsify over aMapMDs (where the key is "/filename.md" and value is
 * the markdown string or a markdown file path). Aditionally you can add docsify options:\
 * \
 *    title   (String)  \  
 *    theme   (String)  Defaults to vue\
 *    langs   (Array)   Defaults to yaml, markdown, docker, json, sql, python and bash\
 *    plugins (Array)   Defaults to docsify-copy-code\
 *    mermaid (Boolean) Defaults to false\
 * \
 * Example of aMapMDs:\
 * \
 *    { "/README.md" : "# Test\n[Link to README](read_me.md)",\
 *      "/read_me.md": "README.md" }\
 * \
 * </odoc>
 */
Docsify.prototype.genStaticVersion = function(aMapMDs, options) {
    options = _$(options, "options").isMap().default({});
    aMapMDs = _$(aMapMDs, "mapMDs").isMap().default({});

    var output = "";

    output = templify(io.readFileString(this.pth + "index.hbs"), merge({
        uri    : "/",
        title  : "",
        theme  : "vue",
        options: stringify({
            name: "",
            repo: ""
        }),
        langs  : [ "yaml", "markdown", "docker", "json", "sql", "python", "bash" ],
        plugins: [ "docsify-copy-code" ],
        mermaid: false,
        mermaidOptions: stringify({
            startOnLoad: false
        })
    }, options));

    for(var k in aMapMDs) {
        if (isString(aMapMDs[k])) {
            if (aMapMDs[k].indexOf("\n") < 0 && io.fileExists(aMapMDs[k])) {
                aMapMDs[k] = {
                    content: io.readFileString(aMapMDs[k])
                };
            } else {
                aMapMDs[k] = {
                    content: String(aMapMDs[k])
                };
            }

            // Process images
            var o = aMapMDs[k].content, ar = null;
            do {
                ar = o.match(/(\!\[[^\]]+\]\()(\w+\.\w+)/); 
                if (ar != null && io.fileExists(ar[2])) 
                    o = o.substring(0, ar["index"]) + ar[1] + ow.template.html.inlineSrc(ar[2]) + " " + o.substring(ar["index"] + ar[0].length);
            } while(ar != null);
            aMapMDs[k].content = o;
        }
    }

    var cont = stringify(aMapMDs, void 0, "");
    var res  = af.fromString2Bytes(io.readFileString(this.pth + "/docsify/docsify.min.js")
               .replace("var F={};function L", "var F=" + cont + ";function L")
               .replace("var s=new XMLHttpRequest,r=F[a]", "var s=new XMLHttpRequest,r=F[a.substring(window.location.href.indexOf(\"#\")-7)]")
               );

    output = output.replace("\"/_d/docsify.min.js", "\"docsify.js");
    output = output.replace("\"/_m/mermaid.min.js", "\"" + this.pth + "/mermaid/mermaid.min.js");
    output = output.replace(/\"\/\_p\//g, "\"" + this.pth + "prismjs/");
    output = output.replace(/\"\/\_d\//g, "\"" + this.pth + "docsify/");
    output = output.replace("\"docsify.js", "\"data:application/javascript; charset=utf-8;base64," + af.fromBytes2String(af.toBase64Bytes(res)));
    output = ow.template.html.genStaticVersion(output);

    return output;
};

/**
 * <odoc>
 * <key>ow.server.httpd.replyDocsify(aHTTPServer, aDocRootPath, aBaseURI, aRequest, options) : Map</key>
 * Returns everything necessary to reply a docsify content given aHTTPServer, the aDocRootPath where the markdown
 * documents are located, aBaseURI the current request and docsify options:\
 * \
 *    title   (String) \
 *    theme   (String) (can be set using ?t= on the request)\
 *    langs   (Array)  Defaults to yaml, markdown, docker, json, sql, python and bash\
 *    plugins (Array)  Defaults to docsify-copy-code\
 *    mermaid (Boolean) Defaults to false\
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

        if (aRequest.uri.startsWith(aURI + "_m")) {
            return ow.server.httpd.replyFile(aHs, pth + "mermaid", aURI + "_m", aRequest.uri);
        }

        var cont = templify(io.readFileString(pth + "index.hbs"), merge({
            uri    : aURI,
            title  : "",
            theme  : (isDef(aRequest.params) && isDef(aRequest.params.t) ? aRequest.params.t : "vue"),
            options: stringify({
                name: "",
                repo: ""
            }),
            langs  : [ "yaml", "markdown", "docker", "json", "sql", "python", "bash" ],
            plugins: [ "docsify-copy-code" ],
            mermaid: false,
            mermaidOptions: stringify({
                startOnLoad: false
            })
        }, options));
        return ow.server.httpd.reply(cont, 200, "text/html");
    }
};
