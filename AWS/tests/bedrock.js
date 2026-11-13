// Offline InvokeModel serialization/SigV4 and OpenAF integration checks. No credentials required.
load("aws_bedrock.js")
ow.loadObj()
var checks = 0, calls = [], response, status = 200, failTransport = false
function ok(v, label) { checks++; if (!v) throw new Error(label) }
function eq(a, b, label) { ok(JSON.stringify(a) == JSON.stringify(b), label + ": " + JSON.stringify(a)) }
function rejects(fn, code) {
  var e; try { fn() } catch(error) { e = error }
  ok(isDef(e), "expected " + code); eq(e.code, code, "error code"); return e
}
var schema = { type: "object", properties: { name: { type: "string" }, age: { type: "integer" } }, required: ["name", "age"], additionalProperties: false }
var descriptor = { name: "person", schema: schema, strict: true }
var model = "global.anthropic.claude-sonnet-4-5-20250929-v1:0"
function fixture(v) { return { stop_reason: "end_turn", content: [{ type: "thinking", thinking: "hidden" }, { type: "text", text: JSON.stringify(v) }], usage: { input_tokens: 12, output_tokens: 0, cache_read_input_tokens: 4 } } }
function make(id, extra) { return $llm({ type: "bedrock", options: merge({ model: id || model, region: "us-east-1", temperature: 0, params: { max_tokens: 512 } }, extra || {}) }) }
var connect = AWS.prototype.connect, factory = ow.obj.rest.connectionFactory
AWS.prototype.connect = function() { this.accessKey = "fixture-key"; this.secretKey = "fixture-secret"; this.stoken = "fixture-token"; this.region = "us-east-1" }
ow.obj.rest.connectionFactory = function() { return {
  exec: function(url, method, payload, headers) {
    calls.push({ url: String(url), method: method, body: JSON.parse(String(payload)), headers: headers })
    if (failTransport) throw new Error("timeout fixture")
    if (status >= 400) {
      // Java HTTP exceptions retain their response envelope when JS adds a message property.
      var error = new Error("HTTP fixture"), envelope = JSON.stringify({ responseCode: status, contentType: "application/json", response: JSON.stringify(response) })
      error.toString = function() { return "HTTP failure response = " + envelope }
      throw error
    }
    return { response: JSON.stringify(response), responseCode: status }
  }, getErrorResponse: function() { return JSON.stringify(response) }, close: function() {}
} }
try {
  var invoke = AWS.prototype.BEDROCK_InvokeModel, invokeStream = AWS.prototype.BEDROCK_InvokeModelStream
  var responsesInvoke = AWS.prototype.BEDROCK_OpenAIResponses, responsesStream = AWS.prototype.BEDROCK_OpenAIResponsesStream
  var bodies = [], executeCount = 0, toolBody
  var reasoningItem = { type: "reasoning", id: "r1", encrypted_content: "opaque", summary: [] }
  AWS.prototype.BEDROCK_OpenAIResponses = function(region, input) {
    bodies.push(clone(input))
    if (input.tools && !input.input.some(item => item.type == "function_call_output")) return {
      output: [reasoningItem, { type: "function_call", id: "fc1", call_id: "c1", name: "lookup", arguments: '{"key":"x"}' }]
    }
    return { output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text: "done" }] }] }
  }
  AWS.prototype.BEDROCK_OpenAIResponsesStream = function(region, input, callback) {
    var result = AWS.prototype.BEDROCK_OpenAIResponses(region, input)
    callback({ type: "response.completed", response: merge(result, { status: "completed" }) })
    return {}
  }
  AWS.prototype.BEDROCK_InvokeModel = function(region, id, input) {
    toolBody = clone(input)
    if (id.indexOf("anthropic.") >= 0) return { role: "assistant", content: [
      { type: "thinking", thinking: "private", signature: "signed" }, { type: "text", text: "visible" }
    ] }
    return { choices: [{ message: { role: "assistant", content: "done" }, finish_reason: "stop" }] }
  }
  AWS.prototype.BEDROCK_InvokeModelStream = function(region, id, input, callback) {
    toolBody = clone(input)
    callback({ type: "content_block_start", index: 0, content_block: { type: "thinking", thinking: "" } })
    callback({ type: "content_block_delta", index: 0, delta: { type: "thinking_delta", thinking: "private" } })
    callback({ type: "content_block_delta", index: 0, delta: { type: "signature_delta", signature: "signed" } })
    callback({ type: "content_block_start", index: 1, content_block: { type: "text", text: "" } })
    callback({ type: "content_block_delta", index: 1, delta: { type: "text_delta", text: "visible" } })
    callback({ type: "content_block_start", index: 2, content_block: { type: "redacted_thinking", data: "opaque" } })
    return {}
  }
  try {
    ;["openai.gpt-5.4", "openai.gpt-5.5", "openai.gpt-5.6-sol", "openai.gpt-5.6-terra", "openai.gpt-5.6-luna", "global.openai.gpt-6-luna", "us.openai.gpt-6-sol", "global.openai.gpt-6-astra", "global.openai.gpt-6.1-sol", "us.openai.gpt-6.1-terra"].forEach(function(id) {
      var params = { max_tokens: 321, max_completion_tokens: 456, reasoning_effort: "medium", tool_choice: "auto", parallel_tool_calls: false }, before = JSON.stringify(params)
      var modern = make(id, { params: params }).getGPT().model
      modern.setTool("lookup", "Lookup", { type: "object", properties: { key: { type: "string" } } }, function(args) {
        executeCount++; eq(args.key, "x", "tool arguments parsed"); return { value: "found" }
      })
      bodies = []
      eq(modern.rawPrompt("hello"), "done", "Responses tool continuation")
      eq(bodies.length, 2, "one tool continuation")
      eq(bodies[0].model, id, "model preserved")
      eq(bodies[0].max_output_tokens, 456, "completion limit precedence")
      eq(bodies[0].reasoning, { effort: "medium" }, "reasoning forwarded with tools")
      eq(bodies[0].tool_choice, "auto", "tool choice forwarded")
      eq(bodies[0].parallel_tool_calls, false, "parallel setting forwarded")
      ok(isUnDef(bodies[0].max_tokens) && isUnDef(bodies[0].temperature), "legacy/sampling params excluded")
      eq(bodies[1].input.filter(item => item.type == "reasoning")[0], reasoningItem, "opaque reasoning replayed")
      eq(bodies[1].input.filter(item => item.type == "function_call_output")[0].output, '{"value":"found"}', "tool output serialized")
      modern.setConversation([]); bodies = []
      eq(modern.rawPromptStream("hello").content, "done", "streaming Responses tool continuation")
      eq(bodies.length, 2, "streaming tool continuation count")
      eq(bodies[1].input.filter(item => item.type == "reasoning")[0], reasoningItem, "streaming reasoning replayed")
      eq(JSON.stringify(params), before, "caller params immutable")
    })
    eq(executeCount, 20, "all registered tools executed")
    var jsonModel = make("global.openai.gpt-6-luna", { params: { max_tokens: 123, max_output_tokens: 789, reasoning: { effort: "low", summary: "auto" } } }).getGPT().model
    bodies = []; jsonModel.rawPrompt("hello", __, __, true)
    eq(bodies[0].max_output_tokens, 789, "native output limit wins")
    eq(bodies[0].text.format.type, "json_object", "legacy JSON flag becomes native JSON format")
    eq(bodies[0].reasoning, { effort: "low", summary: "auto" }, "native reasoning map retained")
    ok(bodies[0].include.indexOf("reasoning.encrypted_content") >= 0, "stateless reasoning requested")
    AWS.prototype.BEDROCK_OpenAIResponsesStream = function(region, input, callback) { callback({ type: "response.failed", response: { error: { message: "fixture failure" } } }); return {} }
    var failed = jsonModel.rawPromptStream("hello")
    eq(failed.error.message, "fixture failure", "Responses streaming API error surfaced")
    var other = make("openai.gpt-oss-120b-1:0", { params: { reasoning_effort: "high" } }).getGPT().model
    other.rawPrompt("hello")
    eq(toolBody.reasoning_effort, "high", "legacy OpenAI reasoning unchanged")
    eq(toolBody.max_tokens, 512, "legacy OpenAI token limit unchanged")
    ;["global.anthropic.claude-opus-4-7", "global.anthropic.claude-sonnet-5-5"].forEach(function(id) {
      var claude = make(id, { params: { max_tokens: 1024, temperature: 0, top_p: 0.5, top_k: 5 } }).getGPT().model
      eq(claude.rawPrompt("hello"), "visible", "thinking hidden from text")
      var firstUser = clone(toolBody.messages[0])
      eq(claude.conversation[claude.conversation.length - 1].content[0].signature, "signed", "thinking retained in history")
      claude.rawPrompt("again")
      eq(toolBody.messages[1].content[0].signature, "signed", "thinking replayed")
      eq(toolBody.messages[0], firstUser, "normal signed prefix unchanged")
      ok(isUnDef(toolBody.temperature) && isUnDef(toolBody.top_p) && isUnDef(toolBody.top_k), "unsupported sampling omitted")
      claude.setConversation([])
      eq(claude.rawPromptStream("hello").content, "visible", "streaming text hides thinking")
      var streamingFirstUser = clone(toolBody.messages[0])
      eq(claude.conversation[1].content[0], { type: "thinking", thinking: "private", signature: "signed" }, "streaming signed thinking retained")
      eq(claude.conversation[1].content[2], { type: "redacted_thinking", data: "opaque" }, "streaming redacted thinking retained")
      claude.rawPromptStream("again")
      eq(toolBody.messages[0], streamingFirstUser, "streaming signed prefix unchanged")
      eq(toolBody.messages[1].content[0].signature, "signed", "streaming thinking replayed")
      for (var turn = 0; turn < 5; turn++) claude.rawPromptStream("next")
      var cacheCount = 0
      toolBody.messages.forEach(function(message) { message.content.forEach(function(block) { if (block.cache_control) cacheCount++ }) })
      eq(cacheCount, 1, "automatic cache markers do not accumulate across turns")
    })
    var streamTurns = 0, streamExecuted = false
    AWS.prototype.BEDROCK_InvokeModelStream = function(region, id, input, callback) {
      streamTurns++
      if (streamTurns == 1) {
        callback({ type: "content_block_start", index: 0, content_block: { type: "thinking", thinking: "private", signature: "signed" } })
        callback({ type: "content_block_start", index: 1, content_block: { type: "tool_use", id: "t1", name: "lookup", input: {} } })
        callback({ type: "content_block_delta", index: 1, delta: { type: "input_json_delta", partial_json: '{"key":"x"}' } })
      } else {
        eq(input.messages[1].content[0].signature, "signed", "tool continuation replays signed thinking")
        eq(input.messages[1].content[1].input, { key: "x" }, "tool history retains streamed input")
        eq(input.messages[2].content[0].tool_use_id, "t1", "tool result linked")
        callback({ type: "content_block_start", index: 0, content_block: { type: "text", text: "" } })
        callback({ type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "done" } })
      }
      return {}
    }
    var agent = make("global.anthropic.claude-sonnet-5-5").getGPT().model
    agent.setTool("lookup", "Lookup", { type: "object", properties: {} }, function(args) { streamExecuted = args.key == "x"; return "found" })
    eq(agent.rawPromptStream("hello").content, "done", "Claude streamed tool continuation")
    ok(streamExecuted, "Claude streamed tool executed")
  } finally {
    AWS.prototype.BEDROCK_InvokeModel = invoke
    AWS.prototype.BEDROCK_InvokeModelStream = invokeStream
    AWS.prototype.BEDROCK_OpenAIResponses = responsesInvoke
    AWS.prototype.BEDROCK_OpenAIResponsesStream = responsesStream
  }
  response = fixture({ name: "Alice", age: 30 })
  // Exercise the actual signed Responses helper, with HTTP intercepted by the fixture.
  var signedClient = new AWS()
  signedClient.BEDROCK_OpenAIResponses("us-east-1", { model: "openai.gpt-6-luna", input: "hello" })
  ok(calls[calls.length - 1].url.indexOf("bedrock-mantle.us-east-1.api.aws/openai/v1/responses") >= 0, "base GPT uses Mantle")
  ok(calls[calls.length - 1].headers.Authorization.indexOf("/bedrock-mantle/aws4_request") >= 0, "Mantle signing service")
  signedClient.BEDROCK_OpenAIResponses("eu-west-1", { model: "global.openai.gpt-6-luna", input: "hello" })
  ok(calls[calls.length - 1].url.indexOf("bedrock-runtime.eu-west-1.amazonaws.com/openai/v1/responses") >= 0, "profile GPT uses Runtime")
  ok(calls[calls.length - 1].headers.Authorization.indexOf("/bedrock/aws4_request") >= 0, "Runtime signing service")
  var originalHttp = ow.obj.http, streamUrl, streamHeaders, decodedEvents = []
  ow.obj.http = function(url, method, payload, headers) {
    streamUrl = String(url); streamHeaders = headers
    this.client = {}
    this.setThrowExceptions = function() {}
    this.exec = function() {}
    this.responseCode = function() { return 200 }
    this.responseStream = function() { return new java.io.ByteArrayInputStream(new java.lang.String('data: {"type":"response.output_text.delta","delta":"ok"}\n\ndata: [DONE]\n\n').getBytes("UTF-8")) }
  }
  try {
    signedClient.BEDROCK_OpenAIResponsesStream("us-east-1", { model: "openai.gpt-6-luna", input: "hello" }, function(event) { decodedEvents.push(event) })
    ok(streamUrl.indexOf("bedrock-mantle.us-east-1.api.aws/openai/v1/responses") >= 0, "streaming Mantle endpoint")
    ok(streamHeaders.Authorization.indexOf("/bedrock-mantle/aws4_request") >= 0, "streaming Mantle signature")
    eq(decodedEvents[0].delta, "ok", "SSE decoded")
    signedClient.BEDROCK_OpenAIResponsesStream("eu-west-1", { model: "global.openai.gpt-6.1-sol", input: "hello" }, function() {})
    ok(streamUrl.indexOf("bedrock-runtime.eu-west-1.amazonaws.com/openai/v1/responses") >= 0, "streaming Runtime endpoint")
    ok(streamHeaders.Authorization.indexOf("/bedrock/aws4_request") >= 0, "streaming Runtime signature")
  } finally { ow.obj.http = originalHttp }
  ;["opus-4-6-v1", "sonnet-4-6", "opus-4-7", "opus-4-8", "opus-5", "sonnet-5", "opus-5-5", "sonnet-5-5", "haiku-5-5", "fable-5", "fable-5-1", "fable-5-2", "mythos-5", "mythos-5-1"].forEach(function(id) {
    var native = make("global.anthropic.claude-" + id, { params: { max_tokens: 2048, thinking: { type: "adaptive" }, output_config: { effort: "medium" } } }).getGPT()
    native.jsonSchemaPrompt("Alice", descriptor)
    eq(calls[calls.length - 1].body.output_config.effort, "medium", "native effort retained: " + id)
    eq(calls[calls.length - 1].body.output_config.format.schema, schema, "schema alongside effort: " + id)
  })
  var between = make("global.anthropic.claude-sonnet-5-5", { params: { max_tokens: 2048, thinking: { type: "between_tools" }, output_config: { effort: "high" } } }).getGPT()
  between.jsonSchemaPrompt("Alice", descriptor)
  eq(calls[calls.length - 1].body.thinking.type, "between_tools", "native Sonnet between_tools")
  rejects(function() { make("global.anthropic.claude-sonnet-5-5", { params: { thinking: { type: "between_tools", display: "omitted" } } }).getGPT().jsonSchemaPrompt("Alice", descriptor) }, "LLM_DECISION_INVALID_REQUEST")
  rejects(function() { make("global.anthropic.claude-sonnet-5-5", { params: { output_config: { format: { type: "text" } } } }).getGPT().jsonSchemaPrompt("Alice", descriptor) }, "LLM_DECISION_INVALID_REQUEST")
  ;[
    ["sonnet-5-5", { type: "disabled" }, "high"],
    ["opus-5-5", { type: "disabled" }, "medium"],
    ["sonnet-5-5", { type: "between_tools" }, "max"],
    ["opus-4-7", { type: "between_tools" }, "high"],
    ["opus-4-7", { type: "enabled", budget_tokens: 1024 }, "high"],
    ["haiku-5-5", { type: "disabled" }, "xhigh"]
  ].forEach(function(test) {
    var n = calls.length, error
    try { make("global.anthropic.claude-" + test[0], { params: { max_tokens: 2048, thinking: test[1], output_config: { effort: test[2] } } }).getGPT().model.rawPrompt("hello") } catch(e) { error = e }
    ok(isDef(error), "invalid thinking rejected: " + test[0])
    eq(calls.length, n, "invalid thinking before HTTP")
  })
  ;["opus-5", "sonnet-5", "haiku-5-5"].forEach(function(id) {
    make("global.anthropic.claude-" + id, { params: { max_tokens: 2048, thinking: { type: "disabled" }, output_config: { effort: "high" } } }).getGPT().jsonSchemaPrompt("Alice", descriptor)
    eq(calls[calls.length - 1].body.thinking.type, "disabled", "supported disabled thinking retained")
  })
  eq(make("ca.anthropic.claude-haiku-5-5").getCapabilities().structured.implemented, true, "Canada Haiku profile")
  eq(make("apac.anthropic.claude-sonnet-5-5").getCapabilities().structured.implemented, false, "unlisted modern profile remains unknown")
  var llm = make(), g = llm.getGPT(), api = g.model
  var options = { model: model, params: { max_tokens: 123 } }, beforeOptions = JSON.stringify(options)
  ow.ai.__gpttypes.bedrock.create({ options: options })
  eq(JSON.stringify(options), beforeOptions, "constructor options immutable")
  api.setConversation([{ role: "system", content: "Extract accurately." }])
  var beforeSchema = JSON.stringify(descriptor), n = calls.length
  var result = g.jsonSchemaPromptWithStats("Alice, 30", descriptor)
  eq(result.response, { name: "Alice", age: 30 }, "parsed result")
  eq(calls.length, n + 1, "one inference")
  var body = calls[calls.length - 1].body
  eq(body.output_config, { format: { type: "json_schema", schema: schema } }, "native schema object")
  ok(!body.output_format, "no deprecated field")
  eq(body.anthropic_version, "bedrock-2023-05-31", "version")
  eq(body.temperature, 0, "temperature zero"); eq(body.max_tokens, 512, "token config")
  eq(body.messages[0].content[0].text, "Alice, 30", "no JSON instruction")
  eq(body.system[0].text, "Extract accurately.", "system preserved")
  eq(body.system[0].cache_control, { type: "ephemeral" }, "system cache")
  ok(calls[calls.length - 1].headers.Authorization.indexOf("/us-east-1/bedrock/aws4_request") >= 0, "SigV4 transport")
  eq(result.stats.tokens, { prompt: 12, completion: 0, cacheRead: 4, total: 12 }, "usage mapping")
  eq(JSON.stringify(descriptor), beforeSchema, "schema immutable")
  eq(api.conversation.length, 3, "successful conversation exchange")
  var request = { model: model, schema: schema, state: "Alice, 30", providerOptions: {} }
  var requestBefore = JSON.stringify(request), history = JSON.stringify(api.conversation)
  api.rawStructuredPrompt(request)
  eq(JSON.stringify(request), requestBefore, "raw request immutable")
  eq(JSON.stringify(api.conversation), history, "raw history isolated")
  ;["max_tokens", "refusal", "tool_use", "stop_sequence", null].forEach(function(reason) {
    response = fixture({ name: "Alice", age: 30 }); response.stop_reason = reason
    rejects(function() { g.jsonSchemaPrompt("Alice", descriptor) }, "LLM_DECISION_INVALID_RESPONSE")
    eq(JSON.stringify(api.conversation), history, "failed history unchanged")
  })
  ;[[], [{ type: "text", text: "" }], [{ type: "text", text: "not json" }], [{ type: "tool_use", id: "x" }], [{ type: "text", text: '{"name":"Alice","age":"30"}' }], [{ type: "text", text: '{"name":"Alice","age":30,"extra":1}' }]].forEach(function(content) {
    response = fixture({}); response.content = content
    rejects(function() { g.jsonSchemaPrompt("Alice", descriptor) }, "LLM_DECISION_INVALID_RESPONSE")
  })
  rejects(function() { api.normalizeStructuredResponse(null, request) }, "LLM_DECISION_INVALID_RESPONSE")
  response = {}
  rejects(function() { g.jsonSchemaPrompt("Alice", descriptor) }, "LLM_DECISION_INVALID_RESPONSE")
  ;[merge(schema, { additionalProperties: true }), { type: "string", pattern: "x" }, { type: "number", minimum: 0 }, { type: "array", minItems: 2 }, { type: "array", maxItems: 1 }, { type: "object", properties: { x: { type: "object" } }, additionalProperties: false }].forEach(function(s) {
    var count = calls.length
    rejects(function() { g.jsonSchemaPrompt("input", { schema: s }) }, "LLM_DECISION_INVALID_REQUEST")
    eq(calls.length, count, "schema fails before HTTP")
  })
  ;["amazon.nova-pro-v1:0", "anthropic.claude-unknown", "in.anthropic.claude-haiku-4-5-20251001-v1:0"].forEach(function(id) {
    var other = make(id).getGPT(), count = calls.length
    eq(other.getCapabilities().structured.implemented, false, "unsupported/unknown capability")
    rejects(function() { other.jsonSchemaPrompt("input", descriptor) }, "LLM_DECISION_UNSUPPORTED")
    eq(calls.length, count, "unsupported before HTTP")
  })
  ;["", "us.", "eu.", "global.", "au.", "jp."].forEach(function(prefix) {
    eq(make(prefix + "anthropic.claude-sonnet-4-5-20250929-v1:0").getCapabilities().structured.implemented, true, "profile " + prefix)
  })
  eq(make("anthropic.claude-new", { nativeStructuredOutput: true }).getCapabilities().structured.implemented, true, "opt in")
  eq(make(model, { nativeStructuredOutput: false }).getCapabilities().structured.implemented, false, "opt out")
  eq(make("in.anthropic.claude-haiku-4-5-20251001-v1:0", { nativeStructuredOutput: true }).getCapabilities().structured.implemented, false, "known exclusion")
  response = { message: "Access denied" }; status = 403
  var httpError = rejects(function() { g.jsonSchemaPrompt("input", descriptor) }, "LLM_DECISION_PROVIDER_ERROR")
  eq(httpError.status, 403, "HTTP status preserved")
  eq(httpError.providerMessage, "Access denied", "safe provider detail")
  status = 200; response = { error: "API fixture failure", status: 429 }
  rejects(function() { g.jsonSchemaPrompt("input", descriptor) }, "LLM_DECISION_PROVIDER_ERROR")
  failTransport = true
  rejects(function() { g.jsonSchemaPrompt("input", descriptor) }, "LLM_DECISION_PROVIDER_ERROR")
  failTransport = false
  var questions = {
    team: { type: "choice", instructions: "Select team", criteria: { billing: "Charges", tech: "Bugs" } },
    urgent: { type: "boolean", instructions: "Urgent?" },
    priority: { type: "score", instructions: "Priority?", criteria: ["Low", "High"] }
  }
  response = fixture({ team: "billing", urgent: false, priority: 1 }); n = calls.length
  var decision = llm.decideWithStats({ ticket: "Duplicate charge" }, questions, { strategy: "structured" })
  eq(calls.length, n + 1, "single decision inference")
  eq(decision.response.answers.priority.level, 1, "score level")
  eq(decision.response.answers.priority.expectedScore, null, "no invented expectation")
  eq(decision.response.answers.team.probabilities, null, "no invented probabilities")
  eq(decision.stats.tokens.completion, 0, "decision stats")
  eq(calls[calls.length - 1].body.output_config.format.schema.properties.priority.enum, [0, 1], "equivalent score enum")
  eq(JSON.stringify(api.conversation), history, "decision history isolated")
  eq(llm.getCapabilities().native.implemented, false, "native decisions unavailable")
  rejects(function() { llm.decide("state", questions, { strategy: "native" }) }, "LLM_DECISION_UNSUPPORTED")
  rejects(function() { llm.decide("state", questions, { requireProbabilities: true }) }, "LLM_DECISION_UNSUPPORTED")
  response = fixture({ team: "billing", urgent: false, priority: 3 })
  rejects(function() { llm.decide("state", questions) }, "LLM_DECISION_INVALID_RESPONSE")
  var ordinary = make().getGPT()
  response = fixture({ name: "Alice", age: 30 })
  ordinary.model.rawPrompt("Alice", __, __, true)
  body = calls[calls.length - 1].body
  ok(!body.output_config, "legacy JSON has no schema")
  ok(JSON.stringify(body.messages).indexOf("answer in json") >= 0, "legacy JSON instruction")
  ordinary.model.rawPrompt("Hello")
  ok(!calls[calls.length - 1].body.output_config, "ordinary prompt unchanged")
  ordinary.model.setTool("weather", "Weather", { type: "object", properties: { city: { type: "string" } } }, function() { return "sunny" })
  ordinary.model.rawPrompt("Weather?")
  eq(calls[calls.length - 1].body.tools[0].name, "weather", "ordinary tools retained")
  ordinary.model.setConversation([])
  ordinary.jsonSchemaPrompt("Alice", descriptor)
  ok(!calls[calls.length - 1].body.tools, "schema omits registered tools")
  rejects(function() { ordinary.jsonSchemaPrompt("Alice", descriptor, __, __, [{}]) }, "LLM_DECISION_INVALID_REQUEST")
  // Existing tool execution still performs its established follow-up request.
  ordinary.model.setConversation([])
  var executed = 0, callIndex = 0, invoke = AWS.prototype.BEDROCK_InvokeModel
  ordinary.model.setTool("counter", "Count", { type: "object", properties: {} }, function() { executed++; return "done" })
  AWS.prototype.BEDROCK_InvokeModel = function() {
    callIndex++
    return callIndex == 1 ? { stop_reason: "tool_use", content: [{ type: "tool_use", id: "fixture-tool", name: "counter", input: {} }] } : fixture({ done: true })
  }
  try { ordinary.model.rawPrompt("Count") } finally { AWS.prototype.BEDROCK_InvokeModel = invoke }
  ok(executed > 0, "ordinary tool handler executed"); eq(callIndex, 2, "ordinary tool follow up")
  response = fixture([{ value: true }, { value: false }])
  var nested = { type: "array", minItems: 1, items: { type: "object", properties: { value: { type: "boolean" } }, required: ["value"], additionalProperties: false } }
  eq(g.jsonSchemaPrompt("Values", nested), [{ value: true }, { value: false }], "nested schema and raw wrapper")
  response = fixture({ name: "Alice", age: 30 })
  var settings = make(model, { params: { max_tokens: 700, top_k: 5, top_p: 0.9, stop_sequences: ["STOP"], system: "Configured system" } }).getGPT()
  settings.jsonSchemaPrompt("Alice", descriptor)
  eq(calls[calls.length - 1].body.top_k, 5, "inference top k")
  eq(calls[calls.length - 1].body.system[0].text, "Configured system", "configured system")
  var second = make(model, { params: { max_tokens: 99 }, promptCaching: false }).getGPT()
  response = fixture("Bob")
  eq(second.jsonSchemaPrompt("Bob", { schema: { type: "string" } }), "Bob", "primitive schema")
  eq(calls[calls.length - 1].body.max_tokens, 99, "second config isolated")
  ok(!calls[calls.length - 1].body.messages[0].content[0].cache_control, "second cache isolated")
  response = fixture({ name: "Alice", age: 30 }); g.jsonSchemaPrompt("Alice", descriptor)
  eq(calls[calls.length - 1].body.max_tokens, 512, "first config retained")
  eq(result.stats.tokens.completion, 0, "earlier stats snapshot retained")
  var count = calls.length
  rejects(function() { g.jsonSchemaPrompt("Alice", descriptor, __, 2) }, "LLM_DECISION_INVALID_REQUEST")
  eq(calls.length, count, "invalid options before HTTP")
  eq(api.getLastStats(), undefined, "preflight clears stats")
  ;[{ type: "number" }, { type: "integer", enum: [2] }, { type: "null" }, { type: "boolean" }].forEach(function(s) {
    var value = s.type == "null" ? null : s.type == "boolean" ? false : 2
    response = fixture(value)
    eq(g.jsonSchemaPrompt("input", { schema: s, strict: false }), value, "primitive " + s.type)
  })
  response = fixture({ name: "Alice", age: 30 })
  var newer = $llm({ type: "bedrock", options: { model: "global.anthropic.claude-new", nativeStructuredOutput: true, params: {} } }).getGPT()
  newer.jsonSchemaPrompt("Alice", descriptor)
  eq(calls[calls.length - 1].body.max_tokens, 1024, "default token budget")
  ok(calls[calls.length - 1].url.indexOf("global.anthropic.claude-new") >= 0, "override preserves model")
  n = calls.length
  rejects(function() { make(model, { params: { output_format: {} } }).getGPT().jsonSchemaPrompt("Alice", descriptor) }, "LLM_DECISION_INVALID_REQUEST")
  rejects(function() { make(model, { params: { thinking: false } }).getGPT().jsonSchemaPrompt("Alice", descriptor) }, "LLM_DECISION_INVALID_REQUEST")
  eq(calls.length, n, "conflicting schema and invalid thinking fail before HTTP")
  eq(make("apac.anthropic.claude-opus-4-5-20251101-v1:0").getCapabilities().structured.implemented, false, "unlisted profile is unknown")
  var optional = { type: "object", properties: {}, additionalProperties: false }
  for (var i = 0; i < 13; i++) optional.properties["x" + i] = { type: "string" }
  rejects(function() { g.jsonSchemaPrompt("input", optional) }, "LLM_DECISION_INVALID_REQUEST")
} catch(e) { printErr(String(e)); exit(1) } finally { AWS.prototype.connect = connect; ow.obj.rest.connectionFactory = factory }
print("PASS " + checks + " Bedrock checks")
