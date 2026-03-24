/**
 * <odoc>
 * <key>$bunnynet(aMap) : BunnyNet</key>
 * Shortcut factory that returns a new BunnyNet instance using the provided configuration map.
 * </odoc>
 */
var $bunnynet = function(aMap) {
  return new BunnyNet(aMap)
}

/**
 * <odoc>
 * <key>BunnyNet.BunnyNet(aMap) : BunnyNet</key>
 * Creates a bunny.net API wrapper using OpenAF's $rest function. aMap can include:
 * apiKey, accessKey, streamKey, storageKey, storageZone, storageRegion, coreURL,
 * streamURL, storageURL, originErrorsURL and requestHeaders.
 * </odoc>
 */
var BunnyNet = function(aMap) {
  aMap = _$(aMap, "aMap").isMap().default({})

  this.apiKey = _$(aMap.apiKey, "apiKey").isString().default(aMap.accessKey)
  this.streamKey = _$(aMap.streamKey, "streamKey").isString().default(this.apiKey)
  this.storageKey = _$(aMap.storageKey, "storageKey").isString().default(this.apiKey)
  this.storageZone = _$(aMap.storageZone, "storageZone").isString().default(__)
  this.storageRegion = _$(aMap.storageRegion, "storageRegion").isString().default("storage")
  this.coreURL = _$(aMap.coreURL, "coreURL").isString().default("https://api.bunny.net")
  this.streamURL = _$(aMap.streamURL, "streamURL").isString().default("https://video.bunnycdn.com")
  this.originErrorsURL = _$(aMap.originErrorsURL, "originErrorsURL").isString().default("https://cdn-origin-logging.bunny.net")
  this.storageURL = this._normalizeStorageURL(_$(aMap.storageURL, "storageURL").isString().default(this.storageRegion))
  this.requestHeaders = _$(aMap.requestHeaders, "requestHeaders").isMap().default({})
}

/**
 * <odoc>
 * <key>BunnyNet.clone(aMap) : BunnyNet</key>
 * Returns a new BunnyNet instance reusing the current configuration and overriding it with any values from aMap.
 * </odoc>
 */
BunnyNet.prototype.clone = function(aMap) {
  return new BunnyNet(merge(this.getConfig(), _$(aMap, "aMap").isMap().default({})))
}

/**
 * <odoc>
 * <key>BunnyNet.getConfig() : Map</key>
 * Returns a copy of the current effective configuration, including resolved API keys, URLs and default request headers.
 * </odoc>
 */
BunnyNet.prototype.getConfig = function() {
  return {
    apiKey: this.apiKey,
    streamKey: this.streamKey,
    storageKey: this.storageKey,
    storageZone: this.storageZone,
    storageRegion: this.storageRegion,
    coreURL: this.coreURL,
    streamURL: this.streamURL,
    storageURL: this.storageURL,
    originErrorsURL: this.originErrorsURL,
    requestHeaders: merge({}, this.requestHeaders)
  }
}

/**
 * <odoc>
 * <key>BunnyNet.getStorageURL(aRegion) : String</key>
 * Returns the bunny.net Storage API base URL for aRegion or the instance default storage region when omitted.
 * </odoc>
 */
BunnyNet.prototype.getStorageURL = function(aRegion) {
  aRegion = _$(aRegion, "aRegion").isString().default(this.storageRegion)
  if (aRegion == this.storageRegion && isDef(this.storageURL)) return this.storageURL
  return this._normalizeStorageURL(aRegion)
}

/**
 * <odoc>
 * <key>BunnyNet._normalizeStorageURL(aRegionOrURL) : String</key>
 * Internal helper that converts a bunny.net storage region, hostname or URL into a valid Storage API base URL.
 * </odoc>
 */
BunnyNet.prototype._normalizeStorageURL = function(aRegionOrURL) {
  var value = _$(aRegionOrURL, "aRegionOrURL").isString().default("storage")
  value = String(value).trim().replace(/\/+$/, "")

  if (value.length <= 0 || value.toLowerCase() == "storage") {
    return "https://storage.bunnycdn.com"
  }

  if (!/^https?:\/\//i.test(value) && /\.bunnycdn\.com$/i.test(value)) {
    value = "https://" + value
  }

  if (/^https?:\/\//i.test(value)) {
    value = value.replace(/\/+$/, "")

    var match = value.match(/^https?:\/\/([^\/]+)$/i)
    if (isDef(match) && match.length > 1) {
      var host = String(match[1]).toLowerCase()
      if (host == "storage.storage.bunnycdn.com") return "https://storage.bunnycdn.com"
    }

    return value
  }

  return "https://" + value + ".storage.bunnycdn.com"
}

/**
 * <odoc>
 * <key>BunnyNet._normalizePath(aPath, addTrailingSlash) : String</key>
 * Internal helper that trims leading/trailing slashes from a storage path and optionally appends a trailing slash.
 * </odoc>
 */
BunnyNet.prototype._normalizePath = function(aPath, addTrailingSlash) {
  aPath = _$(aPath, "aPath").isString().default("")

  if (aPath.length <= 0) return (addTrailingSlash ? "/" : "")

  aPath = aPath.replace(/^\/+/, "").replace(/\/+$/, "")
  if (aPath.length <= 0) return (addTrailingSlash ? "/" : "")

  return aPath + (addTrailingSlash ? "/" : "")
}

/**
 * <odoc>
 * <key>BunnyNet._ensureKey(aKey, aName) : String</key>
 * Internal helper that validates aKey and throws when the requested bunny.net credential is missing.
 * </odoc>
 */
BunnyNet.prototype._ensureKey = function(aKey, aName) {
  aKey = _$(aKey, aName).isString().default(__)
  if (isUnDef(aKey)) throw "Missing bunny.net " + aName + "."
  return aKey
}

/**
 * <odoc>
 * <key>BunnyNet._headers(aKey, aExtraHeaders) : Map</key>
 * Internal helper that merges default request headers, extra headers and the AccessKey header when aKey is defined.
 * </odoc>
 */
BunnyNet.prototype._headers = function(aKey, aExtraHeaders) {
  var headers = merge({}, this.requestHeaders)
  headers = merge(headers, _$(aExtraHeaders, "aExtraHeaders").isMap().default({}))
  if (isDef(aKey)) headers.AccessKey = aKey
  return headers
}

/**
 * <odoc>
 * <key>BunnyNet._toOriginDate(aDate) : String</key>
 * Internal helper that converts a Date to bunny.net's MM-dd-yyyy Origin Errors date format or returns aDate unchanged when already a string.
 * </odoc>
 */
