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
    this._asnCache = {}        // Cache for IP-to-ASN lookups
    this._aidx = []            // ASN index for IP lookups

    this._m_errors   = $atomic(0, "long") // Atomic counter for errors
    this._m_errors_turn = $atomic(0, "long") // Atomic counter for errors in turn
    this._m_requests = $atomic(0, "long") // Atomic counter for requests
    this._m_requests_turn = $atomic(0, "long") // Atomic counter for requests in turn
    this._m_filtered = $atomic(0, "long") // Atomic counter for filtered requests
    this._m_filtered_turn = $atomic(0, "long") // Atomic counter for filtered requests in turn
}

/**
 * <odoc>
 * <key>SocksServer._ipToInt(aIP) : Number</key>
 * Converts an IPv4 address string to a 32-bit integer for efficient comparison.
 * Uses unsigned integer arithmetic to handle IPs starting with 128+ correctly.
 * </odoc>
 */
SocksServer.prototype._ipToInt = function(aIP) {
    var parts = aIP.split('.')
    // Use >>> 0 to convert to unsigned 32-bit integer
    return ((parseInt(parts[0]) << 24) + (parseInt(parts[1]) << 16) + (parseInt(parts[2]) << 8) + parseInt(parts[3])) >>> 0
}

/**
 * <odoc>
 * <key>SocksServer._ipv6ToBytes(aIP) : Array</key>
 * Converts an IPv6 address string to a 16-byte array for efficient comparison.
 * Handles compressed notation (::) and mixed IPv4/IPv6 addresses.
 * </odoc>
 */
SocksServer.prototype._ipv6ToBytes = function(aIP) {
    // Remove brackets if present
    aIP = aIP.replace(/^\[|\]$/g, '')
    
    // Handle mixed IPv4/IPv6 addresses (e.g., ::ffff:192.168.1.1)
    var ipv4Match = aIP.match(/^(.*):((\d{1,3}\.){3}\d{1,3})$/)
    if (ipv4Match) {
        var ipv6Part = ipv4Match[1]
        var ipv4Part = ipv4Match[2]
        var ipv4Int = this._ipToInt(ipv4Part)
        aIP = ipv6Part + ':' + ((ipv4Int >>> 16) & 0xffff).toString(16) + ':' + (ipv4Int & 0xffff).toString(16)
    }
    
    var parts = aIP.split(':')
    var bytes = new Array(16).fill(0)
    
    // Handle :: compression
    var emptyIndex = parts.indexOf('')
    if (emptyIndex !== -1) {
        // Find consecutive empty parts
        var emptyCount = 0
        for (var i = emptyIndex; i < parts.length && parts[i] === ''; i++) {
            emptyCount++
        }
        
        // Calculate how many zero groups to insert
        var missingGroups = 8 - (parts.length - emptyCount)
        var newParts = []
        
        // Add parts before ::
        for (var i = 0; i < emptyIndex; i++) {
            newParts.push(parts[i])
        }
        
        // Add missing zero groups
        for (var i = 0; i < missingGroups; i++) {
            newParts.push('0')
        }
        
        // Add parts after ::
        for (var i = emptyIndex + emptyCount; i < parts.length; i++) {
            newParts.push(parts[i])
        }
        
        parts = newParts
    }
    
    // Convert each 16-bit group to bytes
    for (var i = 0; i < Math.min(8, parts.length); i++) {
        if (parts[i] !== '') {
            var value = parseInt(parts[i] || '0', 16)
            bytes[i * 2] = (value >>> 8) & 0xff
            bytes[i * 2 + 1] = value & 0xff
        }
    }
    
    return bytes
}

/**
 * <odoc>
 * <key>SocksServer._isIPv6(aIP) : Boolean</key>
 * Determines if an IP address string is IPv6 format.
 * </odoc>
 */
SocksServer.prototype._isIPv6 = function(aIP) {
    return aIP.indexOf(':') !== -1
}

/**
 * <odoc>
 * <key>SocksServer._getCompiledFilter(aFilter) : Object</key>
 * Pre-compiles a CIDR filter into network and mask for efficient matching.
 * Supports both IPv4 and IPv6 CIDR notation.
 * Returns an object with appropriate properties for the IP version.
 * </odoc>
 */
