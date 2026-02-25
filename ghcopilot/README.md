# ghcopilot opack

OpenAF wrapper around the [copilot-sdk-java](https://github.com/copilot-community-sdk/copilot-sdk-java) as an `ow.ai` LLM provider named `ghcopilot`.

## Requirements

- Java 17+
- GitHub Copilot CLI installed and available in `PATH` (or configured with `cliPath`)
- Valid Copilot authentication on the local machine, or a token

## Install Java dependencies

From this folder run:

```bash
ojob ojob.io/oaf/mavenGetJars folder=.
```

## Usage

```javascript
loadLib("ghcopilot.js")

var llm = ow.ai.llm({
  type: "ghcopilot",
  options: {
    model: "gpt-4.1",
    timeout: 120000,
    useStdio: true,
    token: "<github-token>"
  }
})

llm.addSystemPrompt("You are concise.")
print(llm.prompt("Say hello in one sentence."))

var streamed = llm.promptStream("Count from 1 to 3.", __, __, false, __, (chunk, full) => {
  printnl(chunk)
})
print("\nFinal: " + streamed)
```

## oaf_model / OAFP_MODEL definition

You can define this provider in `OAFP_MODEL` / `OAF_MODEL` using `token` to authenticate the Copilot CLI process:

```yaml
type: ghcopilot
options:
  model: gpt-4.1
  token: ${GITHUB_TOKEN}
  timeout: 120000
  useStdio: true
```

`token` is forwarded to the SDK and also exported to the Copilot process as `GH_TOKEN` and `GITHUB_TOKEN`.

## Tool use

Register tools with `setTool` before prompting. The SDK's native `ToolDefinition` / `ToolHandler` mechanism is used, so the Copilot agent calls tools automatically during `sendAndWait`:

```javascript
llm.setTool(
  "get_time",
  "Returns the current UTC time as an ISO-8601 string",
  { type: "object", properties: {}, required: [] },
  (args) => new Date().toISOString()
)
print(llm.prompt("What time is it right now?"))
```

Adding or removing tools causes the session to be transparently recreated on the next call.

## Options

- `model` (string, default: `gpt-4.1`)
- `timeout` (number in ms, default: `120000`)
- `mode` (string, optional; forwarded to `MessageOptions.setMode`)
- `token` (string, optional; preferred auth option for Copilot CLI)
- `githubToken` (string, optional; legacy alias for `token`)
- `cliPath` (string, optional)
- `cliUrl` (string, optional)
- `cwd` (string, optional)
- `useStdio` (boolean, default: `true`)
- `autoStart` (boolean, default: `true`)
- `autoRestart` (boolean, default: `false`)
- `useLoggedInUser` (boolean, optional)
- `logLevel` (string, optional)
- `reasoningEffort` (string, optional; forwarded to `SessionConfig.setReasoningEffort`)
- `configDir` (string, optional; forwarded to `SessionConfig.setConfigDir`)
- `skillDirectories` (array of strings, optional)
- `disabledSkills` (array of strings, optional)
- `availableTools` (array of strings, optional; restrict which built-in tools the agent may use)
- `excludedTools` (array of strings, optional; block specific built-in tools)

## Docker

A sample `Dockerfile` is included in this folder and is based on `openaf/oaf:alpine`, adding Node.js/npm plus the `@github/copilot` binary.

Build and run:

```bash
docker build -t ghcopilot-runtime .
docker run --rm -it \
  -e GITHUB_TOKEN=... \
  ghcopilot-runtime copilot --help
```

## Notes

- This opack uses the Java SDK session `sendAndWait` flow.
- `aJsonFlag=true` appends a JSON-only instruction and attempts to parse the answer.
- Provider API compatibility with `ow.ai.gpt` now includes `setDebugCh(aChName)`, `promptImage(...)`, `promptStream(...)`, and `getModelInfo(aModelId)`.