BunnyNet.prototype._toOriginDate = function(aDate) {
  if (isString(aDate)) return aDate
  if (!isDate(aDate)) throw "aDate needs to be a string in MM-dd-yyyy format or a Date."

  var mm = String(aDate.getMonth() + 1)
  var dd = String(aDate.getDate())
  var yyyy = String(aDate.getFullYear())

  if (mm.length < 2) mm = "0" + mm
  if (dd.length < 2) dd = "0" + dd

  return mm + "-" + dd + "-" + yyyy
}

/**
 * <odoc>
 * <key>BunnyNet._rest(aKey, aMap)</key>
 * Internal helper that builds a $rest client preconfigured with the merged bunny.net request headers.
 * </odoc>
 */
BunnyNet.prototype._rest = function(aKey, aMap) {
  aMap = _$(aMap, "aMap").isMap().default({})
  return $rest(merge(aMap, {
    requestHeaders: this._headers(aKey, aMap.requestHeaders)
  }))
}

/**
 * <odoc>
 * <key>BunnyNet._methodWithBody(aMethod) : Boolean</key>
 * Internal helper that returns true when aMethod is an HTTP method expected to send a request body.
 * </odoc>
 */
BunnyNet.prototype._methodWithBody = function(aMethod) {
  aMethod = String(aMethod).toLowerCase()
  return aMethod == "post" || aMethod == "put" || aMethod == "patch"
}

/**
 * <odoc>
 * <key>BunnyNet._buildURL(aBaseURL, aPath, aQuery) : String</key>
 * Internal helper that combines a base URL, an API path and optional query parameters into a request URL.
 * </odoc>
 */
BunnyNet.prototype._buildURL = function(aBaseURL, aPath, aQuery) {
  var url = String(aBaseURL || "").replace(/\/+$/, "")
  var path = _$(aPath, "aPath").isString().default("")

  if (path.length > 0) {
    if (path.charAt(0) != "/") path = "/" + path
    url += path
  }

  if (isMap(aQuery) && Object.keys(aQuery).length > 0) {
    url += "?" + $rest().query(aQuery)
  }

  return url
}

/**
 * <odoc>
 * <key>BunnyNet._request(aMethod, aBaseURL, aPath, aQuery, aBody, aOptions)</key>
 * Internal helper that executes the requested HTTP method against the assembled bunny.net URL.
 * </odoc>
 */
BunnyNet.prototype._request = function(aMethod, aBaseURL, aPath, aQuery, aBody, aOptions) {
  aMethod = _$(aMethod, "aMethod").isString().$_().toLowerCase()
  aOptions = _$(aOptions, "aOptions").isMap().default({})

  var url = this._buildURL(aBaseURL, aPath, aQuery)
  var rest = this._rest(aOptions.key, aOptions.rest || {})

  if (this._methodWithBody(aMethod)) {
    return rest[aMethod](url, aBody)
  } else {
    return rest[aMethod](url)
  }
}

/**
 * <odoc>
 * <key>BunnyNet.core(aMethod, aPath, aQuery, aBody, aOptions)</key>
 * Performs a core API request against https://api.bunny.net using the account API key.
 * </odoc>
 */
BunnyNet.prototype.core = function(aMethod, aPath, aQuery, aBody, aOptions) {
  aOptions = _$(aOptions, "aOptions").isMap().default({})
  aOptions.key = this._ensureKey(_$(aOptions.key).default(this.apiKey), "apiKey")
  return this._request(aMethod, this.coreURL, aPath, aQuery, aBody, aOptions)
}

/**
 * <odoc>
 * <key>BunnyNet.stream(aMethod, aPath, aQuery, aBody, aOptions)</key>
 * Performs a Stream API request against https://video.bunnycdn.com using the stream API key.
 * </odoc>
 */
BunnyNet.prototype.stream = function(aMethod, aPath, aQuery, aBody, aOptions) {
  aOptions = _$(aOptions, "aOptions").isMap().default({})
  aOptions.key = this._ensureKey(_$(aOptions.key).default(this.streamKey), "streamKey")
  return this._request(aMethod, this.streamURL, aPath, aQuery, aBody, aOptions)
}

/**
 * <odoc>
 * <key>BunnyNet.storage(aMethod, aPath, aQuery, aBody, aOptions)</key>
 * Performs a Storage API request against https://{region}.storage.bunnycdn.com using the storage zone password.
 * aOptions can include zone, region and key.
 * </odoc>
 */
BunnyNet.prototype.storage = function(aMethod, aPath, aQuery, aBody, aOptions) {
  aOptions = _$(aOptions, "aOptions").isMap().default({})

  var zone = _$(aOptions.zone, "zone").isString().default(this.storageZone)
  var region = _$(aOptions.region, "region").isString().default(this.storageRegion)
  var key = this._ensureKey(_$(aOptions.key).default(this.storageKey), "storageKey")

  zone = _$(zone, "zone").isString().$_()
  var path = "/" + zone + "/" + this._normalizePath(aPath, !!aOptions.trailingSlash)

  aOptions.key = key
  return this._request(aMethod, this.getStorageURL(region), path, aQuery, aBody, aOptions)
}

/**
 * <odoc>
 * <key>BunnyNet.originErrors(aPullZoneId, aDate, aQuery, aOptions)</key>
 * Retrieves origin error logs from https://cdn-origin-logging.bunny.net/{pullZoneId}/{date}. aDate can be a Date or a string already formatted as MM-dd-yyyy.
 * </odoc>
 */
BunnyNet.prototype.originErrors = function(aPullZoneId, aDate, aQuery, aOptions) {
  aOptions = _$(aOptions, "aOptions").isMap().default({})
  aOptions.key = this._ensureKey(_$(aOptions.key).default(this.apiKey), "apiKey")

  var date = this._toOriginDate(aDate)

  return this._request("get", this.originErrorsURL, "/" + aPullZoneId + "/" + date, aQuery, __, aOptions)
}

/**
 * <odoc>
 * <key>BunnyNet.purge(aURL, aOptions)</key>
 * Purges a URL from bunny.net CDN cache. aOptions can include async and exactPath.
 * </odoc>
 */
BunnyNet.prototype.purge = function(aURL, aOptions) {
  aOptions = _$(aOptions, "aOptions").isMap().default({})
  var query = { url: _$(aURL, "aURL").isString().$_() }
  if (isDef(aOptions.async)) query.async = aOptions.async
  if (isDef(aOptions.exactPath)) query.exactPath = aOptions.exactPath
  return this.core("post", "/purge", query, __, aOptions)
}

/**
 * <odoc>
 * <key>BunnyNet.listPullZones(aQuery, aOptions)</key>
 * Lists pull zones using the Core API. aQuery can include bunny.net list and filter parameters.
 * </odoc>
 */
BunnyNet.prototype.listPullZones = function(aQuery, aOptions) {
  return this.core("get", "/pullzone", aQuery, __, aOptions)
}

