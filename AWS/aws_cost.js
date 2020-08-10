// Author: Nuno Aguiar
// Cost Explorer

loadLib("aws_core.js");

/**
 * <odoc>
 * <key>AWS.PRICE_GetCostAndUsage(aRegion, aStartDate, aEndDate, granularity, aGroupBy, aFilter, aMetrics) : Map</key>
 * Makes "Cost Explorer" queries given aRegion, aStartDate &amp; aEndDate (e.g. 1234-12-31), granularity (e.g. DAILY, MONTHLY, HOURLY), 
 * aGroupBy (e.g. [{ Type: "DIMENSION", Key: "LINKED_ACCOUNT" }]), aFilter (e.g. { Dimensions: { Key: "SERVICE", Values: [ "Amazon Simple Storage Service"]}}) 
 * and aMetrics (e.g. ["BlendedCost", "UnblendedCost", "UsageQuantity"]).\
 * \
 * Refer to: https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_GetCostAndUsage.html\
 * \
 * </odoc>
 */
AWS.prototype.PRICE_GetCostAndUsage = function(aRegion, aStartDate, aEndDate, granularity, aGroupBy, aFilter, aMetrics) {
    aRegion = _$(aRegion).isString().default("us-east-1");
    var aURL = "https://ce." + aRegion + ".amazonaws.com/";

    aStartDate = _$(aStartDate, "startdate").isString().$_();
    aEndDate = _$(aEndDate, "enddate").isString().$_();
    aMetrics = _$(aMetrics, "metrics").isArray().default(["BlendedCost", "UnblendedCost", "UsageQuantity"]);
    aGroupBy = _$(aGroupBy, "groupby").isArray().default(void 0);
    aFilter  = _$(aFilter, "filter").isMap().default(void 0);
    granularity = _$(granularity, "granularity").isString().default("MONTHLY");
    
    var params = { 
       TimePeriod : {
          Start: aStartDate,
          End  : aEndDate
       },
       Granularity: granularity,
       Filter     : aFilter,
       GroupBy    : aGroupBy,
       Metrics    : aMetrics
    };

 
    var url = new java.net.URL(aURL);
    var aHost = String(url.getHost());
    var aURI = String(url.getPath());

    var res = this.postURLEncoded(aURL, aURI, "", params, "ce", aHost, aRegion, { 
      "X-Amz-Target": "AWSInsightsIndexService.GetCostAndUsage"
    }, void 0, "application/x-amz-json-1.1");

    return res;
 };