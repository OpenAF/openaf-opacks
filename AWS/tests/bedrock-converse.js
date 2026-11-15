// Fully offline Converse fixtures; also loaded by tests/bedrock.js.
(function() {
  loadLib("aws_bedrock.js")
  ow.loadObj()
  var count = 0
  function ok(v, label) { count++; if (!v) throw new Error("Converse: " + label) }
  function eq(a, b, label) { ok(JSON.stringify(a) == JSON.stringify(b), label + " (" + JSON.stringify(a) + ")") }
  function bad(fn, pattern) { var e; try { fn() } catch(err) { e = err }; ok(isDef(e), "expected failure " + pattern); if (pattern) ok(new RegExp(pattern, "i").test(String(e.message || e)), "error detail " + e); return e }
  var connect = AWS.prototype.connect, factory = ow.obj.rest.connectionFactory, http = ow.obj.http
  var converse = AWS.prototype.BEDROCK_Converse, stream = AWS.prototype.BEDROCK_ConverseStream
  var invoke = AWS.prototype.BEDROCK_InvokeModel, responses = AWS.prototype.BEDROCK_OpenAIResponses
  var helper = AWS.__bedrockConverse, calls = [], wire, response, status = 200, closed = 0, httpClosed = 0, streamReads = 0, streamTimeout
  AWS.prototype.connect = function() { this.accessKey = "test-key"; this.secretKey = "test-secret"; this.stoken = "test-token"; this.region = "eu-west-1" }
  function answer(text, extra) { var r = { output: { message: { role: "assistant", content: [{ text: text }] } }, stopReason: "end_turn", usage: { inputTokens: 8, outputTokens: 2, totalTokens: 10, cacheReadInputTokens: 3, cacheWriteInputTokens: 0 }, metrics: { latencyMs: 9 } }; Object.keys(extra || {}).forEach(function(k) { r[k] = extra[k] }); return r }
  function make(id, extra) { return $llm({ type: "bedrock", options: merge({ region: "eu-west-1", model: id || "future.chat", api: "converse", params: {} }, extra || {}) }).getGPT() }
  function model(id, extra) { return make(id, extra).model }
  function crc(bytes) { var c = new java.util.zip.CRC32(); c.update(af.fromArray2Bytes(bytes)); return Number(c.getValue()) }
  function u32(v) { return [v >>> 24 & 255, v >>> 16 & 255, v >>> 8 & 255, v & 255] }
  function utf(s) { return Array.prototype.slice.call(new java.lang.String(s).getBytes("UTF-8")).map(function(b) { return b & 255 }) }
  function header(name, type, value) { var n = utf(name); return [n.length].concat(n, [type], value || []) }
  function sh(name, value) { var v = utf(value); return header(name, 7, [v.length >>> 8, v.length & 255].concat(v)) }
  function frame(name, body, kind, extras) {
    var h = sh(":message-type", kind || "event").concat(sh(kind == "exception" ? ":exception-type" : ":event-type", name), extras || [])
    var p = utf(JSON.stringify(body)), prelude = u32(16 + h.length + p.length).concat(u32(h.length))
    var data = prelude.concat(u32(crc(prelude)), h, p)
    return data.concat(u32(crc(data)))
  }
  function events(text) { return [
    { messageStart: { role: "assistant" } },
    { contentBlockDelta: { contentBlockIndex: 0, delta: { text: text || "hé😀" } } },
    { contentBlockStop: { contentBlockIndex: 0 } },
    { messageStop: { stopReason: "end_turn" } },
    { metadata: { usage: { inputTokens: 8, outputTokens: 2, totalTokens: 10 }, metrics: { latencyMs: 4 } } }
  ] }
  function encoded(es) { return es.reduce(function(out, e) { var k = Object.keys(e)[0]; return out.concat(frame(k, e[k])) }, []) }
  function setupWire(bytes) {
    wire = bytes; closed = 0; httpClosed = 0; streamReads = 0
    ow.obj.http = function(url, method, payload, headers, binary, timeout) {
      streamTimeout = timeout
      calls.push({ url: url, body: JSON.parse(payload), headers: headers })
      var pos = 0
      this.client = {}; this.setThrowExceptions = function() {}; this.exec = function() {}
      this.responseCode = function() { return status }; this.response = function() { return JSON.stringify(response) }
      this.responseStream = function() { return {
        read: function(buffer, off, len) {
          streamReads++
          if (pos == wire.length) return -1
          var n = Math.min(7, len, wire.length - pos)
          for (var i = 0; i < n; i++) buffer[off + i] = wire[pos++] > 127 ? wire[pos - 1] - 256 : wire[pos - 1]
          return n
        }, close: function() { closed++ }
      } }
      this.close = function() { httpClosed++ }
    }
  }
  ow.obj.rest.connectionFactory = function() { return {
    exec: function(url, method, payload, headers) {
      calls.push({ url: String(url), body: JSON.parse(String(payload)), headers: headers })
      if (status >= 400) {
        var error = new Error("HTTP fixture"), envelope = JSON.stringify({ responseCode: status, response: JSON.stringify(response) })
        error.toString = function() { return "HTTP failure response = " + envelope }; throw error
      }
      return { response: JSON.stringify(response), responseCode: status }
    }, getErrorResponse: function() { return JSON.stringify(response) }, close: function() {}
  } }
  try {
    response = answer("ok")
    var client = new AWS(), input = { messages: [{ role: "user", content: [{ text: "hello" }] }] }, before = JSON.stringify(input)
    ;["qwen.qwen3-coder-480b-a35b-v1:0", "eu.anthropic.claude-sonnet-4-5-20250929-v1:0", "global.openai.gpt-6.1-sol", "arn:aws:bedrock:eu-west-1:123456789012:inference-profile/eu.test-v1:0", "arn:aws:bedrock:eu-west-1:123456789012:application-inference-profile/a%2Fb"].forEach(function(id) {
      client.BEDROCK_Converse("eu-west-1", id, input)
      var call = calls[calls.length - 1]
      eq(call.url, "https://bedrock-runtime.eu-west-1.amazonaws.com/model/" + encodeURIComponent(id) + "/converse", "encoded model path")
      ok(call.headers.Authorization.indexOf("/eu-west-1/bedrock/aws4_request") >= 0, "region and service signed")
      eq(call.body, input, "request body")
    })
    eq(JSON.stringify(input), before, "low-level input immutable")
    // Independent JCA HMAC oracle reconstructs the SigV4 canonical request, including ARN escaping.
    function hex(bytes) { return Array.prototype.map.call(bytes, function(b) { return ("0" + (b & 255).toString(16)).slice(-2) }).join("") }
    function hash(value) { return hex(java.security.MessageDigest.getInstance("SHA-256").digest(new java.lang.String(value).getBytes("UTF-8"))) }
    function hmac(key, value) { var mac = javax.crypto.Mac.getInstance("HmacSHA256"); mac.init(new javax.crypto.spec.SecretKeySpec(isString(key) ? new java.lang.String(key).getBytes("UTF-8") : key, "HmacSHA256")); return mac.doFinal(new java.lang.String(value).getBytes("UTF-8")) }
    calls.forEach(function(call) {
      var hs = { host: String(new java.net.URI(call.url).getHost()) }, auth = call.headers.Authorization
      Object.keys(call.headers).forEach(function(k) { hs[k.toLowerCase()] = String(call.headers[k]) })
      var names = auth.match(/SignedHeaders=([^,]+)/)[1].split(";"), date = hs["x-amz-date"], scope = date.slice(0,8) + "/eu-west-1/bedrock/aws4_request"
      var canonical = "POST\n" + encodeURI(String(new java.net.URI(call.url).getRawPath())) + "\n\n" + names.map(function(k) { return k + ":" + hs[k].trim().replace(/\s+/g, " ") + "\n" }).join("") + "\n" + names.join(";") + "\n" + hash(JSON.stringify(call.body))
      var key = hmac(hmac(hmac(hmac("AWS4test-secret", date.slice(0,8)), "eu-west-1"), "bedrock"), "aws4_request")
      eq(auth.split("Signature=")[1], hex(hmac(key, "AWS4-HMAC-SHA256\n" + date + "\n" + scope + "\n" + hash(canonical))), "independent Converse signature")
    })
    status = 403; response = { __type: "AccessDeniedException", message: "denied" }
    var failedHttp = client.BEDROCK_Converse("eu-west-1", "future.chat", input)
    eq(failedHttp.error.responseCode, 403, "nonstream HTTP status"); eq(failedHttp.error.code, "AccessDeniedException", "nonstream AWS code"); eq(failedHttp.error.message, "denied", "nonstream AWS message")
    status = 200; response = answer("ok")

    var es = events(), bytes = encoded(es), received = []
    setupWire(bytes); client.bedrockTimeout = 120000
    var low = client.BEDROCK_ConverseStream("eu-west-1", "arn:aws:bedrock:eu-west-1:123:inference-profile/a", input, function(e, frame) {
      received.push(e); eq(frame.headers[":message-type"], "event", "decoded header")
      ok(streamReads < Math.ceil(bytes.length / 7) + 1, "callback before EOF")
    })
    eq(low.events, es, "wire event ordering")
    eq(received, es, "callbacks exactly once")
    eq(streamTimeout, 120000, "configured stream timeout")
    ok(closed > 0 && httpClosed == 1, "resources closed")
    ok(calls[calls.length - 1].url.endsWith("/converse-stream"), "stream URL")
    eq(calls[calls.length - 1].headers.Accept, "application/vnd.amazon.eventstream", "stream accept")
    var allHeaders = header("bool", 0).concat(header("false", 1), header("byte", 2, [255]), header("short", 3, [255, 254]), header("int", 4, u32(4294967293)), header("long", 5, [0,0,0,0,0,0,0,4]), header("bytes", 6, [0,2,1,2]), header("time", 8, [0,0,0,0,0,0,0,5]), header("uuid", 9, [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1]))
    var headers
    var decoder = helper.decoder(function(h, p) { headers = h; eq(JSON.parse(p).x, 1, "direct JSON payload") })
    var f = frame("sample", { x: 1 }, "event", allHeaders)
    f.forEach(function(b) { decoder.push([b]) }); decoder.end()
    eq(headers.byte, -1, "signed byte"); eq(headers.short, -2, "signed short"); eq(headers.int, -3, "signed int")
    eq(headers.long, "4", "lossless long"); eq(headers.time, "5", "timestamp"); eq(headers.bytes, [1,2], "bytes header"); eq(headers.uuid.length, 16, "uuid header"); eq(headers.bool, true, "boolean header")
    ;[0, 9, f.length - 1].forEach(function(p) { var corrupt = f.slice(); corrupt[p] ^= 1; bad(function() { var d = helper.decoder(function() {}); d.push(corrupt); d.end() }, "CRC") })
    bad(function() { var d = helper.decoder(function() {}); d.push(f.slice(0, -1)); d.end() }, "truncated")
    var invalid = u32(15).concat(u32(0)); invalid = invalid.concat(u32(crc(invalid)))
    bad(function() { helper.decoder(function() {}).push(invalid) }, "length")
    bad(function() { helper.decoder(function() {}).push(frame("x", {}, "event", header("bad", 99))) }, "header type")
    setupWire(encoded(es.slice(0, 3))); low = client.BEDROCK_ConverseStream(__, "future.chat", input, function() {})
    ok(/interrupted/.test(low.error.message), "missing messageStop fails")
    setupWire(frame("throttlingException", { message: "slow down" }, "exception")); low = client.BEDROCK_ConverseStream(__, "future.chat", input, function() {})
    eq(low.error.code, "throttlingException", "AWS exception code"); eq(low.error.message, "slow down", "AWS exception message")
    setupWire(bytes); low = client.BEDROCK_ConverseStream(__, "future.chat", input, function() { throw new Error("callback failed") })
    ok(/callback failed/.test(low.error.message), "callback errors propagate"); eq(httpClosed, 1, "callback failure cleanup")
    status = 403; response = { __type: "AccessDeniedException", message: "denied" }; setupWire([])
    low = client.BEDROCK_ConverseStream(__, "future.chat", input, function() {})
    eq(low.error.responseCode, 403, "HTTP status retained"); eq(low.error.code, "AccessDeniedException", "HTTP AWS code retained"); eq(httpClosed, 1, "HTTP failure closes client")
    status = 200; ow.obj.http = http
    var bodies = [], next = function() { return answer("done") }
    AWS.prototype.BEDROCK_Converse = function(region, id, body) { bodies.push(copyBody(body)); return next(body, id) }
    function copyBody(v) { return JSON.parse(JSON.stringify(v)) }
    var g = model(), conv = [{ role: "system", content: "be concise" }, { role: "user", content: [{ text: "first" }] }], original = JSON.stringify(conv)
    eq(g.rawPrompt(conv), "done", "unknown explicit Converse works")
    eq(bodies[0].system, [{ text: "be concise" }], "separate system")
    eq(JSON.stringify(conv), original, "conversation immutable")
    g.rawPrompt("second")
    eq(bodies[1].messages.length, 3, "multi-turn history")
    eq(g.getLastStats().tokens.cacheCreation, 0, "zero cache write retained")
    eq(g.getLastStats().api, "converse", "stats backend"); eq(g.getLastStats().tokens.total, 10, "cache tokens not added to total"); eq(g.getLastStats().tokens.cacheRead, 3, "cache read stats"); eq(g.getLastStats().latencyMs, 9, "latency")
    var p = { max_tokens: 12, max_output_tokens: 20, temperature: 0.1, top_p: 0.8, stop_sequences: ["END"], inferenceConfig: { maxTokens: 30, temperature: 0.3 }, additionalModelRequestFields: { custom: 1 }, additionalModelResponseFieldPaths: ["/custom"], performanceConfig: { latency: "standard" }, serviceTier: { type: "default" }, requestMetadata: { test: "one" }, guardrailConfig: { guardrailIdentifier: "id", guardrailVersion: "1" } }
    original = JSON.stringify(p); bodies = []; model(__, { temperature: 0.7, params: p }).rawPrompt("hello", __, 0.5)
    eq(bodies[0].inferenceConfig, { temperature: 0.3, maxTokens: 30, topP: 0.8, stopSequences: ["END"] }, "parameter precedence")
    eq(bodies[0].additionalModelRequestFields, { custom: 1 }, "additional fields")
    eq(JSON.stringify(p), original, "params immutable")
    bodies = []; model().rawPrompt("hello"); ok(!bodies[0].inferenceConfig, "no unsupported defaults")
    bad(function() { model(__, { api: "bogus" }) }, "api")
    bad(function() { model(__, { params: { top_k: 9 } }).rawPrompt("hello") }, "additionalModelRequestFields")
    bad(function() { model(__, { params: { inferenceConfig: { maxTokens: 0 } } }).rawPrompt("hello") }, "maxTokens")
    bad(function() { model().rawPrompt([{ role: "user", content: [] }]) }, "empty")
    bad(function() { model().rawPrompt([{ role: "user", content: { text: "x" } }]) }, "content")
    bad(function() { model().rawPrompt([{ role: "assistant", content: "", _responsesOutput: [{ type: "reasoning" }] }]) }, "incompatible|unsupported")
    bad(function() { model(__, { api: "auto" }).rawPrompt("hello") }, "unverified")
    bad(function() { model(__, { api: "invoke" }).rawPrompt("hello") }, "unsupported")
    bad(function() { model(__, { api: "responses" }).rawPrompt("hello") }, "unsupported")
    var nativeCalls = 0, responseCalls = 0
    AWS.prototype.BEDROCK_InvokeModel = function() { nativeCalls++; return { content: [{ type: "text", text: "native" }] } }
    AWS.prototype.BEDROCK_OpenAIResponses = function() { responseCalls++; return { output: [{ type: "message", content: [{ type: "output_text", text: "response" }] }] } }
    model("anthropic.claude-sonnet-4-5-20250929-v1:0", { api: "invoke" }).rawPrompt("hi")
    eq(nativeCalls, 1, "explicit invoke")
    model("openai.gpt-6.1-sol", { api: "responses" }).rawPrompt("hi"); eq(responseCalls, 1, "explicit Responses")
    model("openai.gpt-6.1-sol", { api: "auto" }).rawPrompt("hi"); eq(responseCalls, 2, "auto preserves Responses")
    bodies = []; model("deepseek.v3-v1:0", { api: "auto" }).rawPrompt("hi"); eq(bodies.length, 1, "auto Converse for additional model")
    // Tools: shared normal/stream continuation, failures, correlation and portable round trip.
    var id = "test.tools", cap = {}; cap[id] = { converse: { streaming: true, tools: true, streamingTools: true, images: true, documents: true, structuredOutput: true } }
    var options = { modelCapabilities: cap }, executed = [], rounds = 0
    function toolResponse() { return answer("", { stopReason: "tool_use", output: { message: { role: "assistant", content: [
      { reasoningContent: { reasoningText: { text: "private", signature: "signed" } } },
      { toolUse: { toolUseId: "one", name: "lookup", input: { key: "x" } } },
      { toolUse: { toolUseId: "two", name: "broken", input: {} } }
    ] } } }) }
    function register(g) {
      g.setTool("lookup", "Lookup", { type: "object", properties: { key: { type: "string" } } }, function(args) { executed.push(args.key); return { value: 4 } })
      g.setTool("broken", "Broken", { type: "object", properties: {} }, function() { executed.push("broken"); throw new Error("fixture failure") })
    }
    next = function(body) { return ++rounds == 1 ? toolResponse() : answer("done") }
    g = model(id, options); register(g); bodies = []; eq(g.rawPrompt("hello"), "done", "tool continuation")
    eq(executed, ["x", "broken"], "multiple tools once in order")
    eq(bodies[0].toolConfig.tools[0].toolSpec.name, "lookup", "tool name")
    eq(bodies[1].messages[1].content[0].reasoningContent.reasoningText.signature, "signed", "opaque reasoning replay")
    var results = bodies[1].messages[2].content
    eq(results[0].toolResult.toolUseId, "one", "correlated result"); eq(results[0].toolResult.content, [{ json: { value: 4 } }], "JSON result"); eq(results[1].toolResult.status, "error", "tool error status")
    var portable = g.exportConversation(), imported = model(id, options); imported.importConversation(portable)
    next = function() { return answer("imported") }; bodies = []; imported.rawPrompt("again", __, __, false, [])
    eq(bodies[0].messages[1].content[0].toolUse.toolUseId, "one", "portable imported tool ID")
    eq(bodies[0].messages[2].content.length, 2, "portable result messages combined")
    g = model(id, options); register(g); rounds = 0; executed = []
    next = function() { return ++rounds <= 2 ? toolResponse() : answer("done") }
    g.rawPrompt("hello"); eq(executed.length, 2, "repeated tool ID does not execute twice")
    g = model(id, merge(options, { maxToolRounds: 0 })); register(g); executed = []; next = toolResponse
    bad(function() { g.rawPrompt("hello") }, "maxToolRounds"); eq(executed.length, 0, "limit before execution")
    g = model(id, options); register(g)
    next = function() { var r = toolResponse(); r.output.message.content.push(copyBody(r.output.message.content[1])); return r }
    executed = []; bad(function() { g.rawPrompt("hello") }, "duplicate"); eq(executed.length, 0, "all IDs validated before execution")
    bad(function() { var x = model(); register(x); x.rawPrompt("hello") }, "unverified")
    bad(function() { var x = model("meta.llama3-3-70b-instruct-v1:0"); register(x); x.rawPromptStream("hello") }, "streamingTools")
    // Streaming works through the actual framed transport, not only a provider mock.
    AWS.prototype.BEDROCK_ConverseStream = stream
    setupWire(encoded(events("hello"))); g = model(id, options); var deltas = []
    var result = g.rawPromptStream("hello", __, __, false, [], function(t) { deltas.push(t) })
    ok(!result.error, "stream success " + JSON.stringify(result.error)); eq(result.content, "hello", "stream content"); eq(deltas, ["hello"], "text callback")
    eq(result.events.length, 5, "no duplicated stream events"); eq(g.getLastStats().tokens.total, 10, "metadata stats"); eq(g.getLastStats().stopReason, "end_turn", "stop reason")
    eq(g.conversation[1].content, [{ text: "hello" }], "stream history reconstruction")
    var interleaved = [
      { messageStart: { role: "assistant" } },
      { contentBlockDelta: { contentBlockIndex: 1, delta: { text: "B" } } },
      { contentBlockDelta: { contentBlockIndex: 0, delta: { text: "A" } } },
      { contentBlockStop: { contentBlockIndex: 1 } }, { contentBlockStop: { contentBlockIndex: 0 } },
      { messageStop: { stopReason: "end_turn" } }
    ]
    setupWire(encoded(interleaved)); result = g.rawPromptStream("again", __, __, false, [])
    eq(result.content, "AB", "final text follows block order"); eq(g.conversation[3].content, [{ text: "A" }, { text: "B" }], "block index reconstruction")
    setupWire(encoded(events().slice(0, 2))); original = JSON.stringify(g.conversation); result = g.rawPromptStream("failed", __, __, false, [])
    ok(result.error, "interrupted high-level stream"); eq(JSON.stringify(g.conversation), original, "incomplete stream not committed")
    setupWire(encoded(events('{"x":1}'))); eq(g.promptStreamJSON("json", __, __, []), { x: 1 }, "stream JSON wrapper")
    // Split streamed tool arguments, indexed reasoning/signature and opaque bytes.
    var toolEvents = [
      { messageStart: { role: "assistant" } },
      { contentBlockDelta: { contentBlockIndex: 0, delta: { reasoningContent: { text: "private" } } } },
      { contentBlockDelta: { contentBlockIndex: 0, delta: { reasoningContent: { signature: "sig" } } } },
      { contentBlockStop: { contentBlockIndex: 0 } },
      { contentBlockStart: { contentBlockIndex: 1, start: { toolUse: { toolUseId: "one", name: "lookup" } } } },
      { contentBlockDelta: { contentBlockIndex: 1, delta: { toolUse: { input: '{"key":' } } } },
      { contentBlockDelta: { contentBlockIndex: 1, delta: { toolUse: { input: '"x"}' } } } },
      { contentBlockStop: { contentBlockIndex: 1 } },
      { messageStop: { stopReason: "tool_use" } }
    ]
    var streamRound = 0
    AWS.prototype.BEDROCK_ConverseStream = function(region, id, body, callback) { bodies.push(copyBody(body)); var es = ++streamRound == 1 ? toolEvents : events("done"); es.forEach(callback); return { events: es } }
    g = model(id, options); register(g); bodies = []; executed = []; deltas = []
    result = g.rawPromptStream("hello", __, __, false, __, function(t) { deltas.push(t) })
    eq(result.content, "done", "stream tool continuation"); eq(executed, ["x"], "complete streamed input executed once"); eq(deltas, ["done"], "reasoning hidden")
    eq(bodies[1].messages[1].content[0].reasoningContent.reasoningText.signature, "sig", "stream signature replay")
    executed = []; streamRound = 0
    AWS.prototype.BEDROCK_ConverseStream = function(region, id, body, callback) { toolEvents.slice(0, 6).forEach(callback); return {} }
    g = model(id, options); register(g); result = g.rawPromptStream("hello")
    ok(result.error, "incomplete tool stream rejected"); eq(executed.length, 0, "incomplete args never execute")
    // Structured output through public schema and decision hooks.
    next = function() { return answer('{"name":"Alice"}') }
    var schema = { type: "object", properties: { name: { type: "string" } }, required: ["name"], additionalProperties: false }
    var descriptor = { name: "person", schema: schema }, descBefore = JSON.stringify(descriptor)
    var chat = make("deepseek.v3-v1:0"); bodies = []
    eq(chat.jsonSchemaPrompt("Alice", descriptor), { name: "Alice" }, "public Converse schema")
    eq(JSON.parse(bodies[0].outputConfig.textFormat.structure.jsonSchema.schema), schema, "schema serialized as string")
    eq(JSON.stringify(descriptor), descBefore, "descriptor immutable")
    eq(chat.getCapabilities().structured.implemented, true, "schema capability")
    eq(make("meta.llama3-3-70b-instruct-v1:0").getCapabilities().structured.implemented, false, "unsupported schema capability")
    bad(function() { make("meta.llama3-3-70b-instruct-v1:0").jsonSchemaPrompt("x", descriptor) }, "unsupported")
    original = JSON.stringify(chat.model.conversation)
    ;[answer("not json"), answer('{"name":"Alice"}', { stopReason: "max_tokens" }), answer('{"other":1}'), answer('{"name":"Alice"}', { refusal: true })].forEach(function(r) {
      next = function() { return r }; bad(function() { chat.jsonSchemaPrompt("bad", descriptor) }); eq(JSON.stringify(chat.model.conversation), original, "schema failure leaves history")
    })
    next = function() { return answer('{"name":"Alice"}') }; bodies = []
    make("global.openai.gpt-6.1-sol").jsonSchemaPrompt("Alice", descriptor)
    eq(bodies[0].additionalModelRequestFields.text.format.strict, true, "model-specific strict field")
    bad(function() { make("openai.gpt-6.1-sol", { params: { additionalModelRequestFields: { text: { format: { strict: false } } } } }).jsonSchemaPrompt("Alice", descriptor) }, "strict")
    bad(function() { make("deepseek.v3-v1:0").jsonSchemaPrompt("Alice", { schema: { type: "object", properties: {}, additionalProperties: true } }) }, "additionalProperties")
    next = function() { return { error: { responseCode: 400, response: '{"message":"provider fixture"}' } } }
    var err = bad(function() { chat.jsonSchemaPrompt("Alice", descriptor) }); eq(err.code, "LLM_DECISION_PROVIDER_ERROR", "structured provider error code")
    // Decision compiler generates the schema; produce a response matching its boolean shape.
    next = function(body) { var s = JSON.parse(body.outputConfig.textFormat.structure.jsonSchema.schema), out = {}; Object.keys(s.properties).forEach(function(k) { out[k] = true }); return answer(JSON.stringify(out)) }
    var decision = make("deepseek.v3-v1:0").decideWithStats("ready", { ready: { type: "boolean", instructions: "Ready?" } }, { strategy: "structured" })
    eq(decision.stats.api, "converse", "decision stats")
    // Images/documents use base64 bytes and never local paths.
    var png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aUfoAAAAASUVORK5CYII="
    next = function() { return answer("image") }; bodies = []
    eq(model(id, options).promptImage("describe", png), "image", "Converse promptImage")
    eq(bodies[0].messages[0].content[0].image.source.bytes, png, "image bytes unchanged")
    bad(function() { model().promptImage("describe", png) }, "images")
    g = model(id, options); bodies = []
    g.rawPrompt([{ role: "user", content: [{ document: { name: "Document 1", format: "txt", source: { bytes: "aGVsbG8=" } } }, { text: "summarize" }] }])
    eq(bodies[0].messages[0].content[0].document.source.bytes, "aGVsbG8=", "document bytes")
    bad(function() { g.rawPrompt([{ role: "user", content: [{ document: { name: "/private/file.txt", format: "txt", source: { bytes: "aGVsbG8=" } } }, { text: "x" }] }]) }, "neutral")
    bad(function() { g.rawPrompt([{ role: "user", content: [{ video: { source: {} } }] }]) }, "unsupported")

    // Explicit Converse fields constrain auto selection; opaque history cannot move backends.
    next = function() { return answer("configured") }; bodies = []
    model("openai.gpt-6.1-sol", { api: "auto", params: { guardrailConfig: { guardrailIdentifier: "fixture", guardrailVersion: "1" } } }).rawPrompt("guarded")
    eq(bodies.length, 1, "auto guardrail uses Converse instead of silently dropping settings")
    bad(function() { model("anthropic.claude-sonnet-4-5-20250929-v1:0", { api: "converse" }).rawPrompt([{ role: "assistant", content: [{ type: "thinking", thinking: "private", signature: "sig" }] }]) }, "unsupported")
    var systemChat = model(__, { params: { system: "explicit" } }); bodies = []
    systemChat.rawPrompt([{ role: "system", content: "conversation" }, { role: "user", content: "hello" }])
    eq(bodies[0].system, [{ text: "explicit" }, { text: "conversation" }], "explicit and conversation system order")
    bad(function() { model("anthropic.claude-sonnet-4-5-20250929-v1:0", { promptCaching: true }).rawPrompt("hello") }, "cachePoint")
    // Preserve signed and redacted reasoning in streaming, without displaying it.
    var reasoningEvents = [
      { messageStart: { role: "assistant" } },
      { contentBlockDelta: { contentBlockIndex: 0, delta: { reasoningContent: { redactedContent: "AQI=" } } } },
      { contentBlockDelta: { contentBlockIndex: 0, delta: { reasoningContent: { redactedContent: "AwQ=" } } } },
      { contentBlockStop: { contentBlockIndex: 0 } },
      { contentBlockDelta: { contentBlockIndex: 1, delta: { text: "visible" } } },
      { contentBlockStop: { contentBlockIndex: 1 } },
      { messageStop: { stopReason: "end_turn" } }, { metadata: { usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 } } }
    ]
    AWS.prototype.BEDROCK_ConverseStream = stream; setupWire(encoded(reasoningEvents)); g = model(id, options)
    result = g.rawPromptStream("reason", __, __, false, [])
    ok(!result.error, "redacted stream success")
    eq(g.conversation[1].content[0].reasoningContent.redactedContent, "AQIDBA==", "redacted bytes concatenated without corruption")
    eq(result.content, "visible", "redacted reasoning hidden")
    var outputConfig = { textFormat: { type: "json_schema", structure: { jsonSchema: { name: "person", schema: JSON.stringify(schema) } } } }
    g = model(id, merge(options, { params: { outputConfig: outputConfig } })); setupWire(encoded(events('{"name":"Alice"}')))
    result = g.rawPromptStreamJSON("Alice", __, __, [])
    ok(!result.error, "stream native schema success")
    eq(JSON.parse(result.content), { name: "Alice" }, "stream schema parsed")
    original = JSON.stringify(g.conversation); setupWire(encoded(events("malformed")))
    result = g.rawPromptStreamJSON("fail", __, __, [])
    ok(result.error, "malformed native schema stream fails"); eq(JSON.stringify(g.conversation), original, "stream schema failure immutable")
    next = function() { return answer("malformed") }
    bad(function() { model(id, merge(options, { params: { outputConfig: outputConfig } })).rawPrompt("fail") })
    // Native structured path remains selectable explicitly.
    AWS.prototype.BEDROCK_InvokeModel = function() { return { stop_reason: "end_turn", content: [{ type: "text", text: '{"name":"Alice"}' }] } }
    eq(make("global.anthropic.claude-sonnet-4-5-20250929-v1:0", { api: "invoke" }).jsonSchemaPrompt("Alice", descriptor), { name: "Alice" }, "explicit invoke native structured")
    ow.obj.http = http
    // Provider errors do not trigger native or Responses fallback.
    var nc = nativeCalls, rc = responseCalls
    next = function() { return { error: { code: "AccessDeniedException", responseCode: 403, message: "denied" } } }
    eq(model().rawPrompt("hello").error.responseCode, 403, "provider error returned")
    eq(nativeCalls, nc, "no native fallback"); eq(responseCalls, rc, "no Responses fallback")
    print("PASS " + count + " Converse checks")
  } catch(e) { printErr(String(e) + "\n" + (e.stack || "")); exit(1) } finally {
    AWS.prototype.connect = connect; ow.obj.rest.connectionFactory = factory; ow.obj.http = http
    AWS.prototype.BEDROCK_Converse = converse; AWS.prototype.BEDROCK_ConverseStream = stream
    AWS.prototype.BEDROCK_InvokeModel = invoke; AWS.prototype.BEDROCK_OpenAIResponses = responses
  }
})()