/**
 * <odoc>
 * <key>BunnyNet.getPullZone(aId, aOptions)</key>
 * Retrieves a pull zone by numeric id.
 * </odoc>
 */
BunnyNet.prototype.getPullZone = function(aId, aOptions) {
  return this.core("get", "/pullzone/" + aId, __, __, aOptions)
}

/**
 * <odoc>
 * <key>BunnyNet.createPullZone(aMap, aOptions)</key>
 * Creates a pull zone using the request payload provided in aMap.
 * </odoc>
 */
BunnyNet.prototype.createPullZone = function(aMap, aOptions) {
  return this.core("post", "/pullzone", __, _$(aMap, "aMap").isMap().$_(), aOptions)
}

/**
 * <odoc>
 * <key>BunnyNet.updatePullZone(aId, aMap, aOptions)</key>
 * Updates the pull zone identified by aId with the fields in aMap.
 * </odoc>
 */
BunnyNet.prototype.updatePullZone = function(aId, aMap, aOptions) {
  return this.core("post", "/pullzone/" + aId, __, _$(aMap, "aMap").isMap().$_(), aOptions)
}

/**
 * <odoc>
 * <key>BunnyNet.deletePullZone(aId, aOptions)</key>
 * Deletes the pull zone identified by aId.
 * </odoc>
 */
BunnyNet.prototype.deletePullZone = function(aId, aOptions) {
  return this.core("delete", "/pullzone/" + aId, __, __, aOptions)
}

/**
 * <odoc>
 * <key>BunnyNet.listStorageZones(aQuery, aOptions)</key>
 * Lists storage zones using the Core API.
 * </odoc>
 */
BunnyNet.prototype.listStorageZones = function(aQuery, aOptions) {
  return this.core("get", "/storagezone", aQuery, __, aOptions)
}

/**
 * <odoc>
 * <key>BunnyNet.getStorageZone(aId, aOptions)</key>
 * Retrieves a storage zone by id.
 * </odoc>
 */
BunnyNet.prototype.getStorageZone = function(aId, aOptions) {
  return this.core("get", "/storagezone/" + aId, __, __, aOptions)
}

/**
 * <odoc>
 * <key>BunnyNet.createStorageZone(aMap, aOptions)</key>
 * Creates a storage zone using the request payload provided in aMap.
 * </odoc>
 */
BunnyNet.prototype.createStorageZone = function(aMap, aOptions) {
  return this.core("post", "/storagezone", __, _$(aMap, "aMap").isMap().$_(), aOptions)
}

/**
 * <odoc>
 * <key>BunnyNet.updateStorageZone(aId, aMap, aOptions)</key>
 * Updates the storage zone identified by aId with the fields in aMap.
 * </odoc>
 */
BunnyNet.prototype.updateStorageZone = function(aId, aMap, aOptions) {
  return this.core("post", "/storagezone/" + aId, __, _$(aMap, "aMap").isMap().$_(), aOptions)
}

/**
 * <odoc>
 * <key>BunnyNet.deleteStorageZone(aId, aOptions)</key>
 * Deletes the storage zone identified by aId.
 * </odoc>
 */
BunnyNet.prototype.deleteStorageZone = function(aId, aOptions) {
  return this.core("delete", "/storagezone/" + aId, __, __, aOptions)
}

/**
 * <odoc>
 * <key>BunnyNet.listDNSZones(aQuery, aOptions)</key>
 * Lists DNS zones using the Core API.
 * </odoc>
 */
BunnyNet.prototype.listDNSZones = function(aQuery, aOptions) {
  return this.core("get", "/dnszone", aQuery, __, aOptions)
}

/**
 * <odoc>
 * <key>BunnyNet.getDNSZone(aId, aOptions)</key>
 * Retrieves a DNS zone by id.
 * </odoc>
 */
BunnyNet.prototype.getDNSZone = function(aId, aOptions) {
  return this.core("get", "/dnszone/" + aId, __, __, aOptions)
}

/**
 * <odoc>
 * <key>BunnyNet.createDNSZone(aMap, aOptions)</key>
 * Creates a DNS zone using the request payload provided in aMap.
 * </odoc>
 */
BunnyNet.prototype.createDNSZone = function(aMap, aOptions) {
  return this.core("post", "/dnszone", __, _$(aMap, "aMap").isMap().$_(), aOptions)
}

/**
 * <odoc>
 * <key>BunnyNet.updateDNSZone(aId, aMap, aOptions)</key>
 * Updates the DNS zone identified by aId with the fields in aMap.
 * </odoc>
 */
BunnyNet.prototype.updateDNSZone = function(aId, aMap, aOptions) {
  return this.core("post", "/dnszone/" + aId, __, _$(aMap, "aMap").isMap().$_(), aOptions)
}

/**
 * <odoc>
 * <key>BunnyNet.deleteDNSZone(aId, aOptions)</key>
 * Deletes the DNS zone identified by aId.
 * </odoc>
 */
BunnyNet.prototype.deleteDNSZone = function(aId, aOptions) {
  return this.core("delete", "/dnszone/" + aId, __, __, aOptions)
}

/**
 * <odoc>
 * <key>BunnyNet.listVideoLibraries(aQuery, aOptions)</key>
 * Lists Stream video libraries using the Core API.
 * </odoc>
 */
BunnyNet.prototype.listVideoLibraries = function(aQuery, aOptions) {
  return this.core("get", "/videolibrary", aQuery, __, aOptions)
}

/**
 * <odoc>
 * <key>BunnyNet.getVideoLibrary(aId, aOptions)</key>
 * Retrieves a video library by id.
 * </odoc>
 */
BunnyNet.prototype.getVideoLibrary = function(aId, aOptions) {
  return this.core("get", "/videolibrary/" + aId, __, __, aOptions)
}

/**
 * <odoc>
 * <key>BunnyNet.createVideoLibrary(aMap, aOptions)</key>
 * Creates a video library using the request payload provided in aMap.
 * </odoc>
 */
BunnyNet.prototype.createVideoLibrary = function(aMap, aOptions) {
  return this.core("post", "/videolibrary", __, _$(aMap, "aMap").isMap().$_(), aOptions)
}

/**
 * <odoc>
 * <key>BunnyNet.updateVideoLibrary(aId, aMap, aOptions)</key>
 * Updates the video library identified by aId with the fields in aMap.
 * </odoc>
 */
BunnyNet.prototype.updateVideoLibrary = function(aId, aMap, aOptions) {
  return this.core("post", "/videolibrary/" + aId, __, _$(aMap, "aMap").isMap().$_(), aOptions)
}

/**
 * <odoc>
 * <key>BunnyNet.deleteVideoLibrary(aId, aOptions)</key>
 * Deletes the video library identified by aId.
 * </odoc>
 */
