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
   var signing_key = this.__getSignatureKey(Packages.openaf.AFCmdBase.afc.dIP(this.secretKey), datestamp, aRegion, aService);
   var signature = ow.format.string.toHex(this.__HmacSHA256(string_to_sign, signing_key), "").toLowerCase();

   // Part 4
   var authorization_header = "AWS4-HMAC-SHA256" + " " + "Credential=" + Packages.openaf.AFCmdBase.afc.dIP(this.accessKey) + "/" + credential_scope + ", " + "SignedHeaders=" + signed_headers + ", " + "Signature=" + signature;

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
 * <odoc>
 * <key>AWS.getURLEncoded(aURL, aURI, aParams, aArgs, aService, aHost, aRegion, aAmzTarget, aDate, aContentType) : Object</key>
 * Tries to send a POST http request given aURL, aURI, ordered aParams, an object aArgs, an AWS aService, aHost, an AWS aRegion, an optional aAmzTarget, an optional aDate and an optional aContentType (defaults to application/x-www-form-urlencoded).
 * Returns the object returned by the API.
 * </odoc>
 */
AWS.prototype.getURLEncoded = function(aURL, aURI, aParams, aArgs, aService, aHost, aRegion, aAmzTarget, aDate, aContentType) {
   var params = _$(aParams).isString().default("");

   var extra = this.__getRequest("get", aURI, aService, aHost, aRegion, params, "", aAmzTarget, aDate, aContentType);

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