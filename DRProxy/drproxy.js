/**
 * <odoc>
 * <key>DRProxy.DRProxy(aMap)</key>
 * Creates an instance of DRProxy (Debug Reverse Proxy) that will create or use an existing HTTPServer to replicate HTTP/HTTPS requests.
 * A pre-proxy request and a pos-proxy request functions can be provided to allow for any debug customization. Variables for aMap:\
 * \
 *    proxyTo   (String)     The target prefix URL for all requests received by this HTTPServer.\
 *    proxyPort (Number)     In which port should this HTTPServer be created (if httpd is not provided).\
 *    httpd     (HTTPServer) An existing and running HTTPServer to use.\
 *    uriPrefix (String)     The URI prefix from where requests will be proxy (defaults to "/").\
 *    logFuncs  (Map)        A map of log functions (log, logWarn and logErr) that all receive the arguments (message, requestMap). See also DRProxy.defaultLogs.\
 *    preFunc   (Function)   A function to be executed before a request is sent to the target URL. Receives the arguments (requestMap). If the function returns a Map with stream and response the request won't be proxied to the target URL and the returned stream and response will be used instead.\
 *    posFunc   (Function)   A function to be executed after a request has been sent to the target URL. Receives the arguments (inputStream, requestMap). If the function returns a Map with stream and response those will overlap what will be returned to this proxy client.\
 * </odoc>
 */