BunnyNet.prototype.deleteVideoLibrary = function(aId, aOptions) {
  return this.core("delete", "/videolibrary/" + aId, __, __, aOptions)
}

/**
 * <odoc>
 * <key>BunnyNet.listCountries(aQuery, aOptions)</key>
 * Lists bunny.net countries metadata.
 * </odoc>
 */
BunnyNet.prototype.listCountries = function(aQuery, aOptions) {
  return this.core("get", "/country", aQuery, __, aOptions)
}

/**
 * <odoc>
 * <key>BunnyNet.listRegions(aQuery, aOptions)</key>
 * Lists bunny.net regions metadata.
 * </odoc>
 */
BunnyNet.prototype.listRegions = function(aQuery, aOptions) {
  return this.core("get", "/region", aQuery, __, aOptions)
}

/**
 * <odoc>
 * <key>BunnyNet.getStatistics(aQuery, aOptions)</key>
 * Retrieves account statistics using the provided query parameters.
 * </odoc>
 */
BunnyNet.prototype.getStatistics = function(aQuery, aOptions) {
  return this.core("get", "/statistics", aQuery, __, aOptions)
}

/**
 * <odoc>
 * <key>BunnyNet.getBillingSummary(aQuery, aOptions)</key>
 * Retrieves the bunny.net billing summary.
 * </odoc>
 */
BunnyNet.prototype.getBillingSummary = function(aQuery, aOptions) {
  return this.core("get", "/billing/summary", aQuery, __, aOptions)
}

/**
 * <odoc>
 * <key>BunnyNet.getAPIKeys(aQuery, aOptions)</key>
 * Lists API keys available to the authenticated account.
 * </odoc>
 */
BunnyNet.prototype.getAPIKeys = function(aQuery, aOptions) {
  return this.core("get", "/apikey", aQuery, __, aOptions)
}

/**
 * <odoc>
 * <key>BunnyNet.listVideos(aLibraryId, aQuery, aOptions)</key>
 * Lists videos for the Stream library identified by aLibraryId.
 * </odoc>
 */
BunnyNet.prototype.listVideos = function(aLibraryId, aQuery, aOptions) {
  return this.stream("get", "/library/" + aLibraryId + "/videos", aQuery, __, aOptions)
}

/**
 * <odoc>
 * <key>BunnyNet.getVideo(aLibraryId, aVideoId, aOptions)</key>
 * Retrieves a Stream video by library and video id.
 * </odoc>
 */
BunnyNet.prototype.getVideo = function(aLibraryId, aVideoId, aOptions) {
  return this.stream("get", "/library/" + aLibraryId + "/videos/" + aVideoId, __, __, aOptions)
}

/**
 * <odoc>
 * <key>BunnyNet.createVideo(aLibraryId, aMap, aOptions)</key>
 * Creates a new Stream video in aLibraryId using the payload in aMap.
 * </odoc>
 */
BunnyNet.prototype.createVideo = function(aLibraryId, aMap, aOptions) {
  return this.stream("post", "/library/" + aLibraryId + "/videos", __, _$(aMap, "aMap").isMap().$_(), aOptions)
}

/**
 * <odoc>
 * <key>BunnyNet.updateVideo(aLibraryId, aVideoId, aMap, aOptions)</key>
 * Updates the Stream video identified by aVideoId in aLibraryId with the fields in aMap.
 * </odoc>
 */
BunnyNet.prototype.updateVideo = function(aLibraryId, aVideoId, aMap, aOptions) {
  return this.stream("post", "/library/" + aLibraryId + "/videos/" + aVideoId, __, _$(aMap, "aMap").isMap().$_(), aOptions)
}

/**
 * <odoc>
 * <key>BunnyNet.deleteVideo(aLibraryId, aVideoId, aOptions)</key>
 * Deletes the Stream video identified by aVideoId from aLibraryId.
 * </odoc>
 */
BunnyNet.prototype.deleteVideo = function(aLibraryId, aVideoId, aOptions) {
  return this.stream("delete", "/library/" + aLibraryId + "/videos/" + aVideoId, __, __, aOptions)
}

/**
 * <odoc>
 * <key>BunnyNet.fetchVideo(aLibraryId, aMap, aOptions)</key>
 * Imports a remote video into the Stream library identified by aLibraryId using the fetch payload in aMap.
 * </odoc>
 */
BunnyNet.prototype.fetchVideo = function(aLibraryId, aMap, aOptions) {
  return this.stream("post", "/library/" + aLibraryId + "/videos/fetch", __, _$(aMap, "aMap").isMap().$_(), aOptions)
}

/**
 * <odoc>
 * <key>BunnyNet.listCollections(aLibraryId, aQuery, aOptions)</key>
 * Lists Stream collections for the library identified by aLibraryId.
 * </odoc>
 */
BunnyNet.prototype.listCollections = function(aLibraryId, aQuery, aOptions) {
  return this.stream("get", "/library/" + aLibraryId + "/collections", aQuery, __, aOptions)
}

/**
 * <odoc>
 * <key>BunnyNet.getCollection(aLibraryId, aCollectionId, aOptions)</key>
 * Retrieves a Stream collection by library and collection id.
 * </odoc>
 */
BunnyNet.prototype.getCollection = function(aLibraryId, aCollectionId, aOptions) {
  return this.stream("get", "/library/" + aLibraryId + "/collections/" + aCollectionId, __, __, aOptions)
}

/**
 * <odoc>
 * <key>BunnyNet.createCollection(aLibraryId, aMap, aOptions)</key>
 * Creates a Stream collection in aLibraryId using the payload in aMap.
 * </odoc>
 */
BunnyNet.prototype.createCollection = function(aLibraryId, aMap, aOptions) {
  return this.stream("post", "/library/" + aLibraryId + "/collections", __, _$(aMap, "aMap").isMap().$_(), aOptions)
}

/**
 * <odoc>
 * <key>BunnyNet.deleteCollection(aLibraryId, aCollectionId, aOptions)</key>
 * Deletes the Stream collection identified by aCollectionId from aLibraryId.
 * </odoc>
 */
BunnyNet.prototype.deleteCollection = function(aLibraryId, aCollectionId, aOptions) {
  return this.stream("delete", "/library/" + aLibraryId + "/collections/" + aCollectionId, __, __, aOptions)
}

/**
 * <odoc>
 * <key>BunnyNet._listLocalFiles(aLocalPath) : Map</key>
 * Internal helper that recursively lists files under aLocalPath keyed by their relative path using forward slashes.
 * </odoc>
 */
