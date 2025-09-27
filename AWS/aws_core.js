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
   ow.loadFormat()
   ow.loadObj()
   ow.loadNet()

   this.accessKey = aAccessKey;
   this.secretKey = aSecretKey;
   this.stoken    = aSessionToken;
   this.__debug   = false

   aRegion = _$(aRegion).isString().default("us-east-1")

   this._original = {
      accessKey: aAccessKey,
      secretKey: aSecretKey,
      stoken   : aSessionToken,
      region   : aRegion,
      last     : now()
   }

   this.connect(aAccessKey, aSecretKey, aSessionToken, aRegion);
}

/**
 * <odoc>
 * <key>AWS.reconnect()</key>
 * Resets the connection using the original credentials provided at initialization.
 * </odoc>
 */
AWS.prototype.reconnect = function() {
   this._original.last = now()
   this.connect(this._original.accessKey, this._original.secretKey, this._original.stoken, this._original.region)
}

/**
 * <odoc>
 * <key>AWS.lastConnect() : Number</key>
 * Returns the number of milliseconds since the last connect/reconnect.
 * </odoc>
 */
AWS.prototype.lastConnect = function() {
   return now() - this._original.last
}

AWS.prototype._imds = function() {
   var _role, _cred, _token

   if (ow.net.testPort("169.254.169.254", 80)) {
           // IMDSv1
           var url = "http://169.254.169.254/latest/meta-data"
           var uris = "/iam/security-credentials"
           try {
                   var _res = $rest().get(url)
                   if (isMap(_res) && isDef(_res.responseCode) && _res.responseCode == 200) {
                           var _r = $rest().get(url + uris)
                           if (isMap(_r) && isDef(_r.error) && isDef(_r.error.responseCode) && _r.error.responseCode == 404) {
                                   throw "Problem trying to use IMDSv1: No IAM role was found."
                           } else {
                                   if (isMap(_r)) throw "Problem trying to use IMDSv1: " + af.toSLON(_r)
                                   _role = _r.trim().split("\n")[0]
                                   _cred = $rest().get(url + uris + "/" + _role)
                                   if (_cred.Code != "Success") throw "Problem trying to use IMDSv1: " + af.toSLON(_cred)
                           }
                   } else {
                           if (isMap(_res) && isDef(_res.error) && _res.error.responseCode != 401) {
                                   throw "error accessing IMDS: " + af.toSLON(_res) + (_res.error.responseCode == 403 ? " (Is the AWS instance metadata service enabled?)" : "")
                           }

                           // IMDSv2
                           _token = $rest({ requestHeaders: { "X-aws-ec2-metadata-token-ttl-seconds": 21600 } }).put("http://169.254.169.254/latest/api/token")
                           var rh = { requestHeaders: { "X-aws-ec2-metadata-token": _token } }
                           var _r = $rest(rh).get(url + uris)
                           if (isMap(_r) && isDef(_r.error) && isDef(_r.error.responseCode) && _r.error.responseCode == 404) {
                                   throw "Problem trying to use IMDSv2: No IAM role was found."
                           } else {
                                   if (isMap(_r)) throw "Problem trying to use IMDSv2: " + af.toSLON(_r)
                                   _role = _r.trim().split("\n")[0]
                                   _cred = $rest(rh).get(url + uris + "/" + _role)
                                   if (_cred.Code != "Success") throw "Problem trying to use IMDSv2: " + af.toSLON(_cred)
                           }
                   }
           } catch(e) {
                   throw "Problem trying to determine or use AWS IMDS: " + String(e)
           }

           return {
                   accessKey: _cred.AccessKeyId,
                   secretKey: _cred.SecretAccessKey,
                   token    : _cred.Token
           }
   } else {
      return __
   }
}

AWS.prototype._credentialsFile = function() {
   var _cred = __
   ow.loadJava()
   var ini = new ow.java.ini()
   var _cf = ow.format.getUserHome().replace(/\\/g, "/") + "/.aws/credentials"
   var _profile = _$(getEnv("AWS_PROFILE")).isString().default("default")
   if (io.fileExists(_cf)) {
      var allCreds = ini.loadFile(_cf).get()
      if (isMap(allCreds) && isDef(allCreds[_profile])) {
         _cred = allCreds[_profile]
      } else if (isMap(allCreds) && isDef(allCreds.default)) {
         _cred = allCreds.default
      } else {
         _cred = __
      }
   }
   return _cred
}

AWS.prototype._credentialProcess = function() {
   var _cred = __
   ow.loadJava()
   var ini = new ow.java.ini()
   var _cf = ow.format.getUserHome().replace(/\\/g, "/") + "/.aws/config"
   if (!io.fileExists(_cf)) return __
   var _data = ini.loadFile(_cf).get()

   var _profile = _$(getEnv("AWS_PROFILE")).isString().default("default")
   if (_profile != "default") _profile = "profile " + _profile

   if (isDef(_data[_profile]) && isDef(_data[_profile].credential_process)) {
      var _cmd = _data[_profile].credential_process
      if (isString(_cmd) && _cmd.length > 0) {
         try {
            var _res = $sh(_cmd).get(0).stdout
            if (isString(_res)) {
               _cred = jsonParse(_res)
            } else {
               throw "Invalid response from credential_process: " + af.toSLON(_res)
            }
         } catch(e) {
            throw "Problem trying to execute credential_process: " + String(e)
         }
      }
   }

   return _cred
}

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

   var o
   if (isUnDef(this.accessKey)) {
      // Try credentials file
      var _cred = this._credentialsFile()
      if (isMap(_cred) && isDef(_cred.aws_access_key_id) && isDef(_cred.aws_secret_access_key)) {
         o = {
            AccessKeyId: _cred.aws_access_key_id,
            SecretAccessKey: _cred.aws_secret_access_key,
            Token: isDef(_cred.aws_session_token) ? _cred.aws_session_token : __
         }
      } else {
         // Try profile
         var _cred = this._credentialProcess()
         if (isMap(_cred) && isDef(_cred.AccessKeyId) && isDef(_cred.SecretAccessKey)) {
            o = {
                  AccessKeyId: _cred.AccessKeyId,
               SecretAccessKey: _cred.SecretAccessKey,
               Token: isDef(_cred.SessionToken) ? _cred.SessionToken : __
            }
         } else if (isDef(getEnv("AWS_WEB_IDENTITY_TOKEN_FILE"))) {
            var _token = io.readFileString(getEnv("AWS_WEB_IDENTITY_TOKEN_FILE"))
            var _res = $rest({urlEncode:true}).post("https://sts." + getEnv("AWS_REGION") + ".amazonaws.com/", {
               Action: "AssumeRoleWithWebIdentity",
               DurationSeconds: 3600,
               RoleArn: getEnv("AWS_ROLE_ARN"),
               RoleSessionName: "my-session",
               WebIdentityToken: _token,
               Version: "2011-06-15"
            })
            if (isMap(_res) && isDef(_res.error)) {
               throw af.toSLON( af.fromXML2Obj(_res.error.response) )
            }
            _res = af.fromXML2Obj(_res)
            if (isDef(_res.AssumeRoleWithWebIdentityResponse) && isDef(_res.AssumeRoleWithWebIdentityResponse.AssumeRoleWithWebIdentityResult)) {
               o = {
                  AccessKeyId: _res.AssumeRoleWithWebIdentityResponse.AssumeRoleWithWebIdentityResult.Credentials.AccessKeyId,
                  SecretAccessKey: _res.AssumeRoleWithWebIdentityResponse.AssumeRoleWithWebIdentityResult.Credentials.SecretAccessKey,
                  Token: _res.AssumeRoleWithWebIdentityResponse.AssumeRoleWithWebIdentityResult.Credentials.SessionToken
               }
            } else {
               throw af.toSLON(_res)
            }
         } else {
            if (isDef(getEnv("AWS_CONTAINER_AUTHORIZATION_TOKEN"))) {
               o = $rest({requestHeaders: { Authorization: getEnv("AWS_CONTAINER_AUTHORIZATION_TOKEN") }}).get(getEnv("AWS_CONTAINER_CREDENTIALS_FULL_URI"));
            } else {
               if (isDef(getEnv("AWS_CONTAINER_CREDENTIALS_FULL_URI"))) {
                  o = $rest().get(getEnv("AWS_CONTAINER_CREDENTIALS_FULL_URI"));
               } else {
                  var _cf = ow.format.getUserHome().replace(/\\/g, "/") + "/.aws/credentials"
                  if (isDef(_cf)) {
                     o = {}
                     if (io.fileExists(_cf)) {
                        io.readFileString(_cf)
                        .split("\n")
                        .filter(r => r.trim().match(/^aws_(access_|secret_)/))
                        .forEach(r => {
                           var ar = r.split("=").map(s => s.trim());
                           if (ar[0] == "aws_access_key_id") o.AccessKeyId = ar[1]
                           if (ar[0] == "aws_secret_access_key") o.SecretAccessKey = ar[1]
                           if (ar[0] == "aws_session_token") o.Token = ar[1]
                        })
                     } else {
                        // Fallback to IMDS
                        var _cred = this._imds()
                        if (isMap(_cred)) {
                           o.AccessKeyId     = _cred.accessKey
                           o.SecretAccessKey = _cred.secretKey
                           o.Token           = _cred.token
                        }
                     }
                  }
               }
            }
         }
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
 * <key>AWS.convertArray2Attrs(aParameter, anArray, withoutId) : Map</key>
 * Given anArray will convert it to a flatten AWS map for the provided aParameter. Example:\
 * \
 * aws.convertArray2Attrs("test", [ { a: 11, b: true }, { a: 22, b: false } ]);\
 * // {\
 * //   "test.1.Id": "0", "test.1.a": 11, "test.1.b": true,\
 * //   "test.2.Id": "1", "test.2.a": 22, "test.2.b": false\
 * // }\
 * </odoc>
 */
AWS.prototype.convertArray2Attrs = function(aParameter, anArray, withoutId) {
   withoutId = _$(withoutId, "withoutId").isBoolean().default(false)

   var res = {};
   for(var ii in anArray) {
      if (!withoutId) res[aParameter + "." + (Number(ii) + 1) + ".Id"] = ii;
      for(var jj in anArray[ii]) {
         if (isArray(anArray[ii][jj])) {
            res = merge(res, this.convertArray2Attrs(aParameter + "." + (!withoutId ? "" : "member.") + (Number(ii) + 1) + "." + jj, anArray[ii][jj], withoutId));
         } else {
            res[aParameter + "." + (!withoutId ? "" : "member.") + (Number(ii) + 1) + "." + jj] = anArray[ii][jj];
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

AWS.prototype.__getRequest = function(aMethod, aURI, aService, aHost, aRegion, aRequestParams, aPayload, aAmzFields, aDate, aContentType, altGet) {
   altGet = _$(altGet).isBoolean().default(false)
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

   var can_uri = encodeURI(aURI);
   var can_querystring = aRequestParams; // must be sorted by name
   //var can_headers = (aMethod == "GET" ? "content-type:" + content_type + "\n" + "host:" + aHost + "\n" + "x-amz-date:" + amzdate + "\n" + (isDef(aAmzTarget) ? "x-amz-target:" + aAmzTarget + "\n" : "") : "host:" + aHost + "\n" + "x-amz-date:" + amzdate + "\n");
   var can_headers = (isDef(content_type) && content_type.length > 0 ? "content-type:" + content_type + "\n" : "") + "host:" + aHost + "\n" + (altGet ? "" : "x-amz-date:" + amzdate + "\n");

   var amzFieldsHeaders = Object.keys(aAmzFields), amzHeaders = [];
   for (var amzFieldI in amzFieldsHeaders) {
      request[amzFieldsHeaders[amzFieldI]] = aAmzFields[amzFieldsHeaders[amzFieldI]];
      if (amzFieldsHeaders[amzFieldI] != "X-Amz-Security-Token") {
         amzHeaders.push(amzFieldsHeaders[amzFieldI].toLowerCase());
         can_headers += amzFieldsHeaders[amzFieldI].toLowerCase() + ":" + aAmzFields[amzFieldsHeaders[amzFieldI]] + "\n";
      }
   }

   var signed_headers = (isDef(content_type) && content_type.length > 0 ? "content-type;" : "") + "host" + (altGet ? "" : ";x-amz-date") + (amzHeaders.length > 0 ? ";" + amzHeaders.join(";") : "");
   var payload_hash = sha256(aPayload);

   // Part 2
   var credential_scope = datestamp + "/" + aRegion + "/" + aService + "/" + "aws4_request";
   var altGetFields = {}
   if (altGet) {
      altGetFields = {
         "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
         "X-Amz-Credential": encodeURIComponent(Packages.openaf.AFCmdBase.afc.dIP(this.accessKey) + "/" + credential_scope),
         "X-Amz-Date": amzdate,
         "X-Amz-Expires": 60,
         "X-Amz-Security-Token": (isDef(this.stoken) ? encodeURIComponent(this.stoken) : __),
         "X-Amz-SignedHeaders": encodeURIComponent(signed_headers)
      }
      //can_querystring = can_querystring + "&" + $rest().query(altGetFields)
      if (this.__debug) cprint(altGetFields)
      can_querystring = can_querystring + "&" + templify("X-Amz-Algorithm={{X-Amz-Algorithm}}&X-Amz-Credential={{X-Amz-Credential}}&X-Amz-Date={{X-Amz-Date}}&X-Amz-Expires={{X-Amz-Expires}}{{#if X-Amz-Security-Token}}&X-Amz-Security-Token={{X-Amz-Security-Token}}{{/if}}&X-Amz-SignedHeaders={{X-Amz-SignedHeaders}}", altGetFields)
   }
   var can_Request = aMethod + "\n" + can_uri + "\n" + can_querystring + "\n" + can_headers + "\n" + signed_headers + "\n" + payload_hash
   if (this.__debug) { cprint(can_Request); print("----") }
   var string_to_sign = "AWS4-HMAC-SHA256" + "\n" + amzdate + "\n" + credential_scope + "\n" + sha256(can_Request);
   if (this.__debug) { cprint(string_to_sign); print("++++") }

   // Part 3
   var signing_key = this.__getSignatureKey(Packages.openaf.AFCmdBase.afc.dIP(this.secretKey), datestamp, aRegion, aService);
   var signature = ow.format.string.toHex(this.__HmacSHA256(string_to_sign, signing_key), "").toLowerCase();
   if (this.__debug) { cprint(signature); }

   // Part 4
   var authorization_header = "AWS4-HMAC-SHA256" + " " + "Credential=" + Packages.openaf.AFCmdBase.afc.dIP(this.accessKey) + "/" + credential_scope + ", " + "SignedHeaders=" + signed_headers + ", " + "Signature=" + signature;

   if (aMethod == "GET") {
      if (altGet) {
        altGetFields["X-Amz-Signature"] = signature
        //delete request["X-Amz-Security-Token"]
        //request = merge(request, { _query: can_querystring, "X-Amz-Signature": signature, "X-Amz-Date": amzdate, "Authorization": authorization_header })
        //request = merge(request, { _query: can_querystring, "X-Amz-Date": amzdate, "Authorization": authorization_header })
        request._query = can_querystring + "&X-Amz-Signature=" + signature
	     request._data  = altGetFields
      } else {
        request = merge(request, {
         "Content-Type": (isString(aContentType) && aContentType.length > 0 ? aContentType : __),
         "X-Amz-Date": amzdate,
         "Authorization": authorization_header
        })

	//if (isUnDef(aContentType) || aContentType.length == 0) delete request["Content-Type"]
      }
   } else {
      request = merge(request, {
         "Content-Type": (isString(aContentType) && aContentType.length > 0 ? aContentType : __),
         "x-amz-date": amzdate,
         "Authorization": authorization_header,
      });
      //if (isUnDef(aContentType) || aContentType.length == 0) delete request["Content-Type"]
   }

   return request;
};

/**
 * <odoc>
 * <key>AWS.postURLEncoded(aURL, aURI, aParams, aArgs, aService, aHost, aRegion, aAmzFields, aDate, aContentType, noUTF8) : Object</key>
 * Tries to send a POST http request given aURL, aURI, ordered aParams, an object aArgs, an AWS aService, aHost, an AWS aRegion, an optional aAmzFields, an optional aDate and an optional aContentType (defaults to application/x-www-form-urlencoded).
 * Returns the object returned by the API.
 * </odoc>
 */
AWS.prototype.postURLEncoded = function(aURL, aURI, aParams, aArgs, aService, aHost, aRegion, aAmzFields, aDate, aContentType, noUTF8) {
   var params = _$(aParams).isString().default(""), payload = "";
   aContentType = _$(aContentType).isString().default("application/x-www-form-urlencoded");

   if (aContentType.length > 0 && !aContentType.endsWith("charset=utf-8") && !noUTF8) aContentType = aContentType + "; charset=utf-8"

   if (aContentType.startsWith("application/x-www-form-urlencoded"))
      payload = ow.obj.rest.writeQuery(aArgs);
   else
      payload = isString(aArgs) ? aArgs : stringify(aArgs, void 0, "");
   var extra = this.__getRequest("post", aURI, aService, aHost, aRegion, params, payload, aAmzFields, aDate, (aContentType == '' ? __ : aContentType));

   return $rest({
      urlEncode: (aContentType.startsWith("application/x-www-form-urlencoded")),
      requestHeaders: extra
   }).post(aURL, aArgs);
};

/**
 * <odoc>
 * <key>AWS.restPreActionAWSSign4(aRegionOrMapWithFields, aService, aAmzFields, aDate, aContentType) : Function</key>
 * Provides a preAction function to be used with $rest pre-actions for AWS signed rest requests.
 * </odoc>
 */
AWS.prototype.restPreActionAWSSign4 = function(aRegion, aService, aAmzFields, aDate, aContentType) {
   var parent = this

   if (isMap(aRegion)) {
      var iMap = clone(aRegion)
      aRegion      = _$(iMap.region, "map.region").isString().default("us-east-1")
      aService     = _$(iMap.service, "map.service").isString().$_()
      aAmzFields   = _$(iMap.amzFields, "map.amzFields").isMap().default(__)
      aDate        = _$(iMap.date, "map.date").isDate().default(__)
      aContentType = _$(iMap.contentType, "map.contentType").isString().default(__)
   }

   return function(aOps) {
      aOps.reqHeaders = _$(aOps.reqHeaders).default({})
      aVerb = aOps.aVerb.toLowerCase()

      if (aVerb == "post" || aVerb == "put" || aVerb == "patch") {
         var url = new java.net.URL(aOps.aBaseURL)
         var aHost = String(url.getHost())
         var aUri = String(url.getPath())
         var params = String(url.getQuery())

         if (params != "null" && Object.keys(aOps.aIdxMap).length > 0) params = params + "&" + $rest().query(aOps.aIdxMap)
         if (params == "null") params = $rest().query(aOps.aIdxMap)
         if (params == "" && aOps.aBaseURL.endsWith("?")) aOps.aBaseURL = aOps.aBaseURL.substring(0, aOps.aBaseURL.length -1)

         aContentType = _$(aContentType).isString().default("application/x-www-form-urlencoded; charset=utf-8")
         var aPayload = (aContentType == "application/x-www-form-urlencoded; charset=utf-8" ? $rest().query(aOps.aDataRowMap) : stringify(aOps.aDataRowMap, __, ""))
         aPayload = _$(aPayload).default("")
         aOps.reqHeaders = merge(aOps.reqHeaders,
            parent.__getRequest(aVerb, aUri, aService, aHost, aRegion, params, aPayload, aAmzFields, aDate, aContentType))

         aOps.urlEncode = aContentType.startsWith("application/x-www-form-urlencoded")
      } else {
         var url = new java.net.URL(aOps.aBaseURL)
         var aHost = String(url.getHost())
         var aUri = String(url.getPath())
         var params = String(url.getQuery())

         if (params != "null" && Object.keys(aOps.aIdxMap).length > 0) params = params + "&" + $rest().query(aOps.aIdxMap)
         if (params == "null") params = $rest().query(aOps.aIdxMap)

         aContentType = _$(aContentType).isString().default("application/json; charset=utf-8")

         /*aOps.reqHeaders = merge(aOps.reqHeaders,
            parent.__getRequest(aVerb, aUri, aService, aHost, aRegion, params, "", aAmzFields, aDate, (aVerb == "delete" ? __ : aContentType)))*/
         aOps.reqHeaders = merge(aOps.reqHeaders,
            parent.__getRequest(aVerb, aUri, aService, aHost, aRegion, params, "", aAmzFields, aDate, aContentType))
      }

      return aOps
   }
}

/**
 * <odoc>
 * <key>AWS.getURLEncoded(aURL, aURI, aParams, aArgs, aService, aHost, aRegion, aAmzFields, aDate, aContentType) : Object</key>
 * Tries to send a POST http request given aURL, aURI, ordered aParams, an object aArgs, an AWS aService, aHost, an AWS aRegion, an optional aAmzFields, an optional aDate and an optional aContentType (defaults to application/x-www-form-urlencoded).
 * Returns the object returned by the API.
 * </odoc>
 */
AWS.prototype.getURLEncoded = function(aURL, aURI, aParams, aArgs, aService, aHost, aRegion, aAmzFields, aDate, aContentType, aextra) {
   if (isObject(aParams)) aParams = $rest().query(aParams);
   var params = _$(aParams).isString().default("");

   var extra = this.__getRequest("get", aURI, aService, aHost, aRegion, params, "", aAmzFields, aDate, aContentType, aextra);

   if (aextra) {
      aURL += "?" + extra._query
      delete extra._query
   }

   return $rest({
      requestHeaders: extra
   }).get(aURL);
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
