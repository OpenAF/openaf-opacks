/**
 * <odoc>
 * <key>SocksServer.SocksServer(aCacheTTL)</key>
 * Initiates a SockServer wrapper.
 * </odoc>
 */
var SocksServer = function(aCacheTTL, aNumberOfWorkers) {
    if (isUnDef(getOPackPath("SocksServer")))
        loadExternalJars(".")
    else
        loadExternalJars(getOPackPath("SocksServer"))

    this._cache = {}
    this._old   = now()
    this._ttl   = _$(aCacheTTL, "aCacheTTL").isNumber().default(60000)

    this._workers = aNumberOfWorkers
    this._compiledFilters = {} // Cache for pre-compiled CIDR filters
}

/**
 * <odoc>
 * <key>SocksServer._ipToInt(aIP) : Number</key>
 * Converts an IPv4 address string to a 32-bit integer for efficient comparison.
 * </odoc>
 */
SocksServer.prototype._ipToInt = function(aIP) {
    var parts = aIP.split('.')
    return (parseInt(parts[0]) << 24) + (parseInt(parts[1]) << 16) + (parseInt(parts[2]) << 8) + parseInt(parts[3])
}

/**
 * <odoc>
 * <key>SocksServer._getCompiledFilter(aFilter) : Object</key>
 * Pre-compiles a CIDR filter into network and mask integers for efficient matching.
 * Returns an object with 'network' and 'mask' properties.
 * </odoc>
 */
SocksServer.prototype._getCompiledFilter = function(aFilter) {
    if (isDef(this._compiledFilters[aFilter])) {
        return this._compiledFilters[aFilter]
    }
    
    var parts = aFilter.split('/')
    var networkInt = this._ipToInt(parts[0])
    var prefixLength = parseInt(parts[1])
    var mask = (0xffffffff << (32 - prefixLength)) >>> 0
    var network = (networkInt & mask) >>> 0
    
    var compiled = { network: network, mask: mask }
    this._compiledFilters[aFilter] = compiled
    return compiled
}

/**
 * <odoc>
 * <key>SocksServer.start(aPort, aCallback)</key>
 * Starts a socks server on aPort (no encryption of traffic). Repeated calls will create
 * other socks server.
 * </odoc>
 */
SocksServer.prototype.start = function(aPort, aCallback) {
    aPort = _$(aPort).isNumber().default(1080)

    if (isUnDef(this._server)) {
        this._server = (isDef(this._workers) ? new Packages.org.bbottema.javasocksproxyserver.SocksServer(this._workers) : new Packages.org.bbottema.javasocksproxyserver.SocksServer())
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
 * <key>SocksServer.getNetFilter(ipFilters, hostFilters, asnFilter, shouldInvert) : Function</key>
 * Returns a function to be used with SocksServer.getCallback to filter an array of ipFilters masks (e.g. as cidr) and/or an array of
 * hostFilters suffixes (e.g. "mydomain.com"). If asnFilter is provided it will also filter based on the ASN of the source IP address.
 * If shouldInvert=true the filter will return true for the addresses that do not match the filters.
 * The ipFilters and hostFilters are expected to be arrays of strings, while asnFilter is expected to be an array of numbers.
 * The function returned will take a data object as input, which is expected to have a getAddress() method that returns the source address as a java.net.InetAddress object.
 * The function will return true if the source address matches any of the provided filters, or false otherwise.
 * The function will cache the results for the last _ttl milliseconds to avoid repeated calculations.
 * </odoc>
 */
SocksServer.prototype.getNetFilter = function(ipFilters, hostFilters, asnFilter, shouldInvert) {
    ipFilters    = _$(ipFilters, "ipFilters").isArray().default([])
    hostFilters  = _$(hostFilters, "hostFilters").isArray().default([])
    asnFilter    = _$(asnFilter, "asnFilter").isArray().default([])
    shouldInvert = _$(shouldInvert, "shouldInvert").isBoolean().default(false)

    // TODO: cache filters
    var parent = this
    return function(data) {
        const _cmp = (aSource, filters, hfilters, afilters, shouldInvert) => {
            if (parent._old + parent._ttl < now()) parent._cache = {}
            
            // Use IP string as cache key instead of full object
            var sourceIP = String(aSource.getHostAddress())
            var cacheKey = sourceIP + ":" + (shouldInvert ? "1" : "0")
            if (isDef(parent._cache[cacheKey])) return parent._cache[cacheKey]

            var go = false, go2 = false, hasASNFilter = isDef(afilters) && afilters.length > 0
            
            // Convert IP to 32-bit integer for efficient CIDR matching
            var sourceInt = parent._ipToInt(sourceIP)

            // For each IP filter check if the source address matches using integer comparison
            for (let filter of filters) {
                if (go) break
                if (filter.indexOf("/") > 0) {
                    // Use pre-computed filter objects if available
                    var filterObj = parent._getCompiledFilter(filter)
                    if ((sourceInt & filterObj.mask) === filterObj.network) {
                        go = true
                    }
                }
            }

            if (hasASNFilter && !go) {
                // If ASN based filters are provided, check if the source address matches any of them
                for (let asn of afilters) {
                    if (go) break
                    var _asn = parent.asnIndexIP2ASN(sourceIP, parent._aidx)
                    if (isDef(_asn) && _asn.a == asn) {
                        go = true
                        break
                    }
                }
            }

            // If host based filters are provided, check if the source address matches any of them
            if (isUnDef(hfilters) || hfilters.length == 0) {
                go2 = go
            } else {
                if (isDef(filters) && filters.length > 0 && !go) {
                    go2 = false
                } else {
                    var hostname = String(aSource).split("/")[0]
                    for (let h of hfilters) {
                        if (hostname.endsWith(h)) {
                            go2 = true
                            break
                        }
                    }
                }
            }

            var result = shouldInvert ? go2 : !go2
            parent._cache[cacheKey] = result
            return result
        }

        return _cmp(data, ipFilters, hostFilters, asnFilter, shouldInvert)
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
            if (verboseLog) log("AUDIT | " + msg)
            if (isDef(e) && includeStackTrace) e.printStackTrace()
        },
        info: function(msg) {
            log(msg)
        }
    }
}

/**
 * <odoc>
 * <key>SocksServer.createIP2ASNIndex(aFile, aIP2ASNCache, logFn)</key>
 * Creates an ASN index from the aIP2ASNCache (defaults to the one retrieved by SocksServer.getIP2ASNCache()) and saves it into aFile.
 * If aIP2ASNCache is not provided it will be retrieved using SocksServer.getIP2ASNCache(). The index is saved as a JSON array with the following structure:
 * [ { i: (index), a: (asn), s: (start), e: (end) }, ... ]
 * where i is the index in the original aIP2ASNCache, a is the ASN number, s is the start IP in integer format and e is the end IP in integer format.
 * The aFile is saved as a gzip compressed JSON file.
 * </odoc>
 */
SocksServer.prototype.createIP2ASNIndex = function(aFile, aIP2ASNCache, logFn) {
    _$(aFile, "aFile").isString().$_()
    logFn = _$(logFn, "logFn").isFunction().default(log)

    var _r
    if (isUnDef(aIP2ASNCache)) {
        logFn("Creating IP2ASN cache...")
        _r = ow.net.getIP2ASNCache()
        logFn("Cache loaded with #" + _r.length)
    } else {
        _r = aIP2ASNCache
        logFn("Using provided IP2ASN cache with #" + _r.length)
    }

    logFn("Creating ASN index...")
    var _aidx = pForEach(_r, (r, i) => ({
        i: i,
        a: Number(r.asn),
        s: r.istart,
        e: r.iend
    }))
    logFn("ASN index created with #" + _aidx.length)

    logFn("Saving into aidx.json.gz")
    var os = io.writeFileGzipStream(aFile)
    ioStreamWriteBytes(os, stringify(_aidx, __, ""))
    os.flush()
    os.close()
    logFn("Created aidx.json.gz with " + io.fileInfo(aFile).size + " bytes")
}

/**
 * <odoc>
 * <key>SocksServer.getIP2ASNIndex(aFile)</key>
 * Given aFile will try to retrieve the ASN index from the file.
 * The file is expected to be a gzip compressed JSON file with the following structure (produced with SocksServer.createIP2ASNIndex()):
 * [ { i: (index), a: (asn), s: (start), e: (end) }, ... ]
 * where i is the index in the original aIP2ASNCache, a is the ASN number, s is the start IP in integer format and e is the end IP in integer format.
 * </odoc>
 */
SocksServer.prototype.getIP2ASNIndex = function(aFile) {
    _$(aFile, "aFile").isString().$_()

    var is = io.readFileGzipStream(aFile)

    var _r = jsonParse(af.fromInputStream2String(is), true)
    is.close()
    this._aidx = _r
}

/**
 * <odoc>
 * <key>SocksServer.asnIndexIP2ASN(aIP, aidx) : Map</key>
 * Given an aIP (or host) will try to retrieve the corresponding ASN information from the aidx (defaults to the one retrieved
 * by SocksServer.getIP2ASNIndex()). Returns a map with the ASN information.
 * The aidx is expected to be an array with the following structure:
 * [ { i: (index), a: (asn), s: (start), e: (end) }, ... ]
 * where i is the index in the original aIP2ASNCache, a is the ASN number, s is the start IP in integer format and e is the end IP in integer format.
 * </odoc>
 */
SocksServer.prototype.asnIndexIP2ASN = function(aIP, _aidx) {
    _$(aIP, "aIP").isString().$_()
    _$(_aidx, "_aidx").isArray().$_()

    ow.loadFormat()
    ow.loadNet()
    var _t = ow.format.IP2int(ow.net.getHost2IP(aIP))

    return _aidx.find(r => r.s <= _t && r.e >= _t) 
}

/**
 * <odoc>
 * <key>SocksServer.asnIndexASN2IP(aASN, aidx) : Map</key>
 * Given an aASN will try to retrieve the corresponding ASN information from the aidx. Returns a map with the ASN information.
 * The aidx is expected to be an array with the following structure:
 * [ { i: (index), a: (asn), s: (start), e: (end) }, ... ]
 * where i is the index in the original aIP2ASNCache, a is the ASN number, s is the start IP in integer format and e is the end IP in integer format.
 * </odoc>
 */
SocksServer.prototype.asnIndexASN2IP = function(aASN, _aidx) {
    _$(aASN, "aASN").isNumber().$_()
    _$(_aidx, "_aidx").isArray().$_()

    return _aidx.find(r => r.a == aASN)
}