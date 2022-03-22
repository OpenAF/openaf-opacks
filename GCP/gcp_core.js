var GCP = function(aFileOrToken) {
    aFileOrToken = _$(aFileOrToken, "aFileOrToken").isString().default(__)

    if (isUnDef(aFileOrToken)) {
        var res = $rest().get("http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token")
        this._token      = res.access_token
        this._expires_in = now() + (res.expires_in * 1000)
        this.authMethod  = "metadata"
    }
    if (io.fileExists(aFileOrToken)) {
        this.authMethod = "file"
        throw "Not implemented yet"
    } else {
        this.authMethod = "token"
        this._token = aFileOrToken
    }
}

GCP.prototype.getHeaders = function() {
    if (isDef(this._expires_in) && this._expires_in < now()) {
        if (this.authMethod == "metadata") {
            var res = $rest().get("http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token")
            this._token      = res.access_token
            this._expires_in = now() + (res.expires_in * 1000)
            this.authMethod  = "metadata"
        }
    }
    return {
        requestHeaders: {
            Authorization: "Bearer " + this._token
        },
        uriQuery: true
    }
}