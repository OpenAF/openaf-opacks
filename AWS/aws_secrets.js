// Author: Nuno Aguiar
// Secrets

loadLib("aws_core.js")

/**
  * <odoc>
  * <key>AWS.SECRETS_ListSecrets(aRegion) : Array</key>
  * Given aRegion returns an array with all configured secrets.
  * </odoc>
 */
AWS.prototype.SECRETS_ListSecrets = function(aRegion) {
    aRegion = _$(aRegion).isString().default(this.region)
    var aURL = "https://secretsmanager." + aRegion + ".amazonaws.com/"
    
    var params = {}
 
    var url = new java.net.URL(aURL)
    var aHost = String(url.getHost())
    var aURI = String(url.getPath())
 
    var _r = this.postURLEncoded(aURL, aURI, "", params, "secretsmanager", aHost, aRegion, {
        "X-Amz-Target": "secretsmanager.ListSecrets"
    }, __, "application/x-amz-json-1.1")

    if (isDef(_r) && isDef(_r.SecretList)) {
        return _r.SecretList
    } else {
        return _r
    }
}

/**<
 * <odoc>
 * <key>AWS.SECRETS_GetSecret(aRegion, aSecretId) : Map</key>
 * Given aRegion and aSecretId (ARN) returns a map with the secret information.
 * </odoc>
 */
AWS.prototype.SECRETS_GetSecret = function(aRegion, aSecretId) {
    aRegion = _$(aRegion).isString().default(this.region)
    var aURL = "https://secretsmanager." + aRegion + ".amazonaws.com/"
    
    var params = {
        SecretId: aSecretId
    }
 
    var url = new java.net.URL(aURL)
    var aHost = String(url.getHost())
    var aURI = String(url.getPath())
 
    var _r = this.postURLEncoded(aURL, aURI, "", params, "secretsmanager", aHost, aRegion, {
        "X-Amz-Target": "secretsmanager.GetSecretValue"
    }, __, "application/x-amz-json-1.1")

    return _r
}

/**
 * <odoc>
 * <key>AWS.SECRETS_PutSecretString(aRegion, aSecretId, aNewStringValue) : Map</key>
 * Given aRegion, aSecretId (ARN) and aNewStringValue will update the secret with the new value.
 * Note: a ClientRequestToken will be automatically generated.
 * </odoc>
 */
AWS.prototype.SECRETS_PutSecretString = function(aRegion, aSecretId, aNewStringValue) {
    aRegion = _$(aRegion).isString().default(this.region)
    var aURL = "https://secretsmanager." + aRegion + ".amazonaws.com/"
    
    var params = {
        ClientRequestToken: genUUID(),
        SecretId    : aSecretId,
        SecretString: aNewStringValue
    }
 
    var url = new java.net.URL(aURL)
    var aHost = String(url.getHost())
    var aURI = String(url.getPath())
 
    var _r = this.postURLEncoded(aURL, aURI, "", params, "secretsmanager", aHost, aRegion, {
        "X-Amz-Target": "secretsmanager.PutSecretValue"
    }, __, "application/x-amz-json-1.1")

    return _r
}