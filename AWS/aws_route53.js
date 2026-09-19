// Author: Nuno Aguiar
// ROUTE 53

loadLib("aws_core.js")

/**
 * <odoc>
 * <key>AWS.ROUTE53_ChangeResourceRecordSet(aIdentifier, aChangeMap) : Map</key>
 * Given aRegion, a data source aIdentifier (e.g. db-*) and a sql id as aGroupIdentifier will return the corresponding full SQL queries.
 * To obtain the aIdentifier do run AWS.RDS_DescribeDBInstances a find the corresponding DbiResourceId.
 * More details in https://docs.aws.amazon.com/performance-insights/latest/APIReference/API_GetDimensionKeyDetails.html.
 * </odoc>
 */
AWS.prototype.ROUTE53_ChangeResourceRecordSet = function(aIdentifier, aChangeMap) {
    _$(aIdentifier, "aIdentifier").isString().$_()
    _$(aChangeMap, "aChangeMap").isMap().$_()

    if (aIdentifier.startsWith("/hostedzone/")) aIdentifier = aIdentifier.replace("/hostedzone/", "")

    var aURL   = "https://route53.amazonaws.com/2013-04-01/hostedzone/" + aIdentifier + "/rrset/"
    var url    = new java.net.URL(aURL)
    var aHost  = String(url.getHost())
    var aURI   = String(url.getPath())

    var _r = this.postURLEncoded(aURL, aURI, "", af.fromObj2XML({ ChangeResourceRecordSetsRequest: { ChangeBatch: aChangeMap } }).replace("<ChangeResourceRecordSetsRequest", "<ChangeResourceRecordSetsRequest xmlns=\"https://route53.amazonaws.com/doc/2013-04-01/\""), "route53", aHost, "us-east-1", __, __, "text/xml")
    try {
        _r = af.fromXML2Obj(_r)
    } catch(e) {
        return _r
    }

    if (isDef(_r) && isDef(_r.error)) return _r

    return _r.ChangeResourceRecordSetsResponse
}

/**
 * <odoc>
 * <key>AWS.ROUTE53_setRecord(aIdentifier, aName, aType, aValue, aTTL) : Map</key>
 * Given a route53 hosted zone identified by aIdentifier will change the record aName with type aType with value aValue and ttl aTTL using ROUTE53_ChangeResourceRecordSet.
 * </odoc>
 */
AWS.prototype.ROUTE53_setRecord = function(aIdentifier, aName, aType, aValue, aTTL) {
   _$(aName, "aName").isString().$_()
   _$(aType, "aType").isString().$_()
   _$(aValue, "aValue").isString().$_()
   aTTL = _$(aTTL, "aTTL").isNumber().default(300)

   var _m = { Changes: [ { Change: { Action: "UPSERT", ResourceRecordSet: { Name: aName, Type: aType, TTL: aTTL, ResourceRecords: { ResourceRecord: { Value: aValue } } } } } ] }

   return this.ROUTE53_ChangeResourceRecordSet(aIdentifier, _m)
}

/**
 * <odoc>
 * <key>AWS.ROUTE53_ListResourceRecordSets(aIdentifier) : Array</key>
 * Retrives the record set information about a route53 hosted zone identified by aIdentifier.
 * </odoc>
 */
// https://docs.aws.amazon.com/Route53/latest/APIReference/API_ListResourceRecordSets.html
AWS.prototype.ROUTE53_ListResourceRecordSets = function(aIdentifier) {
    _$(aIdentifier, "aIdentifier").isString().$_()

    if (aIdentifier.startsWith("/hostedzone/")) aIdentifier = aIdentifier.replace("/hostedzone/", "")

    var aURL   = "https://route53.amazonaws.com/2013-04-01/hostedzone/" + aIdentifier + "/rrset/"
    var url    = new java.net.URL(aURL)
    var aHost  = String(url.getHost())
    var aURI   = String(url.getPath())

    var __r = [], _r = {}, params = {}
    do {
        var query = $rest().query(params)
        _r = this.getURLEncoded(aURL + (query ? "?" + query : ""), aURI, query, {}, "route53", aHost, "us-east-1", __)
        if (isMap(_r) && isDef(_r.error)) return _r
        if (isString(_r)) _r = af.fromXML2Obj(_r)
        if (isDef(_r.error)) return _r
        _r = _r.ListResourceRecordSetsResponse
        if (isMap(_r.ResourceRecordSets) && isDef(_r.ResourceRecordSets.ResourceRecordSet))
            __r = __r.concat(_r.ResourceRecordSets.ResourceRecordSet)
        params = { name: _r.NextRecordName, type: _r.NextRecordType }
        if (isDef(_r.NextRecordIdentifier)) params.identifier = _r.NextRecordIdentifier
    } while(String(_r.IsTruncated) == "true")

    // ListResourceRecordSetsResponse
    return __r
}

/**
 * <odoc>
 * <key>AWS.ROUTE53_GetHostedZone(aIdentifier) : Map</key>
 * Retrives the information about a route53 hosted zone identified by aIdentifier.
 * </odoc>
 */
AWS.prototype.ROUTE53_GetHostedZone = function(aIdentifier) {
    _$(aIdentifier, "aIdentifier").isString().$_()

    if (aIdentifier.startsWith("/hostedzone/")) aIdentifier = aIdentifier.replace("/hostedzone/", "")

    var aURL   = "https://route53.amazonaws.com/2013-04-01/hostedzone/" + aIdentifier
    var url    = new java.net.URL(aURL)
    var aHost  = String(url.getHost())
    var aURI   = String(url.getPath())

    var _r = this.getURLEncoded(aURL, aURI, "", {}, "route53", aHost, "us-east-1", __) 
    if (isDef(_r) && isDef(_r.error)) return _r

    return af.fromXML2Obj(_r)
}

// https://docs.aws.amazon.com/Route53/latest/APIReference/API_ListHostedZones.html
// Missing delegationsetid
/**
 * <odoc>
 * <key>AWS.ROUTE53_ListHostedZones() : Array</key>
 * Retrieves an array of hosted zones for the current AWS account.
 * </odoc>
 */
AWS.prototype.ROUTE53_ListHostedZones = function() {
    var aURL   = "https://route53.amazonaws.com/2013-04-01/hostedzone"
    var url    = new java.net.URL(aURL)
    var aHost  = String(url.getHost())
    var aURI   = String(url.getPath())

    var _r = [], __r = {}, params = {}
    do {
        var query = $rest().query(params)
        __r = this.getURLEncoded(aURL + (query ? "?" + query : ""), aURI, query, {}, "route53", aHost, "us-east-1", __)
        if (isString(__r)) __r = af.fromXML2Obj(__r)
        if (!isMap(__r) || !isDef(__r.ListHostedZonesResponse)) throw __r
        __r = __r.ListHostedZonesResponse
        if (isMap(__r.HostedZones) && isDef(__r.HostedZones.HostedZone))
            _r = _r.concat(__r.HostedZones.HostedZone)
        params = { marker: __r.NextMarker }
    } while(String(__r.IsTruncated) == "true")
    return _r
}