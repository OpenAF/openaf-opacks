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
      tools: {},
      getConversation: () => {
        return _r.conversation
      },
      setConversation: (aConversation) => {
        if (isArray(aConversation)) _r.conversation = aConversation
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

        // aTools can be an array of tool objects or undefined (use _r.tools)
        var toolsToUse = isDef(aTools) ? (isArray(aTools) ? aTools : []) : Object.values(_r.tools)

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
            baseConv = baseConv.concat({ role: "user", content: [{ text: aPrompt }] })
          }

          // Normalize every message into the shape Nova expects: { role, content: [ { text } ] } (or keep existing array content)
          var normalized = baseConv.filter(m => isDef(m.role)).map(m => ({
            role: m.role,
            content: Array.isArray(m.content) ? m.content : [{ text: m.content }]
          }))

          _r.conversation = normalized // Update the conversation with the normalized messages

          _m = {
            messages: normalized.filter(r => r.role != "system"),
            schemaVersion: "messages-v1",
            system: _r.conversation.filter(m => m.role == "system").map(m => ({ text: m.content.map(s => s.text).join("") })),
            inferenceConfig: {
              temperature: aTemperature
            }
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
                      json: tool.function.parameters
                    }
                  }
                })
              }
            })
            if (toolConfig.length > 0) {
              _m.toolConfig = { tools: toolConfig }
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
        var res = aws.BEDROCK_InvokeModel(aOptions.region, aModel, aInput)
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
                    var tool = toolsToUse.find(t => t.function && t.function.name === toolName) || _r.tools[toolName]
                    if (isDef(tool) && isDef(tool.fn)) {
                      try {
                        var toolResult = tool.fn(toolInput)
                        var _tR
                        if (aModel.indexOf("anthropic.") >= 0 || aModel.indexOf("claude") >= 0) {
                          _tR = {
                            role: "user",
                            content: [{
                              type: "tool_result",
                              tool_use_id: toolCallId,
                              content: [!isObject(toolResult) ? {
                                type: "text",
                                text: isString(toolResult) ? toolResult : JSON.stringify(toolResult)
                              } : {
                                type: "json",
                                json: toolResult
                              }]
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
