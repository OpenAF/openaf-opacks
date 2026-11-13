# AWS oPack

Load the required service library, for example `loadLib("aws_sqs.js")`.

SQS receive calls accept the requested maximum message count, and FIFO sends accept group IDs in either positional arguments or a message map. Performance Insights uses the client instance region. Each Bedrock provider keeps its own options.

Route 53 listings retrieve every page, including record name/type/identifier cursors and hosted-zone markers. See the [record listing API](https://docs.aws.amazon.com/Route53/latest/APIReference/API_ListResourceRecordSets.html) and [hosted-zone listing API](https://docs.aws.amazon.com/Route53/latest/APIReference/API_ListHostedZones.html).

Run the service-independent regression checks from this directory:

```sh
oaf -f tests/regression.js
```

These checks use local fixtures and test doubles; they do not verify a live external service.

`EKS_GetToken` signs an STS `GetCallerIdentity` URL locally without calling STS. Tokens use unpadded Base64URL encoding and report expiration in UTC (14 minutes by default). STS presigning hashes the empty request body; S3 presigning retains `UNSIGNED-PAYLOAD`.

Run the focused offline EKS token and STS/S3 signing checks with `oaf -f tests/eks.js`. These use dummy credentials and do not verify live EKS authentication.

## Lambda Web Functions, MicroVMs, and network connectors

Load `aws_lambda.js` and construct an AWS client with credentials using the existing AWS setup. The management wrappers accept `(aRegion, aParams)`; use `undefined` for the instance region. Omit `aParams` for operations with no required fields. Each call makes one request and returns the existing REST transport's response, including pagination tokens and errors. Empty responses follow the transport's usual behavior.

The wrappers cover all 20 [Web Functions operations](https://docs.aws.amazon.com/lambda/latest/lambda-web/API_Operations.html), all 24 [MicroVM operations](https://docs.aws.amazon.com/lambda/latest/microvm-api/API_Operations.html), and the five Core connector operations: `CreateNetworkConnector`, `DeleteNetworkConnector`, `GetNetworkConnector`, `ListNetworkConnectors`, and `UpdateNetworkConnector`. Prefix operation names with `LAMBDA_WEB_`, `LAMBDA_MICROVM_`, or `LAMBDA_CORE_`, preserving AWS spelling (`Microvm`, for example).

Parameter maps use AWS SDK input field names, including their casing. In particular, Web tagging uses `{ resource, tags }` and `{ resource, tagKeys }`, while MicroVM tagging uses `{ Resource, Tags }` and `{ Resource, TagKeys }`. Web `PutResourcePolicy` accepts `{ resourceArn, policy, revisionId }`. The wrappers translate the Web body fields to the wire keys `Tags`, `Policy`, and `RevisionId`. Nested configuration is passed unchanged. Required identifiers and parameter-map types are checked locally; AWS validates configuration and service limits. Caller maps are not modified.

Web creation, revisions, and endpoints (configuration maps below are caller supplied):

```javascript
loadLib("aws_lambda.js");
var aws = new AWS(accessKey, secretKey, sessionToken, "eu-west-1");

var created = aws.LAMBDA_WEB_CreateWebFunction(undefined, {
   functionName: "my-app",
   revisionConfig: revisionConfig,
   endpointConfig: endpointConfig
});
var revision = aws.LAMBDA_WEB_CreateWebFunctionRevision(undefined, {
   functionName: "my-app",
   buildConfig: buildConfig,
   serviceConfig: serviceConfig
});
var endpoint = aws.LAMBDA_WEB_CreateWebFunctionEndpoint(undefined, {
   functionName: "my-app",
   endpointName: "main",
   endpointType: endpointType,
   authType: authType
});
aws.LAMBDA_WEB_UpdateWebFunctionEndpoint(undefined, {
   functionName: "my-app", endpointName: "main", description: "Production"
});
var page = aws.LAMBDA_WEB_ListWebFunctions(undefined, { maxResults: 10 });
// Request another page explicitly with { maxResults: 10, nextToken: page.nextToken }.
```

MicroVM images, lifecycle, and authentication tokens:

```javascript
var image = aws.LAMBDA_MICROVM_CreateMicrovmImage(undefined, {
   name: "my-image",
   baseImageArn: baseImageArn,
   buildRoleArn: buildRoleArn,
   codeArtifact: { uri: "s3://my-bucket/code.zip" }
});
var imageState = aws.LAMBDA_MICROVM_GetMicrovmImage(undefined, {
   imageIdentifier: imageArn
});
// Once the selected image/version is ready, start it explicitly.
var vm = aws.LAMBDA_MICROVM_RunMicrovm(undefined, { imageIdentifier: imageArn });
var token = aws.LAMBDA_MICROVM_CreateMicrovmAuthToken(undefined, {
   microvmIdentifier: microvmId,
   expirationInMinutes: 10,
   allowedPorts: [{ port: 8080 }]
});
var shellToken = aws.LAMBDA_MICROVM_CreateMicrovmShellAuthToken(undefined, {
   microvmIdentifier: microvmId, expirationInMinutes: 10
});
aws.LAMBDA_MICROVM_SuspendMicrovm(undefined, { microvmIdentifier: microvmId });
aws.LAMBDA_MICROVM_ResumeMicrovm(undefined, { microvmIdentifier: microvmId });
aws.LAMBDA_MICROVM_TerminateMicrovm(undefined, { microvmIdentifier: microvmId });
```

Core network connectors retain uppercase field names:

```javascript
var connector = aws.LAMBDA_CORE_CreateNetworkConnector(undefined, {
   Name: "private-egress",
   Configuration: {
      VpcEgressConfiguration: {
         SubnetIds: ["subnet-example"],
         SecurityGroupIds: ["sg-example"],
         NetworkProtocol: "IPv4",
         AssociatedComputeResourceTypes: ["MicroVm"]
      }
   },
   OperatorRole: operatorRoleArn
});
var state = aws.LAMBDA_CORE_GetNetworkConnector(undefined, { Identifier: connector.Arn });
var connectors = aws.LAMBDA_CORE_ListNetworkConnectors(undefined, { MaxItems: 10 });
```

These are individual management calls. Callers manage pagination, readiness polling, deployment order, application HTTP requests, and shell connections. No SDK dependency or runtime model download is required. The regional endpoint and signing service are both Lambda; access remains subject to AWS service availability and IAM permissions.

Run `oaf -f tests/lambda.js` for offline request/signing and compatibility checks with dummy credentials and intercepted HTTP. Its static fixtures come from AWS's published operation request syntax, cross-checked against the botocore [Web](https://raw.githubusercontent.com/boto/botocore/develop/botocore/data/lambda-web/2025-03-07/service-2.json), [MicroVM](https://raw.githubusercontent.com/boto/botocore/develop/botocore/data/lambda-microvms/2025-09-09/service-2.json), and [Core](https://raw.githubusercontent.com/boto/botocore/develop/botocore/data/lambda-core/2026-04-30/service-2.json) models on 2026-10-20. These checks do not deploy resources or validate live AWS access.

## Recent Bedrock GPT and Claude models

GPT-5.4, GPT-5.5, GPT-5.6 Sol/Terra/Luna, GPT-6 Astra/Sol/Luna, and GPT-6.1
Sol/Terra use the signed OpenAI Responses API for normal and streaming calls.
Base IDs such as `openai.gpt-6-luna` use Mantle in the configured region;
profile IDs such as `global.openai.gpt-6-luna` use Bedrock Runtime. The adapter
never changes your region or inference profile. Check the
[AWS model cards](https://docs.aws.amazon.com/bedrock/latest/userguide/model-cards.html)
for endpoint availability and account permissions. GPT OSS retains its existing path.

Use `options.params.reasoning: { effort: "medium" }` or the
`reasoning_effort: "medium"` alias (the alias takes precedence). Responses supports
reasoning alongside function tools, so Luna no longer needs reasoning disabled.
`max_output_tokens` takes precedence over `max_completion_tokens`, then `max_tokens`;
only `max_output_tokens` is sent. Legacy sampling temperature is omitted.
`tool_choice`, `parallel_tool_calls`, `text`, `service_tier`, `include`,
`prompt_cache_key`, and `prompt_cache_retention` are forwarded when configured.
AWS validates model-specific values. Normal and streaming calls execute registered
function tools and continue with their results. Native output items, including
opaque reasoning, are retained for replay; stateless calls request encrypted
reasoning content. Legacy JSON flags select `text.format.type: "json_object"`
unless an explicit `params.text` is supplied.

Claude keeps full native assistant blocks (including thinking, signatures, and
redacted thinking) in protocol history. `showReasoning: false` hides reasoning
from returned text, without deleting the history needed for subsequent tool turns.
Keep the model, system prompt, tools, and prior turns stable when replaying bound
thinking. Automatic message cache breakpoints stay stable across later turns.
`getConversation()` is raw protocol history; portable conversation
exports are for transfer and do not preserve signed reasoning.

Opus 4.7/4.8 and the supported Opus/Sonnet/Haiku 5.x models omit sampling
parameters from requests. Fable/Mythos 5.x omit unsupported sampling values and
`top_k`; valid fixed sampling values remain supported. Sonnet/Haiku 4.5 prefer
`top_p` over temperature when both are configured. Older models otherwise retain
their existing behavior.

Configure adaptive thinking with `params.thinking: { type: "adaptive" }` and
`params.output_config: { effort: "medium" }`. Manual `enabled`/`budget_tokens`
settings are rejected locally on models that require adaptive thinking. Sonnet 5.5
accepts `{ type: "between_tools" }` at low, medium, or high effort, and rejects
`disabled`. Opus 5.5 and Fable/Mythos 5.x reject `disabled`; Opus 5, Sonnet 5,
and Haiku 5.5 allow it through high effort. See
[AWS adaptive thinking](https://docs.aws.amazon.com/bedrock/latest/userguide/claude-messages-adaptive-thinking.html).

## Bedrock Claude native structured output

With an OpenAF build providing `ow.ai.__decision` and the structured-output hooks
(the sibling OpenAF source includes them), load `aws_bedrock.js` before creating
an LLM. No OpenAF core changes or extra validation dependency are required.
The adapter uses the existing signed, non-streaming `BEDROCK_InvokeModel`
transport with `output_config.format: { type: "json_schema", schema: <object> }`.
It never retries as prompt-only JSON. Ordinary prompts, JSON flags, streaming,
tools, and other Bedrock model providers retain their existing paths.

Configure credentials through the existing AWS environment/profile setup:
`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and optional `AWS_SESSION_TOKEN`.
Region and model remain explicit adapter options:

```javascript
loadLib("aws_bedrock.js")
var llm = $llm({
  type: "bedrock", timeout: 180000,
  options: {
    region: "us-east-1",
    model: "global.anthropic.claude-sonnet-4-5-20250929-v1:0",
    params: { max_tokens: 1024 }
  }
})
var person = llm.getGPT().jsonSchemaPrompt("Extract the person: Alice, 30.", {
  name: "person", strict: true,
  schema: {
    type: "object",
    properties: { name: { type: "string" }, age: { type: "integer" } },
    required: ["name", "age"], additionalProperties: false
  }
})
var result = llm.decide({ ticket: "Charged twice" }, {
  billing: { type: "boolean", instructions: "Is this a billing issue?" },
  priority: { type: "score", instructions: "Assess urgency", criteria: ["Routine", "Urgent"] }
}, { strategy: "structured" })
// result.answers.billing.value; probability fields and score expectedScore are null.
var withStats = llm.decideWithStats("Duplicate charge", {
  billing: { type: "boolean", instructions: "Is this a billing issue?" }
}, { strategy: "structured" })
```

`jsonSchemaPromptWithStats` returns `{response, stats}` too. The inspected OpenAF
core has no AI `extract()` method; use `jsonSchemaPrompt` for schema-based extraction.
The public schema descriptor is `{name, description, schema, strict}`; raw JSON
Schemas are also accepted by this adapter's helper. Metadata stays local, and
both `strict` settings retain native enforcement and local validation.

Capability policy is deliberately conservative. The known models include
Sonnet/Haiku/Opus 4.5, Sonnet/Opus 4.6, Opus 4.7/4.8, Sonnet/Opus 5,
Sonnet/Opus/Haiku 5.5, Fable 5/5.1/5.2, and Mythos 5/5.1. Model IDs and profile
prefixes are explicitly listed in `_structuredCapability`; unknown combinations
require opt-in. Recognized profiles include the documented US, EU, AU, JP, India,
Canada, and GovCloud combinations where listed for that model. This does **not**
guarantee availability in your region or access from your account. The documented
`in.anthropic.claude-haiku-4-5-20251001-v1:0` exclusion always rejects native output.
Other Claude IDs and opaque/custom profile ARNs are unknown and disabled by
default. For a newer recognized Claude ID verified against its AWS model card,
set `options.nativeStructuredOutput: true`. This opt-in does not bypass the known
India/Haiku exclusion or enable non-Claude/opaque identifiers. Set it to `false`
to disable native schemas. No capability probes are sent.

`getCapabilities()` advertises structured choice, boolean, and score decisions
only for enabled models, with no probabilities and no structured streaming.
Known exclusions report incompatible availability; enabled and unknown model
availability remains unknown until execution (unknown models are ineligible).
Native *decision scoring* is unsupported; `strategy: "structured"` uses native
JSON Schema generation. `auto` can select this structured strategy.

Schemas use the intersection of OpenAF's existing validator and Bedrock's subset:
single `type` (object, array, string, integer, number, boolean, null), `properties`,
`required`, primitive `enum`, `items`, `minItems` of 0 or 1, `description`, and
`title`. Every object must explicitly set `additionalProperties: false`.
At most 12 optional properties are allowed across nested objects. Unsupported
keywords fail before HTTP, including numeric bounds, `maxItems`, patterns,
references, unions, formats, defaults, and compositions, even where Bedrock
supports some of them. Constraints are never silently removed. Core-compiled
score bounds become equivalent finite integer enums on the wire; the original
core schema still validates the response. Validation does not use global Ajv
coercion/default settings.

The helper keeps text system messages/history and appends only a successful
exchange. Decisions and raw structured hooks isolate their requests from history
and registered tools. Explicit nonempty tools and history containing non-text
blocks are rejected on the schema helper; ordinary tool calls still work.
Prompt caching follows `options.promptCaching`, including supported explicit
text-block cache markers. `aJsonFlag` remains the legacy instruction to answer in
JSON; it does not enable native schema enforcement.

Native calls accept inference `params.max_tokens` (default 1024), `temperature`
(0–1), `top_p`, `top_k`, `stop_sequences`, `thinking`, `service_tier`, `system`, and
`anthropic_version: "bedrock-2023-05-31"`, `anthropic_beta` (an array of strings),
and `output_config: { effort: "low" | "medium" | "high" | "xhigh" | "max" }`.
The adapter adds its schema format alongside effort; caller-supplied format fields
are rejected. `thinking.type: "between_tools"` is accepted for Sonnet 5.5.
Conflicting schema/message/tool fields
and unrecognized parameters fail locally. Model-specific inference combinations
remain subject to AWS validation. The existing core currently accepts no Bedrock
`decide` provider options: configure inference through `options.params` instead.
The schema helper also accepts its standard positional temperature/model override.

Errors follow OpenAF codes: `LLM_DECISION_UNSUPPORTED` for ineligible capabilities,
`LLM_DECISION_INVALID_REQUEST` for invalid schemas/options,
`LLM_DECISION_PROVIDER_ERROR` for HTTP/API/connection/timeout failures, and
`LLM_DECISION_INVALID_RESPONSE` for empty, malformed, refused, truncated,
tool-use, or schema-invalid output. Only finalized `end_turn` text blocks are
parsed; thinking blocks are excluded. No fallback or second inference is used for
normalization. Execution-scoped statistics are returned directly; `getLastStats`
remains last-call mutable state. Usage from a received response remains available
when output validation fails, while preflight failures clear previous usage.

AWS can take approximately 90 seconds to compile a new schema; compiled grammars
are cached for 24 hours. Configure the existing timeout to at least 120 seconds
for first use and enough output tokens to avoid `max_tokens` truncation. See the
[AWS structured-output guide](https://docs.aws.amazon.com/bedrock/latest/userguide/structured-output.html),
[Claude announcement and InvokeModel example](https://aws.amazon.com/blogs/machine-learning/structured-outputs-for-anthropic-claude-models-on-amazon-bedrock/),
and [model cards](https://docs.aws.amazon.com/bedrock/latest/userguide/model-cards.html)
for regional/profile availability and service limitations.

Run deterministic tests from `AWS/` using the sibling OpenAF build:

```sh
java -jar ../../openaf/openaf.jar -f tests/bedrock.js
```

HTTP responses and credentials are mocked; these tests make no AWS requests.
The separate live smoke test skips by default and incurs inference charges only
with explicit opt-in. Supply `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, optional
`AWS_SESSION_TOKEN`, `AWS_REGION`, and `BEDROCK_MODEL_ID`, then run:

```sh
OPENAF_BEDROCK_LIVE=1 java -jar ../../openaf/openaf.jar -f tests/bedrock-live.js
```

For a verified newer model, additionally set `BEDROCK_NATIVE_STRUCTURED_OUTPUT=true`.
The smoke test performs one schema extraction and reports statistics. Offline test
success does not establish live AWS model availability or access.

## Signing without sending

`AWS.signRequest(options)` returns headers for a request, without transmitting it.
Load only `aws_core.js` if no service helpers are needed. Example for direct OTLP
metrics and logs (these calls only sign; send the exact same body string yourself):

```javascript
loadLib("aws_core.js")
var aws = AWS.forSigning("eu-west-1") // Lazy, bounded discovery; no network yet.
var metricBody = JSON.stringify({ resourceMetrics: [{ scopeMetrics: [{ metrics: [{
   name: "example_gauge", gauge: { dataPoints: [{ asDouble: 1,
      timeUnixNano: String(Date.now()) + "000000" }] }
}] }] }] })
var metricHeaders = aws.signRequest({ method: "POST",
   url: "https://monitoring.eu-west-1.amazonaws.com/v1/metrics",
   region: "eu-west-1", service: "monitoring", body: metricBody,
   headers: { "Content-Type": "application/json" }, timeoutMs: 5000 })
var logBody = JSON.stringify({ resourceLogs: [{ scopeLogs: [{ logRecords: [{
   timeUnixNano: String(Date.now()) + "000000", body: { stringValue: "Example warning" },
   severityNumber: 13, severityText: "WARN"
}] }] }] })
var logHeaders = aws.signRequest({ method: "POST",
   url: "https://logs.eu-west-1.amazonaws.com/v1/logs",
   region: "eu-west-1", service: "logs", body: logBody,
   headers: { "Content-Type": "application/json", "x-aws-log-group": "/nattrmon/warnings",
      "x-aws-log-stream": "monitoring-01" }, timeoutMs: 5000 })
```

URLs must use HTTPS, a simple unescaped path, and no credentials, query or
fragment. Headers are cloned and normalized; duplicate names and caller-supplied
signature, host and transport framing headers are rejected. Temporary session
tokens are signed. The body must already be a string; serialize it exactly once.

`AWS.forSigning(region)` creates a lazy signing-only instance. `new AWS(...)`
continues to perform its existing eager connection; it also supports the new
instance method. Explicit constructor credentials remain caller-managed. Existing
request helpers and private signing APIs keep their previous refresh behavior.

For discovered credentials, `signRequest` preserves expiration from the existing
credential process, web identity, container and IMDS providers. It refreshes 60
seconds before expiration, or rechecks credentials without expiration after five
minutes. Refresh and signing are serialized per instance; credentials are published
only as a complete valid session. On failure a still-valid session remains usable;
refresh failures are throttled to one attempt every 30 seconds. Expired sessions
fail signing. `timeoutMs` includes lock wait, acquisition and signing. Acquisition
runs in an isolated time-bounded task; a timed-out result is never published.
Provider error text and credentials are excluded from signing errors. No new
credential providers or output-specific credential fields are introduced.

Run `openaf -f tests/signing.js` from `AWS/` for offline independent-JCA signature,
Unicode, header immutability, expiration, timeout and concurrency checks. Also run
`tests/credentials.js`, `tests/lambda.js` and `tests/bedrock.js`. The nAttrMon
repository supplies `tests/opentelemetry-aws-live.js` as an opt-in end-to-end test
against an existing log group/stream; offline checks do not establish live delivery.