SocksServer.prototype._getCompiledFilter = function(aFilter) {
    if (isDef(this._compiledFilters[aFilter])) {
        return this._compiledFilters[aFilter]
    }
    
    var parts = aFilter.split('/')
    var networkAddr = parts[0]
    var prefixLength = parseInt(parts[1])
    var compiled
    
    if (this._isIPv6(networkAddr)) {
        // IPv6 processing
        var networkBytes = this._ipv6ToBytes(networkAddr)
        var maskBytes = new Array(16).fill(0)
        
        // Create mask based on prefix length
        var bitsLeft = prefixLength
        for (var i = 0; i < 16; i++) {
            if (bitsLeft >= 8) {
                maskBytes[i] = 0xff
                bitsLeft -= 8
            } else if (bitsLeft > 0) {
                maskBytes[i] = (0xff << (8 - bitsLeft)) & 0xff
                bitsLeft = 0
            } else {
                maskBytes[i] = 0
            }
        }
        
        // Apply mask to network address
        var maskedNetwork = new Array(16)
        for (var i = 0; i < 16; i++) {
            maskedNetwork[i] = networkBytes[i] & maskBytes[i]
        }
        
        compiled = {
            isIPv6: true,
            network: maskedNetwork,
            mask: maskBytes,
            prefixLength: prefixLength
        }
    } else {
        // IPv4 processing (existing logic)
        var networkInt = this._ipToInt(networkAddr)
        var mask = (0xffffffff << (32 - prefixLength)) >>> 0
        var network = (networkInt & mask) >>> 0
        
        compiled = {
            isIPv6: false,
            network: network,
            mask: mask,
            prefixLength: prefixLength
        }
    }
    
    this._compiledFilters[aFilter] = compiled
    return compiled
}

/**
 * <odoc>
 * <key>SocksServer._turnaround(aAtomic, aTurnAtomic)</key>
 * If aAtomic goes over the long max value minus 1000, it increments aTurnAtomic and resets aAtomic to 0.
 * </odoc>
 */
SocksServer.prototype._turnaround = function(aAtomic, aTurnAtomic) {
    _$(aAtomic, "aAtomic").$_()
    _$(aTurnAtomic, "aTurnAtomic").$_()

    if (aAtomic.get() >= (java.lang.Long.MAX_VALUE - 1000)) {
        $sync(() => {
            aTurnAtomic.inc()
            aAtomic.set(0)
        })
    }
}

/**
 * <odoc>
 * <key>SocksServer.start(aPort, aCallback, aSocketFactory)</key>
 * Starts a socks server on aPort (no encryption of traffic). Repeated calls will create
 * other socks server.
 * </odoc>
 */
