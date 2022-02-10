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