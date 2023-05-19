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