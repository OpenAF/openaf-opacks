// Bedrock Converse transport and private provider helpers. No AWS SDK required.
// Loaded by aws_bedrock.js after aws_core.js.
AWS.__bedrockConverse = {
  fail: function(message) { throw new Error("Bedrock Converse: " + message) },
  error: function(value, status, code) {
    var body = value
    if (isString(body)) { try { body = JSON.parse(body) } catch(ignore) { body = { message: body } } }
    body = isMap(body) ? body : {}
    return { message: body.message || body.Message || String(value), code: code || body.__type || body.code || "BedrockError",
      responseCode: status, requestId: body.requestId,
      originalStatusCode: body.originalStatusCode, originalMessage: body.originalMessage }
  },
  // Incremental framing with prelude/message CRC32. Retains at most one incomplete frame.
  decoder: function(onFrame) {
    var pending = [], self = this
    var uint = function(a, p) { return ((a[p] * 16777216) + (a[p + 1] << 16) + (a[p + 2] << 8) + a[p + 3]) >>> 0 }
    var crc = function(a) { var c = new java.util.zip.CRC32(); c.update(af.fromArray2Bytes(a)); return Number(c.getValue()) }
    var utf = function(a) {
      return String(java.nio.charset.StandardCharsets.UTF_8.newDecoder().onMalformedInput(java.nio.charset.CodingErrorAction.REPORT)
        .onUnmappableCharacter(java.nio.charset.CodingErrorAction.REPORT).decode(java.nio.ByteBuffer.wrap(af.fromArray2Bytes(a))))
    }
    var decode = function(frame, headersLength) {
      var headers = {}, p = 12, end = 12 + headersLength
      var take = function(n) { if (p + n > end) self.fail("truncated EventStream header"); var a = frame.slice(p, p + n); p += n; return a }
      while (p < end) {
        var name = utf(take(take(1)[0])), type = take(1)[0], value
        if (Object.prototype.hasOwnProperty.call(headers, name)) self.fail("duplicate EventStream header")
        if (type == 0 || type == 1) value = type == 0
        else if (type == 2) { value = take(1)[0]; if (value > 127) value -= 256 }
        else if (type == 3) { var s = take(2); value = (s[0] << 8) | s[1]; if (value > 32767) value -= 65536 }
        else if (type == 4) value = uint(take(4), 0) | 0
        else if (type == 5 || type == 8) value = String(new java.math.BigInteger(af.fromArray2Bytes(take(8))))
        else if (type == 6 || type == 7) {
          var l = take(2), bytes = take((l[0] << 8) | l[1]); value = type == 7 ? utf(bytes) : bytes
        } else if (type == 9) value = take(16)
        else self.fail("unknown EventStream header type " + type)
        headers[name] = value
      }
      onFrame(headers, utf(frame.slice(end, frame.length - 4)))
    }
    return {
      push: function(bytes) {
        // Consume one bounded frame at a time even if the network supplies many frames.
        for (var i = 0; i < bytes.length; i++) {
          pending.push(bytes[i] & 255)
          if (pending.length == 12) {
            if (crc(pending.slice(0, 8)) != uint(pending, 8)) self.fail("EventStream prelude CRC mismatch")
            var total = uint(pending, 0), hl = uint(pending, 4)
            if (total < 16 || hl > total - 16 || total > 32 * 1024 * 1024) self.fail("invalid EventStream lengths")
          }
          if (pending.length >= 16 && pending.length == uint(pending, 0)) {
            if (crc(pending.slice(0, -4)) != uint(pending, pending.length - 4)) self.fail("EventStream message CRC mismatch")
            decode(pending, uint(pending, 4)); pending = []
          }
        }
      },
      end: function() { if (pending.length) self.fail("truncated EventStream frame") }
    }
  },
  // Verified exact IDs, not family-wide capability guesses. Unknown is distinct from false.
  // Sources: AWS model cards and structured-output guide; reviewed 2026-11-15.
  records: {
    "deepseek.v3-v1:0": { text: true, streaming: true, tools: true, images: false, structuredOutput: true },
    "qwen.qwen3-coder-480b-a35b-v1:0": { text: true, streaming: true, tools: true, images: false, structuredOutput: true },
    "meta.llama3-3-70b-instruct-v1:0": { text: true, streaming: true, tools: true, streamingTools: false, images: false, structuredOutput: false },
    "mistral.devstral-2-123b": { text: true, streaming: true, images: false, structuredOutput: true },
    "mistral.magistral-small-2509": { text: true, streaming: true, images: true, structuredOutput: true },
    "zai.glm-4.7": { text: true, streaming: true, images: false, structuredOutput: true },
    "google.gemma-3-12b-it": { text: true, streaming: true, images: true, structuredOutput: true },
    "ai21.jamba-1-5-large-v1:0": { text: true }
  },
  create: function(options, context) {
    var self = this, copy = function(v) { return clone(v) }, fail = function(m) { self.fail(m) }
    var has = function(o, k) { return Object.prototype.hasOwnProperty.call(o, k) }
    if (isDef(options.api) && ["invoke", "converse", "responses", "auto"].indexOf(options.api) < 0) fail("api must be invoke, converse, responses or auto")
    if (isDef(options.maxToolRounds) && (!Number.isInteger(options.maxToolRounds) || options.maxToolRounds < 0)) fail("maxToolRounds must be a non-negative integer")
    if (isDef(options.modelCapabilities) && !isMap(options.modelCapabilities)) fail("modelCapabilities must be a map")
    var caps = function(model, api) {
      var id = String(model), base = id.replace(/^(global|us|eu|apac|au|jp|in|ca|us-gov)\./, "")
      if (/:foundation-model\//.test(id)) base = id.split(":foundation-model/")[1]
      var c = api == "converse" ? copy(self.records[base] || {}) : {}
      if (api == "converse" && base == "openai.gpt-6.1-sol") c = { text: true, streaming: true,
        images: true, documents: false, structuredOutput: true, schemaProfile: "required", strictOutput: true }
      if (api == "converse" && base == "anthropic.claude-sonnet-4-5-20250929-v1:0") c = { text: true, streaming: true,
        tools: true, streamingTools: true, images: true, documents: true, reasoning: true, promptCaching: true, structuredOutput: true }
      var override = options.modelCapabilities && options.modelCapabilities[id] && options.modelCapabilities[id][api]
      if (isDef(override)) {
        if (!isMap(override)) fail("model capability override must be a map")
        Object.keys(override).forEach(function(k) {
          if (["text", "streaming", "tools", "streamingTools", "images", "documents", "reasoning", "promptCaching", "structuredOutput", "strictOutput", "schemaProfile"].indexOf(k) < 0) fail("unknown capability " + k)
          if (k == "schemaProfile" && override[k] != "required") fail("schemaProfile must be required")
          if (["schemaProfile"].indexOf(k) < 0 && typeof override[k] != "boolean") fail("capability " + k + " must be boolean")
          c[k] = override[k]
        })
      }
      return c
    }
    var nativeModel = function(model) {
      var id = String(model).replace(/^(global|us|eu|apac|au|jp|in|ca|us-gov)\./, "")
      return /^(amazon\.(titan-|nova-)|anthropic\.|mistral\.|meta\.|openai\.)/.test(id) && !context.responses(model)
    }
    var resolve = function(model, features) {
      features = features || []
      var requested = options.api
      if (isUnDef(requested)) return context.responses(model) ? "responses" : "invoke"
      var compatible = function(api) {
        if (api == "invoke") {
          var base = String(model).replace(/^(global|us|eu|apac|au|jp|in|ca|us-gov)\./, "")
          var verified = context.structured(model) == "supported" || ["amazon.titan-text-express-v1", "amazon.titan-text-lite-v1", "amazon.nova-micro-v1:0", "amazon.nova-lite-v1:0", "amazon.nova-pro-v1:0", "mistral.mistral-7b-instruct-v0:2", "meta.llama3-3-70b-instruct-v1:0", "openai.gpt-oss-120b-1:0", "openai.gpt-oss-20b-1:0"].indexOf(base) >= 0 || caps(model, api).text === true
          if (!verified && (requested == "auto" || features.length)) return false
          return nativeModel(model) && features.every(function(f) {
          if (f == "nativeHistory") return true
          if (f == "structuredOutput") return context.structured(model) == "supported"
          if (f == "streaming") return true
          if (f == "tools" || f == "streamingTools") return /anthropic\.|amazon\.nova-|openai\./.test(String(model))
          if (f == "images") return /anthropic\./.test(String(model))
          return caps(model, api)[f] === true
          })
        }
        if (api == "responses") return (context.responses(model) || caps(model, api).text === true) && features.every(function(f) {
          return f == "responsesHistory" || context.responses(model) && ["streaming", "tools", "streamingTools"].indexOf(f) >= 0 || caps(model, api)[f] === true
        })
        var c = caps(model, api)
        return c.text !== false && (requested == "converse" || c.text === true) && features.every(function(f) { return f == "converseFields" || f == "converseHistory" || c[f] === true })
      }
      if (requested == "auto") {
        var legacy = context.responses(model) ? "responses" : "invoke"
        if (compatible(legacy) && !has(self.records, String(model).replace(/^(global|us|eu|apac|au|jp|in|ca|us-gov)\./, ""))) return legacy
        if (compatible("converse")) return "converse"
        if (compatible("responses")) return "responses"
      } else if (compatible(requested)) return requested
      fail("unsupported or unverified " + (requested || "backend") + " features for " + model + ": " + features.join(", ") + "; configure modelCapabilities for verified models")
    }
    var tools = function(selection) {
      var registry = Object.create(null), specs = [], source = context.provider().tools
      var add = function(value, name) {
        if (isString(value)) { name = value; value = source[name] }
        if (!isMap(value)) fail("unknown tool " + name)
        var def = value.function || value
        name = def.name || name
        if (!isString(name) || !name.length || !isMap(def.parameters)) fail("invalid tool specification")
        if (has(registry, name)) return
        registry[name] = value
        specs.push({ toolSpec: { name: name, description: def.description || "", inputSchema: { json: copy(def.parameters) } } })
      }
      if (isUnDef(selection)) Object.keys(source).forEach(function(k) { add(source[k], k) })
      else if (isArray(selection)) selection.forEach(function(t) { add(t) })
      else if (isMap(selection)) Object.keys(selection).forEach(function(k) { add(source[k] || selection[k], k) })
      else fail("tools must be an array or map")
      return { registry: registry, specs: specs }
    }
    var blob = function(source, limit) {
      if (!isMap(source) || !isString(source.bytes) || !ow.ai.__image.validBase64(source.bytes)) fail("content source.bytes must be base64, not a file path")
      if (af.fromBase64(source.bytes).length > limit) fail("content exceeds byte limit")
    }
    var block = function(b, role, c) {
      if (!isMap(b)) fail("content block must be a map")
      if (b.type == "text") {
        if (!isString(b.text)) fail("text must be a string")
        if (Object.keys(b).some(function(k) { return k != "type" && k != "text" })) fail("native text metadata requires its original backend or explicit Converse blocks")
        return { text: b.text }
      }
      if (b.type == "tool_use" || b.type == "toolUse") b = { toolUse: { toolUseId: b.id || b.toolUseId, name: b.name, input: copy(b.input) } }
      if (b.type == "tool_result" || b.type == "toolResult") b = { toolResult: { toolUseId: b.tool_use_id || b.toolUseId, content: [{ text: isString(b.content) ? b.content : JSON.stringify(b.content) }], status: b.is_error ? "error" : "success" } }
      if (b.type == "image" && b.source && b.source.type == "base64") b = { image: { format: String(b.source.media_type).replace("image/", ""), source: { bytes: b.source.data } } }
      if (isDef(b.type) || Object.keys(b).length != 1) fail("unsupported or opaque content block; retain its original backend")
      var k = Object.keys(b)[0]
      if (["text", "toolUse", "toolResult", "image", "document", "reasoningContent", "cachePoint", "guardContent", "citationsContent"].indexOf(k) < 0) fail("unsupported content block " + k)
      if (k == "text" && !isString(b.text)) fail("text must be a string")
      if (k == "toolUse" && (role != "assistant" || !isMap(b.toolUse) || !isString(b.toolUse.toolUseId) || !b.toolUse.toolUseId.length || !isString(b.toolUse.name) || !isMap(b.toolUse.input))) fail("invalid assistant toolUse block")
      if (k == "toolResult") {
        var tr = b.toolResult
        if (role != "user" || !isMap(tr) || !isString(tr.toolUseId) || !tr.toolUseId.length || !isArray(tr.content) || !tr.content.length) fail("invalid user toolResult block")
        if (isDef(tr.status) && ["success", "error"].indexOf(tr.status) < 0) fail("invalid toolResult status")
        tr.content.forEach(function(part) {
          if (!isMap(part) || Object.keys(part).length != 1 || (!has(part, "json") && !isString(part.text))) fail("tool results support only text or JSON content")
        })
      }
      if (k == "image") {
        if (c.images !== true || role != "user") fail("images require a verified image-capable model and user role")
        if (["png", "jpeg", "gif", "webp"].indexOf(b.image.format) < 0) fail("unsupported image format")
        blob(b.image.source, 3932160)
        var prepared = ow.ai.__image.prepare(b.image.source.bytes, { maxSide: 8000, maxPixels: 64000000, maxBytes: 3932160 })
        if (prepared.resized) fail("image exceeds dimensions or size; use promptImage to prepare it")
      }
      if (k == "document") {
        if (c.documents !== true || role != "user") fail("documents require a verified document-capable model and user role")
        if (["pdf", "csv", "doc", "docx", "xls", "xlsx", "html", "txt", "md"].indexOf(b.document.format) < 0) fail("unsupported document format")
        if (!/^[A-Za-z0-9 ()\[\]-]+$/.test(b.document.name || "")) fail("use a neutral document name without paths")
        blob(b.document.source, 4718592)
      }
      if (k == "cachePoint" && c.promptCaching !== true) fail("prompt caching requires an explicit capability")
      return copy(b)
    }
    var messages = function(conversation, c) {
      var out = [], system = []
      if (!isArray(conversation)) fail("conversation must be an array")
      conversation.forEach(function(m, idx) {
        if (!isMap(m) || isDef(m._responsesOutput)) fail("invalid or incompatible message " + idx)
        var role = isString(m.role) ? m.role.toLowerCase() : m.role
        if (role == "developer") role = "system"
        if (role == "model") role = "assistant"
        if (["user", "assistant", "system", "tool"].indexOf(role) < 0) fail("invalid role at message " + idx)
        var content = []
        if (role == "tool") content = [block({ toolResult: { toolUseId: m.tool_call_id, content: [{ text: isString(m.content) ? m.content : JSON.stringify(m.content) }] } }, "user", c)]
        else {
          if (isString(m.content) && m.content.length) content = [{ text: m.content }]
          else if (isArray(m.content)) content = m.content.map(function(b) { return block(b, role, c) })
          else if (m.content !== null && isDef(m.content)) fail("invalid content at message " + idx)
          if (isArray(m.tool_calls)) m.tool_calls.forEach(function(t) {
            if (!isMap(t) || !isMap(t.function)) fail("invalid tool call")
            var input = t.function.arguments
            if (isString(input)) { try { input = JSON.parse(input) } catch(e) { fail("invalid tool arguments") } }
            content.push(block({ toolUse: { toolUseId: t.id, name: t.function.name, input: copy(input) } }, role, c))
          })
        }
        if (!content.length) fail("empty content at message " + idx)
        if (role == "system") {
          content.forEach(function(b) { if (!has(b, "text") && !has(b, "cachePoint")) fail("invalid system content") })
          system = system.concat(content)
        } else {
          if (content.filter(function(b) { return b.image }).length > 20 || content.filter(function(b) { return b.document }).length > 5) fail("too many images or documents")
          if (content.some(function(b) { return b.document }) && !content.some(function(b) { return b.text })) fail("documents require accompanying text")
          out.push({ role: role == "tool" ? "user" : role, content: content })
        }
      })
      if (!out.length) fail("conversation requires a user message")
      // Portable imports emit separate tool messages; Converse expects their user blocks together.
      var combined = []
      out.forEach(function(m) {
        var previous = combined[combined.length - 1]
        if (m.role == "user" && previous && previous.role == "user" && m.content.every(function(b) { return b.toolResult }) && previous.content.every(function(b) { return b.toolResult })) previous.content = previous.content.concat(m.content)
        else combined.push(m)
      })
      return { messages: combined, system: system }
    }
    var build = function(conversation, model, temperature, json, selected, schema) {
      var c = caps(model, "converse"), converted = messages(conversation, c), p = copy(options.params || {}), body = { messages: converted.messages }, inf = {}
      var fields = ["inferenceConfig", "additionalModelRequestFields", "additionalModelResponseFieldPaths", "performanceConfig", "serviceTier", "requestMetadata", "guardrailConfig", "outputConfig", "toolConfig", "promptVariables", "system"]
      var aliases = ["max_tokens", "max_output_tokens", "temperature", "top_p", "stop_sequences"]
      Object.keys(p).forEach(function(k) { if (fields.indexOf(k) < 0 && aliases.indexOf(k) < 0) fail("params." + k + " is not a Converse field; use additionalModelRequestFields") })
      if (converted.system.length) body.system = converted.system
      if (isDef(options.temperature)) inf.temperature = options.temperature
      if (isDef(p.max_tokens)) inf.maxTokens = p.max_tokens
      if (isDef(p.max_output_tokens)) inf.maxTokens = p.max_output_tokens
      if (isDef(p.temperature)) inf.temperature = p.temperature
      if (isDef(p.top_p)) inf.topP = p.top_p
      if (isDef(p.stop_sequences)) inf.stopSequences = p.stop_sequences
      if (isDef(temperature)) inf.temperature = temperature
      if (isDef(p.inferenceConfig)) {
        if (!isMap(p.inferenceConfig)) fail("inferenceConfig must be a map")
        Object.keys(p.inferenceConfig).forEach(function(k) { if (["maxTokens", "temperature", "topP", "stopSequences"].indexOf(k) < 0) fail("invalid inferenceConfig." + k); inf[k] = p.inferenceConfig[k] })
      }
      if (isDef(inf.maxTokens) && (!Number.isInteger(inf.maxTokens) || inf.maxTokens < 1)) fail("maxTokens must be a positive integer")
      ;["temperature", "topP"].forEach(function(k) { if (isDef(inf[k]) && (!isNumber(inf[k]) || !isFinite(inf[k]) || inf[k] < 0 || inf[k] > 1)) fail("invalid " + k) })
      if (isDef(inf.stopSequences) && (!isArray(inf.stopSequences) || inf.stopSequences.some(function(v) { return !isString(v) }))) fail("stopSequences must be strings")
      if (Object.keys(inf).length) body.inferenceConfig = inf
      fields.filter(function(k) { return k != "inferenceConfig" && k != "system" }).forEach(function(k) { if (isDef(p[k])) body[k] = p[k] })
      if (isDef(p.system)) {
        var systemContent = isString(p.system) ? [{ text: p.system }] : p.system
        if (!isArray(systemContent)) fail("system must be a string or block array")
        body.system = systemContent.map(function(b) {
          var value = block(b, "system", c)
          if (!has(value, "text") && !has(value, "cachePoint")) fail("invalid system block")
          return value
        }).concat(converted.system)
      }
      if (context.promptCachingRequested) fail("use explicit Converse cachePoint blocks instead of promptCaching")
      if (selected.specs.length) {
        var tc = body.toolConfig || { tools: [] }
        if (!isArray(tc.tools)) fail("toolConfig.tools must be an array")
        selected.specs.forEach(function(spec) {
          var existing = tc.tools.filter(function(t) { return t.toolSpec && t.toolSpec.name == spec.toolSpec.name })
          if (existing.length && JSON.stringify(existing[0]) != JSON.stringify(spec)) fail("conflicting tool definition " + spec.toolSpec.name)
          if (!existing.length) tc.tools.push(spec)
        })
        body.toolConfig = tc
      }
      if (json && !schema && !body.outputConfig) body.messages[body.messages.length - 1].content.push({ text: "Return only valid JSON." })
      if (schema) {
        if (body.outputConfig || body.toolConfig) fail("schema requests own outputConfig and tools")
        body.outputConfig = { textFormat: { type: "json_schema", structure: { jsonSchema: { name: "openaf_response", schema: JSON.stringify(schema) } } } }
      }
      if (body.outputConfig) {
        var tf = body.outputConfig.textFormat, definition = tf && tf.structure && tf.structure.jsonSchema
        if (!tf || tf.type != "json_schema" || !definition || !isString(definition.schema)) fail("outputConfig requires textFormat.structure.jsonSchema.schema as a JSON string")
        var wireSchema
        try { wireSchema = JSON.parse(definition.schema) } catch(e) { fail("invalid outputConfig JSON schema") }
        context.schema({ schema: wireSchema })
        if (c.schemaProfile == "required") {
          var visit = function(s) {
            if (s.type == "object" && Object.keys(s.properties || {}).some(function(k) { return (s.required || []).indexOf(k) < 0 })) fail("this model requires all schema properties in required")
            Object.keys(s.properties || {}).forEach(function(k) { visit(s.properties[k]) }); if (s.items) visit(s.items)
          }; visit(wireSchema)
        }
        if (c.strictOutput) {
          var extra = body.additionalModelRequestFields || {}, text = extra.text || {}, format = text.format || {}
          if (has(format, "strict") && format.strict !== true) fail("model requires text.format.strict=true")
          format.strict = true; text.format = format; extra.text = text; body.additionalModelRequestFields = extra
        }
      }
      if (/:prompt\//.test(model) && ["inferenceConfig", "system", "toolConfig", "additionalModelRequestFields"].some(function(k) { return has(body, k) })) fail("prompt resource owns system, inferenceConfig, toolConfig and additionalModelRequestFields")
      return body
    }
    var accumulator = function(callback) {
      var blocks = Object.create(null), started = false, stopped = false, metadata = false, raw = {}, text = ""
      var index = function(e) { if (!Number.isInteger(e.contentBlockIndex) || e.contentBlockIndex < 0) fail("invalid content block index"); return String(e.contentBlockIndex) }
      return {
        accept: function(event) {
          if (!isMap(event) || Object.keys(event).length != 1) fail("invalid Converse event")
          var kind = Object.keys(event)[0], e = event[kind]
          if (/Exception$/.test(kind)) { var error = self.error(e, __, kind); throw error }
          if (kind == "messageStart") {
            if (started || e.role != "assistant") fail("invalid messageStart")
            started = true
          } else if (kind == "metadata") {
            if (!stopped || metadata) fail("out-of-order metadata")
            metadata = true; raw.usage = copy(e.usage); raw.metrics = copy(e.metrics)
          } else if (kind == "messageStop") {
            if (!started || stopped || Object.keys(blocks).some(function(k) { return !blocks[k].closed })) fail("messageStop with incomplete blocks")
            stopped = true; raw.stopReason = e.stopReason
            if (e.additionalModelResponseFields) raw.additionalModelResponseFields = copy(e.additionalModelResponseFields)
          } else {
            if (!started || stopped) fail("content event outside message")
            var k = index(e), b = blocks[k]
            if (kind == "contentBlockStart") {
              if (b) fail("duplicate content block start")
              if (!isMap(e.start)) fail("invalid block start")
              b = blocks[k] = { value: copy(e.start), input: "", closed: false }
            } else if (kind == "contentBlockDelta") {
              var d = e.delta
              if (!isMap(d) || Object.keys(d).length != 1) fail("invalid content delta")
              if (!b) b = blocks[k] = { value: {}, input: "", closed: false }
              if (b.closed) fail("delta after contentBlockStop")
              if (has(d, "text")) {
                if (!isString(d.text) || (Object.keys(b.value).length && !has(b.value, "text"))) fail("invalid text delta")
                b.value.text = (b.value.text || "") + d.text; text += d.text
                if (isFunction(callback)) callback(d.text, event)
              } else if (d.toolUse) {
                if (!b.value.toolUse || !isString(d.toolUse.input)) fail("tool input without start")
                b.input += d.toolUse.input
              } else if (d.reasoningContent) {
                var r = d.reasoningContent
                if (!b.value.reasoningContent) b.value.reasoningContent = {}
                var rc = b.value.reasoningContent
                if (has(r, "redactedContent")) {
                  if (rc.reasoningText) fail("mixed reasoning content")
                  var old = rc.redactedContent ? Array.prototype.slice.call(af.fromBase64(rc.redactedContent)) : []
                  rc.redactedContent = String(java.util.Base64.getEncoder().encodeToString(af.fromArray2Bytes(old.concat(Array.prototype.slice.call(af.fromBase64(r.redactedContent))))))
                } else {
                  if (rc.redactedContent) fail("mixed reasoning content")
                  if (!rc.reasoningText) rc.reasoningText = { text: "", signature: "" }
                  if (isString(r.text)) { rc.reasoningText.text += r.text; if (options.showReasoning && isFunction(callback)) callback(r.text, event) }
                  else if (isString(r.signature)) rc.reasoningText.signature += r.signature
                  else fail("unknown reasoning delta")
                }
              } else fail("unsupported streaming delta " + Object.keys(d)[0])
            } else if (kind == "contentBlockStop") {
              if (!b || b.closed) fail("invalid contentBlockStop")
              if (b.value.toolUse) {
                try { b.value.toolUse.input = JSON.parse(b.input) } catch(err) { fail("incomplete tool JSON") }
                if (!isMap(b.value.toolUse.input)) fail("tool arguments must be an object")
              }
              b.closed = true
            } else fail("unknown streaming event " + kind)
          }
        },
        finish: function() {
          if (!started || !stopped) fail("interrupted Converse stream")
          raw.output = { message: { role: "assistant", content: Object.keys(blocks).sort(function(a, b) { return Number(a) - Number(b) }).map(function(k) { return blocks[k].value }) } }
          return raw
        },
        text: function() { return text }
      }
    }
    var normalize = function(raw) {
      if (!isMap(raw) || !raw.output || !isMap(raw.output.message) || raw.output.message.role != "assistant" || !isArray(raw.output.message.content) || !raw.output.message.content.length) fail("invalid Converse response")
      var text = "", calls = []
      raw.output.message.content.forEach(function(b) {
        if (!isMap(b) || Object.keys(b).length != 1) fail("invalid response content block")
        if (isString(b.text)) text += b.text
        if (b.toolUse) {
          var t = b.toolUse
          if (!isString(t.toolUseId) || !t.toolUseId.length || !isString(t.name) || !isMap(t.input)) fail("invalid toolUse")
          calls.push(copy(t))
        }
        if (options.showReasoning && b.reasoningContent && b.reasoningContent.reasoningText) text += b.reasoningContent.reasoningText.text || ""
      })
      if (calls.length && raw.stopReason != "tool_use") fail("tool calls without tool_use stop reason")
      if (raw.stopReason == "tool_use" && !calls.length) fail("tool_use without calls")
      return { message: copy(raw.output.message), text: text, calls: calls }
    }
    var featureList = function(stream, selected, conversation) {
      var f = stream ? ["streaming"] : []
      if (selected.specs.length || (options.params && options.params.toolConfig)) f.push("tools")
      if (stream && f.indexOf("tools") >= 0) f.push("streamingTools")
      if (options.params && options.params.outputConfig) f.push("structuredOutput")
      if (options.params && ["inferenceConfig", "additionalModelRequestFields", "additionalModelResponseFieldPaths", "performanceConfig", "serviceTier", "requestMetadata", "guardrailConfig", "outputConfig", "toolConfig", "promptVariables"].some(function(k) { return has(options.params, k) })) f.push("converseFields")
      ;(isArray(conversation) ? conversation : []).forEach(function(m) {
        if (m._responsesOutput && f.indexOf("responsesHistory") < 0) f.push("responsesHistory")
        if (!isArray(m.content)) return
        m.content.forEach(function(b) {
          if (!isMap(b)) return
          if (b.reasoningContent && f.indexOf("converseHistory") < 0) f.push("converseHistory")
          if (["thinking", "redacted_thinking"].indexOf(b.type) >= 0 && f.indexOf("nativeHistory") < 0) f.push("nativeHistory")
          if (b.image || b.type == "image") { if (f.indexOf("images") < 0) f.push("images") }
          if (b.document) { if (f.indexOf("documents") < 0) f.push("documents") }
          if (b.cachePoint) { if (f.indexOf("promptCaching") < 0) f.push("promptCaching") }
        })
      })
      return f
    }
    return {
      caps: caps, resolve: resolve, accumulator: accumulator,
      route: function(model, stream, selection, prompt) { return resolve(model, options.api ? featureList(stream, tools(selection), isArray(prompt) ? prompt : context.provider().conversation) : []) },
      run: function(prompt, model, temperature, json, selection, callback, stream) {
        var provider = context.provider(), selected = tools(selection), history = isArray(prompt) ? copy(prompt) : copy(provider.conversation)
        if (!isArray(prompt) && isString(prompt) && prompt.length) history.push({ role: "user", content: prompt })
        var allEvents = [], fullText = "", ledger = Object.create(null), limit = isDef(options.maxToolRounds) ? options.maxToolRounds : 10
        context.reset()
        for (var round = 0; ; round++) {
          var body = build(history, model, temperature, json, selected), raw, events = [], acc
          // Validation completes before credentials refresh or transport.
          resolve(model, featureList(stream, selected, history))
          context.debug("llm-converse-request", { model: model, api: "converse", streaming: stream, round: round })
          context.refresh()
          if (stream) {
            acc = accumulator(callback)
            var transport
            try {
              transport = context.aws.BEDROCK_ConverseStream(options.region, model, body, function(e) { events.push(copy(e)); acc.accept(e) })
              allEvents = allEvents.concat(events)
              if (transport && transport.error) return { error: transport.error, content: fullText + acc.text(), events: allEvents }
              raw = acc.finish()
            } catch(e) { return { error: self.error(e, e.responseCode, e.code), content: fullText + acc.text(), events: allEvents.concat(events) } }
          } else {
            raw = context.aws.BEDROCK_Converse(options.region, model, body)
            if (raw && raw.error) return raw
          }
          var normalized
          try {
            normalized = normalize(raw)
            if (body.outputConfig && !normalized.calls.length) {
              if (raw.stopReason != "end_turn" || raw.refusal) fail("incomplete or refused structured response")
              var outputText = raw.output.message.content.filter(function(b) { return isString(b.text) }).map(function(b) { return b.text }).join("")
              ow.ai.__decision.validateSchema(JSON.parse(body.outputConfig.textFormat.structure.jsonSchema.schema), ow.ai.__decision.parse(outputText))
            }
          } catch(e) {
            if (!stream) throw e
            return { error: self.error(e, e.responseCode, e.code), content: fullText + acc.text(), events: allEvents }
          }
          context.stats(raw, model)
          fullText += normalized.text
          if (normalized.calls.length && round >= limit) fail("maxToolRounds exceeded")
          history.push(normalized.message)
          if (!normalized.calls.length) {
            provider.conversation = history
            context.debug("llm-converse", { model: model, api: "converse", stopReason: raw.stopReason, events: allEvents.length })
            return stream ? { content: fullText, events: allEvents, stopReason: raw.stopReason, response: raw } : normalized.text
          }
          // Check every correlation before executing any handler.
          var current = Object.create(null)
          normalized.calls.forEach(function(t) {
            var key = t.toolUseId, fingerprint = JSON.stringify({ name: t.name, input: t.input })
            if (has(current, key) || (has(ledger, key) && ledger[key].fingerprint != fingerprint)) fail("duplicate or conflicting toolUseId " + key)
            current[key] = fingerprint
          })
          var results = normalized.calls.map(function(t) {
            var key = t.toolUseId
            if (has(ledger, key)) return copy(ledger[key].result)
            var result = { toolResult: { toolUseId: key, content: [] } }, handler = selected.registry[t.name]
            try {
              if (!handler || !isFunction(handler.fn)) throw new Error("Tool " + t.name + " is not available")
              var value = handler.fn(copy(t.input))
              result.toolResult.content = isString(value) ? [{ text: value || "" }] : [{ json: isUnDef(value) ? null : JSON.parse(JSON.stringify(value)) }]
              result.toolResult.status = "success"
            } catch(e) { result.toolResult.content = [{ text: String(e.message || e) }]; result.toolResult.status = "error" }
            ledger[key] = { fingerprint: current[key], result: copy(result) }
            return result
          })
          history.push({ role: "user", content: results })
          provider.conversation = copy(history)
        }
      },
      structured: function(request) {
        var d = ow.ai.__decision
        context.reset()
        if (!d.map(request)) d.invalid()
        var isolated = {}
        Object.keys(request).forEach(function(k) { if (isDef(request[k])) d.put(isolated, k, d.copy(request[k])) })
        request = isolated
        var model = request.model || options.model
        if (resolve(model, ["structuredOutput"]) != "converse") throw d.error("LLM_DECISION_UNSUPPORTED", "bedrock")
        var schema = context.schema(request), po = request.providerOptions || {}
        d.only(po, ["temperature", "maxOutputTokens"])
        var selected = { specs: [], registry: {} }, conv = request.messages || [{ role: "user", content: isString(request.state) ? request.state : JSON.stringify(request.state) }]
        conv = copy(conv)
        if (isString(request.instructions) && request.instructions.length) conv.unshift({ role: "system", content: request.instructions })
        var body
        try {
          body = build(conv, model, po.temperature, false, selected, schema)
          var definition = body.outputConfig.textFormat.structure.jsonSchema
          if (isDef(request.schemaName)) {
            if (!isString(request.schemaName) || !/^[a-zA-Z0-9_-]{1,64}$/.test(request.schemaName)) fail("invalid schema name")
            definition.name = request.schemaName
          }
          if (isDef(request.schemaDescription)) definition.description = request.schemaDescription
          if (isDef(po.maxOutputTokens)) {
            if (!Number.isInteger(po.maxOutputTokens) || po.maxOutputTokens < 1) d.invalid()
            if (!body.inferenceConfig) body.inferenceConfig = {}
            body.inferenceConfig.maxTokens = po.maxOutputTokens
          }
        } catch(e) { if (e.code) throw e; throw d.error("LLM_DECISION_INVALID_REQUEST", "bedrock", __, String(e.message || e)) }
        var raw = d.execution(function() {
          context.refresh()
          var result = context.aws.BEDROCK_Converse(options.region, model, body)
          if (result && result.error) {
            var e = result.error, detail = self.error(e.response || e.message || e, e.responseCode, e.code)
            throw d.error("LLM_DECISION_PROVIDER_ERROR", "bedrock", detail.responseCode, detail.message)
          }
          return result
        }, "bedrock")
        return { raw: raw, stats: context.stats(raw, model) }
      },
      normalizeStructured: function(raw, request) {
        var d = ow.ai.__decision
        if (!raw || raw.refusal || raw.stopReason != "end_turn") d.badResponse()
        var n
        try { n = normalize(raw) } catch(e) { d.badResponse() }
        if (n.calls.length || raw.output.message.content.some(function(b) { return !has(b, "text") && !has(b, "reasoningContent") })) d.badResponse()
        // Schema parsing never includes reasoning even when showReasoning is true.
        var text = raw.output.message.content.filter(function(b) { return isString(b.text) }).map(function(b) { return b.text }).join("")
        var value = d.parse(text)
        return request.questions ? d.structuredAnswers(value, request) : d.validateSchema(request.schema, value)
      }
    }
  }
}

/**
 * <odoc>
 * <key>AWS.BEDROCK_Converse(aRegion, aModelId, aInput) : Map</key>
 * Calls Bedrock Converse using the configured region and unmodified model identifier.
 * </odoc>
 */
AWS.prototype.BEDROCK_Converse = function(aRegion, aModelId, aInput) {
  aRegion = _$(aRegion, "aRegion").isString().default(this.region)
  _$(aModelId, "aModelId").isString().$_()
  if (!aModelId.length || aModelId.length > 2048) AWS.__bedrockConverse.fail("modelId length must be 1 to 2048")
  _$(aInput, "aInput").isMap().$_()
  var uri = "/model/" + encodeURIComponent(aModelId) + "/converse"
  var host = "bedrock-runtime." + aRegion + ".amazonaws.com", payload = stringify(clone(aInput), __, "")
  var headers = this.__getRequest("post", uri, "bedrock", host, aRegion, "", payload, __, __, "application/json")
  var timeout = this.bedrockTimeout || __flags.HTTP_CON_TIMEOUT
  var result = $rest({ requestHeaders: headers, connectionTimeout: timeout,
    options: { timeout: timeout, readTimeout: timeout, writeTimeout: timeout } }).post("https://" + host + uri, payload)
  if (result && isMap(result.error)) {
    var detail = AWS.__bedrockConverse.error(result.error.response || result.error.message || result.error, result.error.responseCode, result.error.code)
    result.error.code = detail.code
    result.error.message = detail.message
  }
  return result
}

/**
 * <odoc>
 * <key>AWS.BEDROCK_ConverseStream(aRegion, aModelId, aInput, aOnEvent) : Map</key>
 * Incrementally delivers Converse union events and decoded EventStream headers.
 * Returns {events} or {events,error}; errors retain AWS codes and HTTP status where supplied.
 * </odoc>
 */
AWS.prototype.BEDROCK_ConverseStream = function(aRegion, aModelId, aInput, aOnEvent) {
  aRegion = _$(aRegion, "aRegion").isString().default(this.region)
  _$(aModelId, "aModelId").isString().$_()
  if (!aModelId.length || aModelId.length > 2048) AWS.__bedrockConverse.fail("modelId length must be 1 to 2048")
  _$(aInput, "aInput").isMap().$_()
  _$(aOnEvent, "aOnEvent").isFunction().$_()
  var uri = "/model/" + encodeURIComponent(aModelId) + "/converse-stream", host = "bedrock-runtime." + aRegion + ".amazonaws.com"
  var url = "https://" + host + uri, payload = stringify(aInput, __, ""), helper = AWS.__bedrockConverse
  var headers = this.__getRequest("post", uri, "bedrock", host, aRegion, "", payload, __, __, "application/json")
  headers["Accept"] = "application/vnd.amazon.eventstream"
  var timeout = this.bedrockTimeout || __flags.HTTP_CON_TIMEOUT || 30000, events = [], h, stream, stopped = false
  try {
    ow.loadObj()
    h = new ow.obj.http(url, "POST", payload, headers, false, timeout, true, { delayBuild: true, timeout: timeout, readTimeout: timeout, writeTimeout: timeout })
    h.setThrowExceptions(false)
    if (isDef(h.client.build)) h.client = h.client.build()
    h.exec(url, "POST", payload, headers, false, timeout, true)
    var status = h.responseCode()
    if (status != 200) return { error: helper.error(h.response(), status), events: events }
    stream = h.responseStream()
    if (isUnDef(stream)) helper.fail("missing response stream")
    var decoder = helper.decoder(function(frameHeaders, content) {
      var kind = frameHeaders[":message-type"], name = frameHeaders[":event-type"], body
      try { body = JSON.parse(content) } catch(e) { helper.fail("invalid EventStream JSON") }
      if (kind == "exception" || kind == "error") throw helper.error(body, status, frameHeaders[":exception-type"] || frameHeaders[":error-code"] || name)
      if (kind != "event" || !isString(name)) helper.fail("invalid EventStream event headers")
      if (/Exception$/.test(name)) throw helper.error(body, status, name)
      var event = {}; event[name] = body
      events.push(event); aOnEvent(event, { headers: frameHeaders })
      if (name == "messageStop") stopped = true
    })
    ioStreamReadBytes(stream, function(bytes) { decoder.push(bytes) }, __, false)
    decoder.end()
    if (!stopped) helper.fail("interrupted Converse stream (missing messageStop)")
    return { events: events }
  } catch(e) { return { error: helper.error(e, e.responseCode, e.code), events: events } }
  finally {
    if (stream) { try { stream.close() } catch(ignore) {} }
    if (h) { try { h.close() } catch(ignore) {} }
  }
}
