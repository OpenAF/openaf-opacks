/**
 * <odoc>
 * <key>AWS.AWS(aAccessKey, aSecretKey)</key>
 * Creates an instance of AWS light simplified API access
 * </odoc>
 */
var AWS = function(aAccessKey, aSecretKey) {
   ow.loadFormat();
   ow.loadObj();
   this.accessKey = aAccessKey;
   this.secretKey = aSecretKey;
};

AWS.prototype.__HmacSHA256 = function(data, key) {
   var alg = "HmacSHA256";
   if (isString(key)) key = (new java.lang.String(key)).getBytes("UTF-8");
   var mac = javax.crypto.Mac.getInstance("HmacSHA256");
   mac.init(new javax.crypto.spec.SecretKeySpec(key, alg));
   return mac.doFinal(new java.lang.String(data).getBytes("UTF-8"));
};

AWS.prototype.__getSignatureKey = function(key, dateStamp, regionName, serviceName) {
   var kSecret = (new java.lang.String("AWS4" + key)).getBytes("UTF-8");
   var kDate = this.__HmacSHA256(dateStamp, kSecret);
   var kRegion = this.__HmacSHA256(regionName, kDate);
   var kService = this.__HmacSHA256(serviceName, kRegion);
   var kSigning = this.__HmacSHA256("aws4_request", kService);
   return kSigning;
};

AWS.prototype.__getSignedHeaders = function(key, dateStamp, regionName, serviceName) {
   return ow.format.string.toHex(this.__getSignatureKey(key, dateStamp, regionName, serviceName), "").toLowerCase();
};

AWS.prototype.__getRequest = function(aMethod, aURI, aService, aHost, aRegion, aRequestParams, aPayload, aAmzTarget, aDate, aContentType) {
   aPayload = _$(aPayload).isString().default("");
   aRequestParams = _$(aRequestParams).isString().default("");
   aURI = _$(aURI).isString().default("/");
   aMethod = aMethod.toUpperCase();
   aAmzTarget = _$(aAmzTarget).isString().default(void 0); // for dynamo (https://docs.aws.amazon.com/general/latest/gr/sigv4-signed-request-examples.html)
   aDate = _$(aDate).isDate().default(new Date());

   // Part 1
   var request = {};
   var amzdate = ow.format.fromDate(aDate, "yyyyMMdd'T'HHmmss'Z'", "UTC");
   var datestamp = ow.format.fromDate(aDate, "yyyyMMdd", "UTC");
   //var content_type = 'application/x-amz-json-1.0';
   var content_type = _$(aContentType).isString().default(void 0);
   
   var can_uri = aURI;
   var can_querystring = aRequestParams; // must be sorted by name
   //var can_headers = (aMethod == "GET" ? "content-type:" + content_type + "\n" + "host:" + aHost + "\n" + "x-amz-date:" + amzdate + "\n" + (isDef(aAmzTarget) ? "x-amz-target:" + aAmzTarget + "\n" : "") : "host:" + aHost + "\n" + "x-amz-date:" + amzdate + "\n");
   var can_headers = (isDef(content_type) ? "content-type:" + content_type + "\n" : "") + "host:" + aHost + "\n" + "x-amz-date:" + amzdate + "\n" + (isDef(aAmzTarget) ? "x-amz-target:" + aAmzTarget + "\n" : "");

   var signed_headers = (isDef(content_type) ? "content-type;" : "") + "host;x-amz-date" + (isDef(aAmzTarget) ? ";x-amz-target": "");

   var payload_hash = sha256(aPayload);

   var can_Request = aMethod + "\n" + can_uri + "\n" + can_querystring + "\n" + can_headers + "\n" + signed_headers + "\n" + payload_hash;

   // Part 2
   var credential_scope = datestamp + "/" + aRegion + "/" + aService + "/" + "aws4_request";
   var string_to_sign = "AWS4-HMAC-SHA256" + "\n" + amzdate + "\n" + credential_scope + "\n" + sha256(can_Request);

   // Part 3
   var signing_key = this.__getSignatureKey(this.secretKey, datestamp, aRegion, aService);
   var signature = ow.format.string.toHex(this.__HmacSHA256(string_to_sign, signing_key), "").toLowerCase();

   // Part 4
   var authorization_header = "AWS4-HMAC-SHA256" + " " + "Credential=" + this.accessKey + "/" + credential_scope + ", " + "SignedHeaders=" + signed_headers + ", " + "Signature=" + signature;

   if (aMethod == "GET") {
      request = {
         "Content-Type": void 0,
         "X-Amz-Date": amzdate,
         "X-Amz-Target": aAmzTarget,
         "Authorization": authorization_header
      };
   } else {
      request = {
         "x-amz-date": amzdate,
         "Authorization": authorization_header
      };
   }
   
   return request;
};

/**
 * <odoc>
 * <key>AWS.postURLEncoded(aURL, aURI, aParams, aArgs, aService, aHost, aRegion, aAmzTarget, aDate, aContentType) : Object</key>
 * Tries to send a POST http request given aURL, aURI, ordered aParams, an object aArgs, an AWS aService, aHost, an AWS aRegion, an optional aAmzTarget, an optional aDate and an optional aContentType (defaults to application/x-www-form-urlencoded).
 * Returns the object returned by the API.
 * </odoc>
 */
AWS.prototype.postURLEncoded = function(aURL, aURI, aParams, aArgs, aService, aHost, aRegion, aAmzTarget, aDate, aContentType) {
   var params = _$(aParams).isString().default(""), payload = "";
   aContentType = _$(aContentType).isString().default("application/x-www-form-urlencoded");

   if (aContentType == "application/x-www-form-urlencoded") 
      payload = ow.obj.rest.writeQuery(aArgs);
   else
      payload = stringify(aArgs, void 0, "");
   var extra = this.__getRequest("post", aURI, aService, aHost, aRegion, params, payload, aAmzTarget, aDate, aContentType);

   return $rest({ 
      urlEncode: (aContentType == "application/x-www-form-urlencoded"), 
      requestHeaders: extra   
   }).post(aURL, aArgs);
};

/**
 * SQS =========================
 */

// <?xml version="1.0"?><SendMessageResponse xmlns="http://queue.amazonaws.com/doc/2012-11-05/"><SendMessageResult><MessageId>eea95448-6967-4bd5-8806-e7436fb421a1</MessageId><MD5OfMessageBody>1a1220a98e629a549411806d665f3887</MD5OfMessageBody><SequenceNumber>18846560619709167616</SequenceNumber></SendMessageResult><ResponseMetadata><RequestId>cf004e2d-1d00-5949-aa8f-1bbdf3964f18</RequestId></ResponseMetadata></SendMessageResponse>
/**
 * <odoc>
 * <key>AWS.SQS_Send(aQueueEndPoint, aRegion, aMessageBody, aMessageGroupId, aMessageDeduplicationId) : Object</key>
 * Tries to send aMessageBody with aMessageGroupId and aMessageDeduplicationId to aQueueEndPoint on a specific aRegion. Returns
 * the result from calling the API.
 * </odoc>
 */
AWS.prototype.SQS_Send = function(aEndPoint, aRegion, aMessageBody, aMessageGroupdId, aMessageDeduplicationId) {
   var aURL = "https://sqs." + aRegion + ".amazonaws.com/" + aEndPoint;
   var url = new java.net.URL(aURL);
   var aURI = String(url.getPath());
   var aHost = String(urll.getHos());

   return this.postURLEncoded(aURL, aURI, "", { 
      Action: "SendMessage", 
      MessageBody: aMessageBody, 
      MessageGroupId: aMessageGroupdId, 
      MessageDeduplicationId: aMessageDeduplicationId, 
      Version: "2012-11-05" 
   }, "sqs", aHost, aRegion);
};

/**
 * Lambda =========================
 */

/** 
 * <odoc>
 * <key>AWS.LAMBDA_Invoke(aRegion, aFunctionName, aFunctionParams, aVersion)</key>
 * Tries to invoke a AWS Lambda aFunctionName with the object aFunctionParams, optionally with aVersion, on aRegion. Returns
 * the AWS Function invocation return object.
 * </odoc>
 */
AWS.prototype.LAMBDA_Invoke = function(aRegion, aFunctionName, aFunctionParams, aVersion) {
   var aURL = "https://lambda." + aRegion + ".amazonaws.com/2015-03-31/functions/" + aFunctionName + "/invocations";
   var url = new java.net.URL(aURL);
   var aHost = String(url.getHost());
   var aURI = String(url.getPath());
   var params = {};

   if (isDef(aVersion)) params.Qualifier = aVersion;
   aURL += "?" + ow.obj.rest.writeQuery(params);

   return this.postURLEncoded(aURL, aURI, ow.obj.rest.writeQuery(params), aFunctionParams, "lambda", aHost, aRegion, void 0, void 0, "application/json");
};