BunnyNet.prototype._listLocalFiles = function(aLocalPath) {
  aLocalPath = _$(aLocalPath, "aLocalPath").isString().$_()

  var base = new java.io.File(aLocalPath)
  if (!base.exists()) throw "Local path '" + aLocalPath + "' doesn't exist."
  if (!base.isDirectory()) throw "Local path '" + aLocalPath + "' needs to be a directory."

  var basePath = String(base.getCanonicalPath()).replace(/\\/g, "/")
  var res = {}

  ;(function walk(aFile) {
    var files = aFile.listFiles()
    if (isNull(files) || isUnDef(files)) return

    for (var ii = 0; ii < files.length; ii++) {
      var file = files[ii]
      if (file.isDirectory()) {
        walk(file)
      } else if (file.isFile()) {
        var fullPath = String(file.getCanonicalPath()).replace(/\\/g, "/")
        var relPath = fullPath.substring(basePath.length).replace(/^\/+/, "")

        res[relPath] = {
          fullPath: fullPath,
          relativePath: relPath,
          size: Number(file.length()),
          lastModified: Number(file.lastModified())
        }
      }
    }
  })(base)

  return res
}

/**
 * <odoc>
 * <key>BunnyNet._storageEntryPath(aBasePath, aEntry) : String</key>
 * Internal helper that extracts a normalized relative path from a bunny.net Storage list entry.
 * </odoc>
 */
BunnyNet.prototype._storageEntryPath = function(aBasePath, aEntry) {
  aBasePath = this._normalizePath(_$(aBasePath, "aBasePath").isString().default(""), false)
  aEntry = _$(aEntry, "aEntry").isMap().default({})

  var path = isDef(aEntry.filepath) ? aEntry.filepath : aEntry.path
  var name = isDef(aEntry.ObjectName) ? aEntry.ObjectName : aEntry.objectName
  if (isUnDef(name)) name = isDef(aEntry.FileName) ? aEntry.FileName : aEntry.filename
  if (isUnDef(name)) name = isDef(aEntry.name) ? aEntry.name : __

  var fullPath
  if (isDef(path) && String(path).length > 0 && path != "/") {
    fullPath = String(path).replace(/\\/g, "/").replace(/^\/+/, "")
  } else if (isDef(name) && String(name).indexOf("/") >= 0) {
    fullPath = String(name).replace(/\\/g, "/").replace(/^\/+/, "")
  } else if (isDef(name)) {
    fullPath = (aBasePath.length > 0 ? aBasePath + "/" : "") + String(name)
  } else {
    return __
  }

  return fullPath.replace(/\/+$/, "")
}

/**
 * <odoc>
 * <key>BunnyNet._storageEntryLastModified(aEntry) : Number</key>
 * Internal helper that converts the last-modified value from a bunny.net Storage list entry into epoch milliseconds when possible.
 * </odoc>
 */
BunnyNet.prototype._storageEntryLastModified = function(aEntry) {
  var lastModified = isDef(aEntry.LastChanged) ? aEntry.LastChanged : aEntry.lastModified
  if (isUnDef(lastModified) || isNull(lastModified)) return __
  if (isNumber(lastModified)) return Number(lastModified)

  var parsed = new Date(String(lastModified))
  if (!isNaN(parsed.getTime())) return Number(parsed.getTime())

  return __
}

/**
 * <odoc>
 * <key>BunnyNet._listRemoteFiles(aPath, aOptions) : Map</key>
 * Internal helper that recursively lists files in bunny.net Storage under aPath keyed by relative path.
 * </odoc>
 */
BunnyNet.prototype._listRemoteFiles = function(aPath, aOptions) {
  var parent = this
  var rootPath = this._normalizePath(_$(aPath, "aPath").isString().default(""), false)
  var res = {}

  ;(function walk(aCurrentPath) {
    var lst = parent.listFiles(aCurrentPath, aOptions)
    if (isMap(lst) && isArray(lst.items)) lst = lst.items
    if (isMap(lst) && isArray(lst.Items)) lst = lst.Items
    if (!isArray(lst)) lst = []

    lst.forEach(function(aEntry) {
      if (!isMap(aEntry)) return

      var isDirectory = toBoolean(isDef(aEntry.IsDirectory) ? aEntry.IsDirectory : aEntry.isDirectory)
      var fullPath = parent._storageEntryPath(aCurrentPath, aEntry)
      if (isUnDef(fullPath) || fullPath.length <= 0) return

      var relPath = fullPath
      if (rootPath.length > 0) {
        if (relPath == rootPath) relPath = ""
        if (relPath.indexOf(rootPath + "/") == 0) relPath = relPath.substring(rootPath.length + 1)
      }

      if (isDirectory) {
        walk(fullPath)
      } else {
        res[relPath] = {
          fullPath: fullPath,
          relativePath: relPath,
          size: Number(isDef(aEntry.Length) ? aEntry.Length : (isDef(aEntry.length) ? aEntry.length : (isDef(aEntry.size) ? aEntry.size : -1))),
          lastModified: parent._storageEntryLastModified(aEntry)
        }
      }
    })
  })(rootPath)

  return res
}

/**
 * <odoc>
 * <key>BunnyNet._getS3Client(aOptions) : S3</key>
 * Internal helper that returns the provided S3 client or creates one from the s3* options using the S3 opack.
 * </odoc>
 */
BunnyNet.prototype._getS3Client = function(aOptions) {
  aOptions = _$(aOptions, "aOptions").isMap().default({})

  if (isDef(aOptions.s3)) return aOptions.s3

  if (typeof S3 == "undefined") {
    var s3Path = getOPackPath("S3")
    if (isUnDef(s3Path)) throw "The S3 opack needs to be installed to use BunnyNet.syncS3."
    loadLib(s3Path + "/s3.js")
  }

  return new S3(
    aOptions.s3URL,
    aOptions.s3AccessKey,
    aOptions.s3Secret,
    aOptions.s3Region,
    aOptions.s3UseVersion1,
    aOptions.s3IgnoreCertCheck
  )
}

/**
 * <odoc>
 * <key>BunnyNet._normalizeS3Prefix(aPrefix) : String</key>
 * Internal helper that normalizes an S3 prefix preserving any leading slash and ensuring a trailing slash when needed.
 * </odoc>
 */
BunnyNet.prototype._normalizeS3Prefix = function(aPrefix) {
  aPrefix = _$(aPrefix, "aPrefix").isString().default("")
  aPrefix = aPrefix.replace(/\\+/g, "/")
  if (aPrefix.length > 0 && !aPrefix.endsWith("/")) aPrefix += "/"
  return aPrefix
}

/**
 * <odoc>
 * <key>BunnyNet._storageOptions(aOptions) : Map</key>
 * Internal helper that extracts BunnyNet storage options from a mixed options map.
 * </odoc>
 */
