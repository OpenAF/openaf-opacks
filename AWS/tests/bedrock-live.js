// Explicit opt-in only; incurs one Bedrock inference charge. Run from AWS/.
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
var llm = $llm({ type: "bedrock", timeout: 180000, options: options })
var result = llm.getGPT().jsonSchemaPromptWithStats("Extract the person's name and age: Alice, 30.", {
  name: "person", schema: { type: "object", properties: { name: { type: "string" }, age: { type: "integer" } }, required: ["name", "age"], additionalProperties: false }
})
if (result.response.name != "Alice" || result.response.age != 30) throw new Error("Unexpected extraction result")
print("PASS live native Bedrock schema extraction")
print(stringify(result.stats))

} catch(e) { printErr(String(e)); exit(1) }
