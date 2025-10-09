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
    var _lastStats = __
    var _resetStats = () => { _lastStats = __ }
    var _captureStats = (aResponse, aModelName) => {
      if (!isMap(aResponse)) {
        _lastStats = __
        return _lastStats
      }

      var stats = { vendor: "bedrock" }
      var modelName = isString(aModelName) ? aModelName : _model
      if (isString(modelName)) stats.model = modelName

      // Handle different Bedrock model response formats
      if (isDef(aResponse.usage)) {
        var tokens = {}
        if (isDef(aResponse.usage.inputTokens)) tokens.prompt = aResponse.usage.inputTokens
        if (isDef(aResponse.usage.outputTokens)) tokens.completion = aResponse.usage.outputTokens
        if (isDef(aResponse.usage.totalTokens)) tokens.total = aResponse.usage.totalTokens
        // Also handle alternative token field names
        if (isDef(aResponse.usage.input_tokens)) tokens.prompt = aResponse.usage.input_tokens
        if (isDef(aResponse.usage.output_tokens)) tokens.completion = aResponse.usage.output_tokens
        if (isDef(aResponse.usage.total_tokens)) tokens.total = aResponse.usage.total_tokens
        if (Object.keys(tokens).length > 0) stats.tokens = tokens
        stats.usage = aResponse.usage
      }

      // Handle stop reasons
      if (isString(aResponse.stop_reason)) stats.stopReason = aResponse.stop_reason
      if (isString(aResponse.stopReason)) stats.stopReason = aResponse.stopReason
      
      // Handle results array finish reasons (Titan models)
      if (isArray(aResponse.results)) {
        var finishReasons = aResponse.results
          .filter(r => isDef(r) && isDef(r.completionReason))
          .map(r => r.completionReason)
        if (finishReasons.length > 0) stats.finishReasons = finishReasons
      }

      // Handle output message structure (Nova/Claude models)
      if (isDef(aResponse.output) && isDef(aResponse.output.message)) {
        if (isString(aResponse.output.message.role)) stats.role = aResponse.output.message.role
        if (isArray(aResponse.output.message.content)) {
          var contentTypes = aResponse.output.message.content
            .filter(c => isMap(c) && isString(c.type))
            .map(c => c.type)
          if (contentTypes.length > 0) stats.contentTypes = contentTypes
        }
      }

      if (Object.keys(stats).filter(k => k != "vendor").length == 0) stats = __
      _lastStats = stats
      return _lastStats
    }
    var _r = {
      conversation: [],
      tools: {},
      getConversation: () => {
        return _r.conversation
      },
      setConversation: (aConversation) => {
        if (isArray(aConversation)) _r.conversation = aConversation
        return _r
      },
      getLastStats: () => _lastStats,
      setTool: (aName, aDesc, aParams, aFn) => {
        _r.tools[aName] = {
          type: "function",
          function: {
            name: aName,
            description: aDesc,
            parameters: aParams
          },
          fn: aFn
        }
        return _r
      },
      prompt: (aPrompt, aModel, aTemperature, aJsonFlag, tools) => {
        var __r = _r.rawPrompt(aPrompt, aModel, aTemperature, aJsonFlag, tools)
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
      rawPrompt: (aPrompt, aModel, aTemperature, aJsonFlag, aTools) => {
        aPrompt = _$(aPrompt, "aPrompt").default("")
        aModel = _$(aModel, "aModel").isString().default(_model)
        aTemperature = _$(aTemperature, "aTemperature").isNumber().default(_temperature)
        aJsonFlag = _$(aJsonFlag, "aJsonFlag").isBoolean().default(false)

        var cv = []

        // Resolve tools that should be exposed to the model and keep a lookup by name
        var toolRegistry = {}
        Object.keys(_r.tools).forEach(name => {
          if (isMap(_r.tools[name])) toolRegistry[name] = _r.tools[name]
        })

        var sanitizeToolSchema = function(schema, forNova) {
          if (!isMap(schema)) return schema
          var sanitized = schema
          try {
            sanitized = JSON.parse(JSON.stringify(schema))
          } catch(je) {}

          if (isDef(sanitized.required) && !isArray(sanitized.required)) {
            if (isMap(sanitized.required)) {
              sanitized.required = Object.keys(sanitized.required)
            } else if (isString(sanitized.required)) {
              sanitized.required = [ sanitized.required ]
            } else {
              delete sanitized.required
            }
          }
          
          // For Nova models, remove empty required array - let the model infer from the schema
          if (forNova && isArray(sanitized.required) && sanitized.required.length == 0) {
            delete sanitized.required
          }
          
          if (!forNova && isArray(sanitized.required) && sanitized.required.length == 0) delete sanitized.required
          delete sanitized.$schema
          delete sanitized.$id
          delete sanitized.definitions
          return sanitized
        }

        var toolsToUse = []
        var addTool = function(tool, fallbackName) {
          if (isUnDef(tool) && isString(fallbackName) && isMap(toolRegistry[fallbackName])) {
            tool = toolRegistry[fallbackName]
          }
          if (!isMap(tool)) return
          var toolName = fallbackName
          if (isMap(tool.function) && isString(tool.function.name)) toolName = tool.function.name
          if (!isString(toolName)) return

          if (!isMap(toolRegistry[toolName])) toolRegistry[toolName] = tool
          var finalTool = toolRegistry[toolName]
          if (!isMap(finalTool) || !isMap(finalTool.function)) return

          if (toolsToUse.filter(t => isMap(t.function) && t.function.name === toolName).length == 0) {
            toolsToUse.push(finalTool)
          }
        }

        if (isArray(aTools)) {
          aTools.forEach(tool => {
            if (isString(tool)) {
              addTool(toolRegistry[tool], tool)
            } else if (isMap(tool)) {
              addTool(tool, tool.name)
            }
          })
        } else if (isMap(aTools)) {
          Object.keys(aTools).forEach(name => {
            addTool(toolRegistry[name], name)
            addTool(aTools[name], name)
          })
        } else {
          Object.keys(toolRegistry).forEach(name => addTool(toolRegistry[name], name))
        }

        //aOptions.promptKey = _$(aOptions.promptKey, "aOptions.promptKey").isString().default("inputText")
        //aOptions.tempKey   = _$(aOptions.tempKey, "aOptions.tempKey").isString().default("textGenerationConfig.temperature")
        //aOptions.promptKeyMap = _$(toBoolean(aOptions.promptKeyMap), "aOptions.promptKeyMap").isBoolean().default(false)
        aOptions.jsonFlag = _$(toBoolean(aOptions.jsonFlag) || aJsonFlag, "aOptions.jsonFlag").isBoolean().default(false)

        //var msgs = []
        //if (isString(aPrompt)) aPrompt = [ aPrompt ]
        //aPrompt = _r.conversation.concat(aPrompt)
        //msgs = aPrompt.map(c => isMap(c) ? c.content : c)

        //if (aJsonFlag) msgs.unshift({ role: "system", content: "output json" })
        if (aJsonFlag) aPrompt += ". answer in json."

        var _m = {}

        var novaToText = function(value) {
          if (isUnDef(value)) return ""
          if (isString(value)) return value
          if (isNumber(value) || isBoolean(value)) return String(value)
          if (isArray(value)) return value.map(v => novaToText(v)).join("")
          if (isMap(value)) {
            if (isString(value.text)) return novaToText(value.text)
            if (isDef(value.json)) {
              try { return isString(value.json) ? value.json : JSON.stringify(value.json) } catch(j) { return String(value.json) }
            }
            if (isDef(value.content)) return novaToText(value.content)
            if (isString(value.value)) return novaToText(value.value)
            try { return JSON.stringify(value) } catch(e) { return String(value) }
          }
          return String(value)
        }

        var novaTextContent = function(value) {
          return { text: novaToText(value) }
        }

        var sanitizeNovaToolTextArray = function(content) {
          var arr = isArray(content) ? content : [content]
          return arr.map(c => novaTextContent(c))
        }

        var ensureNovaContent = function(part) {
          if (isMap(part)) {
            if (isDef(part.type)) {
              if (part.type == "text") return novaTextContent(part.text)
              if (part.type == "tool_use" || part.type == "toolUse") {
                var toolUseId = part.id || part.toolUseId || part.tool_use_id
                var toolUse = {
                  type: "toolUse",
                  toolUseId: toolUseId,
                  name: part.name,
                  input: part.input
                }
                return toolUse
              }
              if (part.type == "tool_result" || part.type == "toolResult") {
                var toolResult = {
                  toolResult: {
                    toolUseId: part.tool_use_id || part.toolUseId,
                    content: sanitizeNovaToolTextArray(part.content),
                    status: part.status
                  }
                }
                if (isUnDef(toolResult.toolResult.status)) delete toolResult.toolResult.status
                return toolResult
              }
            }
            if (isDef(part.toolUse)) {
              var tu = part.toolUse
              return {
                type: "toolUse",
                toolUseId: tu.toolUseId || tu.tool_use_id || tu.id,
                name: tu.name,
                input: tu.input
              }
            }
            if (isDef(part.toolResult)) {
              var tr = part.toolResult
              var sanitized = {
                toolUseId: tr.toolUseId || tr.tool_use_id,
                content: sanitizeNovaToolTextArray(tr.content),
                status: tr.status
              }
              if (isUnDef(sanitized.status)) delete sanitized.status
              return { toolResult: sanitized }
            }
            if (isString(part.text)) return novaTextContent(part.text)
            if (isDef(part.text)) return novaTextContent(part.text)
            if (isDef(part.message)) return novaTextContent(part.message)
            if (isDef(part.value)) return novaTextContent(part.value)
            if (isDef(part.content)) return novaTextContent(part.content)
            if (Object.keys(part).length == 1 && isString(part[Object.keys(part)[0]])) {
              return novaTextContent(part[Object.keys(part)[0]])
            }
            return novaTextContent(part)
          }
          if (isArray(part)) return novaTextContent(part.map(p => novaToText(p)).join(""))
          return novaTextContent(part)
        }

        if (aModel.indexOf("amazon.titan-") >= 0) {
          _m = {
            "inputText": aPrompt,
            "textGenerationConfig": {
              "temperature": aTemperature
            }
          }
        } else if (aModel.indexOf("amazon.nova-") >= 0) {
          var baseConv = Array.isArray(aPrompt) ? aPrompt : _r.conversation
          if (!Array.isArray(aPrompt) && aPrompt && aPrompt.length > 0) {
            baseConv = baseConv.concat({ role: "user", content: [{ type: "text", text: aPrompt }] })
          }

          // Normalize every message into the shape Nova expects: { role, content: [ { text } ] } (or keep existing array content)
          var normalized = baseConv.filter(m => isDef(m.role)).map(m => {
            var parts = []
            if (isArray(m.content)) {
              parts = m.content.map(ensureNovaContent)
            } else {
              parts = [ensureNovaContent(m.content)]
            }
            return {
              role: m.role,
              content: parts
            }
          })

          _r.conversation = normalized // Update the conversation with the normalized messages

          var systemMessages = []
          normalized.filter(m => m.role == "system").forEach(m => {
            var combined = m.content
              .filter(c => isMap(c) && c.type == "text" && isString(c.text))
              .map(c => c.text)
              .join("\n")
            if (combined.length > 0) systemMessages.push({ text: combined })
          })

          _m = {
            messages: normalized.filter(r => r.role != "system"),
            schemaVersion: "messages-v1",
            system: systemMessages,
            inferenceConfig: merge({
              temperature: aTemperature
            }, aOptions.params.inferenceConfig)
          }
          if (_m.system.length == 0) delete _m.system

          // Add tool configuration for Nova models
          if (toolsToUse.length > 0) {
            var toolConfig = []
            toolsToUse.forEach(tool => {
              if (isDef(tool) && isDef(tool.function)) {
            toolConfig.push({
              toolSpec: {
                name: tool.function.name,
                description: tool.function.description,
                inputSchema: {
                  json: sanitizeToolSchema(tool.function.parameters, true)
                }
              }
            })
          }
        })
            if (toolConfig.length > 0) {
              _m.toolConfig = { 
                tools: toolConfig,
                toolChoice: { auto: {} }
              }
            }
          }
        } else if (aModel.indexOf("anthropic.") >= 0 || aModel.indexOf("claude") >= 0) {
          var baseConv = Array.isArray(aPrompt) ? aPrompt : _r.conversation
          if (!Array.isArray(aPrompt) && aPrompt && aPrompt.length > 0) {
            baseConv = baseConv.concat({ role: "user", content: [{ type: "text", text: aPrompt }] })
          }

          var normalized = baseConv.filter(m => isDef(m.role)).map(m => ({
            role: m.role,
            content: Array.isArray(m.content)
              ? m.content.map(c => {
                  if (isMap(c)) {
                    if (isDef(c.toolResult)) {
                      return {
                        type: "tool_result",
                        tool_use_id: c.toolResult.toolUseId || c.toolResult.tool_use_id,
                        content: c.toolResult.content
                      }
                    }
                    if (isDef(c.type) && c.type != "text") return c
                    return { type: c.type || "text", text: c.text }
                  }
                  return { type: "text", text: c }
                })
              : [{ type: "text", text: m.content }]
          }))

          _r.conversation = normalized

          _m = {
            anthropic_version: "bedrock-2023-05-31",
            messages: normalized.filter(r => r.role != "system"),
            temperature: aTemperature
          }

          var sysMsgs = normalized.filter(m => m.role == "system").map(m => m.content.map(s => s.text).join(""))
          if (sysMsgs.length > 0) _m.system = sysMsgs.join("\n")

          if (toolsToUse.length > 0) {
            _m.tools = toolsToUse.filter(tool => isDef(tool) && isDef(tool.function)).map(tool => ({
              name: tool.function.name,
              description: tool.function.description,
              input_schema: tool.function.parameters
            }))
          }
        } else if (aModel.indexOf("mistral.") >= 0) {
          var baseConv = Array.isArray(aPrompt) ? aPrompt : _r.conversation
          if (!Array.isArray(aPrompt) && aPrompt && aPrompt.length > 0) {
            baseConv = baseConv.concat({ role: "user", content: aPrompt })
          }

          var toText = function(content) {
            if (isUnDef(content)) return ""
            if (isString(content)) return content
            if (isArray(content)) return content.map(toText).join("")
            if (isMap(content)) {
              if (isDef(content.text)) return content.text
              if (isDef(content.generated_text)) return toText(content.generated_text)
              if (isDef(content.outputText)) return toText(content.outputText)
              if (isDef(content.output_text)) return toText(content.output_text)
              if (isDef(content.value)) return isString(content.value) ? content.value : JSON.stringify(content.value)
              if (isDef(content.json)) return isString(content.json) ? content.json : JSON.stringify(content.json)
              if (isDef(content.content)) return toText(content.content)
              if (isDef(content.toolResult) && isDef(content.toolResult.content)) return toText(content.toolResult.content)
              if (isDef(content.toolResult)) return JSON.stringify(content.toolResult)
              if (isDef(content.toolUse)) return "[tool_use:" + (content.toolUse.name || "") + "]"
              if (isDef(content.type) && content.type == "text" && isDef(content.data)) return toText(content.data)
              if (isDef(content.type) && isDef(content.message)) return toText(content.message)
              return JSON.stringify(content)
            }
            return String(content)
          }

          var normalized = baseConv.filter(m => isDef(m.role)).map(m => ({
            role: String(m.role).toLowerCase(),
            content: toText(m.content)
          }))

          _r.conversation = normalized

          var systemPrompts = normalized.filter(m => m.role == "system").map(m => m.content).join("\n").trim()
          var chatMessages = normalized.filter(m => m.role == "user" || m.role == "assistant")

          var promptSegments = []
          var firstUser = true
          for (var mi = 0; mi < chatMessages.length; mi++) {
            var message = chatMessages[mi]
            if (message.role == "user") {
              if (firstUser) {
                var instParts = []
                if (systemPrompts.length > 0) instParts.push("<<SYS>>\n" + systemPrompts + "\n<</SYS>>")
                instParts.push(message.content)
                promptSegments.push("<s>[INST] " + instParts.join("\n\n") + " [/INST]")
                firstUser = false
              } else {
                promptSegments.push("<s>[INST] " + message.content + " [/INST]")
              }
            } else if (message.role == "assistant") {
              promptSegments.push(" " + message.content + " </s>")
            }
          }

          var promptText = promptSegments.join("").trim()
          if (promptText.length == 0) promptText = toText(aPrompt)

          _m = {
            "prompt": promptText,
            "temperature": aTemperature
          }
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
        if (aws.lastConnect() > 5 * 60000) aws.reconnect() // reconnect if more than 5 minutes since last connect
        //sprint(aInput)
        var res = aws.BEDROCK_InvokeModel(aOptions.region, aModel, aInput)
        //sprint(res)
        _captureStats(res, aModel)
        if (isDef(res.error)) return res
        if (isDef(res.generation)) return res.generation

        if (isArray(res.outputs)) {
          var mistralTexts = []
          var collectText = function(part) {
            if (isUnDef(part)) return
            if (isString(part)) {
              if (String(part).length > 0) mistralTexts.push(String(part))
            } else if (isArray(part)) {
              part.forEach(collectText)
            } else if (isMap(part)) {
              if (isDef(part.text)) {
                collectText(part.text)
              } else if (isDef(part.generated_text)) {
                collectText(part.generated_text)
              } else if (isDef(part.outputText)) {
                collectText(part.outputText)
              } else if (isDef(part.output_text)) {
                collectText(part.output_text)
              } else if (isDef(part.value)) {
                collectText(part.value)
              } else if (isDef(part.json)) {
                collectText(isString(part.json) ? part.json : JSON.stringify(part.json))
              } else if (isDef(part.content)) {
                collectText(part.content)
              } else if (isDef(part.message)) {
                collectText(part.message)
              }
            }
          }

          res.outputs.forEach(o => {
            if (isDef(o.text)) collectText(o.text)
            if (isDef(o.content)) collectText(o.content)
            if (isDef(o.generated_text)) collectText(o.generated_text)
            if (isDef(o.outputText)) collectText(o.outputText)
            if (isDef(o.output_text)) collectText(o.output_text)
          })

          if (mistralTexts.length == 0 && isDef(res.generated_text)) collectText(res.generated_text)

          if (mistralTexts.length > 0) {
            var uniqueTexts = []
            mistralTexts.forEach(text => {
              if (uniqueTexts.indexOf(text) < 0) uniqueTexts.push(text)
            })
            uniqueTexts.forEach(text => {
              cv.push(text)
              _r.conversation.push({ role: "assistant", content: text })
            })
          }
        }

        if (isArray(res.content)) {
          res = { output: { message: { role: res.role || "assistant", content: res.content } } }
        }

        // Handle structured output with messages (Nova/Claude)
        if (isDef(res.output) && isDef(res.output.message)) {
          var messages = Array.isArray(res.output.message) ? res.output.message : [res.output.message]
          for (var mi = 0; mi < messages.length; mi++) {
            var msg = messages[mi]
            // keep conversation updated
            _r.conversation.push(msg)

            // If message contains an array of content parts, iterate
            if (isArray(msg.content)) {
              for (var ci = 0; ci < msg.content.length; ci++) {
                var content = msg.content[ci]
                try {
                  // Tool call handling (preserve previous behavior)
                  if (isDef(content.toolUse) || content.type == "tool_use") {
                    var _toolUse = content.toolUse || content
                    var toolName = _toolUse.name
                    var toolInput = _toolUse.input
                    var toolCallId = _toolUse.toolUseId || _toolUse.id

                    // Find tool (from passed tools or internal tools)
                    var tool = (isString(toolName) ? toolRegistry[toolName] : __) || _r.tools[toolName]
                    if (isDef(tool) && isDef(tool.fn)) {
                      try {
                        var toolResult = tool.fn(toolInput)
                        var _resultToText = function(value) {
                          if (isString(value)) return value
                          if (isNumber(value) || isBoolean(value)) return String(value)
                          if (isArray(value) || isMap(value)) {
                            try {
                              return JSON.stringify(value)
                            } catch(je) {
                              return String(value)
                            }
                          }
                          if (isUnDef(value)) return ""
                          return String(value)
                        }
                        var _toolResultText = _resultToText(toolResult)
                        var _tR

                        if (aModel.indexOf("anthropic.") >= 0 || aModel.indexOf("claude") >= 0) {
                          _tR = {
                            role: "user",
                            content: [{
                              type: "tool_result",
                              tool_use_id: toolCallId,
                              content: [{
                                type: "text",
                                text: _toolResultText
                              }]
                            }]
                          }
                        } else if (aModel.indexOf("amazon.nova-") >= 0) {
                          _tR = {
                            role: "user",
                            content: [{
                              toolResult: {
                                toolUseId: toolCallId,
                                content: [{ text: _toolResultText }],
                                status: "success"
                              }
                            }]
                          }
                        } else {
                          _tR = {
                            role: "user",
                            content: [{
                              toolResult: {
                                toolUseId: toolCallId,
                                content: [!isObject(toolResult) ? {
                                  text: isString(toolResult) ? toolResult : JSON.stringify(toolResult)
                                } : {
                                  json: toolResult
                                }],
                                status: "success"
                              }
                            }]
                          }
                        }
                        _r.conversation.push(_tR)

                        // Continue conversation with tool result (recursive)
                        var _res = _r.rawPrompt(_r.conversation, aModel, aTemperature, aJsonFlag, aTools)
                        cv.push(_res)
                        return _res
                      } catch (e) {
                        if (aModel.indexOf("anthropic.") >= 0 || aModel.indexOf("claude") >= 0) {
                          _r.conversation.push({
                            role: "user",
                            content: [{
                              type: "tool_result",
                              tool_use_id: toolCallId,
                              content: [{
                                type: "text",
                                text: "Error executing tool: " + e.message
                              }]
                            }]
                          })
                        } else if (aModel.indexOf("amazon.nova-") >= 0) {
                          _r.conversation.push({
                            role: "user",
                            content: [{
                              toolResult: {
                                toolUseId: toolCallId,
                                content: [{ text: "Error executing tool: " + e.message }],
                                status: "error"
                              }
                            }]
                          })
                        } else {
                          _r.conversation.push({
                            role: "user",
                            content: [{
                              toolResult: {
                                toolUseId: toolCallId,
                                content: [{
                                  text: "Error executing tool: " + e.message
                                }],
                                status: "error"
                              }
                            }]
                          })
                        }
                      }
                    }
                  } else {
                    // Only collect assistant text responses
                    if (isDef(msg.role) && String(msg.role).toLowerCase() === "assistant") {
                      if (isString(content)) {
                        cv.push(content)
                      } else if (isMap(content)) {
                        if (isDef(content.text)) {
                          cv.push(content.text)
                        } else if (isDef(content.json)) {
                          cv.push(JSON.stringify(content.json))
                        } else {
                          cv.push(JSON.stringify(content))
                        }
                      } else {
                        cv.push(String(content))
                      }
                    }
                  }
                } catch (ee) { $err(ee) }
              }
            } else {
              // If content is not an array, and role is assistant, append its string form
              if (isDef(msg.role) && String(msg.role).toLowerCase() === "assistant") {
                cv.push(String(msg.content))
              }
            }
          }
        } else if (isDef(res.outputText)) {
          // Some models return outputText / text fields
          cv.push(String(res.outputText))
          _r.conversation.push({ role: "assistant", content: res.outputText })
        } else if (isString(res)) {
          cv.push(res)
        } else if (isMap(res) && isDef(res.output) && isString(res.output)) {
          cv.push(res.output)
        }

        if (aJsonFlag) {
          _r.conversation.push(res)
          return res
        } else {
          return cv.length > 0 ? cv.join("") : __
        }
      },
      promptWithStats: (aPrompt, aModel, aTemperature, aJsonFlag, tools) => {
        var response = _r.prompt(aPrompt, aModel, aTemperature, aJsonFlag, tools)
        return { response: response, stats: _r.getLastStats() }
      },
      rawPromptWithStats: (aPrompt, aModel, aTemperature, aJsonFlag, aTools) => {
        var response = _r.rawPrompt(aPrompt, aModel, aTemperature, aJsonFlag, aTools)
        return { response: response, stats: _r.getLastStats() }
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
        if (_r.conversation.filter(r => r.role == "system" && r.content == aPrompt).length == 0)
          _r.conversation.push({ role: "system", content: aPrompt })
        return _r
      },
      cleanPrompt: () => {
        _r.conversation = []
        return _r
      },
      getModels: () => {
        if (aws.lastConnect() > 5 * 60000) aws.reconnect() // reconnect if more than 5 minutes since last connect
        var res = aws.BEDROCK_ListFoundationalModels(aOptions.region)
        return res
      },
    }
    return _r
  }
}
