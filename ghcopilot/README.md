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

- `params` (map, optional): Reserved for provider/API compatibility. Keep empty unless another integration explicitly requires it.
- `model` (string, default: `gpt-4.1`): Model ID used for generation (for example `gpt-4.1`, `gpt-4o`, etc.).
- `timeout` (number in ms, default: `120000`): Maximum wait time for a response before the request is aborted.
- `mode` (string, optional): Advanced request mode forwarded to `MessageOptions.setMode`.
- `token` (string, optional): Preferred authentication token for Copilot CLI sessions.
- `githubToken` (string, optional): Legacy alias for `token` (use `token` in new configs).
- `cliPath` (string, optional): Absolute path to the `copilot` executable when it is not available in `PATH`.
- `cliUrl` (string, optional): Optional CLI endpoint/URL used by the SDK when supported by your setup.
- `cwd` (string, optional): Working directory used by the Copilot process (affects file/tool context).
- `useStdio` (boolean, default: `true`): Communicates with Copilot CLI over stdio (recommended/default transport).
- `autoStart` (boolean, default: `true`): Automatically starts a CLI session on first request.
- `autoRestart` (boolean, default: `false`): Automatically recreates the session after failures or disconnects.
- `useLoggedInUser` (boolean, optional): Prefer the local Copilot logged-in account/session instead of explicit token-only auth.
- `logLevel` (string, optional): SDK/CLI logging verbosity for troubleshooting (for example `debug`, `info`, `warn`, `error`).
- `reasoningEffort` (string, optional): Reasoning intensity hint forwarded to `SessionConfig.setReasoningEffort`.
- `configDir` (string, optional): Custom configuration directory forwarded to `SessionConfig.setConfigDir`.
- `skillDirectories` (array of strings, optional): Additional directories where Copilot skills are loaded from.
- `disabledSkills` (array of strings, optional): Skill IDs/names to disable, even if available in configured skill directories.
- `availableTools` (array of strings, optional): Allowlist of built-in tools the agent is permitted to call.
- `excludedTools` (array of strings, optional): Blocklist of built-in tools that must not be called.

## Additional methods

Along with the standard `ow.ai.gpt` surface, this provider also exposes:

- `getModels()`
- `getLastStats()`
- `promptWithStats(...)`
- `rawPromptWithStats(...)`
- `promptStreamWithStats(...)`
- `rawPromptStreamWithStats(...)`
- `close()`

## Docker

A sample `Dockerfile` is included in this folder and is based on `openaf/oaf:edge-t8`, adding Node.js/npm plus the `@github/copilot` binary.

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
