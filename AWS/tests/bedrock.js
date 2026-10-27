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
  response = fixture({ name: "Alice", age: 30 })
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
