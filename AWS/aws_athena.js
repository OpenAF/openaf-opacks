// Author: Nuno Aguiar
// Athena

loadLib("aws_core.js");

/**
 * <odoc>
 * <key>AWS.ATHENA_ListQueryExecutions(aRegion, aNextToken, aWorkGroup, aMaxResults) : Map</key>
 * List query executions.
 * </odoc>
 */
AWS.prototype.ATHENA_ListQueryExecutions = function(aRegion, aNextToken, aWorkGroup, aMaxResults) {
    aRegion     = _$(aRegion).isString().default(this.region);
    aNextToken  = _$(aNextToken).isString().default(__);
    aWorkGroup  = _$(aWorkGroup).isString().default(__);
    aMaxResults = _$(aMaxResults).isNumber().default(50);
 
    var res = this.post("athena", aRegion, __, "", {
       MaxResults: aMaxResults,
       NextToken : aNextToken,
       WorkGroup : aWorkGroup
    }, { "X-Amz-Target": "AmazonAthena.ListQueryExecutions" }, __, "application/x-amz-json-1.1");
 
    return res;
}; 

/**
 * <odoc>
 * <key>AWS.ATHENA_GetQueryExecution(aRegion, aQueryExecutionId) : Map</key>
 * Retrieves information about a previous query execution aQueryExecutionId
 * </odoc>
 */
 AWS.prototype.ATHENA_GetQueryExecution = function(aRegion, aQueryExecutionId) {
    aRegion            = _$(aRegion).isString().default(this.region);
    aQueryExecutionId  = _$(aQueryExecutionId).isString().$_();

    var res = this.post("athena", aRegion, __, "", {
       QueryExecutionId: aQueryExecutionId
    }, { "X-Amz-Target": "AmazonAthena.GetQueryExecution" }, __, "application/x-amz-json-1.1");
 
    return res;
}; 