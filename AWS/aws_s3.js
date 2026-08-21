// Author: Nuno Aguiar
// S3 (lightweight SigV4-signed access, used internally e.g. by aws_athena.js to read/delete query results)
// For a full-featured S3 client (multipart uploads, bucket policies, etc) see the separate "S3" opack.

loadLib("aws_core.js");

/**
 * <odoc>
 * <key>AWS.S3_ParseURL(aS3URL) : Map</key>
 * Parses an "s3://bucket/key" aS3URL into a Map with Bucket and Key.
 * </odoc>
 */
AWS.prototype.S3_ParseURL = function(aS3URL) {
   aS3URL = _$(aS3URL, "aS3URL").isString().$_();

   var m = aS3URL.match(/^s3:\/\/([^\/]+)\/(.*)$/);
   if (isUnDef(m)) throw "Invalid S3 URL (expected s3://bucket/key): " + aS3URL;

   return { Bucket: m[1], Key: m[2] };
};

/**
 * <odoc>
 * <key>AWS.S3_EncodeKey(aKey) : String</key>
 * URI-encodes aKey preserving "/" path separators (for use in an S3 path-style request URI).
 * </odoc>
 */
AWS.prototype.S3_EncodeKey = function(aKey) {
   aKey = _$(aKey, "aKey").isString().$_();
   return aKey.split("/").map(encodeURIComponent).join("/");
};

AWS.prototype.__s3SortedQuery = function(aParams) {
   return Object.keys(aParams)
      .filter(k => isDef(aParams[k]))
      .sort()
      .map(k => encodeURIComponent(k) + "=" + encodeURIComponent(aParams[k]))
      .join("&");
};

AWS.prototype.__s3XmlEscape = function(aStr) {
   return String(aStr).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
};

AWS.prototype.__s3SelectSerializationXML = function(aKind, aSerialization) {
   aSerialization = _$(aSerialization).isMap().default({});
   var type = String(_$(aSerialization.type).isString().default("CSV")).toUpperCase();
   var xml = "<" + aKind + "Serialization>";
   var value = (aName, aDefault) => this.__s3XmlEscape(_$(aSerialization[aName]).default(aDefault));

   if (aKind == "Input" && type == "PARQUET") return xml + "<CompressionType>NONE</CompressionType><Parquet/></InputSerialization>";
   if (["CSV", "JSON"].indexOf(type) < 0) throw "Unsupported S3 Select " + aKind.toLowerCase() + " serialization type '" + type + "'.";

   if (aKind == "Input") {
      xml += "<CompressionType>" + value("compression", "NONE") + "</CompressionType>";
      if (type == "CSV") {
         xml += "<CSV><FileHeaderInfo>" + value("fileHeaderInfo", "USE") + "</FileHeaderInfo>" +
            "<FieldDelimiter>" + value("fieldDelimiter", ",") + "</FieldDelimiter>" +
            "<QuoteCharacter>" + value("quoteCharacter", '\"') + "</QuoteCharacter>" +
            "<QuoteEscapeCharacter>" + value("quoteEscapeCharacter", '\"') + "</QuoteEscapeCharacter>" +
            "<RecordDelimiter>" + value("recordDelimiter", "\n") + "</RecordDelimiter>" +
            (isDef(aSerialization.comments) ? "<Comments>" + value("comments", "#") + "</Comments>" : "") +
            (isDef(aSerialization.allowQuotedRecordDelimiter) ? "<AllowQuotedRecordDelimiter>" + value("allowQuotedRecordDelimiter", false) + "</AllowQuotedRecordDelimiter>" : "") + "</CSV>";
      } else {
         xml += "<JSON><Type>" + value("jsonType", "LINES") + "</Type></JSON>";
      }
   } else if (type == "CSV") {
      xml += "<CSV><FieldDelimiter>" + value("fieldDelimiter", ",") + "</FieldDelimiter>" +
         "<QuoteCharacter>" + value("quoteCharacter", '\"') + "</QuoteCharacter>" +
         "<QuoteEscapeCharacter>" + value("quoteEscapeCharacter", '\"') + "</QuoteEscapeCharacter>" +
         "<QuoteFields>" + value("quoteFields", "ASNEEDED") + "</QuoteFields>" +
         "<RecordDelimiter>" + value("recordDelimiter", "\n") + "</RecordDelimiter></CSV>";
   } else {
      xml += "<JSON><RecordDelimiter>" + value("recordDelimiter", "\n") + "</RecordDelimiter></JSON>";
   }

   return xml + "</" + aKind + "Serialization>";
};

