// Author: Nuno Aguiar
// RDS PI

loadLib("aws_core.js");

/**
 * <odoc>
 * <key>AWS.PI_GetDimensionKeyDetails(aRegion, aIdentifier, aGroupIdentifier) : Map</key>
 * Given aRegion, a data source aIdentifier (e.g. db-*) and a sql id as aGroupIdentifier will return the corresponding full SQL queries.
 * To obtain the aIdentifier do run AWS.RDS_DescribeDBInstances a find the corresponding DbiResourceId.
 * More details in https://docs.aws.amazon.com/performance-insights/latest/APIReference/API_GetDimensionKeyDetails.html.
 * </odoc>
 */
AWS.prototype.PI_GetDimensionKeyDetails = function(aRegion, aIdentifier, aGroupIdentifier) {
    aRegion    = _$(aRegion).isString().default(aws.region);
    var aURL   = "https://pi." + aRegion + ".amazonaws.com/";
    var url    = new java.net.URL(aURL);
    var aHost  = String(url.getHost());
    var aURI   = String(url.getPath());
    var params =  { 
        ServiceType        : "RDS", 
        Identifier         : aIdentifier, 
        Group              : "db.sql", 
        GroupIdentifier    : aGroupIdentifier, 
        RequestedDimensions: [ "statement" ]
    };
    return this.postURLEncoded(aURL, aURI, "", params, "pi", aHost, aRegion, { "x-amz-target": "PerformanceInsightsv20180227.GetDimensionKeyDetails" }, __ , "application/x-amz-json-1.1");
}

/**
 * <odoc>
 * <key>AWS.PI_GetResourceMetrics(aRegion, aIdentifier, aPeriod, aQueriesArray, aStartTime, aEndTime, aNextToken) : Map</key>
 * Given aRegion, a data source aIdentifier (e.g. db-*), aPeriod in seconds (valid values are 1, 60, 300, 3600 and 86400), aQueryArray and aStartTime and aEndTime will retrieve the corresponding metrics.
 * aQueries is an array of maps composed of a "Filter", "GroupBy" and a "Metric" (e.g. [{"Metric": "db.load.avg","GroupBy": { "Group": "db.sql", "Limit": 10 } }]). To obtain the aIdentifier do run AWS.RDS_DescribeDBInstances a find the corresponding DbiResourceId.
 * More details in https://docs.aws.amazon.com/performance-insights/latest/APIReference/API_GetResourceMetrics.html.
 * </odoc>
 */
AWS.prototype.PI_GetResourceMetrics = function(aRegion, aIdentifier, aPeriod, aQueries, aStartTime, aEndTime, aNextToken) {
    aRegion     = _$(aRegion).isString().default(this.region);
    aIdentifier = _$(aIdentifier, "aIdentifier").isString().$_();
    aPeriod     = _$(aPeriod, "aPeriod").isNumber().$_();
    aQueries    = _$(aQueries, "aQueries").isArray().$_();
    aStartTime  = _$(aStartTime, "aStartTime").isDate().$_();
    aEndTime    = _$(aEndTime, "aEndTime").isDate().$_();

    var aURL   = "https://pi." + aRegion + ".amazonaws.com/";
    var url    = new java.net.URL(aURL);
    var aHost  = String(url.getHost());
    var aURI   = String(url.getPath());
    var params =  {
        ServiceType    : "RDS",
        Identifier     : aIdentifier,
        PeriodInSeconds: aPeriod, 
        MetricQueries  : aQueries, 
        StartTime      : aStartTime.getTime() / 1000, 
        EndTime        : aEndTime.getTime() / 1000,
        NextToken      : aNextToken
    };
    return this.postURLEncoded(aURL, aURI, "", params, "pi", aHost, aRegion, { "x-amz-target": "PerformanceInsightsv20180227.GetResourceMetrics" }, __ , "application/x-amz-json-1.1");
}

/**
 * <odoc>
 * <key>AWS.PI_gettop10LoadAvg(aRegion, aIdentifier, aStartTime, aEndTime, aPeriod) : Map</key>
 * Given aRegion, a data source aIdentifier (e.g. db-*), aPeriod in seconds (valid values are 1, 60, 300, 3600 and 86400) and aStartTime and aEndtime will retrive the top 10 database
 * load average SQLs (including the full SQL statement) over the corresponding period of time. To obtain the aIdentifier do run AWS.RDS_DescribeDBInstances a find the corresponding DbiResourceId.
 * </odoc>
 */
AWS.prototype.PI_getTop10LoadAvg = function(aRegion, aIdentifier, aStartTime, aEndTime, aPeriod) {
    aPeriod = _$(aPeriod, "aPeriod").isNumber().default(3600);

    var res = this.PI_GetResourceMetrics(aRegion, aIdentifier, aPeriod, [
            {
                Metric : "db.load.avg",
                GroupBy: {
                    Group: "db.sql",
                    Limit: 10
                }
            }
        ],
        aStartTime,
        aEndTime
    );

    if (isArray(res.MetricList)) {
        res.MetricList.forEach(r => {
            if (isMap(r.Key) && isMap(r.Key.Dimensions)) {
                var res2 = this.PI_GetDimensionKeyDetails(aRegion, aIdentifier, r.Key.Dimensions["db.sql.id"]);
                if (isArray(res2.Dimensions) && isDef(res2.Dimensions[0].Value)) r.Key.Dimensions.FullSQL = res2.Dimensions[0].Value;
            }
        });
    }

    return res;
}