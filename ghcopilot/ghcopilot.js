// Author: OpenAF community

loadExternalJars(getOPackPath("ghcopilot") || ".")
ow.loadAI()

ow.ai.__gpttypes.ghcopilot = {
  create: _p => {
    var aOptions = _$(isDef(_p) ? _p.options : __, "aOptions").isMap().default({})
    aOptions.params           = _$(aOptions.params,           "aOptions.params").isMap().default({})
    aOptions.model            = _$(aOptions.model,            "aOptions.model").isString().default("gpt-4.1")
    aOptions.mode             = _$(aOptions.mode,             "aOptions.mode").isString().default(__)
    aOptions.timeout          = _$(aOptions.timeout,          "aOptions.timeout").isNumber().default(120000)
    aOptions.cliPath          = _$(aOptions.cliPath,          "aOptions.cliPath").isString().default(__)
    aOptions.cliUrl           = _$(aOptions.cliUrl,           "aOptions.cliUrl").isString().default(__)
    aOptions.cwd              = _$(aOptions.cwd,              "aOptions.cwd").isString().default(__)
    aOptions.useStdio         = _$(aOptions.useStdio,         "aOptions.useStdio").isBoolean().default(true)
    aOptions.autoStart        = _$(aOptions.autoStart,        "aOptions.autoStart").isBoolean().default(true)
    aOptions.autoRestart      = _$(aOptions.autoRestart,      "aOptions.autoRestart").isBoolean().default(false)
    aOptions.githubToken      = _$(aOptions.githubToken,      "aOptions.githubToken").isString().default(__)
    aOptions.token            = _$(aOptions.token,            "aOptions.token").isString().default(__)
    aOptions.useLoggedInUser  = _$(aOptions.useLoggedInUser,  "aOptions.useLoggedInUser").isBoolean().default(__)
    aOptions.logLevel         = _$(aOptions.logLevel,         "aOptions.logLevel").isString().default(__)
    aOptions.reasoningEffort  = _$(aOptions.reasoningEffort,  "aOptions.reasoningEffort").isString().default(__)
    aOptions.configDir        = _$(aOptions.configDir,        "aOptions.configDir").isString().default(__)
    aOptions.skillDirectories = _$(aOptions.skillDirectories, "aOptions.skillDirectories").isArray().default(__)
    aOptions.disabledSkills   = _$(aOptions.disabledSkills,   "aOptions.disabledSkills").isArray().default(__)
    aOptions.availableTools   = _$(aOptions.availableTools,   "aOptions.availableTools").isArray().default(__)
    aOptions.excludedTools    = _$(aOptions.excludedTools,    "aOptions.excludedTools").isArray().default(__)

    var _conversation    = []
    var _lastStats       = __
    var _tools           = {}
    var _client          = __
    var _session         = __
    var _sessionStreaming = __
    var _sessionModel    = __
    var _sessionSysMsg   = __
    var _sessionToolsKey = __
    var _debugCh         = __

    var _resetStats = () => { _lastStats = __ }

    // Serialize a Java object to a plain JS value via Jackson
    var _fromJava = (jObj) => {
      if (isUnDef(jObj) || jObj === null) return __
      try {
        var mapper = new Packages.com.fasterxml.jackson.databind.ObjectMapper()
        return jsonParse(String(mapper.writeValueAsString(jObj)))
      } catch(e) {
        return jsonParse(stringify(jObj, __, ""))
      }
    }

    // Convert a plain JS object to java.util.LinkedHashMap (handles nested objects via Jackson)
    var _toJavaMap = (obj) => {
      if (isUnDef(obj)) return new java.util.LinkedHashMap()
      try {
        var mapper = new Packages.com.fasterxml.jackson.databind.ObjectMapper()
        return mapper.readValue(stringify(obj, __, ""), java.util.LinkedHashMap.class)
      } catch(e) {
        return new java.util.LinkedHashMap()
      }
    }

    // Build a Java ArrayList of strings from a JS array
    var _toJavaList = (arr) => {
      var l = new java.util.ArrayList()
      arr.forEach(v => l.add(String(v)))
      return l
    }

    // Extract concatenated system message content from conversation
    var _getSystemContent = () => {
      return _conversation
        .filter(m => isMap(m) && m.role === "system" && isString(m.content))
        .map(m => m.content)
        .join("\n")
    }

    // Fingerprint the registered tools (for session recreation detection)
    var _getToolsKey = () => Object.keys(_tools).sort().join(",")

    // Build a flat prompt string from the conversation, skipping system messages
    // (system messages are delivered to the SDK via SessionConfig.setSystemMessage)
    var _buildPrompt = (aPrompt) => {
      if (isArray(aPrompt)) {
        _conversation   = aPrompt
        _r.conversation = _conversation
      } else if (isString(aPrompt)) {
        _conversation.push({ role: "user", content: aPrompt })
      } else {
        throw "aPrompt needs to be a string or an array"
      }

      var out = []
      _conversation.forEach(m => {
        if (isMap(m) && isString(m.role) && m.role !== "system" && isDef(m.content)) {
          out.push(m.role + ": " + (isString(m.content) ? m.content : stringify(m.content, __, "")))
        }
      })
      return out.join("\n")
    }

    // Start the Copilot CLI client if not already running
    var _ensureClient = () => {
      if (isDef(_client)) return

      var co = new Packages.com.github.copilot.sdk.json.CopilotClientOptions()
      if (isString(aOptions.cliPath)) co.setCliPath(aOptions.cliPath)
      if (isString(aOptions.cliUrl))  co.setCliUrl(aOptions.cliUrl)
      if (isString(aOptions.cwd))     co.setCwd(aOptions.cwd)
      if (isString(aOptions.logLevel)) co.setLogLevel(aOptions.logLevel)
      co.setUseStdio(aOptions.useStdio)
      co.setAutoStart(aOptions.autoStart)
      co.setAutoRestart(aOptions.autoRestart)
      var _token = isString(aOptions.token) ? aOptions.token : aOptions.githubToken
      if (isString(_token)) {
        co.setGithubToken(_token)
        var _env = new java.util.HashMap()
        _env.put("GH_TOKEN",     _token)
        _env.put("GITHUB_TOKEN", _token)
        co.setEnvironment(_env)
      }
      if (isDef(aOptions.useLoggedInUser)) co.setUseLoggedInUser(aOptions.useLoggedInUser)

      _client = new Packages.com.github.copilot.sdk.CopilotClient(co)
      _client.start().get(aOptions.timeout, java.util.concurrent.TimeUnit.MILLISECONDS)
    }

    // Create (or recreate) the session when streaming mode, model, system message, or tools change
    var _ensureSession = (aStreaming) => {
      var _wantStreaming    = toBoolean(aStreaming)
      var _currentSysMsg   = _getSystemContent()
      var _currentToolsKey = _getToolsKey()

      if (isDef(_session) &&
          _sessionStreaming === _wantStreaming &&
          _sessionModel    === aOptions.model  &&
          _sessionSysMsg   === _currentSysMsg  &&
          _sessionToolsKey === _currentToolsKey) return

      // Close the old session (but keep the client/process alive)
      if (isDef(_session)) {
        try { _session.close() } catch(e) {}
        _session = __
      }

      _ensureClient()

      var sc = new Packages.com.github.copilot.sdk.json.SessionConfig().setModel(aOptions.model)
      if (isString(aOptions.cwd))            sc.setWorkingDirectory(aOptions.cwd)
      if (isString(aOptions.reasoningEffort)) sc.setReasoningEffort(aOptions.reasoningEffort)
      if (isString(aOptions.configDir))       sc.setConfigDir(aOptions.configDir)
      sc.setStreaming(_wantStreaming)

      // System message — use the SDK's native SystemMessageConfig
      if (_currentSysMsg.length > 0) {
        var smc = new Packages.com.github.copilot.sdk.json.SystemMessageConfig()
        smc.setContent(_currentSysMsg)
        smc.setMode(Packages.com.github.copilot.sdk.SystemMessageMode.APPEND)
        sc.setSystemMessage(smc)
      }

      // Tool definitions — use the SDK's native ToolDefinition + ToolHandler
      var toolDefs = new java.util.ArrayList()
      Object.keys(_tools).forEach(tName => {
        var t   = _tools[tName]
        var _fn = t.fn
        var handler = new JavaAdapter(Packages.com.github.copilot.sdk.json.ToolHandler, {
          invoke: function(invocation) {
            var cf = new java.util.concurrent.CompletableFuture()
            try {
              var args   = _fromJava(invocation.getArguments())
              var result = _fn(isDef(args) ? args : {})
              // Tool results must be serialized to a string for the SDK
              cf.complete(isMap(result) || isArray(result) ? stringify(result, __, "") : String(result))
            } catch(e) {
              cf.completeExceptionally(new java.lang.RuntimeException(String(e)))
            }
            return cf
          }
        })
        var params = isMap(t.function) && isDef(t.function.parameters)
          ? _toJavaMap(t.function.parameters)
          : new java.util.LinkedHashMap()
        toolDefs.add(Packages.com.github.copilot.sdk.json.ToolDefinition.create(
          String(t.function.name),
          String(t.function.description),
          params,
          handler
        ))
      })
      if (toolDefs.size() > 0) sc.setTools(toolDefs)

      // Optional SDK list options
      if (isArray(aOptions.skillDirectories) && aOptions.skillDirectories.length > 0)
        sc.setSkillDirectories(_toJavaList(aOptions.skillDirectories))
      if (isArray(aOptions.disabledSkills) && aOptions.disabledSkills.length > 0)
        sc.setDisabledSkills(_toJavaList(aOptions.disabledSkills))
      if (isArray(aOptions.availableTools) && aOptions.availableTools.length > 0)
        sc.setAvailableTools(_toJavaList(aOptions.availableTools))
      if (isArray(aOptions.excludedTools) && aOptions.excludedTools.length > 0)
        sc.setExcludedTools(_toJavaList(aOptions.excludedTools))

      _session         = _client.createSession(sc).get(aOptions.timeout, java.util.concurrent.TimeUnit.MILLISECONDS)
      _sessionStreaming = _wantStreaming
      _sessionModel    = aOptions.model
      _sessionSysMsg   = _currentSysMsg
      _sessionToolsKey = _currentToolsKey
    }

    var _extractUsage = (aUsageEvent) => {
      if (isUnDef(aUsageEvent) || isUnDef(aUsageEvent.getData)) return __
      var d = aUsageEvent.getData()
      if (isUnDef(d)) return __
      return {
        tokenLimit    : Number(d.tokenLimit()),
        currentTokens : Number(d.currentTokens()),
        messagesLength: Number(d.messagesLength())
      }
    }

    var _setDebug = (aFrom, aData) => {
      if (isUnDef(_debugCh)) return
      var entry = { _t: nowNano(), _f: aFrom }
      if (isMap(aData)) {
        entry = merge(entry, aData)
      } else if (isDef(aData)) {
        entry.data = aData
      }
      $ch(_debugCh).set({ _t: entry._t, _f: entry._f }, entry)
    }

    var _r = {
      conversation: _conversation,
      tools: _tools,
      getConversation: () => _conversation,
      setConversation: aConversation => {
        if (isArray(aConversation)) {
          _conversation   = aConversation
          _r.conversation = _conversation
        }
        return _r
      },
      getModelName: () => aOptions.model,
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
        _tools[aName] = {
          type: "function",
          function: {
            name       : aName,
            description: aDesc,
            parameters : aParams
          },
          fn         : aFn,
          name       : aName,
          description: aDesc,
          params     : aParams
        }
        return _r
      },
      prompt: (aPrompt, aModel, aTemperature, aJsonFlag, tools) => {
        var rr = _r.rawPrompt(aPrompt, aModel, aTemperature, aJsonFlag, tools)
        if (isMap(rr) && isString(rr.response)) return rr.response
        return rr
      },
      rawPrompt: (aPrompt, aModel, aTemperature, aJsonFlag, aTools) => {
        _resetStats()
        if (isString(aModel) && aModel !== aOptions.model) aOptions.model = aModel
        _ensureSession(false)

        var _usage = __
        var usageHandler = new JavaAdapter(java.util.function.Consumer, {
          accept: function(evt) { _usage = _extractUsage(evt) }
        })
        var usageClose = _session.on(Packages.com.github.copilot.sdk.events.SessionUsageInfoEvent, usageHandler)

        try {
          var p = _buildPrompt(aPrompt)
          if (toBoolean(aJsonFlag)) p += "\n\nReply strictly with valid JSON."

          var mo = new Packages.com.github.copilot.sdk.json.MessageOptions().setPrompt(p)
          if (isString(aOptions.mode)) mo.setMode(aOptions.mode)

          _setDebug("client", {
            vendor      : "ghcopilot",
            model       : aOptions.model,
            jsonFlag    : toBoolean(aJsonFlag),
            mode        : aOptions.mode,
            instructions: _getSystemContent(),
            tools       : Object.keys(_tools),
            prompt      : p
          })

          var ev      = _session.sendAndWait(mo).get(aOptions.timeout, java.util.concurrent.TimeUnit.MILLISECONDS)
          var content = isDef(ev) && isDef(ev.getData) && isDef(ev.getData()) ? String(ev.getData().content()) : ""

          _conversation.push({ role: "assistant", content: content })
          _lastStats = { vendor: "ghcopilot", model: aOptions.model, usage: _usage }
          _setDebug("llm", merge({ response: content }, isMap(_lastStats) ? _lastStats : {}))

          if (toBoolean(aJsonFlag)) {
            try {
              return { response: jsonParse(content), raw: content }
            } catch(e) {
              return { response: content, error: "Could not parse JSON response", raw: content }
            }
          }

          return { response: content }
        } catch(e) {
          _setDebug("llm-error", { error: String(e) })
          throw e
        } finally {
          try { usageClose.close() } catch(e) {}
        }
      },
      rawPromptStream: (aPrompt, aModel, aTemperature, aJsonFlag, aTools, aOnDelta) => {
        _resetStats()
        if (isString(aModel) && aModel !== aOptions.model) aOptions.model = aModel
        if (isFunction(aTools) && isUnDef(aOnDelta)) {
          aOnDelta = aTools
          aTools   = __
        }
        aOnDelta = _$(aOnDelta, "aOnDelta").default(__)
        _ensureSession(true)

        var _usage      = __
        var fullContent = ""
        var usageHandler = new JavaAdapter(java.util.function.Consumer, {
          accept: function(evt) { _usage = _extractUsage(evt) }
        })
        var deltaHandler = new JavaAdapter(java.util.function.Consumer, {
          accept: function(evt) {
            try {
              if (isUnDef(evt) || isUnDef(evt.getData) || isUnDef(evt.getData())) return
              var dd    = evt.getData()
              var chunk = isDef(dd.deltaContent) ? String(dd.deltaContent()) : __
              if (!isString(chunk) || chunk.length === 0) return
              fullContent += chunk
              if (isFunction(aOnDelta)) {
                try { aOnDelta(chunk, fullContent) } catch(ce) {}
              }
            } catch(e) {}
          }
        })
        var usageClose = _session.on(Packages.com.github.copilot.sdk.events.SessionUsageInfoEvent, usageHandler)
        var deltaClose = _session.on(Packages.com.github.copilot.sdk.events.AssistantMessageDeltaEvent, deltaHandler)

        try {
          var p = _buildPrompt(aPrompt)
          if (toBoolean(aJsonFlag)) p += "\n\nReply strictly with valid JSON."

          var mo = new Packages.com.github.copilot.sdk.json.MessageOptions().setPrompt(p)
          if (isString(aOptions.mode)) mo.setMode(aOptions.mode)

          _setDebug("client", {
            vendor      : "ghcopilot",
            model       : aOptions.model,
            jsonFlag    : toBoolean(aJsonFlag),
            mode        : aOptions.mode,
            streaming   : true,
            instructions: _getSystemContent(),
            tools       : Object.keys(_tools),
            prompt      : p
          })

          var ev      = _session.sendAndWait(mo).get(aOptions.timeout, java.util.concurrent.TimeUnit.MILLISECONDS)
          var content = fullContent
          if (content.length === 0) {
            content = isDef(ev) && isDef(ev.getData) && isDef(ev.getData()) ? String(ev.getData().content()) : ""
          }

          _conversation.push({ role: "assistant", content: content })
          _lastStats = { vendor: "ghcopilot", model: aOptions.model, usage: _usage }
          _setDebug("llm", merge({ response: content, streaming: true }, isMap(_lastStats) ? _lastStats : {}))

          return { content: content }
        } catch(e) {
          _setDebug("llm-error", { error: String(e), streaming: true })
          throw e
        } finally {
          try { deltaClose.close() } catch(e) {}
          try { usageClose.close() } catch(e) {}
        }
      },
      promptStream: (aPrompt, aModel, aTemperature, aJsonFlag, aTools, aOnDelta) => {
        var rr = _r.rawPromptStream(aPrompt, aModel, aTemperature, aJsonFlag, aTools, aOnDelta)
        if (isMap(rr) && isString(rr.content)) return rr.content
        return rr
      },
      promptStreamWithStats: (aPrompt, aModel, aTemperature, aJsonFlag, aTools, aOnDelta) => {
        var response = _r.promptStream(aPrompt, aModel, aTemperature, aJsonFlag, aTools, aOnDelta)
        return { response: response, stats: _lastStats }
      },
      rawPromptStreamWithStats: (aPrompt, aModel, aTemperature, aJsonFlag, aTools, aOnDelta) => {
        var response = _r.rawPromptStream(aPrompt, aModel, aTemperature, aJsonFlag, aTools, aOnDelta)
        return { response: response, stats: _lastStats }
      },
      promptWithStats: (aPrompt, aModel, aTemperature, aJsonFlag, tools) => {
        var response = _r.prompt(aPrompt, aModel, aTemperature, aJsonFlag, tools)
        return { response: response, stats: _lastStats }
      },
      rawPromptWithStats: (aPrompt, aModel, aTemperature, aJsonFlag, tools) => {
        var response = _r.rawPrompt(aPrompt, aModel, aTemperature, aJsonFlag, tools)
        return { response: response, stats: _lastStats }
      },
      addPrompt: (aRole, aPrompt) => {
        aRole = _$(aRole, "aRole").isString().default("user")
        if (isString(aPrompt)) _conversation.push({ role: aRole.toLowerCase(), content: aPrompt })
        return _r
      },
      addUserPrompt: aPrompt => _r.addPrompt("user", aPrompt),
      // Push system messages into the conversation array (like all reference providers).
      // _ensureSession picks them up via _getSystemContent() and sets SessionConfig.setSystemMessage().
      addSystemPrompt: aPrompt => {
        _$(aPrompt, "aPrompt").isString().$_()
        _conversation.push({ role: "system", content: aPrompt })
        _r.conversation = _conversation
        return _r
      },
      promptImage: (aPrompt, aImage, aDetailLevel, aRole, aModel, aTemperature, aJsonFlag) => {
        aRole        = _$(aRole,        "aRole").isString().default("user")
        aDetailLevel = _$(aDetailLevel, "aDetailLevel").isString().default("low")

        if (isString(aModel) && aModel !== aOptions.model) aOptions.model = aModel
        _ensureSession(false)

        var _usage = __
        var usageHandler = new JavaAdapter(java.util.function.Consumer, {
          accept: function(evt) { _usage = _extractUsage(evt) }
        })
        var usageClose = _session.on(Packages.com.github.copilot.sdk.events.SessionUsageInfoEvent, usageHandler)

        var _tmpFile = __
        try {
          var ptxt = isString(aPrompt) ? aPrompt : stringify(aPrompt, __, "")
          var p    = _buildPrompt([{ role: aRole.toLowerCase(), content: ptxt }])
          var mo   = new Packages.com.github.copilot.sdk.json.MessageOptions().setPrompt(p)
          if (isString(aOptions.mode)) mo.setMode(aOptions.mode)

          // Attach the image via SDK Attachment (path-based) instead of embedding base64 in text
          var attList = new java.util.ArrayList()
          if (io.fileExists(aImage)) {
            var _fname = String(new java.io.File(aImage).getName())
            attList.add(new Packages.com.github.copilot.sdk.json.Attachment("image", aImage, _fname))
          } else if (isString(aImage)) {
            // Base64 string: write to a temp file, attach, then clean up
            var _tmpJFile = java.io.File.createTempFile("ghcopilot_img_", ".jpg")
            _tmpFile      = String(_tmpJFile.getAbsolutePath())
            io.writeFileBytes(_tmpFile, af.fromBase64(aImage))
            attList.add(new Packages.com.github.copilot.sdk.json.Attachment("image", _tmpFile, "image.jpg"))
          } else {
            throw "aImage should be a file path or a base64 string"
          }
          mo.setAttachments(attList)

          _setDebug("client", {
            vendor      : "ghcopilot",
            model       : aOptions.model,
            mode        : aOptions.mode,
            instructions: _getSystemContent(),
            prompt      : p,
            hasImage    : true
          })

          var ev      = _session.sendAndWait(mo).get(aOptions.timeout, java.util.concurrent.TimeUnit.MILLISECONDS)
          var content = isDef(ev) && isDef(ev.getData) && isDef(ev.getData()) ? String(ev.getData().content()) : ""

          _conversation.push({ role: "assistant", content: content })
          _lastStats = { vendor: "ghcopilot", model: aOptions.model, usage: _usage }
          _setDebug("llm", merge({ response: content }, isMap(_lastStats) ? _lastStats : {}))

          if (toBoolean(aJsonFlag)) {
            try {
              return { response: jsonParse(content), raw: content }
            } catch(e) {
              return { response: content, error: "Could not parse JSON response", raw: content }
            }
          }
          return { response: content }
        } catch(e) {
          _setDebug("llm-error", { error: String(e) })
          throw e
        } finally {
          try { usageClose.close() } catch(e) {}
          if (isString(_tmpFile)) { try { io.rm(_tmpFile) } catch(e) {} }
        }
      },
      cleanPrompt: () => {
        _conversation   = []
        _r.conversation = _conversation
        _resetStats()
        return _r
      },
      getModelInfo: (aModelId) => {
        var mid    = _$(aModelId, "aModelId").isString().default(aOptions.model)
        var models = _r.getModels()
        var m      = $from(models).equals("id",   mid).at(0)
        if (isUnDef(m)) m = $from(models).equals("name", mid).at(0)
        return m
      },
      close: () => {
        try { if (isDef(_session)) _session.close() } catch(e) {}
        try { if (isDef(_client))  _client.close()  } catch(e) {}
        _session         = __
        _client          = __
        _sessionStreaming = __
        _sessionModel    = __
        _sessionSysMsg   = __
        _sessionToolsKey = __
      },
      getModels: () => {
        _ensureClient()
        return af.fromJavaArray(_client.listModels().get(aOptions.timeout, java.util.concurrent.TimeUnit.MILLISECONDS).toArray())
          .map(m => ({ id: String(m.getId()), name: String(m.getName()) }))
      }
    }

    return _r
  }
}