AWS.prototype.__s3SelectEventHeaders = function(aBytes, aStart, aLength) {
   var headers = {}, pos = aStart, end = aStart + aLength;
   while (pos < end) {
      var nameLength = aBytes[pos++] & 0xff;
      var name = af.fromBytes2String(af.fromArray2Bytes(aBytes.slice(pos, pos + nameLength)));
      pos += nameLength;
      var type = aBytes[pos++] & 0xff, length = 0;
      if (type == 7) {
         length = ((aBytes[pos] & 0xff) << 8) | (aBytes[pos + 1] & 0xff);
         pos += 2;
         headers[name] = af.fromBytes2String(af.fromArray2Bytes(aBytes.slice(pos, pos + length)));
         pos += length;
      } else if (type == 6) {
         headers[name] = aBytes[pos++] != 0;
      } else {
         throw "Unsupported S3 Select event-stream header type " + type;
      }
   }
   return headers;
};

AWS.prototype.__s3ContentMD5 = function(aBody) {
   var hex = md5(aBody);
   var bytes = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, hex.length / 2);
   for (var i = 0; i < hex.length; i += 2) {
      var v = parseInt(hex.substr(i, 2), 16);
      bytes[i / 2] = v > 127 ? v - 256 : v;
   }
   return String(java.util.Base64.getEncoder().encodeToString(bytes));
};

AWS.prototype.__s3URL = function(aRegion, aBucket, aKey, aQuery) {
   var aURI = "/" + aBucket + (isDef(aKey) ? "/" + this.S3_EncodeKey(aKey) : "");
   var aHost = "s3." + aRegion + ".amazonaws.com";
   var aURL = "https://" + aHost + aURI + (isDef(aQuery) && aQuery.length > 0 ? "?" + aQuery : "");

   return { URI: aURI, Host: aHost, URL: aURL };
};

/**
 * <odoc>
 * <key>AWS.S3_GetObject(aRegion, aBucket, aKey) : String</key>
 * Retrieves the raw content of aKey from aBucket on aRegion using a path-style SigV4 signed request.
 * </odoc>
 */
AWS.prototype.S3_GetObject = function(aRegion, aBucket, aKey) {
   aRegion = _$(aRegion).isString().default(this.region);
   aBucket = _$(aBucket, "aBucket").isString().$_();
   aKey    = _$(aKey, "aKey").isString().$_();

   return this.get("s3", aRegion, "/" + aBucket + "/" + this.S3_EncodeKey(aKey), "", {}, {}, __, __);
};

/**
 * <odoc>
 * <key>AWS.S3_PutObject(aRegion, aBucket, aKey, aContent, aContentType) : Map</key>
 * Uploads aContent (a String, e.g. from io.readFileString) as aKey to aBucket on aRegion. aContentType defaults to
 * "application/octet-stream". Returns an empty Map on success or a Map with an "error" key on failure.
 * </odoc>
 */
AWS.prototype.S3_PutObject = function(aRegion, aBucket, aKey, aContent, aContentType) {
   aRegion      = _$(aRegion).isString().default(this.region);
   aBucket      = _$(aBucket, "aBucket").isString().$_();
   aKey         = _$(aKey, "aKey").isString().$_();
   aContent     = _$(aContent, "aContent").isString().$_();
   aContentType = _$(aContentType).isString().default("application/octet-stream");

   return this.put("s3", aRegion, "/" + aBucket + "/" + this.S3_EncodeKey(aKey), "", aContent, {}, __, aContentType);
};

