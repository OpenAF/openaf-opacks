// Author: Nuno Aguiar
// Cognito

loadLib("aws_core.js");

/**
 * <odoc>
 * <key>AWS.COGNITO_ListUsers(aRegion, aPoolId) : Array</key>
 * Given a region and a pool id, returns the list of users in the pool.
 * Note: this function will return all users in the pool, so be careful with large pools.
 * </odoc>
 */
AWS.prototype.COGNITO_ListUsers = function(aRegion, aPoolId) {
    aRegion = _$(aRegion).isString().default(this.region)
    aPoolId = _$(aPoolId).isString().$_()

    var aURL = "https://cognito-idp." + aRegion + ".amazonaws.com/"
        
    var params = {
        UserPoolId: aPoolId
    }
     
    var url = new java.net.URL(aURL)
    var aHost = String(url.getHost())
    var aURI = String(url.getPath())
   
    var _res = []
    var _r = this.postURLEncoded(aURL, aURI, "", params, "cognito-idp", aHost, aRegion, {
                "X-Amz-Target": "AWSCognitoIdentityProviderService.ListUsers" }, __, "application/x-amz-json-1.1")

    if (isDef(_r.Users)) {
        _res = _res.concat(_r.Users)
        while(isDef(_r.PaginationToken)) {
           params.PaginationToken = _r.PaginationToken
           _r = this.postURLEncoded(aURL, aURI, "", params, "cognito-idp", aHost, aRegion, { "X-Amz-Target": "AWSCognitoIdentityProviderService.ListUsers" }, __, "application/x-amz-json-1.1")
           if (isDef(_r.Users)) _res = _res.concat(_r.Users)
        }
    } else {
        return _r
    }

    return _res
}