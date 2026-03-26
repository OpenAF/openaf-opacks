// Author: Nuno Aguiar
// CodeArtifact

loadLib("aws_core.js");

/**
 * <odoc>
 * <key>AWS.CODEARTIFACT_ListDomains(aRegion) : array</key>
 * Given a region, returns a list of domains in the account.
 * </odoc>
 */
AWS.prototype.CODEARTIFACT_ListDomains = function(aRegion) {
    aRegion = _$(aRegion).isString().default(this.region)
    var aURL = "https://codeartifact." + aRegion + ".amazonaws.com/v1/domains"
    var params = {}
    var url = new java.net.URL(aURL)
    var aHost = String(url.getHost())
    var aURI = String(url.getPath())
    var _res = []
    var _r = this.postURLEncoded(aURL, aURI, "", params, "codeartifact", aHost, aRegion, { "X-Amz-Target": "CodeArtifact_20191031.ListDomains" }, __, "application/x-amz-json-1.1")

    if (isDef(_r.domains)) {
        _res = _res.concat(_r.domains)
        while(isDef(_r.nextToken)) {
           params.nextToken = _r.nextToken
           _r = this.postURLEncoded(aURL, aURI, "", params, "codeartifact", aHost, aRegion, { "X-Amz-Target": "CodeArtifact_20191031.ListDomains" }, __, "application/x-amz-json-1.1")
           if (isDef(_r.domains)) _res = _res.concat(_r.domains)
        }
    }
    return _res
}

/**
 * <odoc>
 * <key>AWS.CODEARTIFACT_ListRepositories(aRegion, aRepositoryPrefix) : array</key>
 * Given a region and a repository prefix, returns a list of repositories in the account.
 * If no prefix is given, all repositories are returned.
 * </odoc>
 */
AWS.prototype.CODEARTIFACT_ListRepositories = function(aRegion, aRepositoryPrefix) {
    aRegion = _$(aRegion).isString().default(this.region)
    var aURL = "https://codeartifact." + aRegion + ".amazonaws.com/v1/repositories"
    var params = {}
    if (isDef(aRepositoryPrefix)) params.repositoryPrefix = aRepositoryPrefix
    var url = new java.net.URL(aURL)
    var aHost = String(url.getHost())
    var aURI = String(url.getPath())
    var _res = []
    var _r = this.postURLEncoded(aURL, aURI, "", params, "codeartifact", aHost, aRegion, { "X-Amz-Target": "CodeArtifact_20191031.ListRepositories" }, __, "application/x-amz-json-1.1")

    if (isDef(_r.repositories)) {
        _res = _res.concat(_r.repositories)
        while(isDef(_r.nextToken)) {
           params.nextToken = _r.nextToken
           _r = this.postURLEncoded(aURL, aURI, "", params, "codeartifact", aHost, aRegion, { "X-Amz-Target": "CodeArtifact_20191031.ListRepositories" }, __, "application/x-amz-json-1.1")
           if (isDef(_r.repositories)) _res = _res.concat(_r.repositories)
        }
    }
    return _res
}

/**
 * <odoc>
 * <key>AWS.CODEARTIFACT_ListPackages(aRegion, aRepository, aDomain, aFormat) : array</key>
 * Given a region, a repository, a domain and a format, returns a list of packages in the account.
 * If no format is given, all packages are returned.
 * If no repository is given, all packages are returned.
 * If no domain is given, all packages are returned.
 * </odoc>
 */