/**
 * <odoc>
 * <key>AWS.S3_HeadObject(aRegion, aBucket, aKey) : Map</key>
 * Retrieves aKey's metadata (size, content type, ETag, last modified, etc) from aBucket on aRegion without
 * downloading its content. Returns a Map with the response headers, or a Map with an "error" key (e.g. 404) if
 * aKey doesn't exist.
 * </odoc>
 */
AWS.prototype.S3_HeadObject = function(aRegion, aBucket, aKey) {
   aRegion = _$(aRegion).isString().default(this.region);
   aBucket = _$(aBucket, "aBucket").isString().$_();
   aKey    = _$(aKey, "aKey").isString().$_();

   return this.head("s3", aRegion, "/" + aBucket + "/" + this.S3_EncodeKey(aKey), "", {}, __, __);
};

/**
 * <odoc>
 * <key>AWS.S3_CopyObject(aRegion, aDestBucket, aDestKey, aSourceBucket, aSourceKey) : Map</key>
 * Copies aSourceKey from aSourceBucket into aDestKey in aDestBucket, all on aRegion, server-side (no data goes
 * through the caller). Returns the parsed CopyObjectResult XML as a Map.
 * </odoc>
 */
AWS.prototype.S3_CopyObject = function(aRegion, aDestBucket, aDestKey, aSourceBucket, aSourceKey) {
   aRegion       = _$(aRegion).isString().default(this.region);
   aDestBucket   = _$(aDestBucket, "aDestBucket").isString().$_();
   aDestKey      = _$(aDestKey, "aDestKey").isString().$_();
   aSourceBucket = _$(aSourceBucket, "aSourceBucket").isString().$_();
   aSourceKey    = _$(aSourceKey, "aSourceKey").isString().$_();

   var copySource = "/" + aSourceBucket + "/" + this.S3_EncodeKey(aSourceKey);

   var res = this.put("s3", aRegion, "/" + aDestBucket + "/" + this.S3_EncodeKey(aDestKey), "", "", { "X-Amz-Copy-Source": copySource }, __, "");
   if (isString(res) && res.trim().startsWith("<")) res = af.fromXML2Obj(res);

   return res;
};

/**
 * <odoc>
 * <key>AWS.S3_GetPresignedURL(aRegion, aBucket, aKey, aExpiresInSeconds) : String</key>
 * Builds a time-limited, unauthenticated download URL (SigV4 query-string signing) for aKey in aBucket on aRegion,
 * valid for aExpiresInSeconds (default 3600, i.e. 1 hour). Anyone with the URL can GET the object until it expires,
 * without needing AWS credentials - useful e.g. to hand out a link to an Athena query result CSV.
 * </odoc>
 */
AWS.prototype.S3_GetPresignedURL = function(aRegion, aBucket, aKey, aExpiresInSeconds) {
   aRegion           = _$(aRegion).isString().default(this.region);
   aBucket           = _$(aBucket, "aBucket").isString().$_();
   aKey              = _$(aKey, "aKey").isString().$_();
   aExpiresInSeconds = _$(aExpiresInSeconds).isNumber().default(3600);

   var loc = this.__s3URL(aRegion, aBucket, aKey);
   var extra = this.__getRequest("get", loc.URI, "s3", loc.Host, aRegion, "", "", {}, __, __, true, aExpiresInSeconds);

   return loc.URL + "?" + extra._query;
};

/**
 * <odoc>
 * <key>AWS.S3_DeleteObject(aRegion, aBucket, aKey) : Map</key>
 * Deletes aKey from aBucket on aRegion using a path-style SigV4 signed request. S3 deletes are idempotent so this
 * doesn't error if the key doesn't exist. On failure (e.g. access denied) returns a Map with an "error" key.
 * </odoc>
 */
