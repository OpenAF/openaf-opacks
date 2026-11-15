// Explicit opt-in only; each case incurs inference charges (tools may use multiple rounds). Run from AWS/.
if (getEnv("OPENAF_BEDROCK_LIVE") != "1") {
  print("SKIP: set OPENAF_BEDROCK_LIVE=1 to run live Bedrock inference")
  exit(0)
}
;["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION", "BEDROCK_MODEL_ID"].forEach(function(name) {
  if (!isString(getEnv(name)) || !getEnv(name).length) { printErr("Required environment variable: " + name); exit(1) }
})
try {
load("aws_bedrock.js")
var options = { model: getEnv("BEDROCK_MODEL_ID"), region: getEnv("AWS_REGION"), params: { max_tokens: 512 } }
if (getEnv("BEDROCK_NATIVE_STRUCTURED_OUTPUT") == "true") options.nativeStructuredOutput = true
if (isString(getEnv("BEDROCK_API")) && getEnv("BEDROCK_API").length) options.api = getEnv("BEDROCK_API")
if (isString(getEnv("BEDROCK_MODEL_CAPABILITIES")) && getEnv("BEDROCK_MODEL_CAPABILITIES").length) options.modelCapabilities = JSON.parse(getEnv("BEDROCK_MODEL_CAPABILITIES"))
var llm = $llm({ type: "bedrock", timeout: 180000, options: options })
if (options.api == "converse") {
  var chat = llm.getGPT().model, capabilities = chat.getBedrockCapabilities(), cases = (getEnv("BEDROCK_LIVE_CASES") || "text").split(",")
  cases.forEach(function(testCase) {
    testCase = testCase.trim()
    if (["text", "stream", "tools", "schema", "image"].indexOf(testCase) < 0) throw new Error("Unknown live case: " + testCase)
    var feature = { stream: "streaming", tools: "tools", schema: "structuredOutput", image: "images" }[testCase]
    if (feature && capabilities[feature] !== true) { print("SKIP " + testCase + ": capability unsupported or unverified"); return }
    chat.cleanPrompt()
    var result
    if (testCase == "text") result = chat.rawPrompt("Reply with hello.", __, __, false, [])
    if (testCase == "stream") {
      var deltas = []
      result = chat.rawPromptStream("Reply with hello.", __, __, false, [], function(delta) { deltas.push(delta) })
      if (!result.error && !deltas.length) throw new Error("No text streamed")
    }
    if (testCase == "tools") {
      var executed = 0
      chat.setTool("lookup", "Look up the fixture value for a key", { type: "object", properties: { key: { type: "string" } }, required: ["key"], additionalProperties: false }, function() { executed++; return { value: "fixture" } })
      result = chat.rawPrompt("Call lookup with key x, then report its value.", __, __, false, ["lookup"])
      if (!result.error && executed != 1) throw new Error("Expected exactly one tool execution")
    }
    if (testCase == "schema") result = llm.getGPT().jsonSchemaPrompt("Extract Alice's name.", { name: "person", schema: { type: "object", properties: { name: { type: "string" } }, required: ["name"], additionalProperties: false } })
    if (testCase == "image") {
      if (!getEnv("BEDROCK_IMAGE_FILE")) { print("SKIP image: set BEDROCK_IMAGE_FILE"); return }
      result = chat.promptImage("Describe this image briefly.", getEnv("BEDROCK_IMAGE_FILE"))
    }
    if (!result || result.error || isString(result) && !result.length) throw new Error("Failed live " + testCase + ": " + stringify(result))
    if (testCase == "schema" && result.name != "Alice") throw new Error("Unexpected schema extraction")
    print("PASS live Converse " + testCase)
    print(stringify(chat.getLastStats()))
  })
} else {
var result = llm.getGPT().jsonSchemaPromptWithStats("Extract the person's name and age: Alice, 30.", {
  name: "person", schema: { type: "object", properties: { name: { type: "string" }, age: { type: "integer" } }, required: ["name", "age"], additionalProperties: false }
})
if (result.response.name != "Alice" || result.response.age != 30) throw new Error("Unexpected extraction result")
print("PASS live native Bedrock schema extraction")
print(stringify(result.stats))
}

} catch(e) { printErr(String(e)); exit(1) }
