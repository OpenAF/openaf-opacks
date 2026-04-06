loadExternalJars(getOPackPath("Mac") || ".")

/**
 * <odoc>
 * <key>Mac.macSay(aMsg, aVoice, quiet) : String</key>
 * Tries to say aMsg using the mac "say" command. Optionally you can specify aVoice name.
 * </odoc>
 */
var macSay = (msg, voice, quiet) => { 
    quiet = _$(quiet, "quiet").isBoolean().default(false)
    var _args = ["say"]

    if (isString(voice)) {
        _args.push("-v")
        _args.push(voice)
    }

    _args.push(msg)
    if (!quiet) print(ansiColor("BOLD", "🎙  mac talking... "))
    $sh(["say", "-v", "Jamie", msg]).exec()

    return !quiet ? ansiColor("ITALIC", msg) : msg
}

/**
 * <odoc>
 * <key>af.fromPList(aStringOrStream) : Object</key>
 * Tries to convert aStringOrStream representation of a PList file into a javascript object.
 * </odoc>
 */
AF.prototype.fromPList = function(aObj) {
    var pl = Packages.com.dd.plist.PropertyListParser.parse(isString(aObj) ? af.fromString2InputStream(aObj) : aObj)
    if (pl != null) {
        var _o = pl.toJavaObject()
        var _r
        if (Object.prototype.toString.call(_o) == "[object JavaArray]") {
            _r = []
            for(var i = 0; i < _o.length; i++) {
                _r.push( af.fromJavaMap(_o[i]) )
            }
        } else {
            _r = af.fromJavaMap(_o)
        }
        traverse(_r, (aK, aV, aP, aO) => {
            if (isString(aV) && (aV.endsWith(" AM") || aV.endsWith(" PM"))) {
                aO[aK] = ow.format.toDate(aV.replace(" ", " "), "MMM d, yyyy, h:mm:ss a")
            }
        })
        return _r
    } else {
        return __
    }
}

/**
 * <odoc>
 * <key>io.readFilePList(aFile) : Object</key>
 * Tries to read a PList file and convert it into a javascript object.
 * </odoc>
 */
IO.prototype.readFilePList = function(aFile) {
    return af.fromPList(new java.io.File(aFile))
}

/**
 * <odoc>
 * <key>io.writeFilePList(aFile, aObj) : Object</key>
 * Tries to write a javascript object into a PList file.
 * </odoc>
 */
IO.prototype.writeFilePList = function(aFile, aObj) {
    var _o = Packages.com.dd.plist.NSObject.fromJavaObject(aObj)
    var os = io.writeFileStream(aFile)
    Packages.com.dd.plist.PropertyListParser.saveAsXML(_o, os)
    os.close()
}

/**
 * <odoc>
 * <key>io.writeFilePListBin(aFile, aObj) : Object</key>
 * Tries to write a javascript object into a binary PList file.
 * </odoc>
 */
IO.prototype.writeFilePListBin = function(aFile, aObj) {
    var _o = Packages.com.dd.plist.NSObject.fromJavaObject(aObj)
    var os = io.writeFileStream(aFile)
    Packages.com.dd.plist.PropertyListParser.saveAsBinary(_o, os)
    os.close()
}

/**
 * <odoc>
 * <key>af.toPList(aObj) : String</key>
 * Tries to convert a javascript object into a PList string representation.
 * </odoc>
 */
AF.prototype.toPList = function(aObj) {
    return String(Packages.com.dd.plist.NSObject.fromJavaObject(aObj).toXMLPropertyList())
}

// ow.ai integration for Apple Foundation Models
ow.loadAI()
ow.ai.__gpttypes.mac = {
  create: _p => {
    var aOptions = _$(_p.options, "aOptions").isMap().$_()
    aOptions.model     = _$(aOptions.model,       "aOptions.model").isString().default("default")
    aOptions.temperature = _$(aOptions.temperature, "aOptions.temperature").isNumber().default(__)
    aOptions.timeout   = _$(aOptions.timeout,     "aOptions.timeout").isNumber().default(120000)

    var _model       = aOptions.model
    var _temperature = aOptions.temperature
    var _lastStats   = __
    var _debugCh     = __

    // Swift helper script — compiled on each call via `swift <file>`
    var _swiftScript = `import Foundation
import FoundationModels

struct Msg: Codable { var role: String; var content: String }
struct In: Codable  { var messages: [Msg]; var temperature: Double?; var jsonMode: Bool? }
struct Out: Codable { var content: String?; var error: String? }

func enc<T: Encodable>(_ v: T) -> String {
    guard let d = try? JSONEncoder().encode(v), let s = String(data: d, encoding: .utf8) else { return "{}" }
    return s
}

guard CommandLine.arguments.count > 1,
      let raw = try? Data(contentsOf: URL(fileURLWithPath: CommandLine.arguments[1])),
      let inp = try? JSONDecoder().decode(In.self, from: raw)
else {
    print(enc(Out(content: nil, error: "invalid input")))
    exit(1)
}

guard SystemLanguageModel.default.isAvailable else {
    let avail = String(describing: SystemLanguageModel.default.availability)
    print(enc(Out(content: nil, error: "Apple Foundation Models unavailable: \\(avail)")))
    exit(1)
}

let sem = DispatchSemaphore(value: 0)
var out = Out(content: nil, error: nil)

Task {
    do {
        // Split messages by role
        let sysMsgs = inp.messages.filter { $0.role == "system" }.map { $0.content }
        let chatMsgs = inp.messages.filter { $0.role != "system" }

        // Build transcript entries
        var entries: [Transcript.Entry] = []

        // System instructions entry
        let sysText = sysMsgs.joined(separator: "\\n")
        if !sysText.isEmpty {
            let instrSeg = Transcript.TextSegment(content: sysText)
            let instrEntry = Transcript.Entry.instructions(
                Transcript.Instructions(segments: [.text(instrSeg)], toolDefinitions: [])
            )
            entries.append(instrEntry)
        }

        // Prior conversation turns (all but the last message)
        let priorMsgs = chatMsgs.dropLast()
        for msg in priorMsgs {
            let seg = Transcript.TextSegment(content: msg.content)
            if msg.role == "user" {
                let prompt = Transcript.Prompt(segments: [.text(seg)])
                entries.append(.prompt(prompt))
            } else {
                let resp = Transcript.Response(assetIDs: [], segments: [.text(seg)])
                entries.append(.response(resp))
            }
        }

        // Create session from accumulated transcript
        let transcript = Transcript(entries: entries)
        let session = LanguageModelSession(transcript: transcript)

        // Last user message (the actual prompt)
        let lastContent: String
        if let last = chatMsgs.last {
            lastContent = (inp.jsonMode == true) ? last.content + " Answer in JSON." : last.content
        } else {
            out = Out(content: nil, error: "no user message provided")
            sem.signal()
            return
        }

        var opts = GenerationOptions()
        if let temp = inp.temperature { opts.temperature = temp }

        let response = try await session.respond(to: lastContent, options: opts)
        out = Out(content: response.content, error: nil)
    } catch {
        out = Out(content: nil, error: error.localizedDescription)
    }
    sem.signal()
}
sem.wait()
print(enc(out))
`

    var _callModel = (messages, temperature, jsonMode) => {
      var tmpScript = __
      var tmpInput  = __
      try {
        tmpScript = io.createTempFile("ow_ai_mac_", ".swift")
        tmpInput  = io.createTempFile("ow_ai_mac_in_", ".json")
        io.writeFileString(tmpScript, _swiftScript)
        io.writeFileJSON(tmpInput, { messages: messages, temperature: temperature, jsonMode: jsonMode || false }, "")

        if (isDef(_debugCh)) $ch(_debugCh).set({_t:nowNano(),_f:"client"}, { messages: messages, temperature: temperature, jsonMode: jsonMode })

        var res = $sh(["swift", tmpScript, tmpInput]).timeout(aOptions.timeout).exec()[0]

        // Always try to parse stdout first — the script emits JSON even on error paths
        var parsed = jsonParse(res.stdout.trim(), true)
        if (isMap(parsed)) {
          if (isDef(_debugCh)) $ch(_debugCh).set({_t:nowNano(),_f:"llm"}, parsed)
          return parsed
        }

        if (res.exitcode != 0) return { error: res.stderr || "swift process failed (exit " + res.exitcode + ")" }
        return { error: "unexpected output: " + res.stdout }
      } finally {
        if (isDef(tmpScript)) try { io.rm(tmpScript) } catch(e) {}
        if (isDef(tmpInput))  try { io.rm(tmpInput)  } catch(e) {}
      }
    }

    var _r = {
      conversation: [],
      tools: {},

      getConversation: () => _r.conversation,

      setConversation: (aConversation) => {
        if (isArray(aConversation)) _r.conversation = aConversation
        return _r
      },

      exportConversation: () => {
        return _r.conversation.map(msg => ({
          role   : String(msg.role || "user").toLowerCase(),
          content: isString(msg.content) ? msg.content : (isMap(msg.content) ? stringify(msg.content,"","") : String(msg.content || ""))
        }))
      },

      importConversation: (aExport) => {
        _$(aExport, "aExport").isArray().$_()
        _r.conversation = aExport.map(msg => ({
          role   : String(msg.role || "user").toLowerCase(),
          content: isString(msg.content) ? msg.content : ""
        }))
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
        _r.tools[aName] = { type: "function", function: { name: aName, description: aDesc, parameters: aParams }, fn: aFn }
        return _r
      },

      addPrompt: (aRole, aPrompt) => {
        if (isUnDef(aPrompt)) { aPrompt = aRole; aRole = "user" }
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

      rawPrompt: (aPrompt, aModel, aTemperature, aJsonFlag, aTools) => {
        aPrompt      = _$(aPrompt, "aPrompt").default("")
        aTemperature = _$(aTemperature, "aTemperature").isNumber().default(_temperature)
        aJsonFlag    = _$(aJsonFlag, "aJsonFlag").isBoolean().default(false)

        // Build message list from conversation + new prompt
        var msgs = _r.conversation.slice()
        if (isString(aPrompt) && aPrompt.length > 0) msgs = msgs.concat({ role: "user", content: aPrompt })
        else if (isArray(aPrompt)) msgs = aPrompt

        var result = _callModel(msgs, aTemperature, aJsonFlag)

        _lastStats = { vendor: "mac", model: _model }
        if (isDef(result.error)) return result

        // Update conversation with user prompt and assistant reply
        if (isString(aPrompt) && aPrompt.length > 0) _r.conversation.push({ role: "user", content: aPrompt })
        _r.conversation.push({ role: "assistant", content: result.content || "" })

        return result.content || __
      },

      prompt: (aPrompt, aModel, aTemperature, aJsonFlag, aTools) => {
        return _r.rawPrompt(aPrompt, aModel, aTemperature, aJsonFlag, aTools)
      },

      promptImage: (aPrompt, aImage, aDetailLevel, aRole, aModel, aTemperature, aJsonFlag) => {
        throw "promptImage not supported by Apple Foundation Models"
      },

      promptWithStats: (aPrompt, aModel, aTemperature, aJsonFlag, aTools) => {
        var response = _r.prompt(aPrompt, aModel, aTemperature, aJsonFlag, aTools)
        return { response: response, stats: _r.getLastStats() }
      },

      rawPromptWithStats: (aPrompt, aModel, aTemperature, aJsonFlag, aTools) => {
        var response = _r.rawPrompt(aPrompt, aModel, aTemperature, aJsonFlag, aTools)
        return { response: response, stats: _r.getLastStats() }
      },

      rawPromptStream: (aPrompt, aModel, aTemperature, aJsonFlag, aTools, aOnDelta) => {
        // Foundation Models streaming is not exposed via CLI; fall back to non-streaming
        var content = _r.rawPrompt(aPrompt, aModel, aTemperature, aJsonFlag, aTools)
        if (isDef(aOnDelta) && isString(content)) aOnDelta(content, {})
        return { content: isString(content) ? content : "", events: [] }
      },

      promptStream: (aPrompt, aModel, aTemperature, aJsonFlag, aTools, aOnDelta) => {
        var result = _r.rawPromptStream(aPrompt, aModel, aTemperature, aJsonFlag, aTools, aOnDelta)
        return result.content
      },

      promptStreamWithStats: (aPrompt, aModel, aTemperature, aJsonFlag, aTools, aOnDelta) => {
        var response = _r.promptStream(aPrompt, aModel, aTemperature, aJsonFlag, aTools, aOnDelta)
        return { response: response, stats: _r.getLastStats() }
      },

      rawPromptStreamWithStats: (aPrompt, aModel, aTemperature, aJsonFlag, aTools, aOnDelta) => {
        var response = _r.rawPromptStream(aPrompt, aModel, aTemperature, aJsonFlag, aTools, aOnDelta)
        return { response: response, stats: _r.getLastStats() }
      },

      promptStreamJSON: (aPrompt, aModel, aTemperature, aTools, aOnDelta) => {
        var text = _r.promptStream(aPrompt, aModel, aTemperature, true, aTools, aOnDelta)
        try { return jsonParse(text) } catch(e) { return text }
      },

      getModels: () => [{ modelId: "default", modelName: "Apple Foundation Model (on-device)" }],

      getModel: () => ({ modelId: "default", modelName: "Apple Foundation Model (on-device)" }),
    }
    return _r
  }
}