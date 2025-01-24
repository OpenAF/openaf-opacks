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