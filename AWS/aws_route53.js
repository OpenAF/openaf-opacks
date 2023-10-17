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

    var __r = [], _r = {}
    do {
        var aExtra = $rest().query({marker: __r.NextMarker})
        var _r = af.fromXML2Obj(aws.getURLEncoded(aURL + aExtra, aURI + aExtra, "", {}, "route53", aHost, "us-east-1", __))
        if (isDef(_r) && isDef(_r.error)) return _r; else _r = _r.ListResourceRecordSetsResponse
        __r = __r.concat(_r.ResourceRecordSets.ResourceRecordSet)
    } while(isDef(__r) && __r.IsTruncated)

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

    var _r = [], __r = {}
    do {
        var __r = af.fromXML2Obj( this.getURLEncoded(aURL + "/" + $rest().query({marker: __r.NextMarker}), aURI + "/" + $rest().query({marker: __r.NextMarker}), "", { }, "route53", aHost, "us-east-1", __) )
        if (isMap(__r) && isDef(__r.ListHostedZonesResponse)) 
            _r = _r.concat(__r.ListHostedZonesResponse.HostedZones.HostedZone)
        else
            throw __r
    } while(isDef(__r) && __r.IsTruncated)
    return _r
}