BunnyNet.prototype._storageOptions = function(aOptions) {
  var res = merge({}, _$(aOptions, "aOptions").isMap().default({}))

  delete res.path
  delete res.logFn
  delete res.logErrorFn
  delete res.numThreads
  delete res.s3
  delete res.s3URL
  delete res.s3AccessKey
  delete res.s3Secret
  delete res.s3Region
  delete res.s3UseVersion1
  delete res.s3IgnoreCertCheck

  return res
}

/**
 * <odoc>
 * <key>BunnyNet._listS3Files(aS3Bucket, aS3Prefix, aOptions) : Map</key>
 * Internal helper that recursively lists files in an S3 bucket/prefix keyed by relative path.
 * </odoc>
 */
BunnyNet.prototype._listS3Files = function(aS3Bucket, aS3Prefix, aOptions) {
  var s3 = this._getS3Client(aOptions)
  var prefix = this._normalizeS3Prefix(aS3Prefix)
  var res = {}
  var lst = s3.listObjects(_$(aS3Bucket, "aS3Bucket").isString().$_(), prefix, __, true)

  lst.forEach(function(aEntry) {
    if (toBoolean(aEntry.isDirectory)) return

    var fullPath = String(aEntry.filename)
    var relPath = fullPath
    if (prefix.length > 0 && relPath.indexOf(prefix) == 0) relPath = relPath.substring(prefix.length)

    res[relPath] = {
      fullPath: fullPath,
      relativePath: relPath,
      size: Number(aEntry.size),
      lastModified: Number(aEntry.lastModified)
    }
  })

  return res
}

/**
 * <odoc>
 * <key>BunnyNet.listFiles(aPath, aOptions)</key>
 * Lists files under the storage path aPath. aOptions can include zone, region and key.
 * </odoc>
 */
BunnyNet.prototype.listFiles = function(aPath, aOptions) {
  aOptions = _$(aOptions, "aOptions").isMap().default({})
  aOptions.trailingSlash = true
  return this.storage("get", aPath, __, __, aOptions)
}

/**
 * <odoc>
 * <key>BunnyNet.deleteFile(aPath, aOptions)</key>
 * Deletes a file from bunny.net Storage at aPath.
 * </odoc>
 */
BunnyNet.prototype.deleteFile = function(aPath, aOptions) {
  return this.storage("delete", aPath, __, __, aOptions)
}

/**
 * <odoc>
 * <key>BunnyNet.downloadFile(aPath, aOptions)</key>
 * Downloads the file stored at aPath from bunny.net Storage.
 * </odoc>
 */
BunnyNet.prototype.downloadFile = function(aPath, aOptions) {
  return this.storage("get", aPath, __, __, aOptions)
}

/**
 * <odoc>
 * <key>BunnyNet.uploadFile(aPath, aBody, aOptions)</key>
 * Uploads aBody to bunny.net Storage at aPath.
 * </odoc>
 */
BunnyNet.prototype.uploadFile = function(aPath, aBody, aOptions) {
  return this.storage("put", aPath, __, aBody, aOptions)
}

/**
 * <odoc>
 * <key>BunnyNet.compare(aPath, aLocalPath, aOptions) : Array</key>
 * Compares bunny.net Storage under aPath with the local directory aLocalPath and returns an array of sync-style actions.
 * </odoc>
 */
BunnyNet.prototype.compare = function(aPath, aLocalPath, aOptions) {
  aPath = _$(aPath, "aPath").isString().default("")
  aLocalPath = _$(aLocalPath, "aLocalPath").isString().$_()
  aOptions = _$(aOptions, "aOptions").isMap().default({})

  var prefix = this._normalizePath(aPath, false)
  if (prefix.length > 0) prefix += "/"

  var localFiles = this._listLocalFiles(aLocalPath)
  var remoteFiles = this._listRemoteFiles(aPath, aOptions)
  var realLocalPath = String((new java.io.File(aLocalPath)).getCanonicalPath()).replace(/\\/g, "/") + "/"
  var actions = []
  var seen = {}

  var addAction = function(aAction) {
    var key = aAction.cmd + "|" + _$(aAction.sourceBucket).default("") + "|" + _$(aAction.source).default("") + "|" + _$(aAction.targetBucket).default("") + "|" + _$(aAction.target).default("")
    if (seen[key]) return
    seen[key] = true
    actions.push(aAction)
  }

  Object.keys(localFiles).forEach(function(aRelativePath) {
    var localEntry = localFiles[aRelativePath]
    var remoteName = prefix + aRelativePath
    var remoteEntry = remoteFiles[aRelativePath]

    if (isDef(remoteEntry)) {
      if (localEntry.size != remoteEntry.size || localEntry.lastModified != remoteEntry.lastModified) {
        if (localEntry.lastModified != remoteEntry.lastModified) {
          if (localEntry.lastModified > remoteEntry.lastModified) {
            addAction({
              cmd: "put",
              status: "replace",
              source: localEntry.fullPath,
              target: remoteName
            })
          } else {
            addAction({
              cmd: "get",
              status: "replace",
              source: remoteName,
              target: realLocalPath + aRelativePath
            })
          }
        }
      }
    } else {
      addAction({
        cmd: "put",
        status: "new",
        source: localEntry.fullPath,
        target: remoteName
      })
    }
  })

  Object.keys(remoteFiles).forEach(function(aRelativePath) {
    var remoteEntry = remoteFiles[aRelativePath]
    var localEntry = localFiles[aRelativePath]
    var localName = realLocalPath + aRelativePath

    if (isDef(localEntry)) {
      if (remoteEntry.size != localEntry.size || remoteEntry.lastModified != localEntry.lastModified) {
        if (remoteEntry.lastModified != localEntry.lastModified) {
          if (localEntry.lastModified > remoteEntry.lastModified) {
            addAction({
              cmd: "put",
              status: "replace",
              source: localName,
              target: remoteEntry.fullPath
            })
          } else {
            addAction({
              cmd: "get",
              status: "replace",
              source: remoteEntry.fullPath,
              target: localName
            })
          }
        }
      }
    } else {
      addAction({
        cmd: "get",
        status: "new",
        source: remoteEntry.fullPath,
        target: localName
      })
    }
  })

  return actions
}

/**
 * <odoc>
 * <key>BunnyNet.squashLocalActions(aPath, aLocalPath, aOptions) : Array</key>
 * Returns the actions needed to make aLocalPath match bunny.net Storage under aPath.
 * </odoc>
 */
BunnyNet.prototype.squashLocalActions = function(aPath, aLocalPath, aOptions) {
  var actions = this.compare(aPath, aLocalPath, aOptions)

  $from(actions)
  .equals("cmd", "put")
  .equals("status", "new")
  .select(function(r) { r.cmd = "delLocal" })

  $from(actions)
  .equals("cmd", "put")
  .equals("status", "replace")
  .select(function(r) { r.cmd = "void" })

  return $from(actions).notEquals("cmd", "void").select()
}

