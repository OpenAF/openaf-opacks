# m365copilot

Preview Microsoft 365 Copilot provider for OpenAF. Requires a licensed Microsoft 365 Copilot work/school account and Microsoft Graph delegated permissions. The Graph beta API is subject to change and is not supported by Microsoft for production applications.

Register an Entra public-client application, enable device-code/public-client authentication and obtain tenant consent for Sites.Read.All, Mail.Read, People.Read.All, OnlineMeetingTranscript.Read.All, Chat.Read, ChannelMessage.Read.All and ExternalItem.Read.All. Tenant conditional-access policy may block device authentication.

```javascript
loadLib('m365copilot.js')
var llm = ow.ai.llm({ type: 'm365copilot', options: {
  authMode: 'deviceCode', tenantId: '<tenant>', clientId: '<app>',
  timeZone: 'Europe/Lisbon', webSearch: true, timeout: 120000
} })
print(llm.prompt('Summarize recent project discussions.'))
```

Alternatively use `authMode: 'token'` with `token` or a `tokenProvider` callback returning a delegated Graph access token. Device authentication retains and refreshes tokens in memory; no credential files are written. `onDeviceCode` can replace the default stderr instructions.

`options.files` accepts SharePoint/OneDrive URL strings; `additionalContext` accepts text strings. Context and web search settings apply to every turn. Enterprise grounding remains enabled.

`promptStream` uses the standard OpenAF callback `(delta, full)`. When a response is revised, delta is empty and full contains the authoritative replacement. Inspect `llm.model.getLastResponse()` for response text, citations, sensitivity labels and raw Graph data. `rawPrompt` returns the same map.

`cleanPrompt` detaches the remote conversation without deleting Microsoft data. Imported conversation history is supplied as context on the first new turn. System prompts are contextual instructions, without privileged system-role guarantees. Images, tools, model selection and temperature are unsupported. JSON mode requests JSON and parses the result without schema guarantees. Token usage is unavailable. Requests are never automatically replayed after transport failures. Partial streamed output remains in getLastResponse().

For OAF_MODEL/OAFP_MODEL use the same serializable type/options object; supply tokens through your existing secret configuration. Token callbacks require JavaScript configuration.

API reference: https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/api/ai-services/chat/overview