AWS.prototype.CODEARTIFACT_ListPackages = function(aRegion, aRepository, aDomain, aFormat) {
    aRegion = _$(aRegion).isString().default(this.region)
    var aURL = "https://codeartifact." + aRegion + ".amazonaws.com/v1/packages"
    var params = {}
    if (isDef(aRepository)) params.repository = aRepository
    if (isDef(aDomain)) params.domain = aDomain
    if (isDef(aFormat)) params.format = aFormat
    var url = new java.net.URL(aURL)
    var aHost = String(url.getHost())
    var aURI = String(url.getPath())
    var _res = []
    var _r = this.postURLEncoded(aURL, aURI, "", params, "codeartifact", aHost, aRegion, { "X-Amz-Target": "CodeArtifact_20191031.ListPackages" }, __, "application/x-amz-json-1.1")

    if (isDef(_r.packages)) {
        _res = _res.concat(_r.packages)
        while(isDef(_r.nextToken)) {
           params.nextToken = _r.nextToken
           _r = this.postURLEncoded(aURL, aURI, "", params, "codeartifact", aHost, aRegion, { "X-Amz-Target": "CodeArtifact_20191031.ListPackages" }, __, "application/x-amz-json-1.1")
           if (isDef(_r.packages)) _res = _res.concat(_r.packages)
        }
    }
    return _res
}

/**
 * <odoc>
 * <key>AWS.CODEARTIFACT_ListPackageVersions(aRegion, aRepository, aDomain, aFormat, aNamespace, aPackage) : array</key>
 * Given a region, a repository, a domain, a format, a namespace and a package, returns a list of package versions in the account.
 * If no format is given, all packages are returned.
 * If no repository is given, all packages are returned.
 * If no domain is given, all packages are returned.
 * </odoc>
 */
AWS.prototype.CODEARTIFACT_ListPackageVersions = function(aRegion, aRepository, aDomain, aFormat, aNamespace, aPackage) {
    aRegion = _$(aRegion).isString().default(this.region)
    var aURL = "https://codeartifact." + aRegion + ".amazonaws.com/v1/package/versions"
    var params = {}
    if (isDef(aRepository)) params.repository = aRepository
    if (isDef(aDomain)) params.domain = aDomain
    if (isDef(aFormat)) params.format = aFormat
    if (isDef(aNamespace)) params.namespace = aNamespace
    if (isDef(aPackage)) params.package = aPackage
    var url = new java.net.URL(aURL)
    var aHost = String(url.getHost())
    var aURI = String(url.getPath())
    var _res = []
    var _r = this.postURLEncoded(aURL, aURI, "", params, "codeartifact", aHost, aRegion, { "X-Amz-Target": "CodeArtifact_20191031.ListPackageVersions" }, __, "application/x-amz-json-1.1")

    if (isDef(_r.versions)) {
        _res = _res.concat(_r.versions)
        while(isDef(_r.nextToken)) {
           params.nextToken = _r.nextToken
           _r = this.postURLEncoded(aURL, aURI, "", params, "codeartifact", aHost, aRegion, { "X-Amz-Target": "CodeArtifact_20191031.ListPackageVersions" }, __, "application/x-amz-json-1.1")
           if (isDef(_r.versions)) _res = _res.concat(_r.versions)
        }
    }
    return _res
}

/**
 * <odoc>
 * <key>AWS.CODEARTIFACT_GetPackageVersionAsset(aRegion, aRepository, aDomain, aFormat, aNamespace, aPackage, aVersion, aAsset) : Map</key>
 * Given a region, a repository, a domain, a format, a namespace, a package, a version and an asset name, returns a map with a stream property
 * containing the binary content of the asset and the contentType header value.
 * </odoc>
 */