AWS.prototype.S3_DeleteObject = function(aRegion, aBucket, aKey) {
   aRegion = _$(aRegion).isString().default(this.region);
   aBucket = _$(aBucket, "aBucket").isString().$_();
   aKey    = _$(aKey, "aKey").isString().$_();

   return this.delete("s3", aRegion, "/" + aBucket + "/" + this.S3_EncodeKey(aKey), "", __, {}, __, __);
};

/**
 * <odoc>
 * <key>AWS.S3_SelectObjectContent(aRegion, aBucket, aKey, aSQLExpression, aInputSerialization, aOutputSerialization, aOptions) : Map</key>
 * Runs an S3 Select SQL expression against aKey and returns { Records, Stats, Progress, Events }. Input serialization
 * supports CSV (default), JSON and Parquet; output serialization supports CSV (default) and JSON. aOptions supports
 * requestProgress, scanStartRange, scanEndRange and onRecord(aRecordChunk), which is called as Records events arrive.
 * </odoc>
 */
AWS.prototype.S3_SelectObjectContent = function(aRegion, aBucket, aKey, aSQLExpression, aInputSerialization, aOutputSerialization, aOptions) {
   aRegion              = _$(aRegion).isString().default(this.region);
   aBucket              = _$(aBucket, "aBucket").isString().$_();
   aKey                 = _$(aKey, "aKey").isString().$_();
   aSQLExpression       = _$(aSQLExpression, "aSQLExpression").isString().$_();
   aInputSerialization  = _$(aInputSerialization).isMap().default({});
   aOutputSerialization = _$(aOutputSerialization).isMap().default({});
   aOptions             = _$(aOptions).isMap().default({});

   var query = this.__s3SortedQuery({ select: "", "select-type": 2 });
   var loc = this.__s3URL(aRegion, aBucket, aKey, query);
   var body = '<?xml version="1.0" encoding="UTF-8"?><SelectObjectContentRequest xmlns="http://s3.amazonaws.com/doc/2006-03-01/">' +
      '<Expression>' + this.__s3XmlEscape(aSQLExpression) + '</Expression><ExpressionType>SQL</ExpressionType>' +
      this.__s3SelectSerializationXML("Input", aInputSerialization) +
      this.__s3SelectSerializationXML("Output", aOutputSerialization) +
      '<RequestProgress><Enabled>' + (_$(aOptions.requestProgress).isBoolean().default(false) ? 'true' : 'false') + '</Enabled></RequestProgress>' +
      ((isDef(aOptions.scanStartRange) || isDef(aOptions.scanEndRange)) ? '<ScanRange>' +
         (isDef(aOptions.scanStartRange) ? '<Start>' + _$(aOptions.scanStartRange).isNumber().$_() + '</Start>' : '') +
         (isDef(aOptions.scanEndRange) ? '<End>' + _$(aOptions.scanEndRange).isNumber().$_() + '</End>' : '') + '</ScanRange>' : '') +
      '</SelectObjectContentRequest>';
   var headers = this.__getRequest("post", loc.URI, "s3", loc.Host, aRegion, query, body, __, __, "application/xml");
   headers["Accept"] = "application/vnd.amazon.eventstream";

   ow.loadObj();
   var result = { Records: "", Stats: __, Progress: [], Events: [] }, stream, pending = [];
   var readUInt32BE = (arr, idx) => (((arr[idx] & 0xff) << 24) | ((arr[idx + 1] & 0xff) << 16) | ((arr[idx + 2] & 0xff) << 8) | (arr[idx + 3] & 0xff)) >>> 0;
   var processPending = () => {
      while (pending.length >= 12) {
         var totalLength = readUInt32BE(pending, 0);
         if (totalLength < 16) throw "Invalid S3 Select event-stream frame length " + totalLength;
         if (pending.length < totalLength) return;

         var headersLength = readUInt32BE(pending, 4);
         var payloadStart = 12 + headersLength, payloadLength = totalLength - headersLength - 16;
         if (payloadLength < 0) throw "Invalid S3 Select event-stream headers length";
         var eventHeaders = this.__s3SelectEventHeaders(pending, 12, headersLength);
         var payload = af.fromBytes2String(af.fromArray2Bytes(pending.slice(payloadStart, payloadStart + payloadLength)));
         var event = { type: eventHeaders[":event-type"], messageType: eventHeaders[":message-type"] };

         if (event.messageType == "error" || event.messageType == "exception") {
            throw "S3 Select " + (eventHeaders[":error-code"] || event.type || "error") + ": " + (eventHeaders[":error-message"] || payload);
         }
         if (event.type == "Records") {
            result.Records += payload;
            if (isFunction(aOptions.onRecord)) aOptions.onRecord(payload);
         } else if (event.type == "Stats") {
            result.Stats = af.fromXML2Obj(payload);
         } else if (event.type == "Progress") {
            result.Progress.push(af.fromXML2Obj(payload));
         }
         result.Events.push(event);
         pending = pending.slice(totalLength);
      }
   };

   try {
      var h = new ow.obj.http(loc.URL, "POST", body, headers, false, 30000, true, { delayBuild: true });
      h.setThrowExceptions(false);
      if (isDef(h.client.build)) h.client = h.client.build();
      h.exec(loc.URL, "POST", body, headers, false, 30000, true);
      if (h.responseCode() != 200) return { error: "HTTP " + h.responseCode() + ": " + h.response(), Records: "", Events: [] };
      stream = h.responseStream();
      if (isUnDef(stream)) return { error: "Failed to get S3 Select response stream", Records: "", Events: [] };
      ioStreamReadBytes(stream, buffer => {
         for (var i = 0; i < buffer.length; i++) pending.push(buffer[i]);
         processPending();
      });
      if (pending.length > 0) return { error: "Incomplete S3 Select event stream", Records: result.Records, Events: result.Events };
   } catch(e) {
      return { error: String(e), Records: result.Records, Stats: result.Stats, Progress: result.Progress, Events: result.Events };
   } finally {
      if (isDef(stream)) try { stream.close(); } catch(e) {}
   }

   return result;
};

/**
 * <odoc>
 * <key>AWS.S3_DeleteObjects(aRegion, aBucket, aKeys, aQuiet) : Map</key>
 * Batch-deletes up to 1000 aKeys (an Array of Strings) from aBucket on aRegion in a single call (the Multi-Object
 * Delete API). If aQuiet is true (default false) only errors are returned in the response, successes are omitted.
 * Returns the parsed DeleteResult XML as a Map (res.DeleteResult.Deleted / res.DeleteResult.Error).
 * </odoc>
 */
AWS.prototype.S3_DeleteObjects = function(aRegion, aBucket, aKeys, aQuiet) {
   aRegion = _$(aRegion).isString().default(this.region);
   aBucket = _$(aBucket, "aBucket").isString().$_();
   aKeys   = _$(aKeys, "aKeys").isArray().$_();
   aQuiet  = _$(aQuiet).isBoolean().default(false);

   if (aKeys.length == 0) return { DeleteResult: { Deleted: [], Error: [] } };
   if (aKeys.length > 1000) throw "S3_DeleteObjects supports at most 1000 keys per call (got " + aKeys.length + ")";

   var body = '<?xml version="1.0" encoding="UTF-8"?><Delete>' +
      (aQuiet ? '<Quiet>true</Quiet>' : '') +
      aKeys.map(k => '<Object><Key>' + this.__s3XmlEscape(k) + '</Key></Object>').join('') +
      '</Delete>';

   var query = this.__s3SortedQuery({ "delete": "" });
   var loc = this.__s3URL(aRegion, aBucket, __, query);

   var res = this.postURLEncoded(loc.URL, loc.URI, query, body, "s3", loc.Host, aRegion, { "Content-MD5": this.__s3ContentMD5(body) }, __, "application/xml");
   if (isString(res) && res.trim().startsWith("<")) res = af.fromXML2Obj(res);

   return res;
};

/**
 * <odoc>
 * <key>AWS.S3_ListObjectsV2(aRegion, aBucket, aPrefix, aMaxKeys, aContinuationToken) : Map</key>
 * Lists objects under aBucket on aRegion (ListObjectsV2), optionally filtered by aPrefix, paginating with
 * aMaxKeys and aContinuationToken. Returns the parsed XML response as a Map (res.ListBucketResult...).
 * </odoc>
 */
AWS.prototype.S3_ListObjectsV2 = function(aRegion, aBucket, aPrefix, aMaxKeys, aContinuationToken) {
   aRegion = _$(aRegion).isString().default(this.region);
   aBucket = _$(aBucket, "aBucket").isString().$_();

   var query = this.__s3SortedQuery({
      "list-type"         : 2,
      "prefix"            : aPrefix,
      "max-keys"          : aMaxKeys,
      "continuation-token": aContinuationToken
   });
   var loc = this.__s3URL(aRegion, aBucket, __, query);

   var res = this.getURLEncoded(loc.URL, loc.URI, query, {}, "s3", loc.Host, aRegion, {}, __, __);
   if (isString(res) && res.trim().startsWith("<")) res = af.fromXML2Obj(res);

   return res;
};

/**
 * <odoc>
 * <key>AWS.S3_ListObjectVersions(aRegion, aBucket, aPrefix, aKeyMarker, aVersionIdMarker, aMaxKeys) : Map</key>
 * Lists object versions (and delete markers) under a version-enabled aBucket on aRegion, optionally filtered by
 * aPrefix, paginating with aKeyMarker/aVersionIdMarker/aMaxKeys. Returns the parsed XML response as a Map.
 * </odoc>
 */
AWS.prototype.S3_ListObjectVersions = function(aRegion, aBucket, aPrefix, aKeyMarker, aVersionIdMarker, aMaxKeys) {
   aRegion = _$(aRegion).isString().default(this.region);
   aBucket = _$(aBucket, "aBucket").isString().$_();

   var query = this.__s3SortedQuery({
      "versions"         : "",
      "prefix"           : aPrefix,
      "key-marker"       : aKeyMarker,
      "version-id-marker": aVersionIdMarker,
      "max-keys"         : aMaxKeys
   });
   var loc = this.__s3URL(aRegion, aBucket, __, query);

   var res = this.getURLEncoded(loc.URL, loc.URI, query, {}, "s3", loc.Host, aRegion, {}, __, __);
   if (isString(res) && res.trim().startsWith("<")) res = af.fromXML2Obj(res);

   return res;
};

/**
 * <odoc>
 * <key>AWS.S3_GetObjectTagging(aRegion, aBucket, aKey) : Map</key>
 * Retrieves the tag set of aKey in aBucket on aRegion. Returns the parsed XML response as a Map
 * (res.Tagging.TagSet.Tag being a single Map or an Array of Maps with Key/Value).
 * </odoc>
 */
AWS.prototype.S3_GetObjectTagging = function(aRegion, aBucket, aKey) {
   aRegion = _$(aRegion).isString().default(this.region);
   aBucket = _$(aBucket, "aBucket").isString().$_();
   aKey    = _$(aKey, "aKey").isString().$_();

   var query = this.__s3SortedQuery({ "tagging": "" });
   var loc = this.__s3URL(aRegion, aBucket, aKey, query);

   var res = this.getURLEncoded(loc.URL, loc.URI, query, {}, "s3", loc.Host, aRegion, {}, __, __);
   if (isString(res) && res.trim().startsWith("<")) res = af.fromXML2Obj(res);

   return res;
};

/**
 * <odoc>
 * <key>AWS.S3_PutObjectTagging(aRegion, aBucket, aKey, aTags) : Map</key>
 * Replaces the tag set of aKey in aBucket on aRegion with aTags (a Map of tag name to tag value, up to 10 tags).
 * </odoc>
 */
AWS.prototype.S3_PutObjectTagging = function(aRegion, aBucket, aKey, aTags) {
   aRegion = _$(aRegion).isString().default(this.region);
   aBucket = _$(aBucket, "aBucket").isString().$_();
   aKey    = _$(aKey, "aKey").isString().$_();
   aTags   = _$(aTags, "aTags").isMap().$_();

   var body = '<?xml version="1.0" encoding="UTF-8"?><Tagging><TagSet>' +
      Object.keys(aTags).map(k => '<Tag><Key>' + this.__s3XmlEscape(k) + '</Key><Value>' + this.__s3XmlEscape(aTags[k]) + '</Value></Tag>').join('') +
      '</TagSet></Tagging>';

   var query = this.__s3SortedQuery({ "tagging": "" });
   var loc = this.__s3URL(aRegion, aBucket, aKey, query);

   return this.putURLEncoded(loc.URL, loc.URI, query, body, "s3", loc.Host, aRegion, {}, __, "application/xml");
};

/**
 * <odoc>
 * <key>AWS.S3_ListBuckets(aRegion) : Map</key>
 * Lists all S3 buckets owned by the caller (aRegion only affects which regional endpoint signs the request, not
 * which buckets are returned). Returns the parsed XML response as a Map (res.ListAllMyBucketsResult.Buckets...).
 * </odoc>
 */
AWS.prototype.S3_ListBuckets = function(aRegion) {
   aRegion = _$(aRegion).isString().default(this.region);

   var res = this.get("s3", aRegion, "/", "", {}, {}, __, __);
   if (isString(res) && res.trim().startsWith("<")) res = af.fromXML2Obj(res);

   return res;
};

/**
 * <odoc>
 * <key>AWS.S3_CreateBucket(aRegion, aBucket) : Map</key>
 * Creates aBucket on aRegion.
 * </odoc>
 */
AWS.prototype.S3_CreateBucket = function(aRegion, aBucket) {
   aRegion = _$(aRegion).isString().default(this.region);
   aBucket = _$(aBucket, "aBucket").isString().$_();

   // us-east-1 is the default region and must NOT be given a LocationConstraint
   var body = (aRegion == "us-east-1") ? "" :
      '<?xml version="1.0" encoding="UTF-8"?><CreateBucketConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><LocationConstraint>' + aRegion + '</LocationConstraint></CreateBucketConfiguration>';

   return this.put("s3", aRegion, "/" + aBucket, "", body, {}, __, (body.length > 0 ? "application/xml" : ""));
};

/**
 * <odoc>
 * <key>AWS.S3_DeleteBucket(aRegion, aBucket) : Map</key>
 * Deletes aBucket on aRegion. The bucket must be empty.
 * </odoc>
 */
AWS.prototype.S3_DeleteBucket = function(aRegion, aBucket) {
   aRegion = _$(aRegion).isString().default(this.region);
   aBucket = _$(aBucket, "aBucket").isString().$_();

   return this.delete("s3", aRegion, "/" + aBucket, "", __, {}, __, __);
};

/**
 * <odoc>
 * <key>AWS.S3_GetBucketLocation(aRegion, aBucket) : Map</key>
 * Retrieves the region aBucket was created in. Returns the parsed XML response as a Map (res.LocationConstraint,
 * empty/undefined meaning us-east-1).
 * </odoc>
 */
AWS.prototype.S3_GetBucketLocation = function(aRegion, aBucket) {
   aRegion = _$(aRegion).isString().default(this.region);
   aBucket = _$(aBucket, "aBucket").isString().$_();

   var query = this.__s3SortedQuery({ "location": "" });
   var loc = this.__s3URL(aRegion, aBucket, __, query);

   var res = this.getURLEncoded(loc.URL, loc.URI, query, {}, "s3", loc.Host, aRegion, {}, __, __);
   if (isString(res) && res.trim().startsWith("<")) res = af.fromXML2Obj(res);

   return res;
};