SocksServer.prototype.start = function(aPort, aCallback, aSocketFactory) {
    aPort = _$(aPort).isNumber().default(1080)

    if (isUnDef(this._server)) {
        this._server = (isDef(this._workers) ? new Packages.org.bbottema.javasocksproxyserver.SocksServer(this._workers) : new Packages.org.bbottema.javasocksproxyserver.SocksServer())
    }

    // Add to global prometheus metrics
    ow.loadMetrics()
    ow.metrics.add("SocksServer-" + aPort, () => this.getMetrics())

    if (isDef(aCallback)) {
        return isDef(aSocketFactory) ? this._server.start(aPort, aSocketFactory, aCallback): this._server.start(aPort, aCallback)
    } else {
        return isDef(aSocketFactory) ? this._server.start(aPort, aSocketFactory): this._server.start(aPort)
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
    if (isDef(this._channel)) {
        this._channel.disconnect()
        this._channel = __
    }
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

    // Pre-compile ASN filters into a Set for O(1) lookup
    var asnFilterSet = asnFilter.length > 0 ? new Set(asnFilter) : null

    // TODO: cache filters
    var parent = this
    return function(data) {
        const _cmp = (aSource, filters, hfilters, asnFilterSet, shouldInvert) => {
            if (parent._old + parent._ttl < now()) {
                parent._cache = {}
                parent._asnCache = {} // Clear ASN cache when main cache expires
            }
            
            // Use IP string as cache key instead of full object
            var sourceIP = String(aSource.getHostAddress())
            var cacheKey = sourceIP + ":" + (shouldInvert ? "1" : "0")
            if (isDef(parent._cache[cacheKey])) return parent._cache[cacheKey]

            const _matchesCIDR = function(sourceIP, filterObj) {
                var isSourceIPv6 = parent._isIPv6(sourceIP)
                
                // IP version mismatch
                if (isSourceIPv6 !== filterObj.isIPv6) {
                    return false
                }
                
                if (filterObj.isIPv6) {
                    // IPv6 matching
                    var sourceBytes = parent._ipv6ToBytes(sourceIP)

                    // Compare each byte with mask applied
                    for (var i = 0; i < 16; i++) {
                        if ((sourceBytes[i] & filterObj.mask[i]) !== filterObj.network[i]) {
                            return false
                        }
                    }
                    return true
                } else {
                    // IPv4 matching (existing logic)
                    var sourceInt = parent._ipToInt(sourceIP)
                    return ((sourceInt & filterObj.mask) >>> 0) === filterObj.network
                }
            }

            var go = false, go2 = false, hasASNFilter = asnFilterSet !== null

            // For each IP filter check if the source address matches using CIDR comparison
            for (let filter of filters) {
                if (go) break
                if (filter.indexOf("/") > 0) {
                    // Use pre-computed filter objects for both IPv4 and IPv6
                    var filterObj = parent._getCompiledFilter(filter)
                    if (_matchesCIDR(sourceIP, filterObj)) {
                        go = true
                    }
                }
            }

            if (hasASNFilter && !go) {
                // Single ASN lookup + Set-based check (O(1) instead of O(m))
                // Use cached ASN lookup for even better performance
                var _asn = parent._asnCache[sourceIP]
                if (isUnDef(_asn)) {
                    _asn = parent.asnIndexIP2ASN(sourceIP, parent._aidx)
                    parent._asnCache[sourceIP] = _asn
                }
                
                if (isDef(_asn) && asnFilterSet.has(_asn.a)) {
                    go = true
                }
            }

            // If host based filters are provided, check if the source address matches any of them
            // Filter out empty strings from host filters
            var effectiveHFilters = hfilters ? hfilters.filter(h => h && h.length > 0) : []
            
            if (isUnDef(effectiveHFilters) || effectiveHFilters.length == 0) {
                go2 = go
            } else {
                if (isDef(filters) && filters.length > 0 && !go) {
                    go2 = false
                } else {
                    // Initialize go2 to false before checking host filters
                    go2 = false
                    var hostname = String(aSource).split("/")[0]
                    for (let h of effectiveHFilters) {
                        if (hostname.endsWith(h)) {
                            go2 = true
                            break
                        }
                    }
                }
            }

            var result = shouldInvert ? go2 : !go2
            
            parent._cache[cacheKey] = result

            // Increment filtered requests counter
            if (!result) {
                $doV(() => {
                    parent._turnaround(parent._m_filtered, parent._m_filtered_turn)
                    parent._m_filtered.inc()
                })
            }
            return result
        }

        return _cmp(data, ipFilters, hostFilters, asnFilterSet, shouldInvert)
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
    var parent = this

    return {
        filter: function(data) {
            $doV(() => {
                parent._turnaround(parent._m_requests, parent._m_requests_turn)
                parent._m_requests.inc()
            })

            if (isDef(aFilterFunc))
                return aFilterFunc(data) 
            else
                return false
        },
        error: function(msg, e) {
            $doV(() => {
                parent._turnaround(parent._m_errors, parent._m_errors_turn)
                parent._m_errors.inc()
            })

            if (verboseLog) logErr(msg)
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
 * <key>SocksServer.updateASNIdx(aURL)</key>
 * Downloads the ASN index from aURL (defaults to "https://openaf.io/asnidx.json.gz") and updates the internal ASN index.
 * The ASN index is expected to be a gzip compressed JSON file with the following structure:
 * [ { i: (index), a: (asn), s: (start), e: (end) }, ... ]
 * where i is the index in the original IP-to-ASN cache, a is the ASN number, s is the start IP in integer format and e is the end IP in integer format.
 * The index is used to quickly look up the ASN for a given IP address.
 * This function invalidates all related caches when the ASN index is updated.
 * </odoc>
 */
SocksServer.prototype.updateASNIdx = function(aURL) {
    aURL = _$(aURL, "aURL").isString().default("https://openaf.io/asnidx.json.gz")

    log("Downloading ASN index from " + aURL + "...")
    var file = io.createTempFile("aidx", ".json.gz")
    $rest().get2File(file, aURL)
    
    log("Update internal ASN index...")
    this.getIP2ASNIndex(file)
    this._aidxage = (new Date($rest().head("https://openaf.io/asnidx.json.gz").response["last-modified"])).getTime()
    
    // Invalidate all ASN-related caches since the index has been updated
    log("Invalidating ASN-related caches...")
    this._invalidateASNCaches()
    
    log("ASN index updated (#" + this._aidx.length + ")")
}

/**
 * <odoc>
 * <key>SocksServer._invalidateASNCaches()</key>
 * Invalidates all ASN-related caches when the ASN index is updated.
 * This includes the main filter cache, ASN lookup cache, and resets cache timing.
 * </odoc>
 */
SocksServer.prototype._invalidateASNCaches = function() {
    // Clear the main filter cache (contains results that may depend on ASN lookups)
    this._cache = {}
    
    // Clear the ASN lookup cache (IP -> ASN mappings may have changed)
    this._asnCache = {}
    
    // Reset cache timing to force fresh calculations
    this._old = now()
    
    log("Cleared filter cache (" + Object.keys(this._cache).length + " entries)")
    log("Cleared ASN cache (" + Object.keys(this._asnCache).length + " entries)")
}

/**
 * <odoc>
 * <key>SocksServer.getCacheStats() : Object</key>
 * Returns statistics about the current cache state including sizes and age.
 * Useful for monitoring cache performance and determining optimal refresh intervals.
 * </odoc>
 */
SocksServer.prototype.getCacheStats = function() {
    var cacheAge = now() - this._old
    var filterCacheSize = Object.keys(this._cache).length
    var asnCacheSize = Object.keys(this._asnCache).length
    var compiledFiltersSize = Object.keys(this._compiledFilters).length
    var asnIndexSize = this._aidx ? this._aidx.length : 0
    
    return {
        cacheAge: cacheAge,
        cacheAgeHours: Math.round(cacheAge / 3600000 * 100) / 100,
        filterCacheSize: filterCacheSize,
        asnCacheSize: asnCacheSize,
        compiledFiltersSize: compiledFiltersSize,
        asnIndexSize: asnIndexSize,
        ttl: this._ttl,
        ttlHours: Math.round(this._ttl / 3600000 * 100) / 100
    }
}

/**
 * <odoc>
 * <key>SocksServer.clearCaches(clearCompiledFilters)</key>
 * Manually clears all caches. If clearCompiledFilters=true, also clears the compiled CIDR filters cache.
 * Useful for forcing fresh calculations or freeing memory.
 * </odoc>
 */
SocksServer.prototype.clearCaches = function(clearCompiledFilters) {
    clearCompiledFilters = _$(clearCompiledFilters, "clearCompiledFilters").isBoolean().default(false)
    
    var stats = this.getCacheStats()
    
    this._cache = {}
    this._asnCache = {}
    this._old = now()
    
    if (clearCompiledFilters) {
        this._compiledFilters = {}
    }
    
    log("Manually cleared caches:")
    log("  - Filter cache: " + stats.filterCacheSize + " entries")
    log("  - ASN cache: " + stats.asnCacheSize + " entries")
    if (clearCompiledFilters) {
        log("  - Compiled filters: " + stats.compiledFiltersSize + " entries")
    }
}

/**
 * <odoc>
 * <key>SocksServer.getMetrics() : Object</key>
 * Returns comprehensive metrics about the SOCKS server including cache statistics, 
 * filter performance, memory usage, and operational status.
 * Useful for monitoring, alerting, and performance optimization.
 * </odoc>
 */
SocksServer.prototype.getMetrics = function() {
    var cacheAge = now() - this._old
    var filterCacheSize = Object.keys(this._cache).length
    var asnCacheSize = Object.keys(this._asnCache).length
    var compiledFiltersSize = Object.keys(this._compiledFilters).length
    var asnIndexSize = this._aidx ? this._aidx.length : 0

    var cacheStats = {
        cacheAge: cacheAge,
        cacheAgeHours: Math.round(cacheAge / 3600000 * 100) / 100,
        filterCacheSize: filterCacheSize,
        asnCacheSize: asnCacheSize,
        compiledFiltersSize: compiledFiltersSize,
        asnIndexSize: asnIndexSize,
        ttl: this._ttl,
        ttlHours: Math.round(this._ttl / 3600000 * 100) / 100
    }
    
    // Calculate cache hit ratios and efficiency metrics
    var totalCacheSize = cacheStats.filterCacheSize + cacheStats.asnCacheSize
    var cacheMemoryEstimate = (cacheStats.filterCacheSize * 50) + (cacheStats.asnCacheSize * 30) + (cacheStats.compiledFiltersSize * 100) // rough bytes estimate
    
    // Server status
    var serverStatus = {
        isRunning: isDef(this._server),
        hasASNIndex: isDef(this._aidx) && this._aidx.length > 0,
        asnIndexAgeHours: isDef(this._aidx) ? Math.round((now() - this._aidxage) / 3600000 * 100) / 100 : "not loaded",
        requests: this._m_requests.get(),
        requestsTurns: this._m_requests_turn.get(),
        errors: this._m_errors.get(),
        errorsTurns: this._m_errors_turn.get(),
        filtered: this._m_filtered.get(),
        filteredTurns: this._m_filtered_turn.get()
    }
    
    // Performance metrics
    var performance = {
        cacheEfficiency: totalCacheSize > 0 ? Math.round((cacheStats.filterCacheSize / totalCacheSize) * 100) : 0,
        asnCacheRatio: totalCacheSize > 0 ? Math.round((cacheStats.asnCacheSize / totalCacheSize) * 100) : 0,
        avgCacheEntryAge: cacheStats.cacheAge / Math.max(totalCacheSize, 1),
        cacheMemoryEstimateKB: Math.round(cacheMemoryEstimate / 1024 * 100) / 100
    }
    
    // Filter configuration metrics
    var filterConfig = {
        compiledFiltersCount: cacheStats.compiledFiltersSize,
        hasPrecompiledFilters: cacheStats.compiledFiltersSize > 0,
        estimatedFilterTypes: this._getFilterTypeEstimate()
    }
    
    // Operational health
    var health = {
        cacheHealthy: cacheStats.cacheAge < (this._ttl * 2), // Cache should refresh before 2x TTL
        asnIndexHealthy: serverStatus.hasASNIndex,
        memoryHealthy: cacheMemoryEstimate < (50 * 1024 * 1024), // Under 50MB estimated
        configurationValid: this._validateConfiguration()
    }
    
    return {
        // Core cache statistics
        cache: cacheStats,
        
        // Server operational status
        server: serverStatus,
        
        // Performance and efficiency metrics
        performance: performance,
        
        // Filter configuration
        filters: filterConfig,
        
        // Health indicators
        health: health,
        
        // Summary metrics for dashboards
        summary: {
            totalCacheEntries: totalCacheSize,
            overallHealth: Object.values(health).every(v => v === true) ? "healthy" : "degraded",
            primaryMetrics: {
                cacheSize: totalCacheSize,
                cacheAgeHours: cacheStats.cacheAgeHours,
                asnIndexSize: cacheStats.asnIndexSize,
                memoryUsageKB: performance.cacheMemoryEstimateKB
            }
        }
    }
}

/**
 * <odoc>
 * <key>SocksServer._getFilterTypeEstimate() : Object</key>
 * Internal method to estimate the types of compiled filters in use.
 * Returns breakdown of filter complexity for performance analysis.
 * </odoc>
 */
SocksServer.prototype._getFilterTypeEstimate = function() {
    var filterKeys = Object.keys(this._compiledFilters)
    var estimate = {
        cidrFilters: 0,
        broadNetworks: 0,  // /8, /16 networks
        specificNetworks: 0, // /24, /32 networks
        complexFilters: 0
    }
    
    filterKeys.forEach(filter => {
        if (filter.indexOf('/') > 0) {
            estimate.cidrFilters++
            var prefix = parseInt(filter.split('/')[1])
            if (prefix <= 16) {
                estimate.broadNetworks++
            } else if (prefix >= 24) {
                estimate.specificNetworks++
            } else {
                estimate.complexFilters++
            }
        }
    })
    
    return estimate
}

/**
 * <odoc>
 * <key>SocksServer._validateConfiguration() : Boolean</key>
 * Internal method to validate the current server configuration.
 * Returns true if configuration appears valid, false otherwise.
 * </odoc>
 */
SocksServer.prototype._validateConfiguration = function() {
    try {
        // Check basic configuration
        if (!isDef(this._ttl) || this._ttl <= 0) return false
        if (!isDef(this._cache) || !isDef(this._asnCache)) return false
        if (!isDef(this._compiledFilters)) return false
        
        // Check ASN index if present
        if (isDef(this._aidx) && this._aidx.length > 0) {
            var sample = this._aidx[0]
            if (!isDef(sample.a) || !isDef(sample.s) || !isDef(sample.e)) return false
        }
        
        return true
    } catch (e) {
        return false
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
 * This function invalidates ASN-related caches when loading a new index.
 * </odoc>
 */
SocksServer.prototype.getIP2ASNIndex = function(aFile) {
    _$(aFile, "aFile").isString().$_()

    var is = io.readFileGzipStream(aFile)

    var _r = jsonParse(af.fromInputStream2String(is), true)
    is.close()
    
    // Store the new ASN index
    this._aidx = _r
    this._aidxage = io.fileInfo(aFile).lastModified
    
    // Invalidate caches since the ASN index has changed
    // (but don't log here to avoid double logging when called from updateASNIdx)
    this._cache = {}
    this._asnCache = {}
    this._old = now()
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

SocksServer.prototype.getSSHSocketFactory = function(aSSHSession) {
    // Returns a javax.net.SocketFactory that creates sockets over SSH
    this._chnumber = $atomic(0, "long")
    var parent = this
    return new JavaAdapter(Packages.javax.net.SocketFactory, {
        createSocket: function(aRemoteHost, aRemotePort) {
            var channel = null
            var localOut = null, remoteIn = null, remoteOut = null, localIn = null
            try {
                while(parent._chnumber.get() >= 1000) {
                    sleep(100, true)
                }
                channel = aSSHSession.openChannel("direct-tcpip")
                parent._chnumber.inc()
                channel.setHost(aRemoteHost)
                channel.setPort(aRemotePort)
                // Use PipedInputStream/PipedOutputStream directly
                localOut = new java.io.PipedOutputStream()
                remoteIn = new java.io.PipedInputStream(localOut, 65536)
                remoteOut = new java.io.PipedOutputStream()
                localIn = new java.io.PipedInputStream(remoteOut, 65536)

                channel.setInputStream(remoteIn)
                channel.setOutputStream(remoteOut)
                channel.connect()

                // Do not store channel on parent, keep it local for thread safety
                return new JavaAdapter(java.net.Socket, {
                    _closed: false,
                    getPort: function() {
                        return aRemotePort
                    },
                    getInetAddress: function() {
                        return java.net.InetAddress.getByName(aRemoteHost)
                    },
                    getInputStream: function() {
                        return localIn
                    },
                    getOutputStream: function() {
                        return localOut
                    },
                    isClosed: function() {
                        return this._closed
                    },
                    isConnected: function() {
                        return true && !this._closed
                    },
                    close: function() {
                        // Ensure all resources are closed properly
                        try {
                            if (channel) channel.disconnect()
                            this._closed = true
                            parent._chnumber.dec()
                        } catch(e) {}
                        try { if (localIn) localIn.close() } catch(e) {}
                        try { if (localOut) localOut.close() } catch(e) {}
                        try { if (remoteIn) remoteIn.close() } catch(e) {}
                        try { if (remoteOut) remoteOut.close() } catch(e) {}
                    }
                })
            } catch(e) {
                $err(e)
                // Avoid expensive stack trace logging, just throw
                throw new Error("Failed to open SSH channel to " + aRemoteHost + ":" + aRemotePort)
            }
        }
    });
}