AWS.prototype.CODEARTIFACT_GetPackageVersionAsset = function(aRegion, aRepository, aDomain, aFormat, aNamespace, aPackage, aVersion, aAsset) {
    aRegion = _$(aRegion).isString().default(this.region)
    var params = {}
    if (isDef(aRepository)) params.repository = aRepository
    if (isDef(aDomain))     params.domain = aDomain
    if (isDef(aFormat))     params.format = aFormat
    if (isDef(aNamespace))  params.namespace = aNamespace
    if (isDef(aPackage))    params.package = aPackage
    if (isDef(aVersion))    params.version = aVersion
    if (isDef(aAsset))      params.asset = aAsset

    var aURL = "https://codeartifact." + aRegion + ".amazonaws.com/v1/package/version/asset"
    var url = new java.net.URL(aURL)
    var aHost = String(url.getHost())
    var aURI = String(url.getPath())

    // SigV4 requires query params sorted alphabetically; no Content-Type for GET without body.
    // encodeURIComponent leaves ! * ' ( ) unencoded, but SigV4 requires encoding all chars
    // except A-Z a-z 0-9 - _ . ~ — so we apply the extra replacements after encodeURIComponent.
    var _sigV4Encode = s => encodeURIComponent(s).replace(/!/g,"%21").replace(/'/g,"%27").replace(/\(/g,"%28").replace(/\)/g,"%29").replace(/\*/g,"%2A")
    var queryStr = Object.keys(params).sort().map(k => _sigV4Encode(k) + "=" + _sigV4Encode(params[k])).join("&")

    var _rawHeaders = this.__getRequest("get", aURI, "codeartifact", aHost, aRegion, queryStr, "", __, __)
    var headers = {}
    Object.keys(_rawHeaders).forEach(k => { if (isDef(_rawHeaders[k])) headers[k] = _rawHeaders[k] })
    var h = new ow.obj.http()
    h.setThrowExceptions(false)
    h.getStream(aURL + "?" + queryStr, __, headers, 30000)
    if (h.responseCode() >= 400) {
        var _code = h.responseCode()
        var _body = ""
        try { _body = af.fromInputStream2String(h.outputObj); h.close() } catch(_e) { try { h.close() } catch(_) {} }
        throw "IOException " + _code + " [query: " + queryStr + "]: " + _body
    }
    return { stream: h.outputObj, contentType: h.responseType() }
}

/**
 * <odoc>
 * <key>AWS.CODEARTIFACT_ListPackageVersionAssets(aRegion, aRepository, aDomain, aFormat, aNamespace, aPackage, aVersion) : array</key>
 * Given a region, a repository, a domain, a format, a namespace and a package version, returns a list of package version assets in the account.
 * If no format is given, all packages are returned.
 * If no repository is given, all packages are returned.
 * If no domain is given, all packages are returned.
 * </odoc>
 */
AWS.prototype.CODEARTIFACT_ListPackageVersionAssets = function(aRegion, aRepository, aDomain, aFormat, aNamespace, aPackage, aVersion) {
    aRegion = _$(aRegion).isString().default(this.region)
    var aURL = "https://codeartifact." + aRegion + ".amazonaws.com/v1/package/version/assets"
    var params = {}
    if (isDef(aRepository)) params.repository = aRepository
    if (isDef(aDomain)) params.domain = aDomain
    if (isDef(aFormat)) params.format = aFormat
    if (isDef(aNamespace)) params.namespace = aNamespace
    if (isDef(aPackage)) params.package = aPackage
    if (isDef(aVersion)) params.packageVersion = aVersion
    var url = new java.net.URL(aURL)
    var aHost = String(url.getHost())
    var aURI = String(url.getPath())
    var _res = []
    var _r = this.postURLEncoded(aURL, aURI, "", params, "codeartifact", aHost, aRegion, { "X-Amz-Target": "CodeArtifact_20191031.ListPackageVersionAssets" }, __, "application/x-amz-json-1.1")

    if (isDef(_r.assets)) {
        _res = _res.concat(_r.assets)
        while(isDef(_r.nextToken)) {
           params.nextToken = _r.nextToken
           _r = this.postURLEncoded(aURL, aURI, "", params, "codeartifact", aHost, aRegion, { "X-Amz-Target": "CodeArtifact_20191031.ListPackageVersionAssets" }, __, "application/x-amz-json-1.1")
           if (isDef(_r.assets)) _res = _res.concat(_r.assets)
        }
    }
    return _res
}