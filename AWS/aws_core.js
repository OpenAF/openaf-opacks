// Author: Nuno Aguiar
// Core lib

/**
 * <odoc>
 * <key>AWS.AWS(aAccessKey, aSecretKey, aSessionToken)</key>
 * Creates an instance of AWS light simplified API access. The accessKey, secretKey and temporary sessionToken will be 
 * taken from environment variables or provided directly.
 * </odoc>
 */
var AWS = function(aAccessKey, aSecretKey, aSessionToken, aRegion) {
   ow.loadFormat();
   ow.loadObj();
   this.accessKey = aAccessKey;
   this.secretKey = aSecretKey;
   this.stoken    = aSessionToken;

   this.connect(aAccessKey, aSecretKey, aSessionToken, aRegion);
};

/**
 * <odoc>
 * <key>AWS.connect(aAccessKey, aSecretKey, aSessionToken, aRegion)</key>
 * Resets existing credentials if needed. Usually helpful when using session tokens.
 * </odoc>
 */
AWS.prototype.connect = function(aAccessKey, aSecretKey, aSessionToken, aRegion) {
   this.accessKey = _$(aAccessKey).default(this._aAccessKey);
   this.secretKey = _$(aSecretKey).default(this._aSecretKey);
   this.stoken    = _$(aSessionToken).default(this.aSessionToken);

   if (isUnDef(this.accessKey) && isDef(getEnv("AWS_ACCESS_KEY_ID"))) this.accessKey = String(getEnv("AWS_ACCESS_KEY_ID")); 
   if (isUnDef(this.secretKey) && isDef(getEnv("AWS_SECRET_ACCESS_KEY"))) this.secretKey = String(getEnv("AWS_SECRET_ACCESS_KEY"));
   if (isUnDef(this.stoken) && isDef(getEnv("AWS_SESSION_TOKEN"))) this.stoken = String(getEnv("AWS_SESSION_TOKEN"));

   if (isUnDef(this.accessKey)) {
      var o;
      if (isDef(getEnv("AWS_CONTAINER_AUTHORIZATION_TOKEN"))) {
         o = $rest({requestHeaders: { Authorization: getEnv("AWS_CONTAINER_AUTHORIZATION_TOKEN") }}).get(getEnv("AWS_CONTAINER_CREDENTIALS_FULL_URI"));
      } else {
         o = $rest().get(getEnv("AWS_CONTAINER_CREDENTIALS_FULL_URI"));
      }
      this.accessKey = o.AccessKeyId;
      this.secretKey = o.SecretAccessKey;
      this.stoken    = o.Token;
   }

   this.region = aRegion || getEnv("AWS_DEFAULT_REGION");
};

/*AWS.prototype.getS3 = function() {
   var go = false;
   try {
      loadLib("s3.js");
      go = true;
   } catch(e) {
      throw "Please install the S3 oPack: opack install S3";
   }

   if (go) {
      if (isDef(S3)) {
         return new S3("https://s3.amazonaws.com", this.accessKey, this.secretKey, this.region);
      }
   }
};*/

/**
 * <odoc>
 * <key>AWS.getVirtualMFASessionToken(aRegion, mfaDeviceARN, aTokenCode, durationInSeconds) : AWS</key>
 * Builds a new AWS object instance when access is restricted to MFA-based authentication given aRegion, a mfaDeviceARN, the current aTokenCode
 * and a durationInSeconds (optional). Example:\
 * \
 *   var aws  = new AWS("AKIABC", "abc123");\
 *   var naws = aws.getVirtualMFASessionToken("eu-west-1", "arn:aws:iam::123456789012:mfa/my_user", 123456, 3600);\
 * \
 *   naws.LAMBDA_Invoke("eu-west-1", "testFunction", { a: 1, b: 2 });\
 * \
 * </odoc>
 */
AWS.prototype.getVirtualMFASessionToken = function(aRegion, mfaDeviceARN, aTokenCode, durationInSeconds) {
   aRegion = _$(aRegion).isString().default(this.region);
   var aURL = "https://sts." + aRegion + ".amazonaws.com/";
   var url = new java.net.URL(aURL);
   var aURI = String(url.getPath());
   var aHost = String(url.getHost());

   var res = this.postURLEncoded(aURL, aURI, "", {
      Version        : "2011-06-15",
      Action         : "GetSessionToken",
      DurationSeconds: durationInSeconds,
      SerialNumber   : mfaDeviceARN,
      TokenCode      : aTokenCode
   }, "sts", aHost, aRegion);
   if (isString(res) && res.startsWith("<GetSessionTokenResponse ")) {
      res = af.fromXML2Obj(res);
      return new AWS(res.GetSessionTokenResponse.GetSessionTokenResult.Credentials.AccessKeyId, res.GetSessionTokenResponse.GetSessionTokenResult.Credentials.SecretAccessKey, res.GetSessionTokenResponse.GetSessionTokenResult.Credentials.SessionToken, aRegion);
   } else {
      if (isDef(res.error))
         throw res.error.response;
      else
         throw res;
   }
};