var DRProxy = function(aMap) {
    ow.loadServer();
    ow.loadObj();
    if (isUnDef(aMap)) aMap = {};

    this.proxy_to = aMap.proxyTo;
    this.proxy_port = aMap.proxyPort;
    this.shouldLog = false;
    this.shouldPre = false;
    this.shouldPos = false;

    // Set default URI prefix
    if (isUnDef(aMap.uriPrefix)) aMap.uriPrefix = "/";

    // Set default log functions if any
    if (isDef(aMap.logFuncs)) {
        if (isDef(aMap.logFuncs.log)) this.log = aMap.logFuncs.log;
        if (isDef(aMap.logFuncs.logErr)) this.logErr = aMap.logFuncs.logErr;
        if (isDef(aMap.logFuncs.logWarn)) this.logWarn = aMap.logFuncs.logWarn;
        this.shouldLog = true;
    }

    // Set preFunc
    if (isDef(aMap.preFunc)) {
        this.funcPre = aMap.preFunc;
        this.shouldPre = true;
    }

    // Set posFunc
    if (isDef(aMap.posFunc)) {
        this.funcPos = aMap.posFunc;
        this.shouldPos = true;
    }

    if (isDef(aMap.host)) {
        this.host = aMap.host;
    } else {
        var u = new java.net.URL(aMap.proxyTo);
        this.host = String(u.getHost());
        if (u.getDefaultPort() != u.getPort()) this.host += ":" + u.getPort();
    }

    // Define which HTTPServer to use
    this.__hs = (isUnDef(aMap.httpd)) ? ow.server.httpd.start(this.proxy_port) : aMap.httpd;
    var parent = this;

    // Default proxy function
    var fproxy = function(r) {
        try {
            var fdata = "";
            // If PUT or POST take care of the extra content. Delete content-length
            if (r.method == "PUT" || r.method == "POST") {
                if (isDef(r.files.content)) {
                    try {
                        fdata = io.readFileString(r.files.content);
                    } catch (e) {
                        if (parent.shouldLog) parent.logErr(String(e), r);
                    }
                } else {
                    fdata = r.params["NanoHttpd.QUERY_STRING"];
                }
                delete r.header["Content-Length"];
                delete r.header["content-length"];
            }

            delete r.header.connection;
            delete r.header.Connection;

            var is, response, resPre;
            if (isDef(parent.host) && isDef(r.header)) r.header.host = parent.host;

            // Use the pre function if available
            if (parent.shouldPre) {
                try {
                    resPre = parent.funcPre(r);
                    // If pre function returned a result, use it
                    if (isDef(resPre)) {
                        if (!isJavaObject(resPre.stream) || isUnDef(resPre.response))
                           throw "A preFunc should return a map with 'stream' (InputStream) and 'response'";
                        is = resPre.stream;
                        response = resPre.response;
                    }
                } catch(e1) {
                    if (parent.shouldLog) parent.logErr(String(e1),  r);
                }
            }

            // Proxy request only if there wasn't any returned result from a pre function
            if (isUnDef(resPre)) {
                var ht = new ow.obj.http();
                ht.setConfig({
                    disableCookie: true,
                    disableRedirectHandling: true
                });
                try {
                    is = ht.exec(parent.proxy_to + r.originalURI, r.method, fdata, r.header, void 0, void 0, true, 30000);
                    if (is == null || isUnDef(is)) is = "";
                } catch(e) {
                    is = af.fromInputStream2String(ht.outputObj);
                    if (is == null || isUnDef(is)) {
                        is = "";
                        e.javaException.printStackTrace();
                    }
                }

                try {
                    response = {
                        contentType: ht.responseType(),
                        code: ht.responseCode(),
                        header: ht.responseHeaders()
                    };
                } catch(e) {
                    response = {};
                }
            }
            
            // Merge the proxy request into the main request map
            r = merge(r, { response: response });

            var resPos;
            // Use the pos function if available
            if (parent.shouldPos) {
                try { 
                    resPos = parent.funcPos(is, r);
                    // If pos function returned a result, use it
                    if (isDef(resPos)) {
                        if (!isJavaObject(resPos.stream) || isUnDef(resPos.response))
                           throw "A posFunc should return a map with 'stream' (InputStream) and 'response'";
                        is = resPos.stream;
                        response = resPos.response;
                    }
                } catch(e1) {
                    if (parent.shouldLog) parent.logErr(String(e1),  r);
                }
            }

            if (parent.shouldLog) parent.log(r.originalURI, r);

            // Remove transfer-encoding and content-type as the HTTPServer will create them.
            var heads = {};
            
            if (isDef(r.response) && isDef(r.response.header)) {
                heads = r.response.header;

                //delete heads["Transfer-Encoding"];
                //delete heads["transfer-encoding"];
                //delete heads["Content-Encoding"];
                //delete heads["content-encoding"];
                //delete heads["Content-Type"];
                //delete heads["content-type"];
                if (isDef(parent.host)) heads.host = parent.host;
            }

            if (!isString(is)) {
                return parent.__hs.replyStream(is, r.response.contentType, r.response.code, heads);
            } else {
                return parent.__hs.reply(is, r.response.contentType, r.response.code, heads);
            }
        } catch (e) {
            if (parent.shouldLog) parent.logErr(String(e),  r);
        }
    };

    // Bind the route function to the current HTTPServer
    var routes = {};
    routes[aMap.uriPrefix] = fproxy;
    ow.server.httpd.route(this.__hs, routes);
};

/**
 * <odoc>
 * <key>DRProxy.stop()</key>
 * Stops the currently defined HTTPServer (either created or provided).
 * </odoc>
 */
DRProxy.prototype.stop = function() {
    ow.server.httpd.stop(this.__hs);
};

DRProxy.defaultLog = function(aMsg, r) { tlog("{{method}} {{{originalURI}}} | {{response.code}} {{{response.contentType}}} {{response.header.Content-Length}}", r); };
DRProxy.prototype.log = function(aMsg, r) { };

DRProxy.defaultLogWarn = function(aMsg, r) { tlogWarn("{{method}} {{{originalURI}}} | {{response.code}} {{{response.contentType}}} {{response.header.Content-Length}}", r); };
DRProxy.prototype.logWarn = function(aMsg, r) { };

DRProxy.defaultLogErr = function(aMsg, r) { tlogErr("{{method}} {{{originalURI}}} | " + aMsg, r); };
DRProxy.prototype.logErr = function(aMsg, r) { };

/**
 * <odoc>
 * <key>DRProxy.defaultLogs</key>
 * Provides default log functions.
 * </odoc>
 */
DRProxy.defaultLogs = {
    log: DRProxy.defaultLog,
    logWarn: DRProxy.defaultLogWarn,
    logErr: DRProxy.defaultLogErr
};