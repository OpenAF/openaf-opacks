// Author: Nuno Aguiar
// BedRock

loadLib("aws_core.js")

/**
 * <odoc>
 * <key>AWS.BEDROCK_ListFoundationalModels(aRegion, outputMode, provider, inferenceType, customType) : Array</key>
 * Given aRegion, outputMode, provider, inferenceType and customType will return a list of foundational models available.
 * </odoc>
 */
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

/**
 * <odoc>
 * <key>AWS.BEDROCK_InvokeModel(aRegion, aModelId, aInput) : Map</key>
 * Given aRegion, aModelId and aInput will invoke the specified model and return the results.
 * </odoc>
 */
AWS.prototype.BEDROCK_InvokeModel = function(aRegion, aModelId, aInput) {
  aRegion = _$(aRegion, "aRegion").isString().default(this.region)
  _$(aModelId, "aModelId").isString().$_()
  _$(aInput, "aInput").$_()

  var uri = "/model/" + encodeURIComponent(aModelId) + "/invoke"
  var aURL = "https://bedrock-runtime." + aRegion + ".amazonaws.com/model/" + encodeURIComponent(aModelId) + "/invoke"
  var url = new java.net.URL(aURL)
  var aHost = String(url.getHost())
  var aURI = String(url.getPath())

  //if (isString(aInput)) aInput = { "prompt": aInput }

  var res = this.postURLEncoded(aURL, uri, __, aInput, "bedrock", aHost, aRegion, __, __, 'application/json', true)
  if (isDef(res.error)) return res

  return res
}

ow.loadAI()
ow.ai.__gpttypes.bedrock = {
  create: _p => {
    if (isDef(_p) && isNumber(_p.timeout)) __flags.HTTP_CON_TIMEOUT = _p.timeout

    ow.loadObj()
    aOptions = _$(_p.options, "aOptions").isMap().$_()
    aOptions.params = _$(aOptions.params, "aOptions.params").isMap().default({})
    //aOptions.timeout = _$(aOptions.timeout, "aOptions.timeout").isNumber().default(5 * 60000)
    aOptions.model = _$(aOptions.model, "aOptions.model").isString().default("amazon.titan-text-express-v1")
    aOptions.temperature = _$(aOptions.temperature, "aOptions.temperature").isNumber().default(__)
    aOptions.region = _$(aOptions.region, "aOptions.region").isString().default("us-east-1")

    var aws = new AWS()
    var _model = aOptions.model
    var _temperature = aOptions.temperature
    var _r = {
      conversation: [],
      getConversation: () => {
        return _r.conversation
      },
      setConversation: (aConversation) => {
        if (isArray(aConversation)) _r.conversation = aConversation
        return _r
      },
      prompt: (aPrompt, aModel, aTemperature, aJsonFlag) => {
        var __r = _r.rawPrompt(aPrompt, aModel, aTemperature, aJsonFlag)
        if (isDef(__r) && isArray(__r.results) && __r.results.length > 0) {
            if (__r.results[0].completionReason == "FINISH") {
               return __r.results[0].outputText.trim()
            } else {
              if (isMap(__r.results[0])) {
                return __r.results[0]
              }
            }
         }
         return __r
      },
      promptImage: (aPrompt, aImage, aDetailLevel, aRole, aModel, aTemperature, aJsonFlag) => {
        throw "Not implemented yet"
      },
      rawPrompt: (aPrompt, aModel, aTemperature, aJsonFlag) => {
        aPrompt = _$(aPrompt, "aPrompt").isString().$_()
        aModel = _$(aModel, "aModel").isString().default(_model)
        aTemperature = _$(aTemperature, "aTemperature").isNumber().default(_temperature)
        aJsonFlag = _$(aJsonFlag, "aJsonFlag").isBoolean().default(false)

        //aOptions.promptKey = _$(aOptions.promptKey, "aOptions.promptKey").isString().default("inputText")
        //aOptions.tempKey   = _$(aOptions.tempKey, "aOptions.tempKey").isString().default("textGenerationConfig.temperature")
        //aOptions.promptKeyMap = _$(toBoolean(aOptions.promptKeyMap), "aOptions.promptKeyMap").isBoolean().default(false)
        aOptions.jsonFlag  = _$(toBoolean(aOptions.jsonFlag) || aJsonFlag, "aOptions.jsonFlag").isBoolean().default(false)

        //var msgs = []
        //if (isString(aPrompt)) aPrompt = [ aPrompt ]
        //aPrompt = _r.conversation.concat(aPrompt)
        //msgs = aPrompt.map(c => isMap(c) ? c.content : c)

        //if (aJsonFlag) msgs.unshift({ role: "system", content: "output json" })
        if (aJsonFlag) aPrompt += ". answer in json."

        var _m = {}
        
        if (aModel.indexOf("amazon.titan-") >= 0) {
          _m = {
            "inputText": aPrompt,
            "textGenerationConfig": {
              "temperature": aTemperature
            }
          }
        } else if (aModel.indexOf("amazon.nova-") >= 0) {
          _m = {
            messages: _r.conversation.concat({role: "user", content: [ { text: aPrompt } ] }).filter(m => m.role == "user"),
            schemaVersion: "messages-v1",
            system: _r.conversation.filter(m => m.role == "system").map(m => ({ text : m.content })),
            inferenceConfig: {
              temperature: aTemperature
            }
          }
          if (_m.system.length == 0) delete _m.system
        } else if (aModel.indexOf("meta.") >= 0) {
	        //var msgs = []
          //msgs = _r.conversation.concat({role: "user", content: aPrompt })
          _m = {
	          "prompt": aPrompt,
	          "temperature": aTemperature
	        }
        } else {
          _m = {
              "prompt": aPrompt,
              "temperature": aTemperature
          }
        }
        //$$(_m).set(aOptions.promptKey, aOptions.promptKeyMap ? msgs : msgs.join("; "))
        //$$(_m).set(aOptions.tempKey, aTemperature)
    
        // export OAFP_MODEL="(type: bedrock, timeout: 900000, options: (model: 'amazon.nova-micro-v1:0', temperature: 0, params: (inferenceConfig: (max_new_tokens: 1024))))"
        // export OAFP_MODEL="(type: bedrock, timeout: 900000, options: (model: 'amazon.titan-text-express-v1', temperature: 0, params: (textGenerationConfig: (maxTokenCount: 2048))))"
        // export OAFP_MODEL="(type: bedrock, timeout: 900000, options: (model: 'us.meta.llama3-2-3b-instruct-v1:0', temperature: 0, params: (max_gen_len: 2048) ))"

        var aInput = merge(_m, aOptions.params)
        var res = aws.BEDROCK_InvokeModel(aOptions.region, aModel, aInput)
        if (isDef(res.error)) return res
        if (isDef(res.generation)) return res.generation
        if (isDef(res.output) && isDef(res.output.message) && isArray(res.output.message.content)) {
          _r.conversation = _r.conversation.concat(res.output.message.content)
          return (isDef(res.output.message.content[0]) && isString(res.output.message.content[0].text) ? res.output.message.content[0].text : res.output.message.content)
        }

        if (aJsonFlag) {
          _r.conversation.push(res)
          return res
        } else {
          return res
        }
      },
      rawImgGen: (aPrompt, aModel) => {
        throw "Not implemented yet"
      },
      promptImgGen: (aPrompt, aModel) => {
        throw "Not implemented yet"
      },
      addPrompt: (aRole, aPrompt) => {
        if (isUnDef(aPrompt)) {
            aPrompt = aRole
            aRole = "user"
         }
         if (isString(aPrompt)) _r.conversation.push({ role: aRole.toLowerCase(), content: aPrompt })
         if (isArray(aPrompt))  _r.conversation = _r.conversation.concat(aPrompt)
         return _r
      },
      addUserPrompt: (aPrompt) => {
        _r.conversation.push({ role: "user", content: aPrompt })
        return _r
      },
      addSystemPrompt: (aPrompt) => {
        _r.conversation.push({ role: "system", content: aPrompt })
        return _r
      },
      cleanPrompt: () => {
        _r.conversation = []
        return _r
      },
      getModels: () => {
        var res = aws.BEDROCK_ListFoundationalModels(aOptions.region)
        return res
      },
    }
    return _r
  }
}