/**
 * <odoc>
 * <key>AWS.convertArray2Attrs(aParameter, anArray) : Map</key>
 * Given anArray will convert it to a flatten AWS map for the provided aParameter. Example:\
 * \
 * aws.convertArray2Attrs("test", [ { a: 11, b: true }, { a: 22, b: false } ]);\
 * // {\
 * //   "test.1.Id": "0", "test.1.a": 11, "test.1.b": true,\
 * //   "test.2.Id": "1", "test.2.a": 22, "test.2.b": false\
 * // }\
 * </odoc>
 */
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

/**
 * <odoc>
 * <key>AWS.flattenMap2Params(aMap) : aMap</key>
 * Converts any json aMap into a flatten AWS map representation. Example:\
 * \
 * aws.flattenMap2Params({ a: 1, b: [ 1, 2, 3 ], c: { x: 1, y: -1 } });\
 * // {\
 * //   "a": 1,\
 * //   "b.Id.1": 1,\
 * //   "b.Id.2": 2,\
 * //   "b.Id.3": 3,\
 * //   "c.x": 1,\
 * //   "c.y": -1\
 * // }\
 * \
 * </odoc>
 */
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
      request[amzFieldsHeaders[amzFieldI]] = aAmzFields[amzFieldsHeaders[amzFieldI]];
      if (amzFieldsHeaders[amzFieldI] != "X-Amz-Security-Token") {
         amzHeaders.push(amzFieldsHeaders[amzFieldI].toLowerCase());
         can_headers += amzFieldsHeaders[amzFieldI].toLowerCase() + ":" + aAmzFields[amzFieldsHeaders[amzFieldI]] + "\n";
      }
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
         "Content-Type": (isDef(aContentType) ? aContentType : void 0),
         "x-amz-date": amzdate,
         "Authorization": authorization_header,
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

/**
 * <odoc>
 * <key>AWS.restPreActionAWSSign4(aRegion, aService, aAmzFields, aDate, aContentType) : Function</key>
 * Provides a preAction function to be used with $rest pre-actions for AWS signed rest requests.
 * </odoc>
 */
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
   if (isObject(aParams)) aParams = $rest().query(aParams);
   var params = _$(aParams).isString().default("");

   var extra = this.__getRequest("get", aURI, aService, aHost, aRegion, params, "", aAmzFields, aDate, aContentType);

   return $rest({ 
      urlEncode: (aContentType == "application/x-www-form-urlencoded"), 
      requestHeaders: extra
   }).get(aURL, aArgs);
};

AWS.prototype.get = function(aService, aRegion, aPartURI, aParams, aArgs, aAmzFields, aDate, aContentType) {
   aPartURI = _$(aPartURI).default("/");
   var aURL = "https://" + aService + "." + aRegion + ".amazonaws.com" + aPartURI;
   var url = new java.net.URL(aURL);
   var aHost = String(url.getHost());
   var aURI = String(url.getPath());

   return this.getURLEncoded(aURL, aURI, aParams, aArgs, aService, aHost, aRegion, aAmzFields, aDate, aContentType);
};

AWS.prototype.post = function(aService, aRegion, aPartURI, aParams, aArgs, aAmzFields, aDate, aContentType) {
   aPartURI = _$(aPartURI).default("/");
   var aURL = "https://" + aService + "." + aRegion + ".amazonaws.com" + aPartURI;
   var url = new java.net.URL(aURL);
   var aHost = String(url.getHost());
   var aURI = String(url.getPath());

   return this.postURLEncoded(aURL, aURI, aParams, aArgs, aService, aHost, aRegion, aAmzFields, aDate, aContentType);
};

AWS.prototype.delete = function(aService, aRegion, aPartURI, aParams, aArgs, aAmzFields, aDate, aContentType) {
   aPartURI = _$(aPartURI).default("/");
   var aURL = "https://" + aService + "." + aRegion + ".amazonaws.com" + aPartURI;
   var url = new java.net.URL(aURL);
   var aHost = String(url.getHost());
   var aURI = String(url.getPath());

   if (isObject(aParams)) aParams = $rest().query(aParams);
   var params = _$(aParams).isString().default("");

   var extra = this.__getRequest("delete", aURI, aService, aHost, aRegion, params, "", aAmzFields, aDate, aContentType);

   return $rest({ 
      urlEncode: (aContentType == "application/x-www-form-urlencoded"), 
      requestHeaders: extra
   }).delete(aURL, aArgs);
};