/**
 * <odoc>
 * <key>BunnyNet.squashRemoteActions(aPath, aLocalPath, aOptions) : Array</key>
 * Returns the actions needed to make bunny.net Storage under aPath match the local directory aLocalPath.
 * </odoc>
 */
BunnyNet.prototype.squashRemoteActions = function(aPath, aLocalPath, aOptions) {
  var actions = this.compare(aPath, aLocalPath, aOptions)

  $from(actions)
  .equals("cmd", "get")
  .equals("status", "new")
  .select(function(r) { r.cmd = "delRemote" })

  $from(actions)
  .equals("cmd", "get")
  .equals("status", "replace")
  .select(function(r) { r.cmd = "void" })

  return $from(actions).notEquals("cmd", "void").select()
}

/**
 * <odoc>
 * <key>BunnyNet.syncActions(aPath, aLocalPath, aOptions) : Array</key>
 * Returns the full two-way sync action list between bunny.net Storage under aPath and the local directory aLocalPath.
 * </odoc>
 */
BunnyNet.prototype.syncActions = function(aPath, aLocalPath, aOptions) {
  return this.compare(aPath, aLocalPath, aOptions)
}

/**
 * <odoc>
 * <key>BunnyNet.execActions(anArrayOfActions, aOptions, aLogFunction, aLogErrorFunction, numThreads)</key>
 * Executes the actions generated by BunnyNet.compare, BunnyNet.squashLocalActions, BunnyNet.squashRemoteActions or BunnyNet.syncActions.
 * </odoc>
 */
BunnyNet.prototype.execActions = function(anArrayOfActions, aOptions, aLogFunction, aLogErrorFunction, numThreads) {
  var parent = this

  anArrayOfActions = _$(anArrayOfActions, "anArrayOfActions").isArray().default([])
  aOptions = _$(aOptions, "aOptions").isMap().default({})
  aLogFunction = _$(aLogFunction, "aLogFunction").isFunction().default(log)
  aLogErrorFunction = _$(aLogErrorFunction, "aLogErrorFunction").isFunction().default(logErr)

  if (isArray(anArrayOfActions[0])) {
    for (var ii in anArrayOfActions) {
      this.execActions(anArrayOfActions[ii], aOptions, aLogFunction, aLogErrorFunction, numThreads)
    }
    return
  }

  parallel4Array(anArrayOfActions, function(action) {
    try {
      switch(action.cmd) {
      case "get":
        aLogFunction("Get '" + action.source + "' to '" + action.target + "'")
        var dir = String(action.target).replace(/\\/g, "/").replace(/\/[^\/]+$/, "")
        if (dir.length > 0 && !io.fileExists(dir)) io.mkdir(dir)
        io.writeFileBytes(action.target, parent.downloadFile(action.source, aOptions))
        break
      case "put":
        aLogFunction("Put '" + action.source + "' in '" + action.target + "'")
        parent.uploadFile(action.target, io.readFileBytes(action.source), aOptions)
        break
      case "delRemote":
        aLogFunction("Delete '" + action.source + "'")
        parent.deleteFile(action.source, aOptions)
        break
      case "delLocal":
        aLogFunction("Local delete '" + action.source + "'")
        io.rm(action.source)
        break
      }

      return true
    } catch(e) {
      aLogErrorFunction(e)
      return false
    }
  }, numThreads)
}

/**
 * <odoc>
 * <key>BunnyNet.sync(aLocalPath, aOptions) : Array</key>
 * Convenience wrapper that uses BunnyNet.squashRemoteActions and BunnyNet.execActions to mirror aLocalPath into bunny.net Storage.
 * aOptions can include path, zone, region and key.
 * </odoc>
 */
BunnyNet.prototype.sync = function(aLocalPath, aOptions) {
  aOptions = _$(aOptions, "aOptions").isMap().default({})

  var remotePath = _$(aOptions.path, "aOptions.path").isString().default("")
  var logFn = _$(aOptions.logFn, "aOptions.logFn").isFunction().default(log)
  var errFn = _$(aOptions.logErrorFn, "aOptions.logErrorFn").isFunction().default(logErr)
  var numThreads = _$(aOptions.numThreads, "aOptions.numThreads").isNumber().default(__)
  var storageOptions = this._storageOptions(aOptions)

  var actions = this.squashRemoteActions(remotePath, aLocalPath, storageOptions)
  this.execActions(actions, storageOptions, logFn, errFn, numThreads)
  return actions
}

/**
 * <odoc>
 * <key>BunnyNet.compareS3(aPath, aS3Bucket, aS3Prefix, aOptions) : Array</key>
 * Compares bunny.net Storage under aPath with objects in the S3 bucket aS3Bucket and optional prefix aS3Prefix.
 * </odoc>
 */
