// Author: OpenAF community

loadExternalJars(getOPackPath("ghcopilot") || ".")
ow.loadAI()

var __ghcopilotRequire = function() {
  if (isUnDef(Packages.com) ||
      isUnDef(Packages.com.github) ||
      isUnDef(Packages.com.github.copilot) ||
      isUnDef(Packages.com.github.copilot.sdk) ||
      isUnDef(Packages.com.github.copilot.sdk.CopilotClient)) {
    throw "Missing copilot-sdk-java jars. Run: ojob ojob.io/oaf/mavenGetJars folder=. in the ghcopilot opack folder."
  }
}

ow.ai.__gpttypes.ghcopilot = {
  create: _p => {
    var aOptions = _$(isDef(_p) ? _p.options : __, "aOptions").isMap().default({})
    aOptions.params = _$(aOptions.params, "aOptions.params").isMap().default({})
    aOptions.model = _$(aOptions.model, "aOptions.model").isString().default("gpt-4.1")
    aOptions.mode = _$(aOptions.mode, "aOptions.mode").isString().default(__)
    aOptions.timeout = _$(aOptions.timeout, "aOptions.timeout").isNumber().default(120000)
    aOptions.cliPath = _$(aOptions.cliPath, "aOptions.cliPath").isString().default(__)
    aOptions.cliUrl = _$(aOptions.cliUrl, "aOptions.cliUrl").isString().default(__)
    aOptions.cwd = _$(aOptions.cwd, "aOptions.cwd").isString().default(__)
    aOptions.useStdio = _$(aOptions.useStdio, "aOptions.useStdio").isBoolean().default(true)
    aOptions.autoStart = _$(aOptions.autoStart, "aOptions.autoStart").isBoolean().default(true)
    aOptions.autoRestart = _$(aOptions.autoRestart, "aOptions.autoRestart").isBoolean().default(false)
    aOptions.githubToken = _$(aOptions.githubToken, "aOptions.githubToken").isString().default(__)
    aOptions.token = _$(aOptions.token, "aOptions.token").isString().default(__)
    aOptions.useLoggedInUser = _$(aOptions.useLoggedInUser, "aOptions.useLoggedInUser").isBoolean().default(__)
    aOptions.logLevel = _$(aOptions.logLevel, "aOptions.logLevel").isString().default(__)

    var _conversation = []
    var _instructions = __
    var _lastStats = __
    var _tools = {}
    var _client = __
    var _session = __

    var _resetStats = () => { _lastStats = __ }

    var _buildPrompt = (aPrompt) => {
      var conv = []
      if (isArray(aPrompt)) {
        conv = aPrompt
        _conversation = aPrompt
      } else if (isString(aPrompt)) {
        _conversation.push({ role: "user", content: aPrompt })
        conv = _conversation
      } else {
        throw "aPrompt needs to be a string or an array"
      }

      var out = []
      if (isString(_instructions) && _instructions.length > 0) out.push("System: " + _instructions)
      conv.forEach(m => {
        if (isMap(m) && isString(m.role) && isDef(m.content)) {
          out.push(m.role + ": " + m.content)
        }
      })
      return out.join("\n")
    }

    var _ensureSession = () => {
      __ghcopilotRequire()
      if (isDef(_session) && isDef(_client)) return

      var CopilotClient = Packages.com.github.copilot.sdk.CopilotClient
      var CopilotClientOptions = Packages.com.github.copilot.sdk.json.CopilotClientOptions
      var SessionConfig = Packages.com.github.copilot.sdk.json.SessionConfig

      var co = new CopilotClientOptions()
      if (isString(aOptions.cliPath)) co.setCliPath(aOptions.cliPath)
      if (isString(aOptions.cliUrl)) co.setCliUrl(aOptions.cliUrl)
      if (isString(aOptions.cwd)) co.setCwd(aOptions.cwd)
      if (isString(aOptions.logLevel)) co.setLogLevel(aOptions.logLevel)
      co.setUseStdio(aOptions.useStdio)
      co.setAutoStart(aOptions.autoStart)
      co.setAutoRestart(aOptions.autoRestart)
      var _token = isString(aOptions.token) ? aOptions.token : aOptions.githubToken
      if (isString(_token)) {
        co.setGithubToken(_token)
        var _env = new java.util.HashMap()
        _env.put("GH_TOKEN", _token)
        _env.put("GITHUB_TOKEN", _token)
        co.setEnvironment(_env)
      }
      if (isDef(aOptions.useLoggedInUser)) co.setUseLoggedInUser(aOptions.useLoggedInUser)

      _client = new CopilotClient(co)
      _client.start().get(aOptions.timeout, java.util.concurrent.TimeUnit.MILLISECONDS)

      var sc = new SessionConfig().setModel(aOptions.model)
      if (isString(aOptions.cwd)) sc.setWorkingDirectory(aOptions.cwd)
      sc.setStreaming(false)
      _session = _client.createSession(sc).get(aOptions.timeout, java.util.concurrent.TimeUnit.MILLISECONDS)
    }

    var _extractUsage = (aUsageEvent) => {
      if (isUnDef(aUsageEvent) || isUnDef(aUsageEvent.getData)) return __
      var d = aUsageEvent.getData()
      if (isUnDef(d)) return __
      return {
        tokenLimit: Number(d.tokenLimit()),
        currentTokens: Number(d.currentTokens()),
        messagesLength: Number(d.messagesLength())
      }
    }

    var _r = {
      conversation: _conversation,
      tools: _tools,
      getConversation: () => _conversation,
      setConversation: aConversation => {
        if (isArray(aConversation)) _conversation = aConversation
        _r.conversation = _conversation
        return _r
      },
      getModelName: () => aOptions.model,
      getLastStats: () => _lastStats,
      setTool: (aName, aDesc, aParams, aFn) => {
        _tools[aName] = { name: aName, description: aDesc, params: aParams, fn: aFn }
        return _r
      },
      prompt: (aPrompt, aModel, aTemperature, aJsonFlag, tools) => {
        var rr = _r.rawPrompt(aPrompt, aModel, aTemperature, aJsonFlag, tools)
        if (isMap(rr) && isString(rr.response)) return rr.response
        return rr
      },
      rawPrompt: (aPrompt, aModel, aTemperature, aJsonFlag, aTools) => {
        _resetStats()
        if (isString(aModel) && aModel != aOptions.model) {
          aOptions.model = aModel
          try { if (isDef(_session)) _session.close() } catch(e) {}
          _session = __
        }
        _ensureSession()

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

          var ev = _session.sendAndWait(mo).get(aOptions.timeout, java.util.concurrent.TimeUnit.MILLISECONDS)
          var content = isDef(ev) && isDef(ev.getData) && isDef(ev.getData()) ? String(ev.getData().content()) : ""

          _conversation.push({ role: "assistant", content: content })
          _lastStats = {
            vendor: "ghcopilot",
            model: aOptions.model,
            usage: _usage
          }

          if (toBoolean(aJsonFlag)) {
            try {
              return { response: jsonParse(content), raw: content }
            } catch(e) {
              return { response: content, error: "Could not parse JSON response", raw: content }
            }
          }

          return { response: content }
        } finally {
          try { usageClose.close() } catch(e) {}
        }
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
      addSystemPrompt: aPrompt => {
        _instructions = _$(aPrompt, "aPrompt").isString().$_()
        return _r
      },
      cleanPrompt: () => {
        _conversation = []
        _r.conversation = _conversation
        _instructions = __
        _resetStats()
        return _r
      },
      close: () => {
        try { if (isDef(_session)) _session.close() } catch(e) {}
        try { if (isDef(_client)) _client.close() } catch(e) {}
        _session = __
        _client = __
      },
      getModels: () => {
        _ensureSession()
        return af.fromJavaArray(_client.listModels().get(aOptions.timeout, java.util.concurrent.TimeUnit.MILLISECONDS).toArray())
          .map(m => ({ id: String(m.getId()), name: String(m.getName()) }))
      }
    }

    return _r
  }
}
