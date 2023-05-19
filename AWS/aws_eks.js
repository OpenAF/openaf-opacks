// Author: Nuno Aguiar
// EKS

loadLib("aws_core.js");
 
/**
 * <odoc>
 * <key>AWS.EKS_ListClusters(aRegion, aParamsMap) : Array</key>
 * </odoc>
 */
AWS.prototype.EKS_ListClusters = function(aRegion, params) {
    aRegion = _$(aRegion).isString().default(this.region)
    params = _$(params).isMap().default({})
    var aURL = "https://eks." + aRegion + ".amazonaws.com/clusters"
    var url = new java.net.URL(aURL)
    var aHost = String(url.getHost())
    var aURI = String(url.getPath())

    var data = [], res
    do {
      var _uri = aURI
      var _url = aURL
      if (isDef(res) && !isNull(res.nextToken)) {
        var q = "?" + $rest().query({ nextToken: res.nextToken })
        _url += q
        _uri += q
      }
      res = this.getURLEncoded(_url, _uri, "", merge({}, params), "eks", aHost, aRegion, {})

      if (isDef(res) && isArray(res.clusters)) data = data.concat(res.clusters)
    } while(isDef(res) && !isNull(res.nextToken))

    return data
}  

/**
 * <odoc>
 * <key>AWS.EKS_DescribeCluster(aRegion, aName) : Map</key>
 * </odoc>
 */
AWS.prototype.EKS_DescribeCluster = function(aRegion, aName) {
    aRegion = _$(aRegion).isString().default(this.region)
    aName   = _$(aName).isString().$_()
    var aURL = "https://eks." + aRegion + ".amazonaws.com/clusters/" + aName
    var url = new java.net.URL(aURL)
    var aHost = String(url.getHost())
    var aURI = String(url.getPath())

    return this.getURLEncoded(aURL, aURI, "", {}, "eks", aHost, aRegion, {})
}

/**
 * <odoc>
 * <key>AWS.EKS_GetToken(aRegion, aName) : Map</key>
 * </odoc>
 */
/*AWS.prototype.EKS_GetToken = function(aRegion, aName) {
  aRegion = _$(aRegion).isString().default(this.region)
  aName   = _$(aName).isString().$_()
  var aURL = "https://eks." + aRegion + ".amazonaws.com/" + aName
  var url = new java.net.URL(aURL)
  var aHost = String(url.getHost())
  var aURI = String(url.getPath())

  var res = this.postURLEncoded(aURL, aURI, "", { 
    Action: "GetQueueAttributes", 
    QueueUrl: aURL,
    "AttributeName.1": "All",
    Version: "2012-11-05" 
 }, "sqs", aHost, aRegion);
 
 if (isString(res)) res = af.fromXML2Obj(res);
 return res;
}*/