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

AWS.prototype.EKS_GetToken = function(aRegion, aClusterName) {
  aRegion      = _$(aRegion, "aRegion").isString().default(this.region)
  aClusterName = _$(aClusterName, "aClusterName").isString().$_()

  var _data = this.__getRequest("get", "/", "sts", "sts." + aRegion + ".amazonaws.com", aRegion, "Action=GetCallerIdentity&Version=2011-06-15", "", { "x-k8s-aws-id": aClusterName },__,__, true)
  return {
    kind: "ExecCredential",
    apiVersion: "client.authentication.k8s.io/v1beta1",
    spec: {},
    status: {
      expirationTimestamp: new Date(ow.format.toDate( _data._query.match(/X-Amz-Date=([^&]+)&/)[1], "yyyyMMdd'T'HHmmss'Z'").getTime() + 60000).toISOString(),
      token: "k8s-aws-v1." + af.fromBytes2String(af.toBase64Bytes(_data._query))
    }
  }
}

AWS.prototype.EKS_GetKubeConfig = function(aRegion, aClusterName, aCmd, aArgs) {
  aRegion      = _$(aRegion, "aRegion").isString().default(this.region)
  aClusterName = _$(aClusterName, "aClusterName").isString().$_()
  aCmd         = _$(aCmd, "aCmd").isString().default(java.lang.System.getProperty("java.home") + java.io.File.separator + "bin" + java.io.File.separator + "java")
  aArgs        = _$(aArgs, "aArgs").isArray().default(["-jar", getOpenAFJar(), "-c", "load('aws.js');aws=new AWS();sprint(aws.EKS_GetToken('" + aRegion + "','" + aClusterName + "'))"])

  var _cluster = this.EKS_DescribeCluster(aRegion, aClusterName)

  return {
    apiVersion: "v1",
    clusters: [
      { 
        cluster: {
          "certificate-authority-data": _cluster.cluster.certificateAuthority.data,
          server: _cluster.cluster.endpoint,
        },
        name: _cluster.cluster.arn
      }
    ],
    contexts: [
      {
        context: {
          cluster: _cluster.cluster.arn,
          user: _cluster.cluster.arn
        },
        name: _cluster.cluster.arn
      }
    ],
    "current-context": _cluster.cluster.arn,
    kind: "Config",
    preferences: {},
    users: [
      {
        name: _cluster.cluster.arn,
        user: {
          exec: {
            apiVersion: "client.authentication.k8s.io/v1beta1",
            command: aCmd,
            args: aArgs
          }
        }
      }
    ]
  }
}