// Author: Nuno Aguiar
// STS

loadLib("aws_core.js");

/**
 * <odoc>
 * <key>AWS.STS_GetCallerIdentity(aRegion) : Map</key>
 * </odoc>
 */
AWS.prototype.STS_GetCallerIdentity = function(aRegion) {
    aRegion = _$(aRegion).isString().default(this.region)
    var aURL = "https://sts." + aRegion + ".amazonaws.com/"
    var url = new java.net.URL(aURL)
    var aHost = String(url.getHost())
    var aURI = String(url.getPath())
    var params = {
       Action: "GetCallerIdentity",
       Version: "2011-06-15"
    }

    var res = this.postURLEncoded(aURL, aURI, "", params, "sts", aHost, aRegion)

    if (isMap(res)) return res; else return af.fromXML2Obj(res)
}

/**
 * <odoc>
 * <key>AWS.STS_GetSessionToken(aRegion, aDurationSecs) : Map</key>
 * Given a region and a duration in seconds, returns a map with the
 * session token, access key and secret key.
 * </odoc>
 */
AWS.prototype.STS_AssumeRole = function(aRegion, aRoleARN, aRoleSession, aDurationSecs) {
    aRegion = _$(aRegion).isString().default(this.region)
    aRoleARN = _$(aRoleARN, "aRoleARN").isString().$_()
    aRoleSession = _$(aRoleSession, "aRoleSession").isString().default(genUUID())

    var aURL = "https://sts." + aRegion + ".amazonaws.com/"
    var url = new java.net.URL(aURL)
    var aHost = String(url.getHost())
    var aURI = String(url.getPath())
    var params = {
       Action: "AssumeRole",
       Version: "2011-06-15",
       RoleSessionName: aRoleSession,
       RoleArn: aRoleARN,
       DurationSeconds: aDurationSecs
    }

    var res = this.postURLEncoded(aURL, aURI, "", params, "sts", aHost, aRegion)

    if (!isMap(res)) res = af.fromXML2Obj(res)
    if (isDef(res.AssumeRoleResponse)) res = res.AssumeRoleResponse
    return res
}

/**
 * <odoc>
 * <key>AWS.assumeRole(aRoleARN, aRoleSession, aDurationSecs) : AWS</key>
 * Given a role ARN, a session name and a duration in seconds, returns
 * an AWS object with the new credentials.
 * </odoc>
 */
AWS.prototype.assumeRole = function(aRoleARN, aRoleSession, aDurationSecs) {
    var o = this.STS_AssumeRole(this.region, aRoleARN, aRoleSession, aDurationSecs)
    if (isDef(o.AssumeRoleResult)) o = o.AssumeRoleResult
    if (isDef(o.Credentials)) o = o.Credentials
    if (isDef(o.AccessKeyId)) {
        var newaws = new AWS(o.AccessKeyId, o.SecretAccessKey, o.SessionToken)
        newaws.assumeRoleExp = (new Date(o.AssumeRoleResult.Credentials.Expiration)).getTime()
        return newaws
    } else {
        throw new Error("Invalid response from AWS STS AssumeRole: " + JSON.stringify(o))
    }
}

/**
 * <odoc>
 * <key>AWS.checkAssumeRole() : Boolean</key>
 * Checks if the current AWS object has a valid session token.
 * If the session token is expired, it returns true.
 * If it is still valid, it returns false.
 * </odoc>
 */
AWS.prototype.checkAssumeRole = function() {
    if (isDef(this.assumeRoleExp)) {
        var now = new Date().getTime()
        if (now > this.assumeRoleExp) {
            return true
        } else {
            return false
        }
    } else {
        return false
    }
}