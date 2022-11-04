// Author: Nuno Aguiar
// SQS

loadLib("aws_core.js");

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
  * <key>AWS.SQS_Receive(aQueueEndPoint, aRegion, aVisibilityTimeout, aWaitTimeSeconds, maxMessages, aAttrList) : Object</key>
  * Tries to send receive a message from the aQueueEndPoint on region aRegion given aVisibilityTimeout in seconds. If a message is not immediatelly available it will wait
  * for aWaitTimeSeconds. On FIFO queues, after receiving the message you should delete it after successfully processing it within the visibility timeout period.
  * Optionally you can provide an array of message attributes to retrieve or just "All" and a maxMessages to retrieve (defaults to 1)
  * </odoc>
  */
 AWS.prototype.SQS_Receive = function(aEndPoint, aRegion, aVisibilityTimeout, aWaitTimeSeconds, maxMessage, aAttrList) {
    aRegion = _$(aRegion).isString().default(this.region);
    aMaxMessage = _$(aMaxMessage, "aMaxMessage").isNumber().default(__)
    aAttrList = _$(aAttrList, "aAttrList").default([])

    var aURL = "https://sqs." + aRegion + ".amazonaws.com/" + aEndPoint.replace(/^\//, "");
    var url = new java.net.URL(aURL);
    var aURI = String(url.getPath());
    var aHost = String(url.getHost());
 
    var res = this.postURLEncoded(aURL, aURI, "", { 
       Action: "ReceiveMessage", 
       QueueUrl: aURL,
       Version: "2012-11-05",
       VisibilityTimeout: aVisibilityTimeout,
       WaitTimeSeconds: aWaitTimeSeconds,
       MaxNumberOfMessages: maxMessage,
       AttributeName: aAttrList
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
 