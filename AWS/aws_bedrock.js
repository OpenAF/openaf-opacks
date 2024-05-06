// Author: Nuno Aguiar
// BedRock

loadLib("aws_core.js")

AWS.prototype.BEDROCK_ListFoundationalModels = function(aRegion, outputMode, provider, inferenceType, customType) {
  aRegion = _$(aRegion, "aRegion").isString().default(this.region)
  
  var uri = "/foundation-models"
  var aURL = "https://bedrock." + aRegion + ".amazonaws.com" + uri
  var url = new java.net.URL(aURL)
  var aHost = String(url.getHost())
  var aURI = String(url.getPath())

  var params = {
    byCustomizationType: customType,
    byInferenceType: inferenceType,
    byOutputModality: outputMode,
    byProvider: provider
  }
 
  var res = this.getURLEncoded(aURL, uri, $rest().query(params), {}, "bedrock", aHost, aRegion)
  if (isDef(res.error)) return res

  if (isDef(res.modelSummaries)) res = res.modelSummaries
  return res
}

AWS.prototype.BEDROCK_InvokeModel = function(aRegion, aModelId, aInput) {
  aRegion = _$(aRegion, "aRegion").isString().default(this.region)
  _$(aModelId, "aModelId").isString().$_()
  _$(aInput, "aInput").$_()

  var uri = "/model/" + aModelId + "/invoke"
  var aURL = "https://bedrock-runtime." + aRegion + ".amazonaws.com" + uri 
  var url = new java.net.URL(aURL)
  var aHost = String(url.getHost())
  var aURI = String(url.getPath())

  if (isString(aInput)) aInput = { "prompt": aInput }

  var res = this.postURLEncoded(aURL, uri, __, aInput, "bedrock", aHost, aRegion, __, __, 'application/json')
  if (isDef(res.error)) return res

  return res
}