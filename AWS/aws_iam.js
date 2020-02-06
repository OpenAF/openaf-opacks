// Author: Nuno Aguiar
// ECS

loadLib("aws_core.js");

/**
 * <odoc>
 * <key>AWS.IAM_GetUser(aUserName) : Map</key>
 * Retrieves the information about aUserName (defaults to current).
 * </odoc>
 */
AWS.prototype.IAM_GetUser = function(aUserName) {
    var aURL = "https://iam.amazonaws.com/";
    var url = new java.net.URL(aURL);
    var aHost = String(url.getHost());
    var aURI = String(url.getPath());
    var params = {
       Action: "GetUser",
       UserName: aUserName,
       Version: "2010-05-08"
    };
    url += "?" + $rest().query(params);
 
    var res = this.getURLEncoded(url, aURI, $rest().query(params), {}, "iam", aHost, "us-east-1");

    if (isMap(res)) return res; else return af.fromXML2Obj(res);
}; 