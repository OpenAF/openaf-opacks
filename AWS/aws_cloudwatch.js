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
 
    return res;
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
 
    return res;
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
 
    return res;
 };
 
 