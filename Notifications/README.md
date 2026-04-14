# Notifications opack

OpenAF opack providing libraries and an MCP server for sending notifications via **Slack**, **MS Teams**, and **Pushover**.

## Installation

```bash
opack install Notifications
```

---

## Slack (`slack.js`)

Sends messages to a Slack channel via an [Incoming Webhook](https://api.slack.com/messaging/webhooks).

### Setup

Create an incoming webhook in your Slack workspace and copy the URL.

### Usage

```javascript
loadLib("slack.js");

var sl = new Slack("https://hooks.slack.com/services/...");
// or: var sl = $slack("https://hooks.slack.com/services/...");

// Plain text
sl.send("Hello from OpenAF");

// With channel/username overrides
sl.send("Hello", { channel: "#alerts", username: "mybot" });

// Attachments (legacy rich formatting)
sl.sendAttachments("Deployment result", [{
    color : "good",
    title : "Build #42",
    text  : "All tests passed"
}]);

// Block Kit — section + context
sl.sendBlock("*Service restarted* successfully", "env: prod | version: 1.2.3");

// Block Kit — with header
sl.sendBlock("*Deployment complete*", ["env: prod", "duration: 3m"], "Deployment", ":rocket:");

// Raw payload passthrough
sl.sendMessage({ blocks: [ { type: "divider" } ] });
```

### Methods

| Method | Description |
|---|---|
| `send(message, options?)` | Send plain text. `options` may include `channel`, `username`, `icon_emoji`, `icon_url`. |
| `sendAttachments(text, array, options?)` | Send with legacy attachment array. |
| `sendBlock(sectionTxt, contextTxt?, headerTxt?, headerEmoji?, options?)` | Send Block Kit message. `headerTxt` prepends a header block; `headerEmoji` defaults to `:bell:`. `contextTxt` can be a string or array. |
| `sendMessage(map, options?)` | Send arbitrary raw payload merged with optional overrides. |

### oJob

```bash
ojob notificationsSlack.yaml webHookURL=https://hooks.slack.com/... message="Hello"

# Block mode with header
ojob notificationsSlack.yaml webHookURL=... mode=block sectionTxt="*Alert*" headerTxt="Alert" contextTxt="env: prod"

# Shortcut
ojob notificationsSlack.yaml sendSlack "Hello from oJob"
```

**Parameters:**

| Parameter | Required | Description |
|---|---|---|
| `webHookURL` | yes | Slack incoming webhook URL |
| `message` | mode=message | Message text |
| `attachments` | mode=attachments | Array of attachment maps |
| `mode` | no | `message` (default), `attachments`, or `block` |
| `sectionTxt` | block | Markdown section text |
| `contextTxt` | no | Context string or array (block mode) |
| `headerTxt` | no | Header text (block mode) |
| `headerEmoji` | no | Header emoji, default `:bell:` (block mode) |
| `channel` | no | Override default channel |
| `username` | no | Override bot display name |

---

## MS Teams (`msteams.js`)

Sends messages to a Microsoft Teams channel. Supports both the **legacy Office 365 Incoming Webhook connector** (`send`) and the modern **Workflows webhook** (Adaptive Cards via `sendAdaptiveCard` / `sendSection`).

> **Note:** Microsoft has deprecated the Office 365 Incoming Webhook connector. New integrations should use a [Workflows webhook](https://support.microsoft.com/en-us/office/create-incoming-webhooks-with-workflows-for-microsoft-teams-8ae491c7-0394-4861-ba59-055e33f75498) and the `sendAdaptiveCard` or `sendSection` methods.

### Usage

```javascript
loadLib("msteams.js");

var ms = new MSTeams("https://prod.webhooks.office.com/...");
// or: var ms = $msteams("https://prod.webhooks.office.com/...");

// Simple section with fact table (Workflows webhook)
ms.sendSection("Deployment complete", "Service restarted successfully.", {
    Environment: "production",
    Version    : "1.2.3",
    Duration   : "3m 12s"
});

// Custom Adaptive Card (Workflows webhook)
ms.sendAdaptiveCard({
    body: [
        { type: "TextBlock", text: "Custom card", weight: "bolder" },
        { type: "TextBlock", text: "Any Adaptive Card body here", wrap: true }
    ],
    actions: [
        { type: "Action.OpenUrl", title: "View logs", url: "https://example.com/logs" }
    ]
});

// Legacy connector (deprecated)
ms.send("<b>Hello</b> from OpenAF");
```

### Methods

| Method | Description |
|---|---|
| `send(htmlMessage)` | **Deprecated.** Send HTML/markdown to legacy Office 365 connector. |
| `sendAdaptiveCard(card)` | Send an Adaptive Card. `card` is the inner content map `{ body: [...], actions?: [...] }`. The Workflows envelope is added automatically. |
| `sendSection(title, text, factsMap?)` | Convenience builder: bold title + body text + optional key-value fact table. Calls `sendAdaptiveCard` internally. |

---

## Pushover (`pushover.js`)

Sends push notifications to mobile devices via [Pushover](https://pushover.net).

### Setup

Register at [pushover.net](https://pushover.net) to obtain an API token and your user key.

### Usage

```javascript
loadLib("pushover.js");

var po = new Pushover("your-api-token");
po.send("user-or-group-key", "Hello from OpenAF");
```

### oJob

```bash
ojob notificationsPushover.yaml apiToken=abc123 userId=def456 message="Hello"
```

---

## MCP Server (`mcp-notify.yaml`)

A [Model Context Protocol](https://modelcontextprotocol.io) server exposing notification tools to AI assistants (e.g. Claude). Can run as a **STDIO** server (default) or an **HTTP** server.

At least one notification target must be configured.

### Tools exposed

| Tool | Description |
|---|---|
| `sendNotification` | Send a Pushover push notification |
| `sendSlackNotification` | Send a Slack message (text or block mode) |
| `sendTeamsNotification` | Send an MS Teams Adaptive Card |

### STDIO mode (Claude Desktop / Claude Code)

```json
{
  "mcpServers": {
    "notifications": {
      "command": "ojob",
      "args": ["mcp-notify.yaml"],
      "env": {
        "slackWebhook": "https://hooks.slack.com/services/...",
        "teamsWebhook": "https://prod.webhooks.office.com/...",
        "pushoverkey" : "abc123",
        "userid"      : "def456"
      }
    }
  }
}
```

### HTTP mode

```bash
ojob mcp-notify.yaml slackWebhook=https://hooks.slack.com/... onport=8888
```

### Parameters

| Parameter | Required | Description |
|---|---|---|
| `pushoverkey` | if using Pushover | Pushover API token |
| `userid` | if using Pushover | Pushover user/group key |
| `slackWebhook` | if using Slack | Slack incoming webhook URL |
| `teamsWebhook` | if using Teams | MS Teams Workflows webhook URL |
| `onport` | no | If set, starts an HTTP MCP server on this port instead of STDIO |

Parameters can also be passed as environment variables (e.g. `export slackWebhook=...`).