BunnyNet.prototype.compareS3 = function(aPath, aS3Bucket, aS3Prefix, aOptions) {
  if (isMap(aS3Prefix) && isUnDef(aOptions)) {
    aOptions = aS3Prefix
    aS3Prefix = ""
  }

  aPath = _$(aPath, "aPath").isString().default("")
  aS3Bucket = _$(aS3Bucket, "aS3Bucket").isString().$_()
  aS3Prefix = _$(aS3Prefix, "aS3Prefix").isString().default("")
  aOptions = _$(aOptions, "aOptions").isMap().default({})

  var bunnyPrefix = this._normalizePath(aPath, false)
  if (bunnyPrefix.length > 0) bunnyPrefix += "/"

  var s3Prefix = this._normalizeS3Prefix(aS3Prefix)
  var storageOptions = this._storageOptions(aOptions)
  var s3Files = this._listS3Files(aS3Bucket, aS3Prefix, aOptions)
  var remoteFiles = this._listRemoteFiles(aPath, storageOptions)
  var actions = []
  var seen = {}

  var addAction = function(aAction) {
    var key = aAction.cmd + "|" + _$(aAction.sourceBucket).default("") + "|" + _$(aAction.source).default("") + "|" + _$(aAction.targetBucket).default("") + "|" + _$(aAction.target).default("")
    if (seen[key]) return
    seen[key] = true
    actions.push(aAction)
  }

  Object.keys(s3Files).forEach(function(aRelativePath) {
    var s3Entry = s3Files[aRelativePath]
    var remoteName = bunnyPrefix + aRelativePath
    var remoteEntry = remoteFiles[aRelativePath]

    if (isDef(remoteEntry)) {
      if (s3Entry.size != remoteEntry.size || s3Entry.lastModified != remoteEntry.lastModified) {
        if (s3Entry.lastModified != remoteEntry.lastModified) {
          if (s3Entry.lastModified > remoteEntry.lastModified) {
            addAction({
              cmd: "putFromS3",
              status: "replace",
              source: s3Entry.fullPath,
              sourceBucket: aS3Bucket,
              target: remoteName
            })
          } else {
            addAction({
              cmd: "getToS3",
              status: "replace",
              source: remoteName,
              targetBucket: aS3Bucket,
              target: s3Prefix + aRelativePath
            })
          }
        }
      }
    } else {
      addAction({
        cmd: "putFromS3",
        status: "new",
        source: s3Entry.fullPath,
        sourceBucket: aS3Bucket,
        target: remoteName
      })
    }
  })

  Object.keys(remoteFiles).forEach(function(aRelativePath) {
    var remoteEntry = remoteFiles[aRelativePath]
    var s3Entry = s3Files[aRelativePath]

    if (isDef(s3Entry)) {
      if (remoteEntry.size != s3Entry.size || remoteEntry.lastModified != s3Entry.lastModified) {
        if (remoteEntry.lastModified != s3Entry.lastModified) {
          if (s3Entry.lastModified > remoteEntry.lastModified) {
            addAction({
              cmd: "putFromS3",
              status: "replace",
              source: s3Prefix + aRelativePath,
              sourceBucket: aS3Bucket,
              target: remoteEntry.fullPath
            })
          } else {
            addAction({
              cmd: "getToS3",
              status: "replace",
              source: remoteEntry.fullPath,
              targetBucket: aS3Bucket,
              target: s3Entry.fullPath
            })
          }
        }
      }
    } else {
      addAction({
        cmd: "getToS3",
        status: "new",
        source: remoteEntry.fullPath,
        targetBucket: aS3Bucket,
        target: s3Prefix + aRelativePath
      })
    }
  })

  return actions
}

/**
 * <odoc>
 * <key>BunnyNet.squashRemoteS3Actions(aPath, aS3Bucket, aS3Prefix, aOptions) : Array</key>
 * Returns the actions needed to make bunny.net Storage under aPath match the S3 bucket/prefix source.
 * </odoc>
 */
BunnyNet.prototype.squashRemoteS3Actions = function(aPath, aS3Bucket, aS3Prefix, aOptions) {
  var actions = this.compareS3(aPath, aS3Bucket, aS3Prefix, aOptions)

  $from(actions)
  .equals("cmd", "getToS3")
  .equals("status", "new")
  .select(function(r) { r.cmd = "delRemote" })

  $from(actions)
  .equals("cmd", "getToS3")
  .equals("status", "replace")
  .select(function(r) { r.cmd = "void" })

  return $from(actions).notEquals("cmd", "void").select()
}

/**
 * <odoc>
 * <key>BunnyNet.execS3Actions(anArrayOfActions, aOptions, aLogFunction, aLogErrorFunction, numThreads)</key>
 * Executes the actions generated by BunnyNet.compareS3 or BunnyNet.squashRemoteS3Actions using the S3 opack as the source.
 * </odoc>
 */
BunnyNet.prototype.execS3Actions = function(anArrayOfActions, aOptions, aLogFunction, aLogErrorFunction, numThreads) {
  aOptions = _$(aOptions, "aOptions").isMap().default({})

  var parent = this
  var s3 = this._getS3Client(aOptions)
  var storageOptions = this._storageOptions(aOptions)

  anArrayOfActions = _$(anArrayOfActions, "anArrayOfActions").isArray().default([])
  aLogFunction = _$(aLogFunction, "aLogFunction").isFunction().default(log)
  aLogErrorFunction = _$(aLogErrorFunction, "aLogErrorFunction").isFunction().default(logErr)

  if (isArray(anArrayOfActions[0])) {
    for (var ii in anArrayOfActions) {
      this.execS3Actions(anArrayOfActions[ii], aOptions, aLogFunction, aLogErrorFunction, numThreads)
    }
    return
  }

  parallel4Array(anArrayOfActions, function(action) {
    try {
      switch(action.cmd) {
      case "putFromS3":
        aLogFunction("Put '" + action.sourceBucket + ":" + action.source + "' in '" + action.target + "'")
        var tmp = io.createTempFile("bunnynet_s3sync_", ".tmp")
        try {
          s3.getObject(action.sourceBucket, action.source, tmp)
          parent.uploadFile(action.target, io.readFileBytes(tmp), storageOptions)
        } finally {
          if (io.fileExists(tmp)) io.rm(tmp)
        }
        break
      case "getToS3":
        aLogFunction("Put '" + action.source + "' in '" + action.targetBucket + ":" + action.target + "'")
        var tmp2 = io.createTempFile("bunnynet_s3sync_", ".tmp")
        try {
          io.writeFileBytes(tmp2, parent.downloadFile(action.source, storageOptions))
          s3.putObject(action.targetBucket, action.target, tmp2)
        } finally {
          if (io.fileExists(tmp2)) io.rm(tmp2)
        }
        break
      case "delRemote":
        aLogFunction("Delete '" + action.source + "'")
        parent.deleteFile(action.source, storageOptions)
        break
      }

      return true
    } catch(e) {
      aLogErrorFunction(e)
      return false
    }
  }, numThreads)
}

/**
 * <odoc>
 * <key>BunnyNet.syncS3(aS3Bucket, aS3Prefix, aOptions) : Array</key>
 * Convenience wrapper that mirrors objects from the S3 bucket aS3Bucket and optional prefix aS3Prefix into bunny.net Storage.
 * aOptions can include path, zone, region, key, s3 or the s3URL/s3AccessKey/s3Secret/s3Region connection options.
 * </odoc>
 */
BunnyNet.prototype.syncS3 = function(aS3Bucket, aS3Prefix, aOptions) {
  if (isMap(aS3Prefix) && isUnDef(aOptions)) {
    aOptions = aS3Prefix
    aS3Prefix = ""
  }

  aOptions = _$(aOptions, "aOptions").isMap().default({})

  var remotePath = _$(aOptions.path, "aOptions.path").isString().default("")
  var logFn = _$(aOptions.logFn, "aOptions.logFn").isFunction().default(log)
  var errFn = _$(aOptions.logErrorFn, "aOptions.logErrorFn").isFunction().default(logErr)
  var numThreads = _$(aOptions.numThreads, "aOptions.numThreads").isNumber().default(__)
  var actions = this.squashRemoteS3Actions(remotePath, aS3Bucket, aS3Prefix, aOptions)

  this.execS3Actions(actions, aOptions, logFn, errFn, numThreads)
  return actions
}

if (typeof exports != "undefined") {
  exports.BunnyNet = BunnyNet
  exports.$bunnynet = $bunnynet
}
