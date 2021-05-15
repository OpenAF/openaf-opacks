// Author: Nuno Aguiar
// CloudWatch

loadLib("aws_core.js");

/**
 * <odoc>
 * <key>AWS.CLOUDWATCH_LOGS_DescribeLogGroups(aRegion, aLimit, aPrefix, nextToken) : Map</key>
 * Gets a list of CloudWatch log groups from aRegion, given an optional aLimit, aPrefix and a nextToken.
 * </odoc>
 */
AWS.prototype.CLOUDWATCH_LOGS_DescribeLogGroups = function(aRegion, aLimit, aPrefix, nextToken) {
    aRegion = _$(aRegion).isString().default(this.region);
    aLimit = _$(aLimit).isNumber().default(void 0);
    aPrefix = _$(aPrefix).isString().default(void 0);
    nextToken = _$(nextToken).isString().default(void 0);
 
    var aURL = "https://logs." + aRegion + ".amazonaws.com/";
    var url = new java.net.URL(aURL);
    var aHost = String(url.getHost());
    var aURI = String(url.getPath());
 
    var res = this.postURLEncoded(aURL, aURI, "", {
       limit: aLimit,
       logGroupNamePrefix: aPrefix,
       nextToken: nextToken
    }, "logs", aHost, aRegion, {
       "X-Amz-Target": "Logs_20140328.DescribeLogGroups"
    }, void 0, "application/x-amz-json-1.1");
 
    if (isMap(res))
      return af.fromXML2Obj(res.error.response);
    else
      return af.fromXML2Obj(res);
}; 

/**
 * <odoc>
 * <key>AWS.CLOUDWATCH_GetMetricStatistics(aRegion, aNamespace, aMetricName, aDimensions, aStatistics, aExtendedStatistics, aStartTime, aEndTime, aPeriod, aUnit) : Map</key>
 * Get the CloudWatch metric using the following parameters:\
 * \
 *    aRegion            : the corresponding AWS region 
 *    aNamespace         : the metric namespace (e.g. "AWS/EC2")\
 *    aMetricName        : the metric to gather (e.g. "CPUUtilization")\ 
 *    aDimensions        : a map of dimensions (e.g. { Name: "InstanceId", Value: "i-123456"})\
 *    aStatistics        : array (e.g. "Maximum")\
 *    aExtendedStatistics: array of extended statistics (e.g. "p90")\ 
 *    aStartTime         : a start time\
 *    aEndTime           : a end time\
 *    aPeriod            : in seconds\
 *    Unit               : [Seconds | Microseconds | Milliseconds | Bytes | Kilobytes | Megabytes | Gigabytes | Terabytes | Bits | Kilobits | Megabits | Gigabits | Terabits | Percent | Count | Bytes/Second | Kilobytes/Second | Megabytes/Second | Gigabytes/Second | Terabytes/Second | Bits/Second | Kilobits/Second | Megabits/Second | Gigabits/Second | Terabits/Second | Count/Second | None]\
 * \
 * </odoc>
 */
AWS.prototype.CLOUDWATCH_GetMetricStatistics = function(aRegion, aNamespace, aMetricName, aDimensions, aStatistics, aExtendedStatistics, aStartTime, aEndTime, aPeriod, aUnit) {
   aRegion = _$(aRegion, "region").isString().default(this.region);
   aNamespace = _$(aNamespace, "namespace").isString().default("");
   aMetricName = _$(aMetricName, "metricname").isString().$_();
   aPeriod = _$(aPeriod, "period").isNumber().$_();
   aDimensions = _$(aDimensions, "dimensions").isArray().default(__);
   aStatistics = _$(aStatistics, "statistics").isArray().default(__);
   aExtendedStatistics = _$(aExtendedStatistics, "extendedstatistics").isArray().default(__);
   aStartTime = _$(aStartTime, "StartTime").isDate().$_();
   aEndTime = _$(aEndTime, "EndTime").isDate().$_();
   aUnit = _$(aUnit, "unit").isString().default(__);

   var aURL = "https://monitoring." + aRegion + ".amazonaws.com/";
   var url = new java.net.URL(aURL);
   var aHost = String(url.getHost());
   var aURI = String(url.getPath());

   var data = merge(this.flattenMap2Params({ Statistics: aStatistics }), merge(this.flattenMap2Params({ ExtendedStatistics: aExtendedStatistics }), merge(this.convertArray2Attrs("Dimensions.member", aDimensions), {
      Action    : "GetMetricStatistics",
      Version   : "2010-08-01",
      Namespace : aNamespace,
      EndTime   : aEndTime.toISOString(),
      MetricName: aMetricName,
      Period    : aPeriod,
      StartTime : aStartTime.toISOString()
   }))); 
   data.Unit = aUnit;
   var res = this.postURLEncoded(aURL, aURI, "", data, "monitoring", aHost, aRegion);

   if (isMap(res))
      return af.fromXML2Obj(res.error.response);
   else
      return af.fromXML2Obj(res).GetMetricStatisticsResponse;
};

 /**
  * <odoc>
  * <key>AWS.CLOUDWATCH_PutMetricData(aRegion, aNamespace, aMetricDataArray) : Map</key>
  * Tries to send aMetricDataArray of maps (up to 10 elements) under custom aNamespace in aRegion. 
  * On the aMetricDataArray each map can contain:\
  * \
  *    MetricName: String\
  *    Timestamp : NumberOfMilliseconds in UTC\
  *    Unit      : [Seconds | Microseconds | Milliseconds | Bytes | Kilobytes | Megabytes | Gigabytes | Terabytes | Bits | Kilobits | Megabits | Gigabits | Terabits | Percent | Count | Bytes/Second | Kilobytes/Second | Megabytes/Second | Gigabytes/Second | Terabytes/Second | Bits/Second | Kilobits/Second | Megabits/Second | Gigabits/Second | Terabits/Second | Count/Second | None]\
  *    Value     : aValue\
  * \
  * Check more in https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_MetricDatum.html.
  * </odoc>
  */
 AWS.prototype.CLOUDWATCH_PutMetricData = function(aRegion, aNamespace, aMetricDat) {
   aRegion = _$(aRegion).isString().default(this.region);
   aNamespace = _$(aNamespace).isString().default("");
   aMetricDat = _$(aMetricDat).isArray().default([]);

   var aURL = "https://monitoring." + aRegion + ".amazonaws.com/";
   var url = new java.net.URL(aURL);
   var aHost = String(url.getHost());
   var aURI = String(url.getPath());

   var res = this.postURLEncoded(aURL, aURI, "", merge(this.convertArray2Attrs("MetricData.member", aMetricDat), {
      Action   : "PutMetricData",
      Version  : "2010-08-01",
      Namespace: aNamespace
   }), "monitoring", aHost, aRegion);

   if (isMap(res))
      return af.fromXML2Obj(res.error.response);
   else
      return af.fromXML2Obj(res);
 };

 /**
  * <odoc>
  * <key>AWS.CLOUDWATCH_LOGS_DescribeLogStreams(aRegion, aGroupName, aLimit, aPrefix, aDescending, aOrderBy, nextToken) : Map</key>
  * Gets a list of CloudWatch log streams on a log aGroupName, from aRegion, given an optional aLimit, aOrderbY, aPrefix and a nextToken.
  * </odoc>
  */
 AWS.prototype.CLOUDWATCH_LOGS_DescribeLogStreams = function(aRegion, aGroupName, aLimit, aPrefix, aDescending, aOrderBy, nextToken) {
    aRegion = _$(aRegion).isString().default(this.region);
    aLimit = _$(aLimit).isNumber().default(void 0);
    aPrefix = _$(aPrefix).isString().default(void 0);
    nextToken = _$(nextToken).isString().default(void 0);
    aOrderBy = _$(aOrderBy).isString().default(void 0);
 
    var aURL = "https://logs." + aRegion + ".amazonaws.com/";
    var url = new java.net.URL(aURL);
    var aHost = String(url.getHost());
    var aURI = String(url.getPath());
 
    var res = this.postURLEncoded(aURL, aURI, "", {
       descending         : aDescending,
       limit              : aLimit,
       logGroupName       : aGroupName,
       logStreamNamePrefix: aPrefix,
       orderBy            : aOrderBy,
       nextToken          : nextToken
    }, "logs", aHost, aRegion, {
       "X-Amz-Target": "Logs_20140328.DescribeLogStreams"
    }, void 0, "application/x-amz-json-1.1");
 
    if (isMap(res))
      return af.fromXML2Obj(res.error.response);
    else
      return af.fromXML2Obj(res);
 };
 
 /**
  * <odoc>
  * <key>AWS.CLOUDWATCH_LOGS_GetLogEvents(aRegion, aGroupName, aStreamName, aLimit, startFromHead, startTime, endTime, nextToken) : Map</key>
  * Gets a list of CloudWatch log streams events on a log aGroupName and aStreamName, from aRegion, given an optional aLimit, aOrderbY, aPrefix and a nextToken.
  * </odoc>
  */
 AWS.prototype.CLOUDWATCH_LOGS_GetLogEvents = function(aRegion, aGroupName, aStreamName, aLimit, startFromHead, startTime, endTime, nextToken) {
    aRegion = _$(aRegion).isString().default(this.region);
    _$(aGroupName).isString().$_("Please provide a group name.");
    _$(aStreamName).isString().$_("Please provide a stream name.");
    aLimit = _$(aLimit).isNumber().default(void 0);
    startFromHead = _$(startFromHead).isString().default(void 0);
    nextToken = _$(nextToken).isString().default(void 0);
    startTime = _$(startTime).isString().default(void 0);
    endTime = _$(endTime).isString().default(void 0);
 
    var aURL = "https://logs." + aRegion + ".amazonaws.com/";
    var url = new java.net.URL(aURL);
    var aHost = String(url.getHost());
    var aURI = String(url.getPath());
 
    var res = this.postURLEncoded(aURL, aURI, "", {
       endTime      : endTime,
       limit        : aLimit,
       logGroupName : aGroupName,
       logStreamName: aStreamName,
       nextToken    : nextToken,
       startFromHead: startFromHead,
       startTime    : startTime
    }, "logs", aHost, aRegion, {
       "X-Amz-Target": "Logs_20140328.GetLogEvents"
    }, void 0, "application/x-amz-json-1.1");
 
    if (isMap(res))
      return af.fromXML2Obj(res.error.response);
    else
      return af.fromXML2Obj(res);
 };
 
 