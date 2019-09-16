// Author: Nuno Aguiar

/**
 * <odoc>
 * <key>AWS.AWS(aAccessKey, aSecretKey, aSessionToken)</key>
 * Creates an instance of AWS light simplified API access. The accessKey, secretKey and temporary sessionToken will be 
 * taken from environment variables or provided directly.
 * </odoc>
 */
var AWS = function(aAccessKey, aSecretKey, aSessionToken) {
   ow.loadFormat();
   ow.loadObj();
   this.accessKey = aAccessKey;
   this.secretKey = aSecretKey;
   this.stoken    = aSessionToken;

   if (isUnDef(this.accessKey) && getEnv("AWS_ACCESS_KEY_ID") != "null") this.accessKey = String(getEnv("AWS_ACCESS_KEY_ID")); 
   if (isUnDef(this.secretKey) && getEnv("AWS_SECRET_ACCESS_KEY") != "null") this.secretKey = String(getEnv("AWS_SECRET_ACCESS_KEY"));
   if (isUnDef(this.stoken) && getEnv("AWS_SESSION_TOKEN") != "null") this.stoken = String(getEnv("AWS_SESSION_TOKEN"));

   this.region = getEnv("AWS_DEFAULT_REGION");
};

AWS.prototype.convertArray2Attrs = function(aParameter, anArray) {
   var res = {};
   for(var ii in anArray) {
      res[aParameter + "." + (Number(ii) + 1) + ".Id"] = ii;
      for(var jj in anArray[ii]) {
         if (isArray(anArray[ii][jj])) {
            res = merge(res, this.convertArray2Attrs(aParameter + "."+ (Number(ii) + 1) + "." + jj, anArray[ii][jj]));
         } else {
            res[aParameter + "."+ (Number(ii) + 1) + "." + jj] = anArray[ii][jj];
         }
      }
   }
   return res;
};

