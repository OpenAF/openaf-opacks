// Author: Nuno Aguiar
// Lambda

loadLib("aws_core.js");

/**
 * Lambda =========================
 */

/** 
 * <odoc>
 * <key>AWS.LAMBDA_Invoke(aRegion, aFunctionName, aFunctionParams, aVersion, aInvocationType, aLogType) : Object</key>
 * Tries to invoke a AWS Lambda aFunctionName with the object aFunctionParams, optionally with aVersion and/or aInvocationType and/or aLogType, on aRegion. Returns
 * the AWS Function invocation return object.
 * See more in: https://docs.aws.amazon.com/lambda/latest/dg/API_Invoke.html
 * </odoc>
 */
AWS.prototype.LAMBDA_Invoke = function(aRegion, aFunctionName, aFunctionParams, aVersion, aInvocationType, aLogType) {
    aRegion = _$(aRegion).isString().default(this.region);
    var aURL = "https://lambda." + aRegion + ".amazonaws.com/2015-03-31/functions/" + aFunctionName + "/invocations";
    var url = new java.net.URL(aURL);
    var aHost = String(url.getHost());
    var aURI = String(url.getPath());
    var params = {}, amzFields = {};
 
    if (isDef(aVersion)) params.Qualifier = aVersion;
    if (isDef(aInvocationType)) amzFields["X-Amz-Invocation-Type"] = aInvocationType;
    if (isDef(aLogType)) amzFields["X-Amz-Log-Type"] = aLogType;
    aURL += "?" + ow.obj.rest.writeQuery(params);
 
    return this.postURLEncoded(aURL, aURI, ow.obj.rest.writeQuery(params), aFunctionParams, "lambda", aHost, aRegion, amzFields, void 0, "application/json");
 };
 
 /**
  * <odoc>
  * <key>AWS.LAMBDA_InvokeAsync(aRegion, aFunctionName, aFunctionParams, aVersion, aLogType)</key>
  * Tries to asynchronously invoke a AWS Lambda aFunctionName with the object aFunctionParams, optionally with aVersion and/or aInvocationType and/or aLogType, on aRegion.
  * See more in: https://docs.aws.amazon.com/lambda/latest/dg/API_Invoke.html
  * </odoc>
  */
 AWS.prototype.LAMBDA_InvokeAsync = function(aRegion, aFunctionName, aFunctionParams, aVersion, aLogType) {
    aRegion = _$(aRegion).isString().default(this.region);
    return this.LAMBDA_Invoke(aRegion, aFunctionName, aFunctionParams, aVersion, "Event", aLogType);
 };
 
 /**
  * <odoc>
  * <key>AWS.LAMBDA_InvokeDryRun(aRegion, aFunctionName, aFunctionParams, aVersion, aLogType) : Object</key>
  * Tries to invoke, as a dry run, a AWS Lambda aFunctionName with the object aFunctionParams, optionally with aVersion and/or aInvocationType and/or aLogType, on aRegion. Returns
  * the AWS Function invocation validation return object.
  * See more in: https://docs.aws.amazon.com/lambda/latest/dg/API_Invoke.html
  * </odoc>
  */
 AWS.prototype.LAMBDA_InvokeDryRun = function(aRegion, aFunctionName, aFunctionParams, aVersion, aLogType) {
    aRegion = _$(aRegion).isString().default(this.region);
    return this.LAMBDA_Invoke(aRegion, aFunctionName, aFunctionParams, aVersion, "DryRun", aLogType);
 };
 