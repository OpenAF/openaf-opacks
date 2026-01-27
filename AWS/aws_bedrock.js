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
 * <key>AWS.BEDROCK_GetFoundationalModel(aRegion, aModelId) : Map</key>
 * Retrieves details for a specific foundational model identified by aModelId.
 * </odoc>
 */
AWS.prototype.BEDROCK_GetFoundationalModel = function(aRegion, aModelId) {
  aRegion = _$(aRegion, "aRegion").isString().default(this.region)
  _$(aModelId, "aModelId").isString().$_()

  var uri = "/foundation-models/" + encodeURIComponent(aModelId)
  var aURL = "https://bedrock." + aRegion + ".amazonaws.com" + uri
  var url = new java.net.URL(aURL)
  var aHost = String(url.getHost())

  var res = this.getURLEncoded(aURL, uri, "", {}, "bedrock", aHost, aRegion)
  if (isDef(res.error)) return res

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

/**
 * <odoc>
 * <key>AWS.BEDROCK_InvokeModelStream(aRegion, aModelId, aInput, aOnChunk) : Map</key>
 * Given aRegion, aModelId, aInput and aOnChunk callback, will invoke the specified model with streaming
 * and call aOnChunk(decodedChunk, rawEvent) for each chunk. Returns {events: Array} with all events.
 * </odoc>
 */
AWS.prototype.BEDROCK_InvokeModelStream = function(aRegion, aModelId, aInput, aOnChunk) {
  aRegion = _$(aRegion, "aRegion").isString().default(this.region)
  _$(aModelId, "aModelId").isString().$_()
  _$(aInput, "aInput").$_()
  _$(aOnChunk, "aOnChunk").isFunction().$_()

  var uri = "/model/" + encodeURIComponent(aModelId) + "/invoke-with-response-stream"
  var aURL = "https://bedrock-runtime." + aRegion + ".amazonaws.com/model/" + encodeURIComponent(aModelId) + "/invoke-with-response-stream"
  var url = new java.net.URL(aURL)
  var aHost = String(url.getHost())
  var aURI = String(url.getPath())

  var payload = stringify(aInput, __, "")
  var headers = this.__getRequest("post", aURI, "bedrock", aHost, aRegion, "", payload, __, __, 'application/json')

  // Add required headers for streaming
  headers["Content-Type"] = "application/json"
  headers["Accept"] = "application/vnd.amazon.eventstream"

  // Create HTTP connection with streaming enabled
  ow.loadObj()
  var events = []
  var streamError
  var rstream

  try {
    // Create http object with delayBuild to control exception handling
    var h = new ow.obj.http(aURL, "POST", payload, headers, false, 30000, true, {delayBuild: true})
    h.setThrowExceptions(false)

    // Build the client
    if (isDef(h.client.build)) {
      h.client = h.client.build()
    }

    // Now execute the request
    h.exec(aURL, "POST", payload, headers, false, 30000, true)

    // Check response code
    var responseCode = h.responseCode()
    if (responseCode != 200) {
      // Read error response
      var errorBody = h.response()
      return {
        error: "HTTP " + responseCode + ": " + errorBody,
        events: []
      }
    }

    // Get the response stream
    rstream = h.responseStream()
    if (isUnDef(rstream)) {
      return {
        error: "Failed to get response stream",
        events: []
      }
    }

    // Process event stream incrementally
    // AWS Bedrock uses binary eventstream format, so we parse the framing as bytes
    try {
      var pending = []
      var readUInt32BE = (arr, idx) => {
        return (((arr[idx] & 0xff) << 24) | ((arr[idx + 1] & 0xff) << 16) | ((arr[idx + 2] & 0xff) << 8) | (arr[idx + 3] & 0xff)) >>> 0
      }

      var processPending = () => {
        while (pending.length >= 12) {
          var totalLen = readUInt32BE(pending, 0)
          if (totalLen < 16) {
            pending = []
            return
          }
          if (pending.length < totalLen) return

          var headersLen = readUInt32BE(pending, 4)
          var payloadStart = 12 + headersLen
          var payloadLen = totalLen - headersLen - 16

          if (payloadLen >= 0 && (payloadStart + payloadLen) <= pending.length) {
            var payloadBytes = pending.slice(payloadStart, payloadStart + payloadLen)
            var payloadStr = af.fromBytes2String(af.fromArray2Bytes(payloadBytes))

            try {
              var payload = jsonParse(payloadStr)
              if (isDef(payload.bytes)) {
                var decodedBytes = af.fromBytes2String(af.fromBase64(payload.bytes))
                var chunk = jsonParse(decodedBytes)

                events.push(chunk)

                if (isDef(aOnChunk)) {
                  try {
                    aOnChunk(chunk, payload)
                  } catch(callbackError) {
                    // Log but don't fail
                  }
                }
              }
            } catch(parseError) {
              // Skip unparseable chunks
            }
          }

          pending = pending.slice(totalLen)
        }
      }

      ioStreamReadBytes(rstream, (buffer) => {
        for (var i = 0; i < buffer.length; i++) {
          pending.push(buffer[i])
        }
        processPending()
      })
    } catch(readError) {
      streamError = "Error reading stream: " + String(readError)
    } finally {
      // Always close the stream
      try {
        rstream.close()
      } catch(closeError) {
        // Ignore close errors
      }
    }
  } catch(httpError) {
    streamError = "HTTP error: " + String(httpError)
  }

  if (isDef(streamError)) {
    return { error: streamError, events: events }
  }

  return {
    events: events
  }
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
    aOptions.showReasoning = _$(aOptions.showReasoning, "aOptions.showReasoning").isBoolean().default(false)

    var aws = new AWS()
    var _model = aOptions.model
    var _temperature = aOptions.temperature
    var _lastStats = __
    var _debugCh = __
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
        // Calculate total if not provided
        if (isUnDef(tokens.total) && isDef(tokens.prompt) && isDef(tokens.completion)) {
          tokens.total = tokens.prompt + tokens.completion
        }
        // Also handle alternative token field names (snake_case for OpenAI/Mistral)
        if (isDef(aResponse.usage.input_tokens)) tokens.prompt = aResponse.usage.input_tokens
        if (isDef(aResponse.usage.output_tokens)) tokens.completion = aResponse.usage.output_tokens
        if (isDef(aResponse.usage.total_tokens)) tokens.total = aResponse.usage.total_tokens
        // Handle prompt_tokens and completion_tokens (alternative naming)
        if (isDef(aResponse.usage.prompt_tokens)) tokens.prompt = aResponse.usage.prompt_tokens
        if (isDef(aResponse.usage.completion_tokens)) tokens.completion = aResponse.usage.completion_tokens
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
      if (isArray(aResponse.choices)) {
        var choiceReasons = aResponse.choices
          .map(c => (isMap(c) && (isString(c.finish_reason) || isString(c.finishReason))) ? (c.finish_reason || c.finishReason) : __)
          .filter(r => isString(r))
        if (choiceReasons.length > 0) {
          if (isUnDef(stats.finishReasons)) stats.finishReasons = []
          choiceReasons.forEach(r => {
            if (stats.finishReasons.indexOf(r) < 0) stats.finishReasons.push(r)
          })
        }
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
      getModelName: () => _model,
      getLastStats: () => _lastStats,
      setDebugCh: (aChName) => {
        if (isDef(aChName)) {
          _debugCh = aChName
          $ch(_debugCh).create()
        } else {
          _debugCh = __
        }
        return _r
      },
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

        // Handle Nova/Anthropic/Claude structured output when JSON flag is true
        if (aJsonFlag && isMap(__r) && isDef(__r.output) && isDef(__r.output.message)) {
          var msg = __r.output.message
          if (isArray(msg.content)) {
            var textParts = []
            msg.content.forEach(c => {
              if (isMap(c)) {
                // Handle text content
                if (c.type === "text" && isDef(c.text)) {
                  textParts.push(c.text)
                }
                // Handle JSON content (Nova models)
                else if (isDef(c.json)) {
                  textParts.push(isString(c.json) ? c.json : JSON.stringify(c.json))
                }
                // Handle plain text without type
                else if (isDef(c.text)) {
                  textParts.push(c.text)
                }
              } else if (isString(c)) {
                textParts.push(c)
              }
            })
            if (textParts.length > 0) {
              return textParts.join("")
            }
          }
        }

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
          } catch (je) { }

          if (isDef(sanitized.required) && !isArray(sanitized.required)) {
            if (isMap(sanitized.required)) {
              sanitized.required = Object.keys(sanitized.required)
            } else if (isString(sanitized.required)) {
              sanitized.required = [sanitized.required]
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

        var toolResultToText = function(value) {
          if (isString(value)) return value
          if (isNumber(value) || isBoolean(value)) return String(value)
          if (isArray(value) || isMap(value)) {
            try {
              return JSON.stringify(value)
            } catch (je) {
              return String(value)
            }
          }
          if (isUnDef(value)) return ""
          return String(value)
        }

        var openAIContentToText = function(value) {
          if (isUnDef(value)) return ""
          if (isString(value)) return value
          if (isNumber(value) || isBoolean(value)) return String(value)
          if (isArray(value)) return value.map(v => openAIContentToText(v)).join("")
          if (isMap(value)) {
            if (isString(value.text)) return openAIContentToText(value.text)
            if (isDef(value.json)) return openAIContentToText(value.json)
            if (isDef(value.value)) return openAIContentToText(value.value)
            if (isDef(value.content)) return openAIContentToText(value.content)
            if (isDef(value.message)) return openAIContentToText(value.message)
            if (isDef(value.data)) return openAIContentToText(value.data)
            if (isDef(value.outputText)) return openAIContentToText(value.outputText)
            if (isDef(value.output_text)) return openAIContentToText(value.output_text)
            if (isDef(value.generated_text)) return openAIContentToText(value.generated_text)
            if (isDef(value.toolResult) && isDef(value.toolResult.content)) return openAIContentToText(value.toolResult.content)
            try { return JSON.stringify(value) } catch (je) { return String(value) }
          }
          return String(value)
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
        // JSON instructions are now handled per-model to avoid persisting in conversation history

        var _m = {}

        var removeReasoningTags = function(text) {
          if (!isString(text)) return text
          // Remove <reasoning>...</reasoning> tags and their content
          return text.replace(/<reasoning>[\s\S]*?<\/reasoning>/mgi, '').trim()
        }

        var novaToText = function(value) {
          if (isUnDef(value)) return ""
          if (isString(value)) return value
          if (isNumber(value) || isBoolean(value)) return String(value)
          if (isArray(value)) return value.map(v => novaToText(v)).join("")
          if (isMap(value)) {
            if (isString(value.text)) return novaToText(value.text)
            if (isDef(value.json)) {
              try { return isString(value.json) ? value.json : JSON.stringify(value.json) } catch (j) { return String(value.json) }
            }
            if (isDef(value.content)) return novaToText(value.content)
            if (isString(value.value)) return novaToText(value.value)
            try { return JSON.stringify(value) } catch (e) { return String(value) }
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
                return {
                  toolUse: {
                    toolUseId: toolUseId,
                    name: part.name,
                    input: part.input
                  }
                }
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
                toolUse: {
                  toolUseId: tu.toolUseId || tu.tool_use_id || tu.id,
                  name: tu.name,
                  input: tu.input
                }
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
          // Support for Amazon Nova models (both v1 and v2): amazon.nova-micro, amazon.nova-lite, amazon.nova-pro
          // Both versions use the same message format and tool calling mechanisms
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

          var messagesForAPI = normalized
          if (!Array.isArray(aPrompt) && isString(aPrompt) && aPrompt.length > 0 && aJsonFlag) {
            messagesForAPI = JSON.parse(JSON.stringify(normalized))
            for (var nvi = messagesForAPI.length - 1; nvi >= 0; nvi--) {
              if (messagesForAPI[nvi].role == "user" && isArray(messagesForAPI[nvi].content)) {
                for (var nci = messagesForAPI[nvi].content.length - 1; nci >= 0; nci--) {
                  if (isMap(messagesForAPI[nvi].content[nci]) && messagesForAPI[nvi].content[nci].type == "text") {
                    messagesForAPI[nvi].content[nci].text = messagesForAPI[nvi].content[nci].text + ". answer in json."
                    break
                  }
                }
                break
              }
            }
          }

          var systemMessages = []
          messagesForAPI.filter(m => m.role == "system").forEach(m => {
            var combined = m.content
              .filter(c => isMap(c) && c.type == "text" && isString(c.text))
              .map(c => c.text)
              .join("\n")
            if (combined.length > 0) systemMessages.push({ text: combined })
          })

          _m = {
            messages: messagesForAPI.filter(r => r.role != "system"),
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
        } else if (aModel.indexOf("mistral.ministral-3-8b-instruct") >= 0 || aModel.indexOf("mistral.ministral-large") >= 0) {
          // New Mistral message-based models (mistral.ministral-3-8b-instruct, mistral.ministral-large, etc.)
          // These models use messages API format instead of the legacy prompt format
          var baseConv = Array.isArray(aPrompt) ? aPrompt : _r.conversation
          if (!Array.isArray(aPrompt) && isString(aPrompt) && aPrompt.length > 0) {
            baseConv = baseConv.concat({ role: "user", content: aPrompt })
          }

          var toTextForMistralMsg = function(content) {
            if (isUnDef(content)) return ""
            if (isString(content)) return content
            if (isArray(content)) return content.map(toTextForMistralMsg).join("")
            if (isMap(content)) {
              if (isDef(content.text)) return content.text
              if (isDef(content.generated_text)) return toTextForMistralMsg(content.generated_text)
              if (isDef(content.outputText)) return toTextForMistralMsg(content.outputText)
              if (isDef(content.output_text)) return toTextForMistralMsg(content.output_text)
              if (isDef(content.value)) return isString(content.value) ? content.value : JSON.stringify(content.value)
              if (isDef(content.content)) return toTextForMistralMsg(content.content)
              if (isDef(content.message)) return toTextForMistralMsg(content.message)
              return JSON.stringify(content)
            }
            return String(content)
          }

          var normalized = baseConv.filter(m => isDef(m.role)).map(m => ({
            role: String(m.role).toLowerCase(),
            content: toTextForMistralMsg(m.content)
          }))

          _r.conversation = normalized

          var messagesForAPI = normalized
          if (!Array.isArray(aPrompt) && isString(aPrompt) && aPrompt.length > 0 && aJsonFlag) {
            messagesForAPI = JSON.parse(JSON.stringify(normalized))
            for (var mmi = messagesForAPI.length - 1; mmi >= 0; mmi--) {
              if (messagesForAPI[mmi].role == "user" && isString(messagesForAPI[mmi].content)) {
                messagesForAPI[mmi].content = messagesForAPI[mmi].content + ". answer in json."
                break
              }
            }
          }

          _m = {
            messages: messagesForAPI,
            temperature: aTemperature
          }

          // Support Mistral message-based model parameters
          if (isDef(aOptions.params.max_tokens)) {
            _m.max_tokens = aOptions.params.max_tokens
          }
          if (isDef(aOptions.params.top_p)) {
            _m.top_p = aOptions.params.top_p
          }
          if (isDef(aOptions.params.top_k)) {
            _m.top_k = aOptions.params.top_k
          }
        } else if (aModel.indexOf("openai.") >= 0) {
          var baseConv = Array.isArray(aPrompt) ? aPrompt : _r.conversation
          if (!Array.isArray(aPrompt) && isString(aPrompt) && aPrompt.length > 0) {
            baseConv = baseConv.concat({ role: "user", content: aPrompt })
          }

          var normalized = []
          for (var omi = 0; omi < baseConv.length; omi++) {
            var originalMsg = baseConv[omi]
            if (!isMap(originalMsg)) {
              normalized.push({ role: "user", content: openAIContentToText(originalMsg) })
              continue
            }
            var role = isString(originalMsg.role) ? String(originalMsg.role).toLowerCase() : "user"
            var normalizedMsg = { role: role }
            // Preserve tool_call_id for tool role messages (OpenAI format)
            if (isString(originalMsg.tool_call_id)) normalizedMsg.tool_call_id = originalMsg.tool_call_id

            if (isArray(originalMsg.tool_calls)) {
              try {
                normalizedMsg.tool_calls = JSON.parse(JSON.stringify(originalMsg.tool_calls))
              } catch (je) {
                normalizedMsg.tool_calls = originalMsg.tool_calls
              }
            }
            if (isString(originalMsg.id)) normalizedMsg.id = originalMsg.id

            if (isArray(originalMsg.content)) {
              var toolResultPart = originalMsg.content
                .filter(p => isMap(p) && (isDef(p.toolResult) || p.type == "tool_result"))
                .shift()
              if (isDef(toolResultPart)) {
                var toolContent = isMap(toolResultPart.toolResult) ? toolResultPart.toolResult.content : toolResultPart.content
                var toolUseId = __
                if (isMap(toolResultPart.toolResult)) toolUseId = toolResultPart.toolResult.toolUseId || toolResultPart.toolResult.tool_use_id
                if (isUnDef(toolUseId) && isString(toolResultPart.tool_use_id)) toolUseId = toolResultPart.tool_use_id
                // Also check for tool_call_id at the message level (OpenAI format)
                if (isUnDef(toolUseId) && isString(originalMsg.tool_call_id)) toolUseId = originalMsg.tool_call_id
                if (isString(toolUseId)) normalizedMsg.tool_call_id = toolUseId
                normalizedMsg.role = "tool"
                normalizedMsg.content = openAIContentToText(toolContent)
              } else if (originalMsg.content.every && originalMsg.content.every(p => isMap(p) && isString(p.type))) {
                try {
                  normalizedMsg.content = JSON.parse(JSON.stringify(originalMsg.content))
                  normalizedMsg.content.forEach(part => {
                    if (isDef(part.text)) part.text = openAIContentToText(part.text)
                    if (isDef(part.content)) part.content = openAIContentToText(part.content)
                    if (isDef(part.value)) part.value = openAIContentToText(part.value)
                  })
                } catch (jce) {
                  normalizedMsg.content = originalMsg.content.map(p => {
                    var clone = {}
                    Object.keys(p).forEach(k => clone[k] = p[k])
                    if (isDef(clone.text)) clone.text = openAIContentToText(clone.text)
                    if (isDef(clone.content)) clone.content = openAIContentToText(clone.content)
                    if (isDef(clone.value)) clone.value = openAIContentToText(clone.value)
                    return clone
                  })
                }
              } else {
                normalizedMsg.content = openAIContentToText(originalMsg.content)
              }
            } else if (isMap(originalMsg.content)) {
              if (isString(originalMsg.content.type) && (isDef(originalMsg.content.text) || isDef(originalMsg.content.content))) {
                normalizedMsg.content = [{
                  type: originalMsg.content.type,
                  text: openAIContentToText(originalMsg.content.text || originalMsg.content.content)
                }]
              } else {
                normalizedMsg.content = openAIContentToText(originalMsg.content)
              }
            } else {
              normalizedMsg.content = openAIContentToText(originalMsg.content)
            }

            if (isUnDef(normalizedMsg.content)) normalizedMsg.content = ""
            normalized.push(normalizedMsg)
          }

          _r.conversation = normalized

          var messagesForAPI = normalized
          if (!Array.isArray(aPrompt) && isString(aPrompt) && aPrompt.length > 0 && aJsonFlag) {
            messagesForAPI = JSON.parse(JSON.stringify(normalized))
            for (var oi = messagesForAPI.length - 1; oi >= 0; oi--) {
              if (messagesForAPI[oi].role == "user" && isString(messagesForAPI[oi].content)) {
                messagesForAPI[oi].content = messagesForAPI[oi].content + ". answer in json."
                break
              }
            }
          }

          _m = {
            messages: messagesForAPI,
            temperature: aTemperature
          }

          if (toolsToUse.length > 0) {
            var openAITools = toolsToUse
              .filter(tool => isDef(tool) && isDef(tool.function))
              .map(tool => ({
                type: "function",
                function: {
                  name: tool.function.name,
                  description: tool.function.description,
                  parameters: sanitizeToolSchema(tool.function.parameters)
                }
              }))
            if (openAITools.length > 0) {
              _m.tools = openAITools
              if (isUnDef(aOptions.params.tool_choice)) _m.tool_choice = "auto"
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
                    // Extract text content from tool result
                    var toolResultContent = c.toolResult.content
                    if (isArray(toolResultContent)) {
                      toolResultContent = toolResultContent.map(tc => {
                        if (isMap(tc) && isDef(tc.text)) return tc.text
                        return String(tc)
                      }).join("")
                    } else if (isMap(toolResultContent) && isDef(toolResultContent.text)) {
                      toolResultContent = toolResultContent.text
                    } else {
                      toolResultContent = String(toolResultContent)
                    }
                    return {
                      type: "tool_result",
                      tool_use_id: c.toolResult.toolUseId || c.toolResult.tool_use_id,
                      content: toolResultContent
                    }
                  }
                  if (isDef(c.type) && c.type != "text") return c
                  return { type: c.type || "text", text: c.text || String(c) }
                }
                return { type: "text", text: String(c) }
              })
              : [{ type: "text", text: String(m.content) }]
          }))

          _r.conversation = normalized

          var messagesForAPI = normalized
          if (!Array.isArray(aPrompt) && isString(aPrompt) && aPrompt.length > 0 && aJsonFlag) {
            messagesForAPI = JSON.parse(JSON.stringify(normalized))
            for (var aci = messagesForAPI.length - 1; aci >= 0; aci--) {
              if (messagesForAPI[aci].role == "user" && isArray(messagesForAPI[aci].content)) {
                for (var acci = messagesForAPI[aci].content.length - 1; acci >= 0; acci--) {
                  if (isMap(messagesForAPI[aci].content[acci]) && messagesForAPI[aci].content[acci].type == "text") {
                    messagesForAPI[aci].content[acci].text = messagesForAPI[aci].content[acci].text + ". answer in json."
                    break
                  }
                }
                break
              }
            }
          }

          _m = {
            anthropic_version: "bedrock-2023-05-31",
            messages: messagesForAPI.filter(r => r.role != "system"),
            temperature: aTemperature
          }

          var sysMsgs = messagesForAPI.filter(m => m.role == "system").map(m => m.content.map(s => s.text).join(""))
          if (sysMsgs.length > 0) _m.system = sysMsgs.join("\n")

          if (toolsToUse.length > 0) {
            _m.tools = toolsToUse.filter(tool => isDef(tool) && isDef(tool.function)).map(tool => ({
              name: tool.function.name,
              description: tool.function.description,
              input_schema: sanitizeToolSchema(tool.function.parameters, false)
            }))
            // Add tool_choice parameter if specified in options, otherwise default to auto
            if (isDef(aOptions.params.tool_choice)) {
              _m.tool_choice = aOptions.params.tool_choice
            } else {
              _m.tool_choice = { type: "auto" }
            }
          }
        } else if (aModel.indexOf("mistral.") >= 0) {
          // Support for Mistral and Ministral models (mistral.mistral-7b, mistral.ministral-3b, mistral.ministral-8b, etc.)
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

          var messagesForAPI = normalized
          if (!Array.isArray(aPrompt) && isString(aPrompt) && aPrompt.length > 0 && aJsonFlag) {
            messagesForAPI = JSON.parse(JSON.stringify(normalized))
            for (var mci = messagesForAPI.length - 1; mci >= 0; mci--) {
              if (messagesForAPI[mci].role == "user" && isString(messagesForAPI[mci].content)) {
                messagesForAPI[mci].content = messagesForAPI[mci].content + ". answer in json."
                break
              }
            }
          }

          var systemPrompts = messagesForAPI.filter(m => m.role == "system").map(m => m.content).join("\n").trim()
          var chatMessages = messagesForAPI.filter(m => m.role == "user" || m.role == "assistant")

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

          // Support Mistral-specific parameters (max_tokens for Mistral/Ministral models)
          if (isDef(aOptions.params.max_tokens)) {
            _m.max_tokens = aOptions.params.max_tokens
          }
          if (isDef(aOptions.params.top_p)) {
            _m.top_p = aOptions.params.top_p
          }
          if (isDef(aOptions.params.top_k)) {
            _m.top_k = aOptions.params.top_k
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

        // Example configurations for different models:
        // export OAFP_MODEL="(type: bedrock, timeout: 900000, options: (model: 'amazon.nova-micro-v1:0', temperature: 0, params: (inferenceConfig: (max_new_tokens: 1024))))"
        // export OAFP_MODEL="(type: bedrock, timeout: 900000, options: (model: 'amazon.nova-micro-v2:0', temperature: 0, params: (inferenceConfig: (max_new_tokens: 1024))))"
        // export OAFP_MODEL="(type: bedrock, timeout: 900000, options: (model: 'amazon.titan-text-express-v1', temperature: 0, params: (textGenerationConfig: (maxTokenCount: 2048))))"
        // export OAFP_MODEL="(type: bedrock, timeout: 900000, options: (model: 'us.meta.llama3-2-3b-instruct-v1:0', temperature: 0, params: (max_gen_len: 2048) ))"
        // Mistral Legacy (prompt format):
        // export OAFP_MODEL="(type: bedrock, timeout: 900000, options: (model: 'mistral.mistral-7b-instruct-v0:2', temperature: 0.7, params: (max_tokens: 1024, top_p: 0.9)))"
        // Mistral Messages (newer format):
        // export OAFP_MODEL="(type: bedrock, timeout: 900000, options: (model: 'mistral.ministral-3-8b-instruct', temperature: 0.7, params: (max_tokens: 1024)))"
        // export OAFP_MODEL="(type: bedrock, timeout: 900000, options: (model: 'mistral.ministral-large-2407-v1:0', temperature: 0.7, params: (max_tokens: 2048)))"

        var aInput = merge(_m, aOptions.params)
        if (aws.lastConnect() > 5 * 60000) aws.reconnect() // reconnect if more than 5 minutes since last connect
        //sprint(aInput)
        if (isDef(_debugCh)) $ch(_debugCh).set({_t:nowNano(),_f:'client'}, merge({_t:nowNano(),_f:'client'}, aInput))
        var res = aws.BEDROCK_InvokeModel(aOptions.region, aModel, aInput)
        if (isDef(_debugCh)) $ch(_debugCh).set({_t:nowNano(),_f:'llm'}, merge({_t:nowNano(),_f:'llm'}, res))
        _captureStats(res, aModel)
        if (isDef(res.error)) return res
        var handledOpenAI = false
        var handledMistralMessages = false

        // Handle Mistral message-based models (similar to OpenAI format)
        if (( aModel.match(/mistral\.ministral-3/) || aModel.match(/mistral\.mistral-large/) ) && isArray(res.choices)) {
          handledMistralMessages = true
          for (var mci = 0; mci < res.choices.length; mci++) {
            var mchoice = res.choices[mci]
            if (!isMap(mchoice)) continue
            var mmessage = isMap(mchoice.message) ? mchoice.message : {}
            var mstoredMessage = {}
            try {
              mstoredMessage = JSON.parse(JSON.stringify(mmessage))
            } catch (mje) {
              mstoredMessage = {
                role: mmessage.role,
                content: mmessage.content
              }
            }
            if (!isString(mstoredMessage.role)) mstoredMessage.role = "assistant"
            if (isUnDef(mstoredMessage.content)) mstoredMessage.content = ""
            _r.conversation.push(mstoredMessage)

            if (isString(mmessage.content) && mmessage.content.length > 0) {
              cv.push(mmessage.content)
            }
          }
        }

        if (aModel.indexOf("openai.") >= 0 && isArray(res.choices)) {
          handledOpenAI = true
          for (var ci = 0; ci < res.choices.length; ci++) {
            var choice = res.choices[ci]
            if (!isMap(choice)) continue
            var message = isMap(choice.message) ? choice.message : {}
            var storedMessage = {}
            try {
              storedMessage = JSON.parse(JSON.stringify(message))
            } catch (je) {
              storedMessage = {
                role: message.role,
                content: message.content,
                tool_calls: message.tool_calls
              }
            }
            if (!isString(storedMessage.role)) storedMessage.role = "assistant"
            if (isUnDef(storedMessage.content)) storedMessage.content = ""
            _r.conversation.push(storedMessage)

            if (isArray(message.tool_calls) && message.tool_calls.length > 0) {
              for (var ti = 0; ti < message.tool_calls.length; ti++) {
                var toolCall = message.tool_calls[ti]
                var toolName = isMap(toolCall) && isMap(toolCall["function"]) && isString(toolCall["function"].name) ? toolCall["function"].name : __
                var toolCallId = isMap(toolCall) && isString(toolCall.id) ? toolCall.id : toolName
                var toolArgs = isMap(toolCall) && isMap(toolCall["function"]) ? toolCall["function"].arguments : __
                var parsedArgs = toolArgs
                if (isString(toolArgs)) {
                  try { parsedArgs = JSON.parse(toolArgs) } catch (pe) { parsedArgs = toolArgs }
                }

                var tool = isString(toolName) ? toolRegistry[toolName] : __
                if (isUnDef(tool) && isString(toolName)) tool = _r.tools[toolName]

                if (isDef(tool) && isDef(tool.fn)) {
                  try {
                    var toolResult = tool.fn(parsedArgs)
                    var toolContent = toolResultToText(toolResult)
                    if (isUnDef(toolCallId)) toolCallId = toolName
                    _r.conversation.push({
                      role: "tool",
                      content: toolContent,
                      tool_call_id: toolCallId
                    })
                  } catch (te) {
                    if (isUnDef(toolCallId)) toolCallId = toolName
                    _r.conversation.push({
                      role: "tool",
                      content: "Error executing tool: " + te.message,
                      tool_call_id: toolCallId
                    })
                  }
                } else {
                  if (isUnDef(toolCallId)) toolCallId = toolName
                  _r.conversation.push({
                    role: "tool",
                    content: "Tool " + (toolName || "<unknown>") + " is not available.",
                    tool_call_id: toolCallId
                  })
                }
              }
              var _res = _r.rawPrompt(_r.conversation, aModel, aTemperature, aJsonFlag, aTools)
              return _res
            }

            if (String(storedMessage.role).toLowerCase() === "assistant") {
              var messageText = openAIContentToText(message.content)
              if (isString(messageText) && messageText.length > 0) {
                // Apply reasoning filter for OpenAI models when showReasoning is false
                if (!aOptions.showReasoning) {
                  messageText = removeReasoningTags(messageText)
                }
                cv.push(messageText)
              }
            }
          }
        }

        if (handledMistralMessages) {
          if (aJsonFlag) {
            return cv.length > 0 ? cv.join("") : __
          }
          var finalText = cv.length > 0 ? cv.join("") : __
          return finalText
        }

        if (handledOpenAI) {
          if (aJsonFlag) {
            // Apply reasoning filter to response even when returning JSON
            var _fres = ""
            if (!aOptions.showReasoning && isMap(res) && isArray(res.choices)) {
              res.choices.forEach(choice => {
                if (isMap(choice.message) && isString(choice.message.content)) {
                  choice.message.content = removeReasoningTags(choice.message.content)
                  _fres = choice.message.content
                }
              })
            }
            return _fres
          }
          var finalText = cv.length > 0 ? cv.join("") : __
          // Apply reasoning filter one more time on the final output for OpenAI models
          if (!aOptions.showReasoning && isString(finalText)) {
            finalText = removeReasoningTags(finalText)
          }
          return finalText
        }

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
              // First pass: collect all tool_use blocks
              var toolUseBlocks = []
              for (var ci = 0; ci < msg.content.length; ci++) {
                var content = msg.content[ci]
                if (isDef(content.toolUse) || content.type == "tool_use") {
                  toolUseBlocks.push(content)
                }
              }

              // If there are tool calls, process ALL of them before making recursive call
              if (toolUseBlocks.length > 0) {
                var toolResultsToAdd = []
                var hasToolCalls = false

                //for (var ti = 0; ti < toolUseBlocks.length; ti++) {
                toolResultsToAdd = pForEach(toolUseBlocks, function(toolContent, ti) {
                  //var toolContent = toolUseBlocks[ti]
                  try {
                    var _toolUse = toolContent.toolUse || toolContent
                    var toolName = _toolUse.name
                    var toolInput = _toolUse.input
                    var toolCallId = _toolUse.toolUseId || _toolUse.id

                    // Find tool (from passed tools or internal tools)
                    var tool = (isString(toolName) ? toolRegistry[toolName] : __) || _r.tools[toolName]
                    if (isDef(tool) && isDef(tool.fn)) {
                      hasToolCalls = true
                      try {
                        var toolResult = tool.fn(toolInput)
                        var _toolResultText = toolResultToText(toolResult)
                        var _tR

                        if (aModel.indexOf("anthropic.") >= 0 || aModel.indexOf("claude") >= 0) {
                          _tR = {
                            type: "tool_result",
                            tool_use_id: toolCallId,
                            content: _toolResultText
                          }
                        } else if (aModel.indexOf("amazon.nova-") >= 0) {
                          _tR = {
                            toolResult: {
                              toolUseId: toolCallId,
                              content: [{ text: _toolResultText }],
                              status: "success"
                            }
                          }
                        } else if (aModel.indexOf("openai.") >= 0) {
                          if (isUnDef(toolCallId)) toolCallId = toolName
                          _tR = {
                            role: "tool",
                            content: _toolResultText,
                            tool_call_id: toolCallId
                          }
                        } else {
                          _tR = {
                            toolResult: {
                              toolUseId: toolCallId,
                              content: [!isObject(toolResult) ? {
                                text: isString(toolResult) ? toolResult : JSON.stringify(toolResult)
                              } : {
                                json: toolResult
                              }],
                              status: "success"
                            }
                          }
                        }
                        //toolResultsToAdd.push(_tR)
                        return _tR
                      } catch (e) {
                        var _errR
                        if (aModel.indexOf("anthropic.") >= 0 || aModel.indexOf("claude") >= 0) {
                          _errR = {
                            type: "tool_result",
                            tool_use_id: toolCallId,
                            content: "Error executing tool: " + e.message
                          }
                        } else if (aModel.indexOf("amazon.nova-") >= 0) {
                          _errR = {
                            toolResult: {
                              toolUseId: toolCallId,
                              content: [{ text: "Error executing tool: " + e.message }],
                              status: "error"
                            }
                          }
                        } else if (aModel.indexOf("openai.") >= 0) {
                          if (isUnDef(toolCallId)) toolCallId = toolName
                          _errR = {
                            role: "tool",
                            content: "Error executing tool: " + e.message,
                            tool_call_id: toolCallId
                          }
                        } else {
                          _errR = {
                            toolResult: {
                              toolUseId: toolCallId,
                              content: [{
                                text: "Error executing tool: " + e.message
                              }],
                              status: "error"
                            }
                          }
                        }
                        //toolResultsToAdd.push(_errR)
                        return _errR
                      }
                    }
                  } catch (ee) { $err(ee) }
                })

                // Add all tool results to conversation at once
                if (hasToolCalls && toolResultsToAdd.length > 0) {
                  // For Anthropic/Claude and Nova, wrap all tool_results in a single user message
                  if (aModel.indexOf("anthropic.") >= 0 || aModel.indexOf("claude") >= 0 || aModel.indexOf("amazon.nova-") >= 0) {
                    _r.conversation.push({
                      role: "user",
                      content: toolResultsToAdd
                    })
                  } else {
                    // For OpenAI, each tool result is a separate message
                    toolResultsToAdd.forEach(function(tr) {
                      _r.conversation.push(tr)
                    })
                  }

                  // Now make the recursive call with all tool results
                  var _res = _r.rawPrompt(_r.conversation, aModel, aTemperature, aJsonFlag, aTools)
                  cv.push(_res)
                  return _res
                }
              }

              // Second pass: collect text content for assistant responses
              for (var ci = 0; ci < msg.content.length; ci++) {
                var content = msg.content[ci]
                try {
                  if (!isDef(content.toolUse) && content.type != "tool_use") {
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

      // ---- Streaming Functions ----

      /**
       * Helper function to extract text delta from streaming chunks
       * @param {Object} chunk - The decoded chunk from the stream
       * @param {String} aModel - The model ID to determine parsing strategy
       * @returns {String|undefined} - The text content or undefined if no content
       */
      _extractStreamingDelta: (chunk, aModel) => {
        // Claude/Anthropic streaming format
        if (aModel.indexOf("anthropic.") >= 0 || aModel.indexOf("claude") >= 0) {
          if (chunk.type == "content_block_delta" && isDef(chunk.delta) && isDef(chunk.delta.text)) {
            return chunk.delta.text
          }
          return __
        }

        // Nova streaming format (similar to Claude)
        if (aModel.indexOf("amazon.nova-") >= 0) {
          if (chunk.type == "content_block_delta" && isDef(chunk.delta) && isDef(chunk.delta.text)) {
            return chunk.delta.text
          }
          if (isDef(chunk.contentBlockDelta) && isDef(chunk.contentBlockDelta.delta) && isDef(chunk.contentBlockDelta.delta.text)) {
            return chunk.contentBlockDelta.delta.text
          }
          return __
        }

        // Titan streaming format
        if (aModel.indexOf("amazon.titan-") >= 0) {
          if (isDef(chunk.outputText)) {
            return chunk.outputText
          }
          return __
        }

        // OpenAI streaming format
        if (aModel.indexOf("openai.") >= 0) {
          if (isArray(chunk.choices) && chunk.choices.length > 0) {
            var choice = chunk.choices[0]
            if (isDef(choice.delta) && isDef(choice.delta.content)) {
              return choice.delta.content
            }
          }
          return __
        }

        // Mistral streaming format
        if (aModel.indexOf("mistral.") >= 0) {
          // Newer message-based models (ministral-*) use OpenAI-style choices/delta format
          if (aModel.indexOf("ministral-") >= 0 || aModel.indexOf("mistral-large") >= 0) {
            if (isArray(chunk.choices) && chunk.choices.length > 0) {
              var choice = chunk.choices[0]
              if (isDef(choice.delta) && isDef(choice.delta.content)) {
                return choice.delta.content
              }
            }
          } else {
            // Older prompt-based models use outputs format
            if (isArray(chunk.outputs) && chunk.outputs.length > 0 && isDef(chunk.outputs[0].text)) {
              return chunk.outputs[0].text
            }
          }
          return __
        }

        // Meta/Llama streaming format
        if (aModel.indexOf("meta.") >= 0) {
          if (isDef(chunk.generation)) {
            return chunk.generation
          }
          return __
        }

        return __
      },

      /**
       * Helper function to extract finish reason from streaming chunks
       * @param {Object} chunk - The decoded chunk from the stream
       * @param {String} aModel - The model ID to determine parsing strategy
       * @returns {String|undefined} - The finish reason or undefined
       */
      _extractStreamingFinishReason: (chunk, aModel) => {
        // Claude/Anthropic
        if ((aModel.indexOf("anthropic.") >= 0 || aModel.indexOf("claude") >= 0) && chunk.type == "message_delta") {
          if (isDef(chunk.delta) && isDef(chunk.delta.stop_reason)) {
            return chunk.delta.stop_reason
          }
        }

        // Nova
        if (aModel.indexOf("amazon.nova-") >= 0 && chunk.type == "message_delta") {
          if (isDef(chunk.delta) && isDef(chunk.delta.stopReason)) {
            return chunk.delta.stopReason
          }
        }

        // Titan
        if (aModel.indexOf("amazon.titan-") >= 0 && isDef(chunk.completionReason)) {
          return chunk.completionReason
        }

        // OpenAI
        if (aModel.indexOf("openai.") >= 0 && isArray(chunk.choices) && chunk.choices.length > 0) {
          if (isDef(chunk.choices[0].finish_reason)) {
            return chunk.choices[0].finish_reason
          }
        }

        // Mistral (newer message-based models use choices format like OpenAI)
        if (aModel.indexOf("mistral.") >= 0 && isArray(chunk.choices) && chunk.choices.length > 0) {
          if (isDef(chunk.choices[0].finish_reason)) {
            return chunk.choices[0].finish_reason
          }
          if (isDef(chunk.choices[0].stop_reason)) {
            return chunk.choices[0].stop_reason
          }
        }

        return __
      },

      /**
       * Helper function to extract tool calls from streaming chunks
       * @param {Object} chunk - The decoded chunk from the stream
       * @param {String} aModel - The model ID to determine parsing strategy
       * @returns {Array|undefined} - Array of tool calls or undefined
       */
      _extractStreamingToolCalls: (chunk, aModel) => {
        // Claude/Anthropic tool use - return with index for tracking
        if ((aModel.indexOf("anthropic.") >= 0 || aModel.indexOf("claude") >= 0) && chunk.type == "content_block_start") {
          if (isDef(chunk.content_block) && chunk.content_block.type == "tool_use") {
            var toolCall = clone(chunk.content_block)
            toolCall._index = chunk.index  // Track index for accumulating input
            return [toolCall]
          }
        }

        // Nova tool use
        if (aModel.indexOf("amazon.nova-") >= 0) {
          if (chunk.type == "content_block_start" && isDef(chunk.content_block) && chunk.content_block.type == "toolUse") {
            var novaToolCall = clone(chunk.content_block)
            novaToolCall._index = chunk.index
            return [novaToolCall]
          }
          if (isDef(chunk.contentBlockStart) && isDef(chunk.contentBlockStart.start) && isDef(chunk.contentBlockStart.start.toolUse)) {
            var novaToolCall2 = clone(chunk.contentBlockStart.start.toolUse)
            novaToolCall2._index = chunk.contentBlockStart.contentBlockIndex
            return [novaToolCall2]
          }
        }

        // OpenAI tool calls
        if (aModel.indexOf("openai.") >= 0 && isArray(chunk.choices) && chunk.choices.length > 0) {
          var choice = chunk.choices[0]
          if (isDef(choice.delta) && isArray(choice.delta.tool_calls)) {
            return choice.delta.tool_calls
          }
        }

        return __
      },

      /**
       * Helper function to extract tool input delta from streaming chunks (for Anthropic/Nova)
       * @param {Object} chunk - The decoded chunk from the stream
       * @param {String} aModel - The model ID to determine parsing strategy
       * @returns {Object|undefined} - {index, partial_json} or undefined
       */
      _extractStreamingToolInputDelta: (chunk, aModel) => {
        // Claude/Anthropic input_json_delta
        if ((aModel.indexOf("anthropic.") >= 0 || aModel.indexOf("claude") >= 0) && chunk.type == "content_block_delta") {
          if (isDef(chunk.delta) && chunk.delta.type == "input_json_delta" && isDef(chunk.delta.partial_json)) {
            return { index: chunk.index, partial_json: chunk.delta.partial_json }
          }
        }

        // Nova input delta (similar structure)
        if (aModel.indexOf("amazon.nova-") >= 0) {
          if (chunk.type == "content_block_delta" && isDef(chunk.delta) && chunk.delta.type == "input_json_delta") {
            return { index: chunk.index, partial_json: chunk.delta.partial_json }
          }
          if (isDef(chunk.contentBlockDelta) && isDef(chunk.contentBlockDelta.delta)) {
            var novaDelta = chunk.contentBlockDelta.delta
            if (novaDelta.type == "input_json_delta" || isDef(novaDelta.toolUse)) {
              var partialJson = novaDelta.partial_json || (novaDelta.toolUse && novaDelta.toolUse.input) || ""
              if (isString(partialJson)) {
                return { index: chunk.contentBlockDelta.contentBlockIndex, partial_json: partialJson }
              }
            }
          }
        }

        return __
      },

      /**
       * Core streaming function that processes streaming responses from Bedrock models
       * @param {String|Array} aPrompt - The prompt or conversation array
       * @param {String} aModel - Model ID (defaults to configured model)
       * @param {Number} aTemperature - Temperature setting (defaults to configured temperature)
       * @param {Boolean} aJsonFlag - Whether to request JSON output
       * @param {Object} aTools - Tools configuration
       * @param {Function} aOnDelta - Callback function(contentChunk, fullChunk) called for each chunk
       * @returns {Object} - {content, events, toolCalls?, finishReason?}
       */
      rawPromptStream: (aPrompt, aModel, aTemperature, aJsonFlag, aTools, aOnDelta) => {
        aPrompt = _$(aPrompt, "aPrompt").default("")
        if (isUnDef(aModel) || aModel == null) aModel = _model
        if (isUnDef(aTemperature) || aTemperature == null) aTemperature = _temperature
        aJsonFlag = _$(aJsonFlag, "aJsonFlag").isBoolean().default(false)
        if (isFunction(aTools) && isUnDef(aOnDelta)) {
          aOnDelta = aTools
          aTools = __
        }
        aOnDelta = _$(aOnDelta, "aOnDelta").default(__)

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
          } catch (je) { }

          if (isDef(sanitized.required) && !isArray(sanitized.required)) {
            if (isMap(sanitized.required)) {
              sanitized.required = Object.keys(sanitized.required)
            } else if (isString(sanitized.required)) {
              sanitized.required = [sanitized.required]
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

        // Ensure tool functions are reachable by name
        toolsToUse.forEach(function(tool) {
          if (!isMap(tool) || !isMap(tool.function)) return
          var toolName = tool.function.name
          if (!isString(toolName)) return
          if (isDef(tool.function.func) && isUnDef(tool.fn)) tool.fn = tool.function.func
          if (isDef(tool.fn)) toolRegistry[toolName] = tool
        })

        // Build input using existing logic from rawPrompt
        // This reuses the same message normalization for all model families
        var _m = {}

        // Add prompt to conversation if it's a string; arrays are treated as the full conversation
        if (isString(aPrompt) && aPrompt.length > 0) {
          _r.conversation.push({ role: "user", content: aPrompt })
        } else if (isArray(aPrompt)) {
          _r.conversation = aPrompt
        }

        // Build model-specific input structure (reusing logic from rawPrompt)
        if (aModel.indexOf("amazon.titan-") >= 0) {
          // Titan format
          var prompt = ""
          if (_r.conversation.length > 0) {
            _r.conversation.forEach(function(msg) {
              if (msg.role == "user") prompt += "User: " + msg.content + "\n"
              if (msg.role == "assistant") prompt += "Assistant: " + msg.content + "\n"
              if (msg.role == "system") prompt = msg.content + "\n" + prompt
            })
            prompt += "Assistant: "
          }
          _m = {
            inputText: prompt,
            textGenerationConfig: {
              temperature: aTemperature,
              maxTokenCount: _$(aOptions.params.textGenerationConfig.maxTokenCount).isNumber().default(4096)
            }
          }
        } else if (aModel.indexOf("amazon.nova-") >= 0) {
          // Nova format (messages-based)
          var messages = []
          var systemPrompts = []

          var toNovaTextParts = function(content) {
            if (isUnDef(content)) return []
            if (isString(content)) return [{ text: content }]
            if (isArray(content)) {
              return content.map(c => {
                if (isMap(c) && isString(c.text)) return { text: c.text }
                return { text: isString(c) ? c : JSON.stringify(c) }
              })
            }
            if (isMap(content) && isString(content.text)) return [{ text: content.text }]
            return [{ text: JSON.stringify(content) }]
          }

          _r.conversation.forEach(function(msg) {
            if (msg.role == "system") {
              toNovaTextParts(msg.content).forEach(p => systemPrompts.push(p))
            } else {
              var content = toNovaTextParts(msg.content)
              messages.push({
                role: msg.role,
                content: content
              })
            }
          })

          var messagesForAPI = messages
          if (!Array.isArray(aPrompt) && isString(aPrompt) && aPrompt.length > 0 && aJsonFlag) {
            messagesForAPI = JSON.parse(JSON.stringify(messages))
            for (var nvi = messagesForAPI.length - 1; nvi >= 0; nvi--) {
              if (messagesForAPI[nvi].role == "user" && isArray(messagesForAPI[nvi].content)) {
                for (var nci = messagesForAPI[nvi].content.length - 1; nci >= 0; nci--) {
                  if (isMap(messagesForAPI[nvi].content[nci]) && isDef(messagesForAPI[nvi].content[nci].text)) {
                    messagesForAPI[nvi].content[nci].text = messagesForAPI[nvi].content[nci].text + ". answer in json."
                    break
                  }
                }
                break
              }
            }
          }

          _m = {
            messages: messagesForAPI,
            schemaVersion: "messages-v1",
            inferenceConfig: {
              temperature: aTemperature
            }
          }

          if (systemPrompts.length > 0) {
            _m.system = systemPrompts
          }

          // Add tools if configured
          if (toolsToUse.length > 0) {
            var toolConfig = []
            toolsToUse.forEach(function(tool) {
              if (isDef(tool) && isDef(tool.function)) {
                toolConfig.push({
                  toolSpec: {
                    name: tool.function.name,
                    description: tool.function.description || "",
                    inputSchema: {
                      json: sanitizeToolSchema(tool.function.parameters, true)
                    }
                  }
                })
              }
            })
            if (toolConfig.length > 0) {
              _m.toolConfig = { tools: toolConfig, toolChoice: { auto: {} } }
            }
          }
        } else if (aModel.indexOf("anthropic.") >= 0 || aModel.indexOf("claude") >= 0) {
          // Claude/Anthropic format
          var messages = []
          var systemPromptParts = []

          var toAnthropicText = function(content) {
            if (isUnDef(content)) return ""
            if (isString(content)) return content
            if (isArray(content)) {
              return content.map(c => {
                if (isMap(c) && isString(c.text)) return c.text
                return isString(c) ? c : JSON.stringify(c)
              }).join("")
            }
            if (isMap(content) && isString(content.text)) return content.text
            return JSON.stringify(content)
          }

          _r.conversation.forEach(function(msg) {
            if (msg.role == "system") {
              var sp = toAnthropicText(msg.content)
              if (sp.length > 0) systemPromptParts.push(sp)
            } else {
              var content = msg.content
              if (isString(content)) {
                content = [{ type: "text", text: content }]
              }
              messages.push({
                role: msg.role,
                content: content
              })
            }
          })

          var messagesForAPI = messages
          if (!Array.isArray(aPrompt) && isString(aPrompt) && aPrompt.length > 0 && aJsonFlag) {
            messagesForAPI = JSON.parse(JSON.stringify(messages))
            for (var aci = messagesForAPI.length - 1; aci >= 0; aci--) {
              if (messagesForAPI[aci].role == "user" && isArray(messagesForAPI[aci].content)) {
                for (var acci = messagesForAPI[aci].content.length - 1; acci >= 0; acci--) {
                  if (isMap(messagesForAPI[aci].content[acci]) && messagesForAPI[aci].content[acci].type == "text") {
                    messagesForAPI[aci].content[acci].text = messagesForAPI[aci].content[acci].text + ". answer in json."
                    break
                  }
                }
                break
              }
            }
          }

          _m = {
            messages: messagesForAPI,
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: _$(aOptions.params.max_tokens).isNumber().default(4096),
            temperature: aTemperature
          }

          var systemPrompt = systemPromptParts.join("\n")
          if (systemPrompt.length > 0) {
            _m.system = systemPrompt
          }

          // Add tools if configured
          if (toolsToUse.length > 0) {
            _m.tools = toolsToUse
              .filter(tool => isDef(tool) && isDef(tool.function))
              .map(tool => ({
                name: tool.function.name,
                description: tool.function.description || "",
                input_schema: sanitizeToolSchema(tool.function.parameters, false)
              }))
          }
        } else if (aModel.indexOf("openai.") >= 0) {
          // OpenAI format
          var messages = []
          _r.conversation.forEach(function(msg) {
            messages.push({
              role: msg.role,
              content: msg.content
            })
          })

          var messagesForAPI = messages
          if (!Array.isArray(aPrompt) && isString(aPrompt) && aPrompt.length > 0 && aJsonFlag) {
            messagesForAPI = JSON.parse(JSON.stringify(messages))
            for (var oi = messagesForAPI.length - 1; oi >= 0; oi--) {
              if (messagesForAPI[oi].role == "user" && isString(messagesForAPI[oi].content)) {
                messagesForAPI[oi].content = messagesForAPI[oi].content + ". answer in json."
                break
              }
            }
          }

          _m = {
            messages: messagesForAPI,
            temperature: aTemperature,
            max_tokens: _$(aOptions.params.max_tokens).isNumber().default(4096)
          }

          // Add tools if configured
          if (toolsToUse.length > 0) {
            _m.tools = toolsToUse
              .filter(tool => isDef(tool) && isDef(tool.function))
              .map(tool => ({
                type: "function",
                function: {
                  name: tool.function.name,
                  description: tool.function.description || "",
                  parameters: sanitizeToolSchema(tool.function.parameters)
                }
              }))
          }
        } else if (aModel.indexOf("mistral.") >= 0) {
          // Mistral format (supports both legacy prompt and messages)
          if (aModel.indexOf("mistral-7b") >= 0 || aModel.indexOf("mixtral-8x7b") >= 0) {
            // Legacy format for older models
            var prompt = ""
            _r.conversation.forEach(function(msg) {
              if (msg.role == "user") prompt += "[INST] " + msg.content + " [/INST]"
              if (msg.role == "assistant") prompt += msg.content
            })
            _m = {
              prompt: prompt,
              temperature: aTemperature,
              max_tokens: _$(aOptions.params.max_tokens).isNumber().default(4096)
            }
          } else {
            // Messages format for newer models
            var messages = []
            _r.conversation.forEach(function(msg) {
              messages.push({
                role: msg.role,
                content: msg.content
              })
            })
            var messagesForAPI = messages
            if (!Array.isArray(aPrompt) && isString(aPrompt) && aPrompt.length > 0 && aJsonFlag) {
              messagesForAPI = JSON.parse(JSON.stringify(messages))
              for (var mi = messagesForAPI.length - 1; mi >= 0; mi--) {
                if (messagesForAPI[mi].role == "user" && isString(messagesForAPI[mi].content)) {
                  messagesForAPI[mi].content = messagesForAPI[mi].content + ". answer in json."
                  break
                }
              }
            }
            _m = {
              messages: messagesForAPI,
              temperature: aTemperature,
              max_tokens: _$(aOptions.params.max_tokens).isNumber().default(4096)
            }
          }
        } else if (aModel.indexOf("meta.") >= 0) {
          // Meta/Llama format
          var prompt = ""
          _r.conversation.forEach(function(msg) {
            if (msg.role == "user") prompt += "<s>[INST] " + msg.content + " [/INST]"
            if (msg.role == "assistant") prompt += msg.content + "</s>"
            if (msg.role == "system") prompt = "<s>[INST] <<SYS>>\n" + msg.content + "\n<</SYS>>\n\n" + prompt
          })
          _m = {
            prompt: prompt,
            temperature: aTemperature,
            max_tokens: _$(aOptions.params.max_tokens).isNumber().default(4096)
          }
        }

        // Merge with any additional params
        var aInput = merge(_m, aOptions.params)

        // Reconnect if needed
        if (aws.lastConnect() > 5 * 60000) aws.reconnect()

        // Debug logging
        if (isDef(_debugCh)) $ch(_debugCh).set({_t:nowNano(),_f:'client-stream'}, merge({_t:nowNano(),_f:'client-stream'}, aInput))

        // Call streaming API
        var fullContent = ""
        var events = []
        var toolCalls = []
        var finishReason = __
        // Track pending tool calls by index for accumulating input JSON (Anthropic/Nova streaming)
        var pendingToolCalls = {}

        try {
          var result = aws.BEDROCK_InvokeModelStream(aOptions.region, aModel, aInput, (chunk, event) => {
            // Extract content delta
            var delta = _r._extractStreamingDelta(chunk, aModel)
            if (isDef(delta) && delta.length > 0) {
              fullContent += delta

              // Call user callback with delta
              if (isDef(aOnDelta)) {
                try {
                  aOnDelta(delta, chunk)
                } catch(callbackError) {
                  // Log but don't fail the stream
                }
              }
            }

            // Extract finish reason
            var reason = _r._extractStreamingFinishReason(chunk, aModel)
            if (isDef(reason)) {
              finishReason = reason
            }

            // Extract tool calls (content_block_start for Anthropic/Nova)
            var tools = _r._extractStreamingToolCalls(chunk, aModel)
            if (isDef(tools) && isArray(tools)) {
              tools.forEach(function(tc) {
                if (isDef(tc._index)) {
                  // Store in pending map for input accumulation
                  pendingToolCalls[tc._index] = {
                    type: tc.type || "tool_use",
                    id: tc.id || tc.toolUseId,
                    name: tc.name,
                    input: "",  // Will accumulate JSON string
                    _index: tc._index
                  }
                } else {
                  // Non-indexed tool calls (OpenAI style) go directly to toolCalls
                  toolCalls.push(tc)
                }
              })
            }

            // Extract tool input delta (content_block_delta with input_json_delta)
            var inputDelta = _r._extractStreamingToolInputDelta(chunk, aModel)
            if (isDef(inputDelta) && isDef(pendingToolCalls[inputDelta.index])) {
              pendingToolCalls[inputDelta.index].input += inputDelta.partial_json
            }

            events.push(chunk)
          })

          events = events.concat(result.events)

          // Check for errors in result
          if (isDef(result.error)) {
            if (isDef(_debugCh)) $ch(_debugCh).set({_t:nowNano(),_f:'llm-stream-error'}, {_t:nowNano(),_f:'llm-stream-error', error: String(result.error)})
            return { error: result.error, content: fullContent, events: events }
          }
        } catch(streamError) {
          if (isDef(_debugCh)) $ch(_debugCh).set({_t:nowNano(),_f:'llm-stream-error'}, {_t:nowNano(),_f:'llm-stream-error', error: String(streamError)})
          return { error: streamError, content: fullContent, events: events }
        }

        if (isDef(_debugCh)) $ch(_debugCh).set({_t:nowNano(),_f:'llm-stream'}, {_t:nowNano(),_f:'llm-stream', content: fullContent, events: events.length})

        // Finalize pending tool calls by parsing accumulated input JSON
        Object.keys(pendingToolCalls).sort((a, b) => Number(a) - Number(b)).forEach(function(idx) {
          var pending = pendingToolCalls[idx]
          var parsedInput = {}
          if (isString(pending.input) && pending.input.length > 0) {
            try {
              parsedInput = JSON.parse(pending.input)
            } catch (parseErr) {
              // If parsing fails, try to use as-is or empty object
              parsedInput = {}
            }
          }
          var finalizedTool = {
            type: pending.type || "tool_use",
            id: pending.id,
            name: pending.name,
            input: parsedInput
          }
          // For Nova models, use toolUse wrapper
          if (aModel.indexOf("amazon.nova-") >= 0) {
            finalizedTool = {
              type: "toolUse",
              toolUseId: pending.id,
              name: pending.name,
              input: parsedInput
            }
          }
          toolCalls.push(finalizedTool)
        })

        var toolResultToText = function(value) {
          if (isString(value)) return value
          if (isNumber(value) || isBoolean(value)) return String(value)
          if (isArray(value) || isMap(value)) {
            try {
              return JSON.stringify(value)
            } catch (je) {
              return String(value)
            }
          }
          if (isUnDef(value)) return ""
          return String(value)
        }

        var normalizeOpenAIToolCalls = function(calls) {
          var byIndex = {}
          calls.forEach(c => {
            if (!isMap(c)) return
            var idx = isNumber(c.index) ? c.index : (isString(c.id) ? c.id : __)
            if (isUnDef(idx)) idx = Object.keys(byIndex).length
            if (isUnDef(byIndex[idx])) {
              byIndex[idx] = {
                id: c.id,
                type: c.type,
                function: { name: "", arguments: "" }
              }
            }
            var entry = byIndex[idx]
            if (isDef(c.id)) entry.id = c.id
            if (isDef(c.type)) entry.type = c.type
            if (isMap(c.function)) {
              if (isDef(c.function.name)) entry.function.name = c.function.name
              if (isDef(c.function.arguments)) entry.function.arguments += c.function.arguments
            }
          })
          return Object.keys(byIndex)
            .sort((a, b) => Number(a) - Number(b))
            .map(k => byIndex[k])
        }

        var normalizedToolCalls = toolCalls
        if (toolCalls.length > 0 && (aModel.indexOf("openai.") >= 0 || aModel.indexOf("mistral.") >= 0)) {
          normalizedToolCalls = normalizeOpenAIToolCalls(toolCalls)
        }

        // Update conversation history
        if (fullContent.length > 0 || normalizedToolCalls.length > 0) {
          var storedMessage = {
            role: "assistant",
            content: fullContent
          }
          if (normalizedToolCalls.length > 0) {
            if (aModel.indexOf("openai.") >= 0 || aModel.indexOf("mistral.") >= 0) {
              storedMessage.tool_calls = normalizedToolCalls
            } else if (aModel.indexOf("anthropic.") >= 0 || aModel.indexOf("claude") >= 0 || aModel.indexOf("amazon.nova-") >= 0) {
              var contentParts = []
              if (fullContent.length > 0) contentParts.push({ type: "text", text: fullContent })
              normalizedToolCalls.forEach(tc => contentParts.push(tc))
              storedMessage.content = contentParts
            } else if (fullContent.length == 0) {
              storedMessage.content = normalizedToolCalls
            }
          }
          _r.conversation.push(storedMessage)
        }

        // Capture stats from streaming events
        // Nova models put usage in metadata.usage in the final event
        if (events.length > 0) {
          // Look for event with usage information
          var usageEvent = events.find(e => isDef(e.usage))

          // For Nova, usage is in metadata.usage
          if (isUnDef(usageEvent)) {
            var metadataEvent = events.find(e => isDef(e.metadata) && isDef(e.metadata.usage))
            if (isDef(metadataEvent)) {
              // Extract usage to top level for _captureStats
              usageEvent = {usage: metadataEvent.metadata.usage}
              // Also include stop reason if present
              if (isDef(finishReason)) usageEvent.stopReason = finishReason
            }
          }

          if (isDef(usageEvent)) {
            _captureStats(usageEvent, aModel)
          }
        }

        // Build response object
        var response = {
          content: fullContent,
          events: events
        }

        if (normalizedToolCalls.length > 0) {
          response.toolCalls = normalizedToolCalls
        }

        if (isDef(finishReason)) {
          response.finishReason = finishReason
        }

        // Execute tools if tool calls are present, then continue the conversation
        if (normalizedToolCalls.length > 0) {
          var toolResultsToAdd = []
          var hasToolCalls = false

          normalizedToolCalls.forEach(function(tc) {
            var toolName = __
            var toolInput = __
            var toolCallId = __

            if (isMap(tc) && isMap(tc.function)) {
              toolName = tc.function.name
              toolCallId = isString(tc.id) ? tc.id : toolName
              toolInput = tc.function.arguments
              if (isString(toolInput)) {
                try { toolInput = JSON.parse(toolInput) } catch (pe) { }
              }
            } else if (isMap(tc) && (isDef(tc.toolUse) || tc.type == "tool_use" || tc.type == "toolUse")) {
              var tu = tc.toolUse || tc
              toolName = tu.name
              toolInput = tu.input
              toolCallId = tu.toolUseId || tu.tool_use_id || tu.id
            }

            if (!isString(toolName)) return
            hasToolCalls = true

            var tool = toolRegistry[toolName] || _r.tools[toolName]
            var toolFn = isDef(tool) ? (tool.fn || (isMap(tool.function) ? tool.function.func : __)) : __
            var toolResult
            try {
              if (isFunction(toolFn)) {
                toolResult = toolFn(toolInput)
              } else {
                toolResult = "Tool " + toolName + " is not available."
              }
              var toolContent = toolResultToText(toolResult)
              if (isUnDef(toolCallId)) toolCallId = toolName

              if (aModel.indexOf("anthropic.") >= 0 || aModel.indexOf("claude") >= 0) {
                toolResultsToAdd.push({
                  type: "tool_result",
                  tool_use_id: toolCallId,
                  content: toolContent
                })
              } else if (aModel.indexOf("amazon.nova-") >= 0) {
                toolResultsToAdd.push({
                  toolResult: {
                    toolUseId: toolCallId,
                    content: [{ text: toolContent }],
                    status: "success"
                  }
                })
              } else {
                toolResultsToAdd.push({
                  role: "tool",
                  content: toolContent,
                  tool_call_id: toolCallId
                })
              }
            } catch (te) {
              var errContent = "Error executing tool: " + te.message
              if (isUnDef(toolCallId)) toolCallId = toolName
              if (aModel.indexOf("anthropic.") >= 0 || aModel.indexOf("claude") >= 0) {
                toolResultsToAdd.push({
                  type: "tool_result",
                  tool_use_id: toolCallId,
                  content: errContent
                })
              } else if (aModel.indexOf("amazon.nova-") >= 0) {
                toolResultsToAdd.push({
                  toolResult: {
                    toolUseId: toolCallId,
                    content: [{ text: errContent }],
                    status: "error"
                  }
                })
              } else {
                toolResultsToAdd.push({
                  role: "tool",
                  content: errContent,
                  tool_call_id: toolCallId
                })
              }
            }
          })

          if (hasToolCalls && toolResultsToAdd.length > 0) {
            if (aModel.indexOf("anthropic.") >= 0 || aModel.indexOf("claude") >= 0 || aModel.indexOf("amazon.nova-") >= 0) {
              _r.conversation.push({
                role: "user",
                content: toolResultsToAdd
              })
            } else {
              toolResultsToAdd.forEach(function(tr) {
                _r.conversation.push(tr)
              })
            }

            return _r.rawPromptStream(_r.conversation, aModel, aTemperature, aJsonFlag, aTools, aOnDelta)
          }
        }

        return response
      },

      /**
       * Streams a prompt and returns aggregated text content
       * @param {String|Array} aPrompt - The prompt or conversation array
       * @param {String} aModel - Model ID
       * @param {Number} aTemperature - Temperature setting
       * @param {Boolean} aJsonFlag - Whether to request JSON output
       * @param {Object} aTools - Tools configuration
       * @param {Function} aOnDelta - Callback function(contentChunk, fullChunk) for each chunk
       * @returns {String} - The accumulated text content
       */
      promptStream: (aPrompt, aModel, aTemperature, aJsonFlag, aTools, aOnDelta) => {
        var result = _r.rawPromptStream(aPrompt, aModel, aTemperature, aJsonFlag, aTools, aOnDelta)
        if (isDef(result.error)) return result
        return result.content
      },

      /**
       * Streams a prompt and returns {response, stats}
       * @param {String|Array} aPrompt - The prompt or conversation array
       * @param {String} aModel - Model ID
       * @param {Number} aTemperature - Temperature setting
       * @param {Boolean} aJsonFlag - Whether to request JSON output
       * @param {Object} aTools - Tools configuration
       * @param {Function} aOnDelta - Callback function(contentChunk, fullChunk) for each chunk
       * @returns {Object} - {response: String, stats: Object}
       */
      promptStreamWithStats: (aPrompt, aModel, aTemperature, aJsonFlag, aTools, aOnDelta) => {
        var response = _r.promptStream(aPrompt, aModel, aTemperature, aJsonFlag, aTools, aOnDelta)
        return {
          response: response,
          stats: _r.getLastStats()
        }
      },

      /**
       * Streams a prompt and returns {response, stats} with full response object
       * @param {String|Array} aPrompt - The prompt or conversation array
       * @param {String} aModel - Model ID
       * @param {Number} aTemperature - Temperature setting
       * @param {Boolean} aJsonFlag - Whether to request JSON output
       * @param {Object} aTools - Tools configuration
       * @param {Function} aOnDelta - Callback function(contentChunk, fullChunk) for each chunk
       * @returns {Object} - {response: {content, events, ...}, stats: Object}
       */
      rawPromptStreamWithStats: (aPrompt, aModel, aTemperature, aJsonFlag, aTools, aOnDelta) => {
        var response = _r.rawPromptStream(aPrompt, aModel, aTemperature, aJsonFlag, aTools, aOnDelta)
        return {
          response: response,
          stats: _r.getLastStats()
        }
      },

      /**
       * Streams a prompt with JSON output and returns parsed JSON
       * @param {String|Array} aPrompt - The prompt or conversation array
       * @param {String} aModel - Model ID
       * @param {Number} aTemperature - Temperature setting
       * @param {Object} aTools - Tools configuration
       * @param {Function} aOnDelta - Callback function(contentChunk, fullChunk) for each chunk
       * @returns {Object} - Parsed JSON object or text if parsing fails
       */
      promptStreamJSON: (aPrompt, aModel, aTemperature, aTools, aOnDelta) => {
        var text = _r.promptStream(aPrompt, aModel, aTemperature, true, aTools, aOnDelta)
        if (isDef(text.error)) return text
        try {
          return jsonParse(text)
        } catch(e) {
          return text
        }
      },

      /**
       * Streams a prompt with JSON output and returns {response, stats}
       * @param {String|Array} aPrompt - The prompt or conversation array
       * @param {String} aModel - Model ID
       * @param {Number} aTemperature - Temperature setting
       * @param {Object} aTools - Tools configuration
       * @param {Function} aOnDelta - Callback function(contentChunk, fullChunk) for each chunk
       * @returns {Object} - {response: Object (parsed JSON), stats: Object}
       */
      promptStreamJSONWithStats: (aPrompt, aModel, aTemperature, aTools, aOnDelta) => {
        var response = _r.promptStreamJSON(aPrompt, aModel, aTemperature, aTools, aOnDelta)
        return {
          response: response,
          stats: _r.getLastStats()
        }
      },

      /**
       * Streams a prompt with JSON output and returns {response, raw, stats}
       * @param {String|Array} aPrompt - The prompt or conversation array
       * @param {String} aModel - Model ID
       * @param {Number} aTemperature - Temperature setting
       * @param {Object} aTools - Tools configuration
       * @param {Function} aOnDelta - Callback function(contentChunk, fullChunk) for each chunk
       * @returns {Object} - {response: Object (parsed JSON), raw: Object, stats: Object}
       */
      promptStreamJSONWithStatsRaw: (aPrompt, aModel, aTemperature, aTools, aOnDelta) => {
        var rawResult = _r.rawPromptStream(aPrompt, aModel, aTemperature, true, aTools, aOnDelta)
        var parsed
        try {
          parsed = jsonParse(rawResult.content)
        } catch(e) {
          parsed = rawResult.content
        }

        return {
          response: parsed,
          raw: rawResult,
          stats: _r.getLastStats()
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
        if (isArray(aPrompt)) _r.conversation = _r.conversation.concat(aPrompt)
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
      getModel: (aModelId) => {
        aModelId = _$(aModelId, "aModelId").isString().default(_model)
        if (aws.lastConnect() > 5 * 60000) aws.reconnect()
        return aws.BEDROCK_GetFoundationalModel(aOptions.region, aModelId)
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
