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

/**
 * <odoc>
 * <key>AWS.LAMBDA_ListLayers(aRegion, aRuntime, aMarker, aMaxItems) : Map</key>
 * Tries to list the current lambda layers for aRegion. Optionally you can filter by aRuntime and paginate using
 * aMarker and a aMaxItems.
 * </odoc>
 */
AWS.prototype.LAMBDA_ListLayers = function(aRegion, aRuntime, aMarker, aMaxItems) {
   aRegion = _$(aRegion, "region").isString().default(this.region);
   aRuntime = _$(aRuntime, "runtime").isString().default(void 0);

   var res = this.get("lambda", aRegion, "/2018-10-31/layers", $rest().query({
      CompatibleRuntime: aRuntime,
      Marker: aMarker,
      MaxItems: aMaxItems
   }), {}, {}, void 0, "application/json");

   return res;
};

/**
 * <odoc>
 * <key>AWS.LAMBDA_ListLayerVersions(aRegion, aLayerName, aRuntime, aMarker, aMaxItems) : Map</key>
 * Tries to list the current lambda layers versions for aRegion and aLayerName. Optionally you can filter by aRuntime and paginate using
 * aMarker and a aMaxItems.
 * </odoc>
 */
AWS.prototype.LAMBDA_ListLayerVersions = function(aRegion, aLayerName, aRuntime, aMarker, aMaxItems) {
   aRegion = _$(aRegion, "region").isString().default(this.region);
   aRuntime = _$(aRuntime, "runtime").isString().default(void 0);
   _$(aLayerName, "layer name").isString().$_();

   var res = this.get("lambda", aRegion, "/2018-10-31/layers/" + aLayerName + "/versions", $rest().query({
      CompatibleRuntime: aRuntime,
      Marker: aMarker,
      MaxItems: aMaxItems
   }), {}, {}, void 0, "application/json");

   return res;
};

/**
 * <odoc>
 * <key>AWS.LAMBDA_PublishLayerVersion(aRegion, aLayerName, aDescription, aLicenseInfo, aContent, aListRuntimes, aListArchs) : Map</key>
 * Tries to publish a new lambda layer version on aRegion for aLayerName with aDescription and aLicenseInfo for, optionally, aListRuntimes array.
 * aContent is a map with either ZipFile (base64 contents) or S3Bucket, S3Key and S3ObjectVersion entries. Example:\
 * \
 * aws.LAMBDA_PublishLayerVersion("eu-west-1", "my_layer", "", "", { ZipFile: af.fromBytes2String(af.toBase64Bytes(io.readFileBytes("mylayer.zip"))) })\
 * \
 * </odoc>
 */
AWS.prototype.LAMBDA_PublishLayerVersion = function(aRegion, aLayerName, aDescription, aLicenseInfo, aContent, aListRuntimes, aListArchs) {
   aRegion = _$(aRegion, "region").isString().default(this.region);
   aListRuntimes = _$(aListRuntimes, "runtimes").isArray().default(void 0);
   _$(aLayerName, "layer name").isString().$_();

   var res = this.post("lambda", aRegion, "/2018-10-31/layers/" + aLayerName + "/versions", "", {
      CompatibleRuntimes: aListRuntimes,
      CompatibleArchitectures: aListArchs,
      Content: aContent,
      Description: aDescription,
      LicenseInfo: aLicenseInfo
   }, {}, void 0, "application/json");

   return res;
};

/**
 * <odoc>
 * <key>AWS.LAMBDA_DeleteLayerVersion(aRegion, aLayerName, aVersionNumber) : Map</key>
 * Tries to delete aVersionNumber of aLayerName on aRegion.
 * </odoc>
 */
AWS.prototype.LAMBDA_DeleteLayerVersion = function(aRegion, aLayerName, aVersionNumber) {
   aRegion = _$(aRegion, "region").isString().default(this.region);
   _$(aLayerName, "layer name").isString().$_();
   _$(aVersionNumber, "version number").isNumber().$_();

   var res = this.delete("lambda", aRegion, "/2018-10-31/layers/" + aLayerName + "/versions/" + aVersionNumber, "", {}, {}, void 0, "application/json");

   return res;
};

/**
 * <odoc>
 * <key>AWS.LAMBDA_CreateWithLayers(aRegion, aFunctionName, aArrayOfLayers, aRole, aRuntime, aContent, aFile, aHandler) : Map</key>
 * Tries to create a lambda aFunctionName in aRegion with aArrayOfLayers using aRole and aRuntime. Optionally you can specify aContent (zip object or string),
 * a default file (if aContent is a string) and aHandler.
 * </odoc>
 */
AWS.prototype.LAMBDA_CreateWithLayers = function(aRegion, aFunctionName, aArrayOfLayers, aRole, aRuntime, aContent, aFile, aHandler) {
   aRegion = _$(aRegion, "region").isString().default(this.region);
   _$(aFunctionName, "function name").isString().$_();
   aArrayOfLayers = _$(aArrayOfLayers, "array of layers").isArray().default([]);
   aRuntime = _$(aRuntime, "runtime").isString().default("provided");
   aContent = _$(aContent, "content").isObject().default(__);
   aFile    = _$(aFile, "file").isString().default("main.js");
   aHandler = _$(aHandler, "handler").isString().default("main.js");

   if (isUnDef(aContent) || isString(aContent)) {
      plugin("ZIP");
      var zip = new ZIP();
      var code = (isString(aContent) ? aContent : "__pm.result = 0;\n");
      zip.putFile(aFile, code);
      aContent = zip;
   }

   var res = this.post("lambda", aRegion, "/2015-03-31/functions", "", {
      FunctionName: aFunctionName,
      Layers: aArrayOfLayers,
      Code: {
         ZipFile: af.fromBytes2String(af.toBase64Bytes(aContent.generate({ compressionLevel: 9})))
      },
      Runtime: aRuntime,
      Role: aRole,
      Handler: aHandler
   }, {}, void 0, "application/json");

   if (!isString(aContent)) aContent.close();

   return res;
};

/**
 * <odoc>
 * <key>AWS.LAMBDA_CreatePython(aRegion, aFunctionName, aRole, aPythonCode) : Map</key>
 * Tries to create a lambda aFunctionName in aRegion with the provided aPythonCode as index.py.
 * </odoc>
 */
AWS.prototype.LAMBDA_CreatePython = function(aRegion, aFunctionName, aRole, aPythonCode) {
   _$(aPythonCode, "aPythonCode").isString().$_();

   plugin("ZIP");
   var zip = new ZIP();
   zip.putFile("index.py", aPythonCode);
   return this.LAMBDA_CreateWithLayers(aRegion, aFunctionName, [], aRole, "python3.8", zip, "index.py", "index.lambda_handler");
};
// Management APIs: static bindings cross-checked against the AWS API references and
// botocore lambda-web (2025-03-07), lambda-microvms (2025-09-09), and
// lambda-core (2026-04-30) models. No runtime SDK/model dependency.
(function() {
   var operations = {
      "WEB_CreateWebFunction": {"method": "put", "path": "/2025-03-07/web-functions", "query": {}, "rename": {}, "identifiers": ["functionName"]},
      "WEB_CreateWebFunctionEndpoint": {"method": "put", "path": "/2025-03-07/web-functions/{functionName}/endpoints", "query": {}, "rename": {}, "identifiers": ["functionName", "endpointName"]},
      "WEB_CreateWebFunctionRevision": {"method": "post", "path": "/2025-03-07/web-functions/{functionName}/revisions", "query": {}, "rename": {}, "identifiers": ["functionName"]},
      "WEB_DeleteResourcePolicy": {"method": "delete", "path": "/2025-03-07/resource-policy/{resourceArn}", "query": {"revisionId": "RevisionId"}, "rename": {}, "identifiers": ["resourceArn"]},
      "WEB_DeleteWebFunction": {"method": "delete", "path": "/2025-03-07/web-functions/{functionName}", "query": {}, "rename": {}, "identifiers": ["functionName"]},
      "WEB_DeleteWebFunctionEndpoint": {"method": "delete", "path": "/2025-03-07/web-functions/{functionName}/endpoints/{endpointName}", "query": {}, "rename": {}, "identifiers": ["functionName", "endpointName"]},
      "WEB_DeleteWebFunctionRevision": {"method": "delete", "path": "/2025-03-07/web-functions/{functionName}/revisions/{revisionId}", "query": {}, "rename": {}, "identifiers": ["functionName", "revisionId"]},
      "WEB_GetResourcePolicy": {"method": "get", "path": "/2025-03-07/resource-policy/{resourceArn}", "query": {}, "rename": {}, "identifiers": ["resourceArn"]},
      "WEB_GetWebAccountSettings": {"method": "get", "path": "/2025-03-07/web-account-settings", "query": {}, "rename": {}, "identifiers": []},
      "WEB_GetWebFunction": {"method": "get", "path": "/2025-03-07/web-functions/{functionName}", "query": {}, "rename": {}, "identifiers": ["functionName"]},
      "WEB_GetWebFunctionEndpoint": {"method": "get", "path": "/2025-03-07/web-functions/{functionName}/endpoints/{endpointName}", "query": {}, "rename": {}, "identifiers": ["functionName", "endpointName"]},
      "WEB_GetWebFunctionRevision": {"method": "get", "path": "/2025-03-07/web-functions/{functionName}/revisions/{revisionId}", "query": {}, "rename": {}, "identifiers": ["functionName", "revisionId"]},
      "WEB_ListTags": {"method": "get", "path": "/2025-03-07/tags/{resource}", "query": {}, "rename": {}, "identifiers": ["resource"]},
      "WEB_ListWebFunctionEndpoints": {"method": "post", "path": "/2025-03-07/web-functions/{functionName}/list-endpoints", "query": {}, "rename": {}, "identifiers": ["functionName"]},
      "WEB_ListWebFunctionRevisions": {"method": "post", "path": "/2025-03-07/web-functions/{functionName}/list-revisions", "query": {}, "rename": {}, "identifiers": ["functionName"]},
      "WEB_ListWebFunctions": {"method": "post", "path": "/2025-03-07/web-functions", "query": {}, "rename": {}, "identifiers": []},
      "WEB_PutResourcePolicy": {"method": "put", "path": "/2025-03-07/resource-policy/{resourceArn}", "query": {}, "rename": {"policy": "Policy", "revisionId": "RevisionId"}, "identifiers": ["resourceArn"]},
      "WEB_TagResource": {"method": "post", "path": "/2025-03-07/tags/{resource}", "query": {}, "rename": {"tags": "Tags"}, "identifiers": ["resource"]},
      "WEB_UntagResource": {"method": "delete", "path": "/2025-03-07/tags/{resource}", "query": {"tagKeys": "tagKeys"}, "rename": {}, "identifiers": ["resource"]},
      "WEB_UpdateWebFunctionEndpoint": {"method": "patch", "path": "/2025-03-07/web-functions/{functionName}/endpoints/{endpointName}", "query": {}, "rename": {}, "identifiers": ["functionName", "endpointName"]},
      "MICROVM_CreateMicrovmAuthToken": {"method": "post", "path": "/2025-09-09/microvms/{microvmIdentifier}/auth-token", "query": {}, "rename": {}, "identifiers": ["microvmIdentifier"]},
      "MICROVM_CreateMicrovmImage": {"method": "post", "path": "/2025-09-09/microvm-images", "query": {}, "rename": {}, "identifiers": ["baseImageArn", "buildRoleArn", "name"]},
      "MICROVM_CreateMicrovmShellAuthToken": {"method": "post", "path": "/2025-09-09/microvms/{microvmIdentifier}/shell-auth-token", "query": {}, "rename": {}, "identifiers": ["microvmIdentifier"]},
      "MICROVM_DeleteMicrovmImage": {"method": "delete", "path": "/2025-09-09/microvm-images/{imageIdentifier}", "query": {}, "rename": {}, "identifiers": ["imageIdentifier"]},
      "MICROVM_DeleteMicrovmImageVersion": {"method": "delete", "path": "/2025-09-09/microvm-images/{imageIdentifier}/versions/{imageVersion}", "query": {}, "rename": {}, "identifiers": ["imageIdentifier", "imageVersion"]},
      "MICROVM_GetMicrovm": {"method": "get", "path": "/2025-09-09/microvms/{microvmIdentifier}", "query": {}, "rename": {}, "identifiers": ["microvmIdentifier"]},
      "MICROVM_GetMicrovmImage": {"method": "get", "path": "/2025-09-09/microvm-images/{imageIdentifier}", "query": {}, "rename": {}, "identifiers": ["imageIdentifier"]},
      "MICROVM_GetMicrovmImageBuild": {"method": "get", "path": "/2025-09-09/microvm-images/{imageIdentifier}/versions/{imageVersion}/builds/{buildId}", "query": {}, "rename": {}, "identifiers": ["imageIdentifier", "imageVersion", "buildId"]},
      "MICROVM_GetMicrovmImageVersion": {"method": "get", "path": "/2025-09-09/microvm-images/{imageIdentifier}/versions/{imageVersion}", "query": {}, "rename": {}, "identifiers": ["imageIdentifier", "imageVersion"]},
      "MICROVM_ListManagedMicrovmImageVersions": {"method": "get", "path": "/2025-09-09/managed-microvm-images/{imageIdentifier}/versions", "query": {"maxResults": "maxResults", "nextToken": "nextToken"}, "rename": {}, "identifiers": ["imageIdentifier"]},
      "MICROVM_ListManagedMicrovmImages": {"method": "get", "path": "/2025-09-09/managed-microvm-images", "query": {"maxResults": "maxResults", "nextToken": "nextToken"}, "rename": {}, "identifiers": []},
      "MICROVM_ListMicrovmImageBuilds": {"method": "get", "path": "/2025-09-09/microvm-images/{imageIdentifier}/versions/{imageVersion}/builds", "query": {"maxResults": "maxResults", "nextToken": "nextToken", "architecture": "architecture", "chipset": "chipset", "chipsetGeneration": "chipsetGeneration"}, "rename": {}, "identifiers": ["imageIdentifier", "imageVersion"]},
      "MICROVM_ListMicrovmImageVersions": {"method": "get", "path": "/2025-09-09/microvm-images/{imageIdentifier}/versions", "query": {"maxResults": "maxResults", "nextToken": "nextToken"}, "rename": {}, "identifiers": ["imageIdentifier"]},
      "MICROVM_ListMicrovmImages": {"method": "get", "path": "/2025-09-09/microvm-images", "query": {"maxResults": "maxResults", "nextToken": "nextToken", "nameFilter": "nameFilter"}, "rename": {}, "identifiers": []},
      "MICROVM_ListMicrovms": {"method": "get", "path": "/2025-09-09/microvms", "query": {"maxResults": "maxResults", "nextToken": "nextToken", "imageIdentifier": "imageIdentifier", "imageVersion": "imageVersion"}, "rename": {}, "identifiers": []},
      "MICROVM_ListTags": {"method": "get", "path": "/2017-03-31/tags/{Resource}", "query": {}, "rename": {}, "identifiers": ["Resource"]},
      "MICROVM_ResumeMicrovm": {"method": "post", "path": "/2025-09-09/microvms/{microvmIdentifier}/resume", "query": {}, "rename": {}, "identifiers": ["microvmIdentifier"]},
      "MICROVM_RunMicrovm": {"method": "post", "path": "/2025-09-09/microvms", "query": {}, "rename": {}, "identifiers": ["imageIdentifier"]},
      "MICROVM_SuspendMicrovm": {"method": "post", "path": "/2025-09-09/microvms/{microvmIdentifier}/suspend", "query": {}, "rename": {}, "identifiers": ["microvmIdentifier"]},
      "MICROVM_TagResource": {"method": "post", "path": "/2017-03-31/tags/{Resource}", "query": {}, "rename": {}, "identifiers": ["Resource"]},
      "MICROVM_TerminateMicrovm": {"method": "delete", "path": "/2025-09-09/microvms/{microvmIdentifier}", "query": {}, "rename": {}, "identifiers": ["microvmIdentifier"]},
      "MICROVM_UntagResource": {"method": "delete", "path": "/2017-03-31/tags/{Resource}", "query": {"TagKeys": "tagKeys"}, "rename": {}, "identifiers": ["Resource"]},
      "MICROVM_UpdateMicrovmImage": {"method": "put", "path": "/2025-09-09/microvm-images/{imageIdentifier}", "query": {}, "rename": {}, "identifiers": ["baseImageArn", "buildRoleArn", "imageIdentifier"]},
      "MICROVM_UpdateMicrovmImageVersion": {"method": "patch", "path": "/2025-09-09/microvm-images/{imageIdentifier}/versions/{imageVersion}", "query": {}, "rename": {}, "identifiers": ["imageIdentifier", "imageVersion"]},
      "CORE_CreateNetworkConnector": {"method": "post", "path": "/2026-04-04/network-connectors", "query": {}, "rename": {}, "identifiers": ["Name"]},
      "CORE_DeleteNetworkConnector": {"method": "delete", "path": "/2026-04-04/network-connectors/{Identifier}", "query": {}, "rename": {}, "identifiers": ["Identifier"]},
      "CORE_GetNetworkConnector": {"method": "get", "path": "/2026-04-04/network-connectors/{Identifier}", "query": {}, "rename": {}, "identifiers": ["Identifier"]},
      "CORE_ListNetworkConnectors": {"method": "get", "path": "/2026-04-04/network-connectors", "query": {"State": "State", "Marker": "Marker", "MaxItems": "MaxItems"}, "rename": {}, "identifiers": []},
      "CORE_UpdateNetworkConnector": {"method": "put", "path": "/2026-04-04/network-connectors/{Identifier}", "query": {}, "rename": {}, "identifiers": ["Identifier"]}
   };

   function request(client, operation, aRegion, aParams) {
      aRegion = _$(aRegion, "aRegion").isString().default(client.region);
      if (isUnDef(aParams)) aParams = {};
      _$(aParams, "aParams").isMap().$_();
      var spec = operations[operation];
      spec.identifiers.forEach(function(key) {
         _$(aParams[key], "aParams." + key).isString().$_();
         if (aParams[key].length == 0) throw "aParams." + key + " must not be empty";
      });
      var body = clone(aParams);
      // RFC 3986 encoding, including characters left unescaped by encodeURIComponent.
      function encode(value) {
         return encodeURIComponent(String(value)).replace(/[!'()*]/g, function(c) {
            return "%" + c.charCodeAt(0).toString(16).toUpperCase();
         });
      }
      var path = spec.path.replace(/\{([^}]+)\}/g, function(match, key) {
         _$(aParams[key], "aParams." + key).isString().$_();
         delete body[key];
         return encode(aParams[key]);
      });
      var query = [];
      Object.keys(spec.query).forEach(function(key) {
         delete body[key];
         if (isDef(aParams[key])) {
            var values = isArray(aParams[key]) ? aParams[key] : [aParams[key]];
            values.forEach(function(value) { query.push(encode(spec.query[key]) + "=" + encode(value)); });
         }
      });
      query.sort();
      Object.keys(spec.rename).forEach(function(key) {
         if (isDef(body[key])) body[spec.rename[key]] = body[key];
         delete body[key];
      });
      var url = "https://lambda." + aRegion + ".amazonaws.com" + path;
      if (query.length > 0) url += "?" + query.join("&");
      var rest = $rest({ preAction: client.restPreActionAWSSign4(aRegion, "lambda", {}, __, "application/json") });
      if (spec.method == "get" || spec.method == "delete") return rest[spec.method](url);
      return rest[spec.method](url, body);
   }

   /**
    * <odoc>
    * <key>AWS.LAMBDA_WEB_CreateWebFunction(aRegion, aParams) : Map</key>
    * Calls CreateWebFunction once. aRegion defaults to the instance region. aParams uses AWS SDK input casing.
    * Fields: functionName, revisionConfig, endpointConfig, tags. Required by AWS: functionName.
    * Returns the service response unchanged; pagination and readiness polling are caller managed.
    * See https://docs.aws.amazon.com/lambda/latest/lambda-web/API_CreateWebFunction.html
    * </odoc>
    */
   AWS.prototype.LAMBDA_WEB_CreateWebFunction = function(aRegion, aParams) {
      return request(this, "WEB_CreateWebFunction", aRegion, aParams);
   };

   /**
    * <odoc>
    * <key>AWS.LAMBDA_WEB_CreateWebFunctionEndpoint(aRegion, aParams) : Map</key>
    * Calls CreateWebFunctionEndpoint once. aRegion defaults to the instance region. aParams uses AWS SDK input casing.
    * Fields: functionName, endpointName, description, endpointType, authType, autoDeploymentMode, revisionWeights, regions, scalingConfig, throttleConfig. Required by AWS: functionName, endpointName, endpointType, authType.
    * Returns the service response unchanged; pagination and readiness polling are caller managed.
    * See https://docs.aws.amazon.com/lambda/latest/lambda-web/API_CreateWebFunctionEndpoint.html
    * </odoc>
    */
   AWS.prototype.LAMBDA_WEB_CreateWebFunctionEndpoint = function(aRegion, aParams) {
      return request(this, "WEB_CreateWebFunctionEndpoint", aRegion, aParams);
   };

   /**
    * <odoc>
    * <key>AWS.LAMBDA_WEB_CreateWebFunctionRevision(aRegion, aParams) : Map</key>
    * Calls CreateWebFunctionRevision once. aRegion defaults to the instance region. aParams uses AWS SDK input casing.
    * Fields: functionName, description, kmsKeyArn, buildConfig, serviceConfig. Required by AWS: functionName, buildConfig, serviceConfig.
    * Returns the service response unchanged; pagination and readiness polling are caller managed.
    * See https://docs.aws.amazon.com/lambda/latest/lambda-web/API_CreateWebFunctionRevision.html
    * </odoc>
    */
   AWS.prototype.LAMBDA_WEB_CreateWebFunctionRevision = function(aRegion, aParams) {
      return request(this, "WEB_CreateWebFunctionRevision", aRegion, aParams);
   };

   /**
    * <odoc>
    * <key>AWS.LAMBDA_WEB_DeleteResourcePolicy(aRegion, aParams) : Map</key>
    * Calls DeleteResourcePolicy once. aRegion defaults to the instance region. aParams uses AWS SDK input casing.
    * Fields: resourceArn, revisionId. Required by AWS: resourceArn.
    * Returns the service response unchanged; pagination and readiness polling are caller managed.
    * See https://docs.aws.amazon.com/lambda/latest/lambda-web/API_DeleteResourcePolicy.html
    * </odoc>
    */
   AWS.prototype.LAMBDA_WEB_DeleteResourcePolicy = function(aRegion, aParams) {
      return request(this, "WEB_DeleteResourcePolicy", aRegion, aParams);
   };

   /**
    * <odoc>
    * <key>AWS.LAMBDA_WEB_DeleteWebFunction(aRegion, aParams) : Map</key>
    * Calls DeleteWebFunction once. aRegion defaults to the instance region. aParams uses AWS SDK input casing.
    * Fields: functionName. Required by AWS: functionName.
    * Returns the service response unchanged; pagination and readiness polling are caller managed.
    * See https://docs.aws.amazon.com/lambda/latest/lambda-web/API_DeleteWebFunction.html
    * </odoc>
    */
   AWS.prototype.LAMBDA_WEB_DeleteWebFunction = function(aRegion, aParams) {
      return request(this, "WEB_DeleteWebFunction", aRegion, aParams);
   };

   /**
    * <odoc>
    * <key>AWS.LAMBDA_WEB_DeleteWebFunctionEndpoint(aRegion, aParams) : Map</key>
    * Calls DeleteWebFunctionEndpoint once. aRegion defaults to the instance region. aParams uses AWS SDK input casing.
    * Fields: functionName, endpointName. Required by AWS: functionName, endpointName.
    * Returns the service response unchanged; pagination and readiness polling are caller managed.
    * See https://docs.aws.amazon.com/lambda/latest/lambda-web/API_DeleteWebFunctionEndpoint.html
    * </odoc>
    */
   AWS.prototype.LAMBDA_WEB_DeleteWebFunctionEndpoint = function(aRegion, aParams) {
      return request(this, "WEB_DeleteWebFunctionEndpoint", aRegion, aParams);
   };

   /**
    * <odoc>
    * <key>AWS.LAMBDA_WEB_DeleteWebFunctionRevision(aRegion, aParams) : Map</key>
    * Calls DeleteWebFunctionRevision once. aRegion defaults to the instance region. aParams uses AWS SDK input casing.
    * Fields: functionName, revisionId. Required by AWS: functionName, revisionId.
    * Returns the service response unchanged; pagination and readiness polling are caller managed.
    * See https://docs.aws.amazon.com/lambda/latest/lambda-web/API_DeleteWebFunctionRevision.html
    * </odoc>
    */
   AWS.prototype.LAMBDA_WEB_DeleteWebFunctionRevision = function(aRegion, aParams) {
      return request(this, "WEB_DeleteWebFunctionRevision", aRegion, aParams);
   };

   /**
    * <odoc>
    * <key>AWS.LAMBDA_WEB_GetResourcePolicy(aRegion, aParams) : Map</key>
    * Calls GetResourcePolicy once. aRegion defaults to the instance region. aParams uses AWS SDK input casing.
    * Fields: resourceArn. Required by AWS: resourceArn.
    * Returns the service response unchanged; pagination and readiness polling are caller managed.
    * See https://docs.aws.amazon.com/lambda/latest/lambda-web/API_GetResourcePolicy.html
    * </odoc>
    */
   AWS.prototype.LAMBDA_WEB_GetResourcePolicy = function(aRegion, aParams) {
      return request(this, "WEB_GetResourcePolicy", aRegion, aParams);
   };

   /**
    * <odoc>
    * <key>AWS.LAMBDA_WEB_GetWebAccountSettings(aRegion, aParams) : Map</key>
    * Calls GetWebAccountSettings once. aRegion defaults to the instance region. aParams uses AWS SDK input casing.
    * Fields: (none). Required by AWS: (none).
    * Returns the service response unchanged; pagination and readiness polling are caller managed.
    * See https://docs.aws.amazon.com/lambda/latest/lambda-web/API_GetWebAccountSettings.html
    * </odoc>
    */
   AWS.prototype.LAMBDA_WEB_GetWebAccountSettings = function(aRegion, aParams) {
      return request(this, "WEB_GetWebAccountSettings", aRegion, aParams);
   };

   /**
    * <odoc>
    * <key>AWS.LAMBDA_WEB_GetWebFunction(aRegion, aParams) : Map</key>
    * Calls GetWebFunction once. aRegion defaults to the instance region. aParams uses AWS SDK input casing.
    * Fields: functionName. Required by AWS: functionName.
    * Returns the service response unchanged; pagination and readiness polling are caller managed.
    * See https://docs.aws.amazon.com/lambda/latest/lambda-web/API_GetWebFunction.html
    * </odoc>
    */
   AWS.prototype.LAMBDA_WEB_GetWebFunction = function(aRegion, aParams) {
      return request(this, "WEB_GetWebFunction", aRegion, aParams);
   };

   /**
    * <odoc>
    * <key>AWS.LAMBDA_WEB_GetWebFunctionEndpoint(aRegion, aParams) : Map</key>
    * Calls GetWebFunctionEndpoint once. aRegion defaults to the instance region. aParams uses AWS SDK input casing.
    * Fields: functionName, endpointName. Required by AWS: functionName, endpointName.
    * Returns the service response unchanged; pagination and readiness polling are caller managed.
    * See https://docs.aws.amazon.com/lambda/latest/lambda-web/API_GetWebFunctionEndpoint.html
    * </odoc>
    */
   AWS.prototype.LAMBDA_WEB_GetWebFunctionEndpoint = function(aRegion, aParams) {
      return request(this, "WEB_GetWebFunctionEndpoint", aRegion, aParams);
   };

   /**
    * <odoc>
    * <key>AWS.LAMBDA_WEB_GetWebFunctionRevision(aRegion, aParams) : Map</key>
    * Calls GetWebFunctionRevision once. aRegion defaults to the instance region. aParams uses AWS SDK input casing.
    * Fields: functionName, revisionId. Required by AWS: functionName, revisionId.
    * Returns the service response unchanged; pagination and readiness polling are caller managed.
    * See https://docs.aws.amazon.com/lambda/latest/lambda-web/API_GetWebFunctionRevision.html
    * </odoc>
    */
   AWS.prototype.LAMBDA_WEB_GetWebFunctionRevision = function(aRegion, aParams) {
      return request(this, "WEB_GetWebFunctionRevision", aRegion, aParams);
   };

   /**
    * <odoc>
    * <key>AWS.LAMBDA_WEB_ListTags(aRegion, aParams) : Map</key>
    * Calls ListTags once. aRegion defaults to the instance region. aParams uses AWS SDK input casing.
    * Fields: resource. Required by AWS: resource.
    * Returns the service response unchanged; pagination and readiness polling are caller managed.
    * See https://docs.aws.amazon.com/lambda/latest/lambda-web/API_ListTags.html
    * </odoc>
    */
   AWS.prototype.LAMBDA_WEB_ListTags = function(aRegion, aParams) {
      return request(this, "WEB_ListTags", aRegion, aParams);
   };

   /**
    * <odoc>
    * <key>AWS.LAMBDA_WEB_ListWebFunctionEndpoints(aRegion, aParams) : Map</key>
    * Calls ListWebFunctionEndpoints once. aRegion defaults to the instance region. aParams uses AWS SDK input casing.
    * Fields: functionName, filters, maxResults, nextToken. Required by AWS: functionName.
    * Returns the service response unchanged; pagination and readiness polling are caller managed.
    * See https://docs.aws.amazon.com/lambda/latest/lambda-web/API_ListWebFunctionEndpoints.html
    * </odoc>
    */
   AWS.prototype.LAMBDA_WEB_ListWebFunctionEndpoints = function(aRegion, aParams) {
      return request(this, "WEB_ListWebFunctionEndpoints", aRegion, aParams);
   };

   /**
    * <odoc>
    * <key>AWS.LAMBDA_WEB_ListWebFunctionRevisions(aRegion, aParams) : Map</key>
    * Calls ListWebFunctionRevisions once. aRegion defaults to the instance region. aParams uses AWS SDK input casing.
    * Fields: functionName, filters, maxResults, nextToken. Required by AWS: functionName.
    * Returns the service response unchanged; pagination and readiness polling are caller managed.
    * See https://docs.aws.amazon.com/lambda/latest/lambda-web/API_ListWebFunctionRevisions.html
    * </odoc>
    */
   AWS.prototype.LAMBDA_WEB_ListWebFunctionRevisions = function(aRegion, aParams) {
      return request(this, "WEB_ListWebFunctionRevisions", aRegion, aParams);
   };

   /**
    * <odoc>
    * <key>AWS.LAMBDA_WEB_ListWebFunctions(aRegion, aParams) : Map</key>
    * Calls ListWebFunctions once. aRegion defaults to the instance region. aParams uses AWS SDK input casing.
    * Fields: filters, maxResults, nextToken. Required by AWS: (none).
    * Returns the service response unchanged; pagination and readiness polling are caller managed.
    * See https://docs.aws.amazon.com/lambda/latest/lambda-web/API_ListWebFunctions.html
    * </odoc>
    */
   AWS.prototype.LAMBDA_WEB_ListWebFunctions = function(aRegion, aParams) {
      return request(this, "WEB_ListWebFunctions", aRegion, aParams);
   };

   /**
    * <odoc>
    * <key>AWS.LAMBDA_WEB_PutResourcePolicy(aRegion, aParams) : Map</key>
    * Calls PutResourcePolicy once. aRegion defaults to the instance region. aParams uses AWS SDK input casing.
    * Fields: resourceArn, policy, revisionId. Required by AWS: resourceArn, policy.
    * Returns the service response unchanged; pagination and readiness polling are caller managed.
    * See https://docs.aws.amazon.com/lambda/latest/lambda-web/API_PutResourcePolicy.html
    * </odoc>
    */
   AWS.prototype.LAMBDA_WEB_PutResourcePolicy = function(aRegion, aParams) {
      return request(this, "WEB_PutResourcePolicy", aRegion, aParams);
   };

   /**
    * <odoc>
    * <key>AWS.LAMBDA_WEB_TagResource(aRegion, aParams) : Map</key>
    * Calls TagResource once. aRegion defaults to the instance region. aParams uses AWS SDK input casing.
    * Fields: resource, tags. Required by AWS: resource, tags.
    * Returns the service response unchanged; pagination and readiness polling are caller managed.
    * See https://docs.aws.amazon.com/lambda/latest/lambda-web/API_TagResource.html
    * </odoc>
    */
   AWS.prototype.LAMBDA_WEB_TagResource = function(aRegion, aParams) {
      return request(this, "WEB_TagResource", aRegion, aParams);
   };

   /**
    * <odoc>
    * <key>AWS.LAMBDA_WEB_UntagResource(aRegion, aParams) : Map</key>
    * Calls UntagResource once. aRegion defaults to the instance region. aParams uses AWS SDK input casing.
    * Fields: resource, tagKeys. Required by AWS: resource, tagKeys.
    * Returns the service response unchanged; pagination and readiness polling are caller managed.
    * See https://docs.aws.amazon.com/lambda/latest/lambda-web/API_UntagResource.html
    * </odoc>
    */
   AWS.prototype.LAMBDA_WEB_UntagResource = function(aRegion, aParams) {
      return request(this, "WEB_UntagResource", aRegion, aParams);
   };

   /**
    * <odoc>
    * <key>AWS.LAMBDA_WEB_UpdateWebFunctionEndpoint(aRegion, aParams) : Map</key>
    * Calls UpdateWebFunctionEndpoint once. aRegion defaults to the instance region. aParams uses AWS SDK input casing.
    * Fields: functionName, endpointName, description, authType, autoDeploymentMode, revisionWeights, scalingConfig, throttleConfig. Required by AWS: functionName, endpointName.
    * Returns the service response unchanged; pagination and readiness polling are caller managed.
    * See https://docs.aws.amazon.com/lambda/latest/lambda-web/API_UpdateWebFunctionEndpoint.html
    * </odoc>
    */
   AWS.prototype.LAMBDA_WEB_UpdateWebFunctionEndpoint = function(aRegion, aParams) {
      return request(this, "WEB_UpdateWebFunctionEndpoint", aRegion, aParams);
   };

   /**
    * <odoc>
    * <key>AWS.LAMBDA_MICROVM_CreateMicrovmAuthToken(aRegion, aParams) : Map</key>
    * Calls CreateMicrovmAuthToken once. aRegion defaults to the instance region. aParams uses AWS SDK input casing.
    * Fields: microvmIdentifier, expirationInMinutes, allowedPorts. Required by AWS: microvmIdentifier, expirationInMinutes, allowedPorts.
    * Returns the service response unchanged; pagination and readiness polling are caller managed.
    * See https://docs.aws.amazon.com/lambda/latest/microvm-api/API_CreateMicrovmAuthToken.html
    * </odoc>
    */
   AWS.prototype.LAMBDA_MICROVM_CreateMicrovmAuthToken = function(aRegion, aParams) {
      return request(this, "MICROVM_CreateMicrovmAuthToken", aRegion, aParams);
   };

   /**
    * <odoc>
    * <key>AWS.LAMBDA_MICROVM_CreateMicrovmImage(aRegion, aParams) : Map</key>
    * Calls CreateMicrovmImage once. aRegion defaults to the instance region. aParams uses AWS SDK input casing.
    * Fields: baseImageArn, baseImageVersion, buildRoleArn, description, codeArtifact, logging, egressNetworkConnectors, cpuConfigurations, resources, additionalOsCapabilities, hooks, environmentVariables, name, tags, clientToken. Required by AWS: baseImageArn, buildRoleArn, codeArtifact, name.
    * Returns the service response unchanged; pagination and readiness polling are caller managed.
    * See https://docs.aws.amazon.com/lambda/latest/microvm-api/API_CreateMicrovmImage.html
    * </odoc>
    */
   AWS.prototype.LAMBDA_MICROVM_CreateMicrovmImage = function(aRegion, aParams) {
      return request(this, "MICROVM_CreateMicrovmImage", aRegion, aParams);
   };

   /**
    * <odoc>
    * <key>AWS.LAMBDA_MICROVM_CreateMicrovmShellAuthToken(aRegion, aParams) : Map</key>
    * Calls CreateMicrovmShellAuthToken once. aRegion defaults to the instance region. aParams uses AWS SDK input casing.
    * Fields: microvmIdentifier, expirationInMinutes. Required by AWS: microvmIdentifier, expirationInMinutes.
    * Returns the service response unchanged; pagination and readiness polling are caller managed.
    * See https://docs.aws.amazon.com/lambda/latest/microvm-api/API_CreateMicrovmShellAuthToken.html
    * </odoc>
    */
   AWS.prototype.LAMBDA_MICROVM_CreateMicrovmShellAuthToken = function(aRegion, aParams) {
      return request(this, "MICROVM_CreateMicrovmShellAuthToken", aRegion, aParams);
   };

   /**
    * <odoc>
    * <key>AWS.LAMBDA_MICROVM_DeleteMicrovmImage(aRegion, aParams) : Map</key>
    * Calls DeleteMicrovmImage once. aRegion defaults to the instance region. aParams uses AWS SDK input casing.
    * Fields: imageIdentifier. Required by AWS: imageIdentifier.
    * Returns the service response unchanged; pagination and readiness polling are caller managed.
    * See https://docs.aws.amazon.com/lambda/latest/microvm-api/API_DeleteMicrovmImage.html
    * </odoc>
    */
   AWS.prototype.LAMBDA_MICROVM_DeleteMicrovmImage = function(aRegion, aParams) {
      return request(this, "MICROVM_DeleteMicrovmImage", aRegion, aParams);
   };

   /**
    * <odoc>
    * <key>AWS.LAMBDA_MICROVM_DeleteMicrovmImageVersion(aRegion, aParams) : Map</key>
    * Calls DeleteMicrovmImageVersion once. aRegion defaults to the instance region. aParams uses AWS SDK input casing.
    * Fields: imageIdentifier, imageVersion. Required by AWS: imageIdentifier, imageVersion.
    * Returns the service response unchanged; pagination and readiness polling are caller managed.
    * See https://docs.aws.amazon.com/lambda/latest/microvm-api/API_DeleteMicrovmImageVersion.html
    * </odoc>
    */
   AWS.prototype.LAMBDA_MICROVM_DeleteMicrovmImageVersion = function(aRegion, aParams) {
      return request(this, "MICROVM_DeleteMicrovmImageVersion", aRegion, aParams);
   };

   /**
    * <odoc>
    * <key>AWS.LAMBDA_MICROVM_GetMicrovm(aRegion, aParams) : Map</key>
    * Calls GetMicrovm once. aRegion defaults to the instance region. aParams uses AWS SDK input casing.
    * Fields: microvmIdentifier. Required by AWS: microvmIdentifier.
    * Returns the service response unchanged; pagination and readiness polling are caller managed.
    * See https://docs.aws.amazon.com/lambda/latest/microvm-api/API_GetMicrovm.html
    * </odoc>
    */
   AWS.prototype.LAMBDA_MICROVM_GetMicrovm = function(aRegion, aParams) {
      return request(this, "MICROVM_GetMicrovm", aRegion, aParams);
   };

   /**
    * <odoc>
    * <key>AWS.LAMBDA_MICROVM_GetMicrovmImage(aRegion, aParams) : Map</key>
    * Calls GetMicrovmImage once. aRegion defaults to the instance region. aParams uses AWS SDK input casing.
    * Fields: imageIdentifier. Required by AWS: imageIdentifier.
    * Returns the service response unchanged; pagination and readiness polling are caller managed.
    * See https://docs.aws.amazon.com/lambda/latest/microvm-api/API_GetMicrovmImage.html
    * </odoc>
    */
   AWS.prototype.LAMBDA_MICROVM_GetMicrovmImage = function(aRegion, aParams) {
      return request(this, "MICROVM_GetMicrovmImage", aRegion, aParams);
   };

   /**
    * <odoc>
    * <key>AWS.LAMBDA_MICROVM_GetMicrovmImageBuild(aRegion, aParams) : Map</key>
    * Calls GetMicrovmImageBuild once. aRegion defaults to the instance region. aParams uses AWS SDK input casing.
    * Fields: imageIdentifier, imageVersion, buildId. Required by AWS: imageIdentifier, imageVersion, buildId.
    * Returns the service response unchanged; pagination and readiness polling are caller managed.
    * See https://docs.aws.amazon.com/lambda/latest/microvm-api/API_GetMicrovmImageBuild.html
    * </odoc>
    */
   AWS.prototype.LAMBDA_MICROVM_GetMicrovmImageBuild = function(aRegion, aParams) {
      return request(this, "MICROVM_GetMicrovmImageBuild", aRegion, aParams);
   };

   /**
    * <odoc>
    * <key>AWS.LAMBDA_MICROVM_GetMicrovmImageVersion(aRegion, aParams) : Map</key>
    * Calls GetMicrovmImageVersion once. aRegion defaults to the instance region. aParams uses AWS SDK input casing.
    * Fields: imageIdentifier, imageVersion. Required by AWS: imageIdentifier, imageVersion.
    * Returns the service response unchanged; pagination and readiness polling are caller managed.
    * See https://docs.aws.amazon.com/lambda/latest/microvm-api/API_GetMicrovmImageVersion.html
    * </odoc>
    */
   AWS.prototype.LAMBDA_MICROVM_GetMicrovmImageVersion = function(aRegion, aParams) {
      return request(this, "MICROVM_GetMicrovmImageVersion", aRegion, aParams);
   };

   /**
    * <odoc>
    * <key>AWS.LAMBDA_MICROVM_ListManagedMicrovmImageVersions(aRegion, aParams) : Map</key>
    * Calls ListManagedMicrovmImageVersions once. aRegion defaults to the instance region. aParams uses AWS SDK input casing.
    * Fields: maxResults, nextToken, imageIdentifier. Required by AWS: imageIdentifier.
    * Returns the service response unchanged; pagination and readiness polling are caller managed.
    * See https://docs.aws.amazon.com/lambda/latest/microvm-api/API_ListManagedMicrovmImageVersions.html
    * </odoc>
    */
   AWS.prototype.LAMBDA_MICROVM_ListManagedMicrovmImageVersions = function(aRegion, aParams) {
      return request(this, "MICROVM_ListManagedMicrovmImageVersions", aRegion, aParams);
   };

   /**
    * <odoc>
    * <key>AWS.LAMBDA_MICROVM_ListManagedMicrovmImages(aRegion, aParams) : Map</key>
    * Calls ListManagedMicrovmImages once. aRegion defaults to the instance region. aParams uses AWS SDK input casing.
    * Fields: maxResults, nextToken. Required by AWS: (none).
    * Returns the service response unchanged; pagination and readiness polling are caller managed.
    * See https://docs.aws.amazon.com/lambda/latest/microvm-api/API_ListManagedMicrovmImages.html
    * </odoc>
    */
   AWS.prototype.LAMBDA_MICROVM_ListManagedMicrovmImages = function(aRegion, aParams) {
      return request(this, "MICROVM_ListManagedMicrovmImages", aRegion, aParams);
   };

   /**
    * <odoc>
    * <key>AWS.LAMBDA_MICROVM_ListMicrovmImageBuilds(aRegion, aParams) : Map</key>
    * Calls ListMicrovmImageBuilds once. aRegion defaults to the instance region. aParams uses AWS SDK input casing.
    * Fields: maxResults, nextToken, imageIdentifier, imageVersion, architecture, chipset, chipsetGeneration. Required by AWS: imageIdentifier, imageVersion.
    * Returns the service response unchanged; pagination and readiness polling are caller managed.
    * See https://docs.aws.amazon.com/lambda/latest/microvm-api/API_ListMicrovmImageBuilds.html
    * </odoc>
    */
   AWS.prototype.LAMBDA_MICROVM_ListMicrovmImageBuilds = function(aRegion, aParams) {
      return request(this, "MICROVM_ListMicrovmImageBuilds", aRegion, aParams);
   };

   /**
    * <odoc>
    * <key>AWS.LAMBDA_MICROVM_ListMicrovmImageVersions(aRegion, aParams) : Map</key>
    * Calls ListMicrovmImageVersions once. aRegion defaults to the instance region. aParams uses AWS SDK input casing.
    * Fields: maxResults, nextToken, imageIdentifier. Required by AWS: imageIdentifier.
    * Returns the service response unchanged; pagination and readiness polling are caller managed.
    * See https://docs.aws.amazon.com/lambda/latest/microvm-api/API_ListMicrovmImageVersions.html
    * </odoc>
    */
   AWS.prototype.LAMBDA_MICROVM_ListMicrovmImageVersions = function(aRegion, aParams) {
      return request(this, "MICROVM_ListMicrovmImageVersions", aRegion, aParams);
   };

   /**
    * <odoc>
    * <key>AWS.LAMBDA_MICROVM_ListMicrovmImages(aRegion, aParams) : Map</key>
    * Calls ListMicrovmImages once. aRegion defaults to the instance region. aParams uses AWS SDK input casing.
    * Fields: maxResults, nextToken, nameFilter. Required by AWS: (none).
    * Returns the service response unchanged; pagination and readiness polling are caller managed.
    * See https://docs.aws.amazon.com/lambda/latest/microvm-api/API_ListMicrovmImages.html
    * </odoc>
    */
   AWS.prototype.LAMBDA_MICROVM_ListMicrovmImages = function(aRegion, aParams) {
      return request(this, "MICROVM_ListMicrovmImages", aRegion, aParams);
   };

   /**
    * <odoc>
    * <key>AWS.LAMBDA_MICROVM_ListMicrovms(aRegion, aParams) : Map</key>
    * Calls ListMicrovms once. aRegion defaults to the instance region. aParams uses AWS SDK input casing.
    * Fields: maxResults, nextToken, imageIdentifier, imageVersion. Required by AWS: (none).
    * Returns the service response unchanged; pagination and readiness polling are caller managed.
    * See https://docs.aws.amazon.com/lambda/latest/microvm-api/API_ListMicrovms.html
    * </odoc>
    */
   AWS.prototype.LAMBDA_MICROVM_ListMicrovms = function(aRegion, aParams) {
      return request(this, "MICROVM_ListMicrovms", aRegion, aParams);
   };

   /**
    * <odoc>
    * <key>AWS.LAMBDA_MICROVM_ListTags(aRegion, aParams) : Map</key>
    * Calls ListTags once. aRegion defaults to the instance region. aParams uses AWS SDK input casing.
    * Fields: Resource. Required by AWS: Resource.
    * Returns the service response unchanged; pagination and readiness polling are caller managed.
    * See https://docs.aws.amazon.com/lambda/latest/microvm-api/API_ListTags.html
    * </odoc>
    */
   AWS.prototype.LAMBDA_MICROVM_ListTags = function(aRegion, aParams) {
      return request(this, "MICROVM_ListTags", aRegion, aParams);
   };

   /**
    * <odoc>
    * <key>AWS.LAMBDA_MICROVM_ResumeMicrovm(aRegion, aParams) : Map</key>
    * Calls ResumeMicrovm once. aRegion defaults to the instance region. aParams uses AWS SDK input casing.
    * Fields: microvmIdentifier. Required by AWS: microvmIdentifier.
    * Returns the service response unchanged; pagination and readiness polling are caller managed.
    * See https://docs.aws.amazon.com/lambda/latest/microvm-api/API_ResumeMicrovm.html
    * </odoc>
    */
   AWS.prototype.LAMBDA_MICROVM_ResumeMicrovm = function(aRegion, aParams) {
      return request(this, "MICROVM_ResumeMicrovm", aRegion, aParams);
   };

   /**
    * <odoc>
    * <key>AWS.LAMBDA_MICROVM_RunMicrovm(aRegion, aParams) : Map</key>
    * Calls RunMicrovm once. aRegion defaults to the instance region. aParams uses AWS SDK input casing.
    * Fields: ingressNetworkConnectors, egressNetworkConnectors, imageIdentifier, imageVersion, executionRoleArn, idlePolicy, logging, runHookPayload, maximumDurationInSeconds, clientToken. Required by AWS: imageIdentifier.
    * Returns the service response unchanged; pagination and readiness polling are caller managed.
    * See https://docs.aws.amazon.com/lambda/latest/microvm-api/API_RunMicrovm.html
    * </odoc>
    */
   AWS.prototype.LAMBDA_MICROVM_RunMicrovm = function(aRegion, aParams) {
      return request(this, "MICROVM_RunMicrovm", aRegion, aParams);
   };

   /**
    * <odoc>
    * <key>AWS.LAMBDA_MICROVM_SuspendMicrovm(aRegion, aParams) : Map</key>
    * Calls SuspendMicrovm once. aRegion defaults to the instance region. aParams uses AWS SDK input casing.
    * Fields: microvmIdentifier. Required by AWS: microvmIdentifier.
    * Returns the service response unchanged; pagination and readiness polling are caller managed.
    * See https://docs.aws.amazon.com/lambda/latest/microvm-api/API_SuspendMicrovm.html
    * </odoc>
    */
   AWS.prototype.LAMBDA_MICROVM_SuspendMicrovm = function(aRegion, aParams) {
      return request(this, "MICROVM_SuspendMicrovm", aRegion, aParams);
   };

   /**
    * <odoc>
    * <key>AWS.LAMBDA_MICROVM_TagResource(aRegion, aParams) : Map</key>
    * Calls TagResource once. aRegion defaults to the instance region. aParams uses AWS SDK input casing.
    * Fields: Resource, Tags. Required by AWS: Resource, Tags.
    * Returns the service response unchanged; pagination and readiness polling are caller managed.
    * See https://docs.aws.amazon.com/lambda/latest/microvm-api/API_TagResource.html
    * </odoc>
    */
   AWS.prototype.LAMBDA_MICROVM_TagResource = function(aRegion, aParams) {
      return request(this, "MICROVM_TagResource", aRegion, aParams);
   };

   /**
    * <odoc>
    * <key>AWS.LAMBDA_MICROVM_TerminateMicrovm(aRegion, aParams) : Map</key>
    * Calls TerminateMicrovm once. aRegion defaults to the instance region. aParams uses AWS SDK input casing.
    * Fields: microvmIdentifier. Required by AWS: microvmIdentifier.
    * Returns the service response unchanged; pagination and readiness polling are caller managed.
    * See https://docs.aws.amazon.com/lambda/latest/microvm-api/API_TerminateMicrovm.html
    * </odoc>
    */
   AWS.prototype.LAMBDA_MICROVM_TerminateMicrovm = function(aRegion, aParams) {
      return request(this, "MICROVM_TerminateMicrovm", aRegion, aParams);
   };

   /**
    * <odoc>
    * <key>AWS.LAMBDA_MICROVM_UntagResource(aRegion, aParams) : Map</key>
    * Calls UntagResource once. aRegion defaults to the instance region. aParams uses AWS SDK input casing.
    * Fields: Resource, TagKeys. Required by AWS: Resource, TagKeys.
    * Returns the service response unchanged; pagination and readiness polling are caller managed.
    * See https://docs.aws.amazon.com/lambda/latest/microvm-api/API_UntagResource.html
    * </odoc>
    */
   AWS.prototype.LAMBDA_MICROVM_UntagResource = function(aRegion, aParams) {
      return request(this, "MICROVM_UntagResource", aRegion, aParams);
   };

   /**
    * <odoc>
    * <key>AWS.LAMBDA_MICROVM_UpdateMicrovmImage(aRegion, aParams) : Map</key>
    * Calls UpdateMicrovmImage once. aRegion defaults to the instance region. aParams uses AWS SDK input casing.
    * Fields: baseImageArn, baseImageVersion, buildRoleArn, description, codeArtifact, logging, egressNetworkConnectors, cpuConfigurations, resources, additionalOsCapabilities, hooks, environmentVariables, imageIdentifier, clientToken. Required by AWS: baseImageArn, buildRoleArn, codeArtifact, imageIdentifier.
    * Returns the service response unchanged; pagination and readiness polling are caller managed.
    * See https://docs.aws.amazon.com/lambda/latest/microvm-api/API_UpdateMicrovmImage.html
    * </odoc>
    */
   AWS.prototype.LAMBDA_MICROVM_UpdateMicrovmImage = function(aRegion, aParams) {
      return request(this, "MICROVM_UpdateMicrovmImage", aRegion, aParams);
   };

   /**
    * <odoc>
    * <key>AWS.LAMBDA_MICROVM_UpdateMicrovmImageVersion(aRegion, aParams) : Map</key>
    * Calls UpdateMicrovmImageVersion once. aRegion defaults to the instance region. aParams uses AWS SDK input casing.
    * Fields: imageIdentifier, imageVersion, status. Required by AWS: imageIdentifier, imageVersion, status.
    * Returns the service response unchanged; pagination and readiness polling are caller managed.
    * See https://docs.aws.amazon.com/lambda/latest/microvm-api/API_UpdateMicrovmImageVersion.html
    * </odoc>
    */
   AWS.prototype.LAMBDA_MICROVM_UpdateMicrovmImageVersion = function(aRegion, aParams) {
      return request(this, "MICROVM_UpdateMicrovmImageVersion", aRegion, aParams);
   };

   /**
    * <odoc>
    * <key>AWS.LAMBDA_CORE_CreateNetworkConnector(aRegion, aParams) : Map</key>
    * Calls CreateNetworkConnector once. aRegion defaults to the instance region. aParams uses AWS SDK input casing.
    * Fields: Name, Configuration, OperatorRole, ClientToken, Tags. Required by AWS: Name, Configuration.
    * Returns the service response unchanged; pagination and readiness polling are caller managed.
    * See https://docs.aws.amazon.com/lambda/latest/lambda-core/API_CreateNetworkConnector.html
    * </odoc>
    */
   AWS.prototype.LAMBDA_CORE_CreateNetworkConnector = function(aRegion, aParams) {
      return request(this, "CORE_CreateNetworkConnector", aRegion, aParams);
   };

   /**
    * <odoc>
    * <key>AWS.LAMBDA_CORE_DeleteNetworkConnector(aRegion, aParams) : Map</key>
    * Calls DeleteNetworkConnector once. aRegion defaults to the instance region. aParams uses AWS SDK input casing.
    * Fields: Identifier. Required by AWS: Identifier.
    * Returns the service response unchanged; pagination and readiness polling are caller managed.
    * See https://docs.aws.amazon.com/lambda/latest/lambda-core/API_DeleteNetworkConnector.html
    * </odoc>
    */
   AWS.prototype.LAMBDA_CORE_DeleteNetworkConnector = function(aRegion, aParams) {
      return request(this, "CORE_DeleteNetworkConnector", aRegion, aParams);
   };

   /**
    * <odoc>
    * <key>AWS.LAMBDA_CORE_GetNetworkConnector(aRegion, aParams) : Map</key>
    * Calls GetNetworkConnector once. aRegion defaults to the instance region. aParams uses AWS SDK input casing.
    * Fields: Identifier. Required by AWS: Identifier.
    * Returns the service response unchanged; pagination and readiness polling are caller managed.
    * See https://docs.aws.amazon.com/lambda/latest/lambda-core/API_GetNetworkConnector.html
    * </odoc>
    */
   AWS.prototype.LAMBDA_CORE_GetNetworkConnector = function(aRegion, aParams) {
      return request(this, "CORE_GetNetworkConnector", aRegion, aParams);
   };

   /**
    * <odoc>
    * <key>AWS.LAMBDA_CORE_ListNetworkConnectors(aRegion, aParams) : Map</key>
    * Calls ListNetworkConnectors once. aRegion defaults to the instance region. aParams uses AWS SDK input casing.
    * Fields: State, Marker, MaxItems. Required by AWS: (none).
    * Returns the service response unchanged; pagination and readiness polling are caller managed.
    * See https://docs.aws.amazon.com/lambda/latest/lambda-core/API_ListNetworkConnectors.html
    * </odoc>
    */
   AWS.prototype.LAMBDA_CORE_ListNetworkConnectors = function(aRegion, aParams) {
      return request(this, "CORE_ListNetworkConnectors", aRegion, aParams);
   };

   /**
    * <odoc>
    * <key>AWS.LAMBDA_CORE_UpdateNetworkConnector(aRegion, aParams) : Map</key>
    * Calls UpdateNetworkConnector once. aRegion defaults to the instance region. aParams uses AWS SDK input casing.
    * Fields: Identifier, Configuration, OperatorRole, ClientToken. Required by AWS: Identifier.
    * Returns the service response unchanged; pagination and readiness polling are caller managed.
    * See https://docs.aws.amazon.com/lambda/latest/lambda-core/API_UpdateNetworkConnector.html
    * </odoc>
    */
   AWS.prototype.LAMBDA_CORE_UpdateNetworkConnector = function(aRegion, aParams) {
      return request(this, "CORE_UpdateNetworkConnector", aRegion, aParams);
   };
})();