AWS.prototype.flattenMap2Params = function(aMap) {
   var res = {};
   traverse(aMap, (aK, aV, aP, aO) => {
      if (!isMap(aV) && !isArray(aV)) {
         if (isNumber(aK)) {
            res[aP.substr(1, aP.length) + ".Id." + (Number(aK) +1) ] = aV;
         } else {
            var mts = aP.match(/\[(\d+)\]/);
            if (mts) {
               res[aP.replace(/^\./, "").replace(/\[(\d+)\]/g, (r) => { return ".Id." + (Number(r.substr(1, r.length -2)) +1); }) + "." + aK] = aV;
            } else {
               res[(aP != "" ? aP.substr(1, aP.length) + "." : "") + aK] = aV; 
            }
         }
      }
   });

   return res;
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

AWS.prototype.__getRequest = function(aMethod, aURI, aService, aHost, aRegion, aRequestParams, aPayload, aAmzFields, aDate, aContentType) {
   aPayload = _$(aPayload).isString().default("");
   aRequestParams = _$(aRequestParams).isString().default("");
   aURI = _$(aURI).isString().default("/");
   aMethod = aMethod.toUpperCase();
   // for dynamo (https://docs.aws.amazon.com/general/latest/gr/sigv4-signed-request-examples.html)
   aAmzFields = _$(aAmzFields).isMap().default({ });
   if (isDef(this.stoken)) aAmzFields["X-Amz-Security-Token"] = this.stoken;
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
   var can_headers = (isDef(content_type) ? "content-type:" + content_type + "\n" : "") + "host:" + aHost + "\n" + "x-amz-date:" + amzdate + "\n";

   var amzFieldsHeaders = Object.keys(aAmzFields), amzHeaders = [];
   for (var amzFieldI in amzFieldsHeaders) {
      can_headers += amzFieldsHeaders[amzFieldI].toLowerCase() + ":" + aAmzFields[amzFieldsHeaders[amzFieldI]] + "\n";
      request[amzFieldsHeaders[amzFieldI]] = aAmzFields[amzFieldsHeaders[amzFieldI]];
      amzHeaders.push(amzFieldsHeaders[amzFieldI].toLowerCase());
   } 

   var signed_headers = (isDef(content_type) ? "content-type;" : "") + "host;x-amz-date" + (amzHeaders.length > 0 ? ";" + amzHeaders.join(";") : "");

   var payload_hash = sha256(aPayload);

   var can_Request = aMethod + "\n" + can_uri + "\n" + can_querystring + "\n" + can_headers + "\n" + signed_headers + "\n" + payload_hash;

   // Part 2
   var credential_scope = datestamp + "/" + aRegion + "/" + aService + "/" + "aws4_request";
   var string_to_sign = "AWS4-HMAC-SHA256" + "\n" + amzdate + "\n" + credential_scope + "\n" + sha256(can_Request);

   // Part 3
   var signing_key = this.__getSignatureKey(Packages.openaf.AFCmdBase.afc.dIP(this.secretKey), datestamp, aRegion, aService);
   var signature = ow.format.string.toHex(this.__HmacSHA256(string_to_sign, signing_key), "").toLowerCase();

   // Part 4
   var authorization_header = "AWS4-HMAC-SHA256" + " " + "Credential=" + Packages.openaf.AFCmdBase.afc.dIP(this.accessKey) + "/" + credential_scope + ", " + "SignedHeaders=" + signed_headers + ", " + "Signature=" + signature;

   if (aMethod == "GET") {
      request = merge(request, {
         "Content-Type": (isDef(aContentType) ? aContentType : void 0),
         "X-Amz-Date": amzdate,
         "Authorization": authorization_header
      });
   } else {
      request = merge(request, {
         "x-amz-date": amzdate,
         "Authorization": authorization_header
      });
   }
   
   return request;
};

/**
 * <odoc>
 * <key>AWS.postURLEncoded(aURL, aURI, aParams, aArgs, aService, aHost, aRegion, aAmzFields, aDate, aContentType) : Object</key>
 * Tries to send a POST http request given aURL, aURI, ordered aParams, an object aArgs, an AWS aService, aHost, an AWS aRegion, an optional aAmzFields, an optional aDate and an optional aContentType (defaults to application/x-www-form-urlencoded).
 * Returns the object returned by the API.
 * </odoc>
 */
AWS.prototype.postURLEncoded = function(aURL, aURI, aParams, aArgs, aService, aHost, aRegion, aAmzFields, aDate, aContentType) {
   var params = _$(aParams).isString().default(""), payload = "";
   aContentType = _$(aContentType).isString().default("application/x-www-form-urlencoded");

   if (aContentType == "application/x-www-form-urlencoded") 
      payload = ow.obj.rest.writeQuery(aArgs);
   else
      payload = stringify(aArgs, void 0, "");
   var extra = this.__getRequest("post", aURI, aService, aHost, aRegion, params, payload, aAmzFields, aDate, aContentType);

   return $rest({ 
      urlEncode: (aContentType == "application/x-www-form-urlencoded"), 
      requestHeaders: extra   
   }).post(aURL, aArgs);
};

AWS.prototype.restPreActionAWSSign4 = function(aRegion, aService, aAmzFields, aDate, aContentType) {
   var parent = this;
   return function(aOps) {
      aOps.reqHeaders = _$(aOps.reqHeaders).default({});
      aVerb = aOps.aVerb.toLowerCase();

      if (aVerb == "post" || aVerb == "put" || aVerb == "patch") {
         var url = new java.net.URL(aOps.aBaseURL);
         var aHost = String(url.getHost());
         var aUri = String(url.getPath());
         var params = String(url.getQuery());

         if (params != "null" && Object.keys(aOps.aIdxMap).length > 0) params = params + "&" + $rest().query(aOps.aIdxMap);
         if (params == "null") params = $rest().query(aOps.aIdxMap);
         if (params == "" && aOps.aBaseURL.endsWith("?")) aOps.aBaseURL = aOps.aBaseURL.substring(0, aOps.aBaseURL.length -1);

         aContentType = _$(aContentType).isString().default("application/x-www-form-urlencoded");
         var aPayload = (aContentType == "application/x-www-form-urlencoded" ? $rest().query(aOps.aDataRowMap) : stringify(aOps.aDataRowMap, void 0, ""));
         aPayload = _$(aPayload).default("");       
         aOps.reqHeaders = merge(aOps.reqHeaders, 
            parent.__getRequest(aVerb, aUri, aService, aHost, aRegion, params, aPayload, aAmzFields, aDate, aContentType));        
      } else {
         var url = new java.net.URL(aOps.aBaseURL);
         var aHost = String(url.getHost());
         var aUri = String(url.getPath());
         var params = String(url.getQuery());

         if (params != "null" && Object.keys(aOps.aIdxMap).length > 0) params = params + "&" + $rest().query(aOps.aIdxMap);
         if (params == "null") params = $rest().query(aOps.aIdxMap);
         
         aOps.reqHeaders = merge(aOps.reqHeaders, 
            parent.__getRequest(aVerb, aUri, aService, aHost, aRegion, params, "", aAmzFields, aDate, (aVerb == "delete" ? void 0 : aContentType)));
      }      

      return aOps;
   };
};

/**
 * <odoc>
 * <key>AWS.getURLEncoded(aURL, aURI, aParams, aArgs, aService, aHost, aRegion, aAmzFields, aDate, aContentType) : Object</key>
 * Tries to send a POST http request given aURL, aURI, ordered aParams, an object aArgs, an AWS aService, aHost, an AWS aRegion, an optional aAmzFields, an optional aDate and an optional aContentType (defaults to application/x-www-form-urlencoded).
 * Returns the object returned by the API.
 * </odoc>
 */
AWS.prototype.getURLEncoded = function(aURL, aURI, aParams, aArgs, aService, aHost, aRegion, aAmzFields, aDate, aContentType) {
   var params = _$(aParams).isString().default("");

   var extra = this.__getRequest("get", aURI, aService, aHost, aRegion, params, "", aAmzFields, aDate, aContentType);

   return $rest({ 
      urlEncode: (aContentType == "application/x-www-form-urlencoded"), 
      requestHeaders: extra
   }).get(aURL, aArgs);
};

/**
 * SQS =========================
 */

/**
 * <odoc>
 * <key>AWS.SQS_Send(aQueueEndPoint, aRegion, aMessageBody, aMessageGroupId, aMessageDeduplicationId) : Object</key>
 * Tries to send aMessageBody with aMessageGroupId and aMessageDeduplicationId to aQueueEndPoint on a specific aRegion. Returns
 * the result from calling the API. Optionally: aMessageBody can be a map with groupId, deduplicationId and body or an array 
 * of these maps up to 10 elements.
 * </odoc>
 */
AWS.prototype.SQS_Send = function(aEndPoint, aRegion, aMessageBody, aMessageGroupdId, aMessageDeduplicationId) {
   aRegion = _$(aRegion).isString().default(this.region);
   var aURL = "https://sqs." + aRegion + ".amazonaws.com/" + aEndPoint.replace(/^\/+/, "").replace(/\/+$/, "");
   var url = new java.net.URL(aURL);
   var aURI = String(url.getPath());
   var aHost = String(url.getHost());
   var res;

   if (isArray(aMessageBody)) {
      if (aMessageBody.length > 10) throw "Can't send more than 10 messages at a time due to AWS restrictions.";
      var msg = {
         Action: "SendMessageBatch",
         Version: "2012-11-05"
      };
      msg = merge(msg, this.convertArray2Attrs("SendMessageBatchRequestEntry", aMessageBody));
      res = this.postURLEncoded(aURL, aURI, "", msg, "sqs", aHost, aRegion);
   } else {
      if (isMap(aMessageBody)) {
         aMessageGroupId = aMessageBody.groupId;
         aMessageDeduplicationId = aMessageBody.deduplicationId;
         aMessageBody = aMessageBody.body;
      }
      res = this.postURLEncoded(aURL, aURI, "", { 
         Action: "SendMessage", 
         MessageBody: aMessageBody, 
         MessageDeduplicationId: (aEndPoint.endsWith(".fifo") ? aMessageDeduplicationId : void 0), 
         MessageGroupId: (aEndPoint.endsWith(".fifo") ? aMessageGroupdId : void 0), 
         Version: "2012-11-05" 
      }, "sqs", aHost, aRegion);
   }

   if (isString(res)) res = af.fromXML2Obj(res);
   return res;
};

/**
 * <odoc>
 * <key>AWS.SQS_Receive(aQueueEndPoint, aRegion, aVisibilityTimeout, aWaitTimeSeconds) : Object</key>
 * Tries to send receive a message from the aQueueEndPoint on region aRegion given aVisibilityTimeout in seconds. If a message is not immediatelly available it will wait
 * for aWaitTimeSeconds. On FIFO queues, after receiving the message you should delete it after successfully processing it within the visibility timeout period.
 * </odoc>
 */
AWS.prototype.SQS_Receive = function(aEndPoint, aRegion, aVisibilityTimeout, aWaitTimeSeconds) {
   aRegion = _$(aRegion).isString().default(this.region);
   var aURL = "https://sqs." + aRegion + ".amazonaws.com/" + aEndPoint.replace(/^\//, "");
   var url = new java.net.URL(aURL);
   var aURI = String(url.getPath());
   var aHost = String(url.getHost());

   var res = this.postURLEncoded(aURL, aURI, "", { 
      Action: "ReceiveMessage", 
      QueueUrl: aURL,
      Version: "2012-11-05",
      VisibilityTimeout: aVisibilityTimeout,
      WaitTimeSeconds: aWaitTimeSeconds
   }, "sqs", aHost, aRegion);
   
   if (isString(res)) res = af.fromXML2Obj(res);
   return res;
};

/**
 * <odoc>
 * <key>AWS.SQS_Delete(aQueueEndPoint, aRegion, aReceiptHandle) : Object</key>
 * Tries to send delete a message from the aQueueEndPoint on region aRegion given aReceiptHandle. If aReceiptHandle is actually a ReceiveMessageResponse/Result it will 
 * provide the aReceiptHandle from the message. Optionally: aReceiptHandle can be an array with maps containing a ReceiptHandle property up to 10 elements.
 * </odoc>
 */
AWS.prototype.SQS_Delete = function(aEndPoint, aRegion, aReceiptHandle) {
   aRegion = _$(aRegion).isString().default(this.region);
   var aURL = "https://sqs." + aRegion + ".amazonaws.com/" + aEndPoint.replace(/^\//, "");
   var url = new java.net.URL(aURL);
   var aURI = String(url.getPath());
   var aHost = String(url.getHost());
   var res;

   if (isArray(aReceiptHandle)) {
      if (aReceiptHandle.length > 10) throw "Can't delete more than 10 messages at a time due to AWS restrictions.";
      var msg = {
         Action: "DeleteMessageBatch",
         Version: "2012-11-05"
      };
      msg = merge(msg, this.convertArray2Attrs("DeleteMessageBatchRequestEntry", aReceiptHandle));
      res = this.postURLEncoded(aURL, aURI, "", msg, "sqs", aHost, aRegion);
   } else {
      if (isMap(aReceiptHandle) && 
      isDef(aReceiptHandle.ReceiveMessageResponse) &&
      isDef(aReceiptHandle.ReceiveMessageResponse.ReceiveMessageResult)) {
        aReceiptHandle = aReceiptHandle.ReceiveMessageResponse.ReceiveMessageResult.Message.ReceiptHandle;
      };
      res = this.postURLEncoded(aURL, aURI, "", { 
         Action: "DeleteMessage", 
         QueueUrl: aURL,
         ReceiptHandle: aReceiptHandle,
         Version: "2012-11-05" 
      }, "sqs", aHost, aRegion);
   }
   
   if (isString(res)) res = af.fromXML2Obj(res);
   return res;
};

/**
 * <odoc>
 * <key>AWS.SQS_MessageVisibility(aQueueEndPoint, aRegion, aReceiptHandle, aVisibilityTimeout) : Object</key>
 * Tries to change the visibility of a message in-flight from the aQueueEndPoint on region aRegion given aReceiptHandle. If aReceiptHandle is actually a ReceiveMessageResponse/Result it will 
 * provide the aReceiptHandle from the message. aVisibilityTimeout is measure in seconds up to 12 hours. Optionally: aReceiptHandle can be an array with maps containing a ReceiptHandle and VisibilityTimeout properties up to 10 elements.
 * </odoc>
 */
AWS.prototype.SQS_MessageVisibility = function(aEndPoint, aRegion, aReceiptHandle, aVisibilityTimeout) {
   aRegion = _$(aRegion).isString().default(this.region);
   var aURL = "https://sqs." + aRegion + ".amazonaws.com/" + aEndPoint.replace(/^\//, "");
   var url = new java.net.URL(aURL);
   var aURI = String(url.getPath());
   var aHost = String(url.getHost());
   var res;

   if (isArray(aReceiptHandle)) {
      if (aReceiptHandle.length > 10) throw "Can't change visibility of more than 10 messages at a time due to AWS restrictions.";
      var msg = {
         Action: "ChangeMessageVisibilityBatch",
         Version: "2012-11-05"
      };
      msg = merge(msg, this.convertArray2Attrs("ChangeMessageVisibilityBatchRequestEntry", aReceiptHandle));
      res = this.postURLEncoded(aURL, aURI, "", msg, "sqs", aHost, aRegion);
   } else {
      if (isMap(aReceiptHandle) && 
         isDef(aReceiptHandle.ReceiveMessageResponse) &&
         isDef(aReceiptHandle.ReceiveMessageResponse.ReceiveMessageResult)) {
            aReceiptHandle = aReceiptHandle.ReceiveMessageResponse.ReceiveMessageResult.Message.ReceiptHandle;
      };

      var res = this.postURLEncoded(aURL, aURI, "", { 
         Action: "ChangeMessageVisibility", 
         QueueUrl: aURL,
         ReceiptHandle: aReceiptHandle,
         VisibilityTimeout: aVisibilityTimeout,
         Version: "2012-11-05" 
      }, "sqs", aHost, aRegion);
   }
   
   if (isString(res)) res = af.fromXML2Obj(res);
   return res;
};

/**
 * <odoc>
 * <key>AWS.SQS_GetQueueAttributes(aQueueEndPoint, aRegion) : Object</key>
 * Tries to obtain and return the attributes of a queue of aQueueEndPoint on region aRegion.
 * </odoc>
 */
AWS.prototype.SQS_GetQueueAttributes = function(aEndPoint, aRegion) {
   aRegion = _$(aRegion).isString().default(this.region);
   var aURL = "https://sqs." + aRegion + ".amazonaws.com/" + aEndPoint.replace(/^\//, "");
   var url = new java.net.URL(aURL);
   var aURI = String(url.getPath());
   var aHost = String(url.getHost());

   var res = this.postURLEncoded(aURL, aURI, "", { 
      Action: "GetQueueAttributes", 
      QueueUrl: aURL,
      "AttributeName.1": "All",
      Version: "2012-11-05" 
   }, "sqs", aHost, aRegion);
   
   if (isString(res)) res = af.fromXML2Obj(res);
   return res;
};

/**
 * <odoc>
 * <key>AWS.SQS_Purge(aQueueEndPoint, aRegion) : Object</key>
 * Tries to purge all messages from  a queue of aQueueEndPoint on region aRegion.
 * </odoc>
 */
AWS.prototype.SQS_Purge = function(aEndPoint, aRegion) {
   aRegion = _$(aRegion).isString().default(this.region);
   var aURL = "https://sqs." + aRegion + ".amazonaws.com/" + aEndPoint.replace(/^\//, "");
   var url = new java.net.URL(aURL);
   var aURI = String(url.getPath());
   var aHost = String(url.getHost());

   var res = this.postURLEncoded(aURL, aURI, "", { 
      Action: "PurgeQueue", 
      QueueUrl: aURL,
      Version: "2012-11-05" 
   }, "sqs", aHost, aRegion);
   
   if (isString(res)) res = af.fromXML2Obj(res);
   return res;
};

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

/**
 * RDS =========================
 */
/**  
 * <odoc>
 * <key>AWS.RDS_DescribeDBClusters(aRegion, aDBClusterIdentifier, aMaxRecords, aMarker, aIncludeShared)</key>
 * Tries to retrieve the aRegion RDS DB clusters information optionally providing aDBClusterIdentifier, aMaxRecords, aIncludeShared boolean and/or aMarker.
 * See more in https://docs.aws.amazon.com/AmazonRDS/latest/APIReference/API_DescribeDBClusters.html
 * </odoc>
 */
AWS.prototype.RDS_DescribeDBClusters = function(aRegion, aDBClusterIdentifier, aMaxRecords, aMarker, aIncludeShared) {
   aRegion = _$(aRegion).isString().default(this.region);
   var aURL = "https://rds." + aRegion + ".amazonaws.com/";
   
   var params = { 
      Action: "DescribeDBClusters", 
      MaxRecords: aMaxRecords,
      IncludeShared: aIncludeShared,
      Marker: aMarker,
      DBClusterIdentifier: aDBClusterIdentifier,
      Version: "2014-10-31"
   };

   aURL += "?" + $rest().query(params);

   var url = new java.net.URL(aURL);
   var aHost = String(url.getHost());
   var aURI = String(url.getPath());

   var res = this.getURLEncoded(aURL, aURI, $rest().query(params), {}, "rds", aHost, aRegion);
   res = af.fromXML2Obj(res);

   if (isDef(res.DescribeDBClustersResponse) && isDef(res.DescribeDBClustersResponse.DescribeDBClustersResult)) {
      res = res.DescribeDBClustersResponse.DescribeDBClustersResult;
   }
   return res;
};

/** 
 * <odoc>
 * <key>AWS.RDS_DescribeDBClusters(aRegion, aDBClusterIdentifier, aMaxRecords, aMarker, aIncludeShared)</key>
 * Tries to retrieve the aRegion RDS DB clusters information optionally providing aDBClusterIdentifier, aMaxRecords, aIncludeShared boolean and/or aMarker.
 * See more in https://docs.aws.amazon.com/AmazonRDS/latest/APIReference/API_DescribeDBInstances.html
 * </odoc>
 */
AWS.prototype.RDS_DescribeDBInstances = function(aRegion, aDBClusterIdentifier, aMaxRecords, aMarker, aIncludeShared) {
   aRegion = _$(aRegion).isString().default(this.region);
   var aURL = "https://rds." + aRegion + ".amazonaws.com/";
   
   var params = { 
      Action: "DescribeDBInstances", 
      MaxRecords: aMaxRecords,
      IncludeShared: aIncludeShared,
      Marker: aMarker,
      DBClusterIdentifier: aDBClusterIdentifier,
      Version: "2014-10-31"
   };

   aURL += "?" + $rest().query(params);

   var url = new java.net.URL(aURL);
   var aHost = String(url.getHost());
   var aURI = String(url.getPath());

   var res = this.getURLEncoded(aURL, aURI, $rest().query(params), {}, "rds", aHost, aRegion);
   res = af.fromXML2Obj(res);

   if (isDef(res.DescribeDBInstancesResponse) && isDef(res.DescribeDBInstancesResponse.DescribeDBInstancesResult)) {
      res = res.DescribeDBInstancesResponse.DescribeDBInstancesResult;
   }
   return res;
};

/** 
 * <odoc>
 * <key>AWS.RDS_ModifyCurrentDBClusterCapacity(aRegion, aDBClusterIdentifier, aCapacity, aSecondsBeforeTimeout, aTimeoutAction)</key>
 * Tries to change the aRegion RDS DB cluster to aCapacity (from 2 to 384) for aDBClusterIdentifier optionally providing aSecondsBeforeTimeout and aTimeoutAction (e.g. ForceApplyCapacityChange or RollbackCapacityChange).
 * See more in https://docs.aws.amazon.com/AmazonRDS/latest/APIReference/API_ModifyCurrentDBClusterCapacity.html
 * </odoc>
 */
AWS.prototype.RDS_ModifyCurrentDBClusterCapacity = function(aRegion, aDBClusterIdentifier, aCapacity, aSecondsBeforeTimeout, aTimeoutAction) {
   aRegion = _$(aRegion).isString().default(this.region);
   var aURL = "https://rds." + aRegion + ".amazonaws.com/";
   var url = new java.net.URL(aURL);
   var aHost = String(url.getHost());
   var aURI = String(url.getPath());

   var params = { 
      Action: "ModifyCurrentDBClusterCapacity", 
      Capacity: aCapacity,
      SecondsBeforeTimeout: aSecondsBeforeTimeout,
      TimeoutAction: aTimeoutAction,
      DBClusterIdentifier: aDBClusterIdentifier,
      Version: "2014-10-31"
   };

   return af.fromXML2Obj(this.postURLEncoded(aURL, aURI, "", params, "rds", aHost, aRegion));
};

/**
 * <odoc>
 * <key>AWS.ECS_ListTaskDefinitions(aRegion, aParamsMap) : Map</key>
 * Retrieves a list of ECS task definitions on a specific aRegion. Optional you can provide filtering with aParamsMap.
 * </odoc>
 */
AWS.prototype.ECS_ListTaskDefinitions = function(aRegion, params) {
   aRegion = _$(aRegion).isString().default(this.region);
   params = _$(params).isMap().default({});
   var aURL = "https://ecs." + aRegion + ".amazonaws.com/";
   var url = new java.net.URL(aURL);
   var aHost = String(url.getHost());
   var aURI = String(url.getPath());

   return af.fromXML2Obj(this.postURLEncoded(aURL, aURI, "", merge({
      Action: "ListTaskDefinitions"
   }, params), "ecs", aHost, aRegion, {
      "X-Amz-Target": "AmazonEC2ContainerServiceV20141113.ListTaskDefinitions"
   }));
};

/**
 * <odoc>
 * <key>AWS.ECS_RunTask(aRegion, taskDefinition, params) : Map</key>
 * Tries to provision a ECS task (taskDefinition) to run with the provided params. Example:\
 * \
 *   aws.ECS_RunTask("eu-west-1", "arn:aws:ecs:eu-west-1:1234567890123:task-definition/test:123", { \
 *      cluster: "testCluster", \
 *      launchType: "FARGATE", \
 *      networkConfiguration: { \
 *         awsvpcConfiguration: { \
 *            assignPublicIp: "ENABLED", \
 *            securityGroups: [ "sg-123ab123" ], \
 *            subnets: [ "subnet-123ab123" ] \
 *         }\
 *      }, \
 *      overrides: { \
 *         containerOverrides: [ { \
 *            name: "testContainer", \
 *            environment: [ { \
 *               name: "MSG", \
 *               value: "Hello World" \
 *            } ] \
 *         } ] \
 *      } \
 *   });\
 * \
 * </odoc>
 */
AWS.prototype.ECS_RunTask = function(aRegion, taskDefinition, params) {
   aRegion = _$(aRegion).isString().default(this.region);
   params = _$(params).isMap().default({});
   var aURL = "https://ecs." + aRegion + ".amazonaws.com/";
   var url = new java.net.URL(aURL);
   var aHost = String(url.getHost());
   var aURI = String(url.getPath());

   var res = this.postURLEncoded(aURL, aURI, "", merge({
      Action: "RunTask",
      taskDefinition: taskDefinition
   }, this.flattenMap2Params(params)), "ecs", aHost, aRegion, {
      "X-Amz-Target": "AmazonEC2ContainerServiceV20141113.RunTask"
   });

   if (isMap(res))
      return af.fromXML2Obj(res.error.response);
   else {
      return af.fromXML2Obj(res);
   }
};

/**
 * DYNAMO DB=======================
 */

  /**
  * <odoc>
  * <key>AWS.DYNAMO_getCh(aRegion, aTable, aChName) : Channel</key>
  * Creates aChName (defaults to aTable) to access a Dynamo aTable on aRegion.
  * </odoc>
  */
AWS.prototype.DYNAMO_getCh = function(aRegion, aTable, aChName) {
   _$(aRegion).$_("Please provide a region.");
   _$(aTable).$_("Please provide a table.");

   aChName = _$(aChName).isString().default(aTable);
   $ch(aChName).create(1, "dynamo", {
      accessKey: this.accessKey,
      secretKey: this.secretKey,
      tableName: aTable,
      region: aRegion
   });

   return $ch(aChName);
};

/**
 * <odoc>
 * <key>AWS.DYNAMO_ListTables(aRegion) : Array</key>
 * Given aRegion returns an array with all DynamoDB tables.
 * </odoc>
 */
AWS.prototype.DYNAMO_ListTables = function(aRegion) {
   var aURL;
   aRegion = _$(aRegion).isString().default(this.region);
   if (aRegion == "local") {
      aURL = "http://127.0.0.1:8000";
   } else {
      aURL = "https://dynamodb." + aRegion + ".amazonaws.com/";
   }
   var url = new java.net.URL(aURL);
   var aHost = String(url.getHost());
   var aURI = String(url.getPath());

   var params = {
   };

   return this.postURLEncoded(aURL, aURI, "", params, "dynamodb", aHost, aRegion, {
      "X-Amz-Target": "DynamoDB_20120810.ListTables"
   }, void 0, "application/json");
};

/**
 * <odoc>
 * <key>AWS.DYNAMO_DeleteTable(aRegion, aTableName)</key>
 * Tries to delete a DynamoDB aTableName from aRegion.
 * </odoc>
 */
AWS.prototype.DYNAMO_DeleteTable = function(aRegion, aTableName) {
   var aURL;
   aRegion = _$(aRegion).isString().default(this.region);
   if (aRegion == "local") {
      aURL = "http://127.0.0.1:8000";
   } else {
      aURL = "https://dynamodb." + aRegion + ".amazonaws.com/";
   }
   var url = new java.net.URL(aURL);
   var aHost = String(url.getHost());
   var aURI = String(url.getPath());

   var params = {
      TableName: aTableName
   };

   return this.postURLEncoded(aURL, aURI, "", params, "dynamodb", aHost, aRegion, {
      "X-Amz-Target": "DynamoDB_20120810.DeleteTable"
   }, void 0, "application/json");
};

/**
 * <odoc>
 * <key>AWS.DYNAMO_CreateTable(aRegion, aTableName, attrDefs, keySchema, globalSecondaryIdxs, localSecondaryIdxs, tags)</key>
 * Tries to create a DynamoDB aTableName in aRegion with the provided attributeDefinitions and optional keySchema, globalSecondaryIdxs, localSecondaryIdxs and tags.
 * Please check more details in https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_CreateTable.html.
 * </odoc>
 */
AWS.prototype.DYNAMO_CreateTable = function(aRegion, tableName, attrDefs, keySchema, globalSecondaryIdxs, localSecondaryIdxs, tags) {
   var aURL;
   aRegion = _$(aRegion).isString().default(this.region);
   if (aRegion == "local") {
      aURL = "http://127.0.0.1:8000";
   } else {
      aURL = "https://dynamodb." + aRegion + ".amazonaws.com/";
   }
   var url = new java.net.URL(aURL);
   var aHost = String(url.getHost());
   var aURI = String(url.getPath());

   var params = {
      AttributeDefinitions: attrDefs,
      TableName: tableName,
      LocalSecondaryIndexes: localSecondaryIdxs,
      KeySchema: keySchema,
      GlobalSecondaryIndexes: globalSecondaryIdxs,
      BillingMode: "PAY_PER_REQUEST",
      Tags: tags
   };

   return this.postURLEncoded(aURL, aURI, "", params, "dynamodb", aHost, aRegion, {
      "X-Amz-Target": "DynamoDB_20120810.CreateTable"
   }, void 0, "application/json");
};

AWS.prototype.__DYNAMO_Item_Deconvert = function(aMap) {
   var __translate = (v) => {
      for(let ii in v) {
         switch(ii) {
         case "N": return String(v[ii]);
         case "S": return String(v[ii]);
         case "BOOL": return Boolean(v[ii]);
         case "NULL": return null;
         case "L": 
            var ar = [];
            for(let iii in v[ii]) {
               ar.push(__translate(v[ii][iii]));
            }
            return ar;
         case "M":
            var ar = {};
            for(let iii in v[ii]) {
               ar[iii] = __translate(v[ii][iii]);
            }
            return ar;
         case "B": 
            return af.fromBase64(v);
         default:
            if (isMap(v[ii])) {
               var ar = {};
               for(let iii in v[ii]) {
                  ar[iii] = __translate(v[ii][iii]);
               }
               return ar;
            } else {
               if (isArray(v[ii])) {
                  var ar = [];
                  for(let ii in v[ii]) {
                     ar.push(__translate(v[ii][iii]));
                  }
                  return ar;
               } else {
                  return __translate(v[ii]);
               }               
            }
         }
      }
   };

   if (isMap(aMap)) {
      var ar = {};
      for(let ii in aMap) {
         ar[ii] = __translate(aMap[ii]);
      }
      return ar;
   }
};

AWS.prototype.__DYNAMO_Item_Convert = function(aMap) {
   var __translate = (v) => {
      if (isString(v)) { return { S: String(v) }; }
      if (isNumber(v)) { return { N: String(v) }; }
      if (isBoolean(v)) { return { BOOL: v }; }
      if (isNull(v)) { return { NULL: v }; }
      if (isArray(v)) {
         var ar = [];
         for(let ii in v) {
            ar.push(__translate(v[ii]));
         }
         return { L: ar };
      }
      if (isMap(v)) {
         var ar = {};
         for(let ii in v) {
            ar[ii] = __translate(v[ii]);
         }
         return { M: ar };
      }
      if (isByteArray(v)) {
         return { B: af.fromBytes2String(af.toBase64Bytes(v)) };
      }
   };

   if (isMap(aMap)) {
      var ar = {};
      for(let ii in aMap) {
         ar[ii] = __translate(aMap[ii]);
      }
      return ar;
   }
};

/**
 * <odoc>
 * <key>AWS.DYNAMO_PutItem(aRegion, aTableName, aItem, aConditionExpression, aExpressionAttrValues)</key>
 * Tries to create or change a DynamoDB aTableName item on aRegion with aItem map (note: plain json, types will be automatically detected).
 * Optionally you can provide aConditionExpression and aExpressionAttrValues (see more details in https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_PutItem.html).
 * </odoc>
 */
AWS.prototype.DYNAMO_PutItem = function(aRegion, aTableName, aItem, aConditionExpression, aExpressionAttrValues) {
   var aURL;
   aRegion = _$(aRegion).isString().default(this.region);
   if (aRegion == "local") {
      aURL = "http://127.0.0.1:8000";
   } else {
      aURL = "https://dynamodb." + aRegion + ".amazonaws.com/";
   }
   var url = new java.net.URL(aURL);
   var aHost = String(url.getHost());
   var aURI = String(url.getPath());

   var params = {
      TableName: aTableName,
      Item: this.__DYNAMO_Item_Convert(aItem),
      ConditionExpression: aConditionExpression,
      ExpressionAttributeValues: aExpressionAttrValues
   };

   return this.postURLEncoded(aURL, aURI, "", params, "dynamodb", aHost, aRegion, {
      "X-Amz-Target": "DynamoDB_20120810.PutItem"
   }, void 0, "application/json");
};

/**
 * <odoc>
 * <key>AWS.DYNAMO_GetItem(aRegion, aTableName, aKey,  aProjectionExpression, shouldConsistentRead) : Map</key>
 * Tries to retrieve an item using aKey map from a DynamoDB aTableName in aRegion. Optionally you can provide aProjectionExpression
 * and/or a shouldConsistentRead boolean (defaults to true).
 * </odoc>
 */
AWS.prototype.DYNAMO_GetItem = function(aRegion, aTableName, aKey, aProjectionExpression, shouldConsistentRead) {
   var aURL;
   aRegion = _$(aRegion).isString().default(this.region);
   if (aRegion == "local") {
      aURL = "http://127.0.0.1:8000";
   } else {
      aURL = "https://dynamodb." + aRegion + ".amazonaws.com/";
   }
   var url = new java.net.URL(aURL);
   var aHost = String(url.getHost());
   var aURI = String(url.getPath());

   var params = {
      TableName: aTableName,
      Key: this.__DYNAMO_Item_Convert(aKey),
      ProjectionExpression: aProjectionExpression,
      ConsistentRead: (isDef(shouldConsistentRead) ? shouldConsistentRead : true)
   };

   var res = this.postURLEncoded(aURL, aURI, "", params, "dynamodb", aHost, aRegion, {
      "X-Amz-Target": "DynamoDB_20120810.GetItem"
   }, void 0, "application/json");
   if (isDef(res.Item)) {
      res.Item = this.__DYNAMO_Item_Deconvert(res.Item);
   }
   return res;
};

/**
 * <odoc>
 * <key>AWS.DYNAMO_GetAllItems(aRegion, aTableName, aFilterExpression, aExpressionAttributeValues, shouldConsistentRead, aIndexName, aSelect) : Map</key>
 * Tries to retrieve all items from a DynamoDB aTableName on aRegion. Optionally you can provide aFilterExpression, aExpressionAttributeValues
 * a boolean shouldConsistentRead, aIndexName and aSelect (if "COUNT" won't retrieve any items, just the count). See more details 
 * in https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Scan.html.
 * </odoc>
 */
AWS.prototype.DYNAMO_GetAllItems = function(aRegion, aTableName, aFilterExpression, aExpressionAttributeValues, shouldConsistentRead, aIndexName, aSelect) {
   var aURL;
   aRegion = _$(aRegion).isString().default(this.region);
   if (aRegion == "local") {
      aURL = "http://127.0.0.1:8000";
   } else {
      aURL = "https://dynamodb." + aRegion + ".amazonaws.com/";
   }
   var url = new java.net.URL(aURL);
   var aHost = String(url.getHost());
   var aURI = String(url.getPath());

   var params = {
      TableName: aTableName,
      FilterExpression: aFilterExpression,
      ExpressionAttributeValues: aExpressionAttributeValues,
      ConsistentRead: (isDef(shouldConsistentRead) ? shouldConsistentRead : true),
      IndexName: aIndexName,
      Select: aSelect
   };

   var res = this.postURLEncoded(aURL, aURI, "", params, "dynamodb", aHost, aRegion, {
      "X-Amz-Target": "DynamoDB_20120810.Scan"
   }, void 0, "application/json");
   if (isDef(res.Items)) {
      for(var ii in res.Items) {
         res.Items[ii] = this.__DYNAMO_Item_Deconvert(res.Items[ii]);
      }
   }
   return res;
};

/**
 * <odoc>
 * <key>AWS.DYNAMO_DeleteItem(aRegion, aTableName, aKey)</key>
 * Tries to delete an item, identified by aKey, from a DynamoDB aTableName on aRegion.
 * </odoc>
 */
AWS.prototype.DYNAMO_DeleteItem = function(aRegion, aTableName, aKey) {
   var aURL;
   aRegion = _$(aRegion).isString().default(this.region);
   if (aRegion == "local") {
      aURL = "http://127.0.0.1:8000";
   } else {
      aURL = "https://dynamodb." + aRegion + ".amazonaws.com/";
   }
   var url = new java.net.URL(aURL);
   var aHost = String(url.getHost());
   var aURI = String(url.getPath());

   var params = {
      TableName: aTableName,
      Key: this.__DYNAMO_Item_Convert(aKey)
   };

   var res = this.postURLEncoded(aURL, aURI, "", params, "dynamodb", aHost, aRegion, {
      "X-Amz-Target": "DynamoDB_20120810.DeleteItem"
   }, void 0, "application/json");
   return res;
};

/**
 * <odoc>
 * <key>AWS.DYNAMO_DescribeTable(aRegion, aTableName) : Map</key>
 * Retrieves a description map for a DynamoDB aTableName on aRegion.
 * </odoc>
 */
AWS.prototype.DYNAMO_DescribeTable = function(aRegion, aTableName) {
   var aURL;
   aRegion = _$(aRegion).isString().default(this.region);
   if (aRegion == "local") {
      aURL = "http://127.0.0.1:8000";
   } else {
      aURL = "https://dynamodb." + aRegion + ".amazonaws.com/";
   }
   var url = new java.net.URL(aURL);
   var aHost = String(url.getHost());
   var aURI = String(url.getPath());

   var params = {
      TableName: aTableName
   };

   var res = this.postURLEncoded(aURL, aURI, "", params, "dynamodb", aHost, aRegion, {
      "X-Amz-Target": "DynamoDB_20120810.DescribeTable"
   }, void 0, "application/json");
   return res;
};

ow.loadCh();
if (isUnDef(ow.ch.__types.dynamo)) ow.ch.__types.dynamo = {
   __channels: {},
   create       : function(aName, shouldCompress, options) {
      options = _$(options).default({});
      _$(options.accessKey).$_("Please provide an accessKey.");
      _$(options.secretKey).$_("Please provide a secretKey.");
      _$(options.tableName).$_("Please provde a table name.");
      options.region = _$(options.region).default(getEnv("AWS_DEFAULT_REGION"));

      ow.loadObj();
      options.aws = new AWS(options.accessKey, options.secretKey);
      
      this.__channels[aName] = options;
   },
   destroy      : function(aName) {
      delete this.__channels[aName];
   },
   size         : function(aName) {
      var options = this.__channels[aName];
      return options.aws.DYNAMO_GetAllItems(options.region, options.tableName, void 0, void 0, void 0, void 0, "COUNT").Count;
   },
   forEach      : function(aName, aFunction) {
      var options = this.__channels[aName];
      var keys = $path(options.aws.DYNAMO_DescribeTable(options.region, options.tableName).Table.KeySchema, "[].AttributeName");
      var oo = options.aws.DYNAMO_GetAllItems(options.region, options.tableName).Items;
      oo.forEach((vv) => {
         aFunction(ow.obj.filterKeys(keys, vv), vv);
      });
   },
   getAll      : function(aName, full) {
      var options = this.__channels[aName];
      return options.aws.DYNAMO_GetAllItems(options.region, options.tableName, full).Items;
   },
   getKeys      : function(aName, full) {
      var options = this.__channels[aName];
      var keys = $path(options.aws.DYNAMO_DescribeTable(options.region, options.tableName).Table.KeySchema, "[].AttributeName");
      return $from(options.aws.DYNAMO_GetAllItems(options.region, options.tableName, full).Items).select((r) => { return ow.obj.filterKeys(keys, r); });
   },
   getSortedKeys: function(aName, full) {
      return this.getKeys(aName, full);
   },
   getSet       : function getSet(aName, aMatch, aK, aV, aTimestamp)  {
      /*var res;
      res = this.get(aName, aK);
      if ($stream([res]).anyMatch(aMatch)) {
         return this.set(aName, aK, aV, aTimestamp);
      }
      return void 0;*/
      throw "Not implemented yet.";
   },
   set          : function(aName, aK, aV, aTimestamp) {
      var options = this.__channels[aName];
      return options.aws.DYNAMO_PutItem(options.region, options.tableName, aV);
   },
   setAll       : function(aName, aKs, aVs, aTimestamp) {
      ow.loadObj();
      for(var i in aVs) {
         this.set(aName, ow.obj.filterKeys(aKs, aVs[i]), aVs[i], aTimestamp);
      }
   },
   unsetAll     : function(aName, aKs, aVs, aTimestamp) {
      ow.loadObj();
      for(var i in aVs) {
         this.unset(aName, ow.obj.filterKeys(aKs, aVs[i]), aVs[i], aTimestamp);
      }
   },		
   get          : function(aName, aK) {
      var options = this.__channels[aName];
      return options.aws.DYNAMO_GetItem(options.region, options.tableName, aK).Item;
   },
   pop          : function(aName) {
      var elems = this.getSortedKeys(aName);
      var elem = elems[elems.length - 1];
      //var res = clone(this.get(aName, elem));
      //this.unset(aName, elem);
      return elem;
   },
   shift        : function(aName) {
      var elems = this.getSortedKeys(aName);
      var elem = elems[0];
      //var res = clone(this.get(aName, elem));
      //this.unset(aName, elem);
      return elem;
   },
   unset        : function(aName, aK, aTimestamp) {
      var options = this.__channels[aName];
      return options.aws.DYNAMO_DeleteItem(options.region, options.tableName, aK);
   }
};