# CHManager – OpenAF Channel Manager

TUI and web-based manager for OpenAF channels. Browse keys/values, create and persist channel definitions, and access the full `ow.ch` feature surface from a friendly interface.

## Install

```bash
opack install CHManager
```

## TUI

```bash
# Interactive TUI
ojob CHManager/CHManager.yaml

# Or via shortcut (after install)
ch-manager

# Run a single command and exit
ch-manager /channels
ch-manager /types
```

### TUI Commands

| Command | Description |
|---|---|
| `/channels [filter]` | List channel definitions |
| `/types [filter]` | List all available channel types |
| `/add <name>` | Guided wizard to add a new channel definition |
| `/edit <name>` | Edit an existing channel definition |
| `/info <name>` | Show channel definition details |
| `/delete <name>` | Delete a channel definition |
| `/open <name>` | Open (create) a channel |
| `/close <name>` | Close (destroy) a channel |
| `/keys <name> [page]` | Browse keys (20 per page) |
| `/get <name> <key>` | Get a value by JSON key |
| `/set <name> <key> <json>` | Set a key/value |
| `/unset <name> <key>` | Remove a key |
| `/getall <name> [page]` | List all values (paginated) |
| `/size <name>` | Number of entries |
| `/clear <name>` | Clear all entries |
| `/expose <name> <port> [path]` | Expose channel over HTTP |
| `/peer <name> <port> <path> <urls>` | Bidirectional peer (comma-sep URLs) |
| `/unpeer <name> [url]` | Remove peer |
| `/remote <def> <url> [login] [pass]` | Define a remote channel |
| `/mirror <src> <target>` | Add mirror subscriber |
| `/housekeep <name> <maxKeys>` | Add housekeep subscriber |
| `/buffer <src> <target> <idxs>` | Add buffer subscriber |
| `/subscribe [name]` | Live-watch channel changes (interactive if omitted) |
| `/unsubscribe [name] [subId]` | Remove live subscriber (interactive if omitted) |
| `/sync <src> <target> <idxs>` | Sync two channels |
| `/import <name> <file>` | Bulk import from JSON/YAML |
| `/export <name> <file>` | Bulk export to JSON/YAML |
| `/help` | Show all commands |
| `/quit` | Exit |

## Web Interface

```bash
# Default port 8090
ojob CHManager/CHManager-web.yaml

# Or via shortcut
ch-manager-web

# Custom port
ch-manager-web onport=8080
```

Open `http://localhost:8090` in your browser.

**Features:**
- Left sidebar with channel list (type badge, open/closed/exposed/peered status)
- Keys and Values tabs with pagination and click-to-edit, plus Table/Tree/Flat/OpenAF nJSMap visual views
- Keys/Values views support auto-refresh (`off`, fixed seconds, or adaptive `auto`) and reverse order (`newest first`) for live-growing channels
- JSON inputs also accept SLON, with text or visual map/array editing
- Add/Edit forms pre-fill known OpenAF channel type options with type, default, required, and odoc-derived descriptions
- Operations panel: expose, peer, mirror, housekeep, buffer, sync, clear
- Live tab with subscribe/unsubscribe configuration and real-time SSE grid by channel
- Definition tab showing full channel config and type metadata as JSON, SLON, printTree-like Tree, or an OpenAF nJSMap visual view
- Add/Edit channel modal with dynamic options form
- Dark/light theme toggle

## Definitions Storage

Channel definitions are persisted to `~/.openaf-ch-manager/channels.yaml`. They reload on the next startup, and channels marked `autoOpen: true` are created automatically.

## Custom Libs

Load additional channel type implementations via `libs=`:

```bash
# Direct path
ch-manager libs="/path/to/my-channel-types.js"

# From an installed opack
ch-manager libs="@MyOPack/channels.js"

# Multiple
ch-manager libs="@OPackA/a.js,@OPackB/b.js"
```

Your lib can register custom types:

```javascript
CHManager.typeRegistry["mytype"] = {
  desc : "My custom channel type",
  opack: "MyOPack",
  options: {
    host: { type: "string", required: true, desc: "Server host" },
    port: { type: "number", default: 1234, desc: "Server port" }
  }
}
// Also register the actual ow.ch type:
ow.ch.__types["mytype"] = { /* standard ow.ch type interface */ }
```

## Supported Channel Types

### Built-in
`simple`, `big`, `file`, `db`, `cache`, `buffer`, `proxy`, `dummy`, `ops`, `remote`, `elasticsearch`, `prometheus`

### OPack types (opack must be installed)
| Type | OPack |
|---|---|
| `redis` | Redis |
| `falkordb` | FalkorDB |
| `vectordb` | lucene |
| `searchdb` | lucene |
| `rocksdb` | rocksdb |
| `s3` | S3 |
| `dynamo` | AWS |
| `awssecrets` | AWS |
| `etcd3` | etcd3 |
| `cq` | cq |
| `mongo` | Mongo |
| `gist` | GIST |

## Programmatic Use

```javascript
loadLib(getOPackPath("CHManager") + "/CHManager.js")

var chm = new CHManager()
chm.init({ libs: "" })

// Define and open a channel
chm.addDef("mydata", "simple", {}, true)
chm.open("mydata")

// CRUD
chm.set("mydata", '{"id":1}', '{"id":1,"name":"test"}')
print(chm.get("mydata", '{"id":1}'))
print(chm.size("mydata"))

// Expose over HTTP
chm.expose("mydata", 8091, "/mydata")

// Mirror to another channel
chm.addDef("backup", "simple", {}, false)
chm.open("backup")
chm.addMirrorSubscriber("mydata", "backup")

// Housekeeping
chm.addHousekeepSubscriber("mydata", 500)
```
