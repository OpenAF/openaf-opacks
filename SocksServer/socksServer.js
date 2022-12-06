/**
 * <odoc>
 * <key>SocksServer.SocksServer()</key>
 * Initiates a SockServer wrapper.
 * </odoc>
 */
var SocksServer = function() {
    if (isUnDef(getOPackPath("SocksServer")))
        loadExternalJars(".")
    else
        loadExternalJars(getOPackPath("SocksServer"))
}

/**
 * <odoc>
 * <key>SocksServer.start(aPort)</key>
 * Starts a socks server on aPort (no encryption of traffic). Repeated calls will create
 * other socks server.
 * </odoc>
 */
SocksServer.prototype.start = function(aPort, aCallback) {
    aPort = _$(aPort).isNumber().default(1080)

    if (isUnDef(this._server)) {
        this._server = new Packages.org.bbottema.javasocksproxyserver.SocksServer()
    }
    if (isDef(aCallback)) {
        return this._server.start(aPort, aCallback)
    } else {
        return this._server.start(aPort)
    }
}

/**
 * <odoc>
 * <key>SocksServer.stop()</key>
 * Stops all socks server started using this current SocksServer instance.
 * </odoc>
 */
SocksServer.prototype.stop = function() {
    this._server.stop()
}

/**
 * <odoc>
 * <key>SocksServer.getLogCallback(verboseLog, detailLog, includeStackTrace) : Function</key>
 * Returns a function to be used as a callback with SocksServer.start. If verboseLog=true connection logging will be output. If verboseLog and detailLog=true
 * a more detailed log will be output. If includeStackTrace=true with verboseLog=true any exception will also output the corresponding Java stack trace.
 * </odoc>
 */
SocksServer.prototype.getLogCallback = function(verboseLog, detailLog, includeStackTrace) {
    return this.getCallback(__, verboseLog, detailLog, includeStackTrace)
}

/**
 * <odoc>
 * <key>SocksServer.getNetFilter(ipFilters) : Function</key>
 * Returns a function to be used with SocksServer.getCallback to filter an array of ipFilters masks (e.g. as cidr).
 * </odoc>
 */
SocksServer.prototype.getNetFilter = function(ipFilters) {
    ipFilters = _$(ipFilters, "ipFilters").isArray().default([])

    return function(data) {
        var _cmp = (aSource, filters) => {
            var go = false
            var d = aSource.getAddress()
            filters.forEach(ip => {
                if (ip.indexOf("/") > 0) {
                    var _p = ip.split("/")
                    var t = java.net.InetAddress.getByName(_p[0]).getAddress()
                    var l = (java.net.InetAddress.getByName(_p[0]).getHostAddress().indexOf(":") >= 0 ? 128 : 32)
    
                    var _r = true
                    for(var i = 0; i < (l - _p[1]) / 8; i++) {
                        if (t[i] != d[i]) _r = false
                    }
                    if (_r) go = true
                    _p.push(go)
                }
            })
            return !go
        }

        return _cmp(data, ipFilters)
    }
}

/**
 * <odoc>
 * <key>SocksServer.getLocalNetFilter() : Function</key>
 * Returns a function to be used with SocksServer.getCallback to filter private local network CIRDs.
 * </odoc>
 */
SocksServer.prototype.getLocalNetFilter = function() {
    var ipFilters = [ "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "fc00::/7" ]

    return this.getNetFilter(ipFilters)
}

/**
 * <odoc>
 * <key>SocksServer.getLocalNetCallback(verboseLog, detailLog, includeStackTrace) : Function</key>
 * Returns a function to be used with SocksServer.start to provide a filter of private local network CIRDs as well as connection logs. If verboseLog and detailLog=true
 * a more detailed log will be output. If includeStackTrace=true with verboseLog=true any exception will also output the corresponding Java stack trace.
 * </odoc>
 */
SocksServer.prototype.getLocalNetCallback = function(verboseLog, detailLog, includeStackTrace) {
    return this.getCallback(this.getLocalNetFilter(), verboseLog, detailLog, includeStackTrace)
}

/**
 * <odoc>
 * <key>SocksServer.getCallback(aFilterFunc, verboseLog, detailLog, includeStackTrace) : Function</key>
 * Returns a function to be used with SocksServer.start to provide a generic aFilterFunc and connection logs. If verboseLog and detailLog=true
 * a more detailed log will be output. If includeStackTrace=true with verboseLog=true any exception will also output the corresponding Java stack trace.
 * </odoc>
 */
SocksServer.prototype.getCallback = function(aFilterFunc, verboseLog, detailLog, includeStackTrace) {
    verboseLog = _$(verboseLog, "verboseLog").isBoolean().default(true)
    detailLog  = _$(detailLog, "detailLog").isBoolean().default(false)
    includeStackTrace = _$(includeStackTrace, "includeStackTrace").isBoolean().default(false)
    aFilterFunc = _$(aFilterFunc, "filterFunc").isFunction().default(__)

    return {
        filter: function(data) {
            if (isDef(aFilterFunc))
                return aFilterFunc(data) 
            else
                return false
        },
        error: function(msg, e) {
            logErr(msg)
            if (isDef(e) && includeStackTrace) e.printStackTrace()
        },
        debug: function(msg, e) {
            if (!detailLog && !(msg.indexOf("Connected to") == 0 || msg.indexOf("Connection from") == 0)) return
            log("AUDIT | " + msg)
            if (isDef(e) && includeStackTrace) e.printStackTrace()
        },
        info: function(msg) {
            log(msg)
        }
    }
}