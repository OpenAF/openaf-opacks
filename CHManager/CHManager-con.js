// Author: Nuno Aguiar
// CHManager TUI console

try {
  plugin("Console")
  ow.loadCh()
  ow.loadFormat()
  var args          = processExpr(" ")
  var chmBasePath   = (io.fileExists("CHManager.js")) ? io.fileInfo(".").canonicalPath : getOPackPath("CHManager")
  if (typeof CHManager === "undefined") load(chmBasePath + "/CHManager.js")

  var con     = new Console()
  var format  = ow.format
  var sideLineTheme = format.withSideLineThemes().simpleLine
  function _pad(s, n) { s = String(s || ""); if (n < 0) { n = -n } while (visibleLength(s) < n) s += " "; return s.substring(0, n) }
  var _home   = String(java.lang.System.getProperty("user.home"))
  var histDir = _home + "/.openaf-ch-manager"
  var histFile= histDir + "/history"

  if (!io.fileExists(histDir)) io.mkdir(histDir)

  var consoleReader
  var commandHistory
  try {
    if (isDef(con) && typeof con.getConsoleReader === "function") {
      consoleReader  = con.getConsoleReader()
      commandHistory = new Packages.jline.console.history.FileHistory(new java.io.File(histFile))
      consoleReader.setHistory(commandHistory)
    }
  } catch(e) { commandHistory = __ }

  // Colour palette
  var C = {
    prompt  : "FG(41)",
    accent  : "FG(218)",
    dim     : "FG(249)",
    error   : "FG(196)",
    ok      : "FG(112)",
    num     : "FG(155)",
    type    : "FG(81)",
    badge   : "FG(220)",
    header  : "BOLD,FG(255)",
    warn    : "FG(214)",
    info    : "FG(117)",
    muted   : "FG(240)",
    open    : "FG(46)",
    closed  : "FG(242)",
    tag     : "FG(183)"
  }
  function col(color, text) {
    try { return ansiColor(color, text) } catch(e) { return text }
  }
  function hr(ch, n) {
    var s = ""; for (var i = 0; i < (n||60); i++) s += (ch||"─"); return s
  }
  function termWidth() {
    try {
      if (isDef(con) && isDef(con.getTerminal)) return con.getTerminal().getWidth()
      if (isDef(consoleReader)) return consoleReader.getTerminal().getWidth()
    } catch(e) {}
    try {
      if (isDef(__con) && isDef(__con.getTerminal)) return __con.getTerminal().getWidth()
    } catch(e2) {}
    return 80
  }
  function md(text) {
    try { return format.withMD(String(text || ""), "", termWidth()) } catch(e) { return String(text || "") }
  }
  function mdCell(text) {
    return String(text || "").replace(/<([^>]+)>/g, "{$1}").replace(/&/g, "&amp;")
  }
  function side(text, lineColor, textColor, theme) {
    try {
      return format.withSideLine(String(text || ""), termWidth(), lineColor || C.prompt, textColor || C.dim, theme || sideLineTheme)
    } catch(e) {
      return String(text || "")
    }
  }
  function printBox(text, lineColor, textColor, theme) {
    print(side(text, lineColor, textColor, theme))
  }
  function infoMsg(text)  { printBox(text, C.info, C.dim) }
  function okMsg(text)    { printBox(text, C.ok, C.dim) }
  function warnMsg(text)  { printBox(text, C.warn, C.dim) }
  function errorMsg(text) { printBox(text, C.error, C.error) }
  function toSLON(value) {
    if (isUnDef(value)) return "undefined"
    if (value === null) return "null"
    if (isString(value)) return value
    try { return af.toSLON(value) } catch(e) {
      try { return stringify(value, __, "") } catch(e2) { return String(value) }
    }
  }
  function parseMaybeJSSLON(value) {
    if (!isString(value)) return value
    try { return af.fromJSSLON(value) } catch(e) { return value }
  }
  function optionDefaultString(spec, current) {
    var value = isDef(current) ? current : (spec && isDef(spec.default) ? spec.default : __)
    if (isUnDef(value)) return ""
    if (isMap(value) || isArray(value)) return toSLON(value)
    return String(value)
  }
  function parseOptionValue(value, spec) {
    var type = spec && spec.type ? spec.type : "string"
    if (value.length === 0) return __
    if (type === "boolean") return value === "true" || value === "y" || value === "yes"
    if (type === "number") return Number(value)
    if (type === "array" || type === "object") return af.fromJSSLON(value)
    if (type === "function") return value
    return value
  }
  function printTypeInfo(type) {
    var info = CHManager.typeRegistry[type] || {}
    var lines = []
    lines.push("## " + typeIcon(type) + " " + type)
    if (info.desc) lines.push("", info.desc)
    if (info.odoc) lines.push("", "`" + info.odoc + "`")
    var opts = info.options || {}
    var keys = Object.keys(opts)
    lines.push("", "**Options:** " + keys.length)
    if (keys.length > 0) {
      lines.push("", "| Option | Type | Required | Default | Description |")
      lines.push("| --- | --- | --- | --- | --- |")
      keys.forEach(function(k) {
        var s = opts[k] || {}
        lines.push("| `" + mdCell(k) + "` | `" + mdCell(s.type || "string") + "` | " + (s.required ? "yes" : "no") + " | `" + mdCell(optionDefaultString(s)) + "` | " + mdCell(s.desc || "") + " |")
      })
    }
    printBox(md(lines.join("\n")), C.info, C.dim)
  }
  function printRows(rows) {
    if (!isArray(rows) || rows.length === 0) return
    print(printTable(rows, termWidth(), true, true, "utf", __, true, false, true))
  }
  function printObject(value) {
    try {
      if (typeof printTreeOrS === "function") print(printTreeOrS(value, termWidth(), { noansi: false, wordWrap: true }))
      else print(printTree(value, termWidth(), { noansi: false, wordWrap: true }))
    } catch(e) {
      print(md("```json\n" + stringify(value, __, 2) + "\n```"))
    }
  }
  function choose(prompt, choices, maxDisplay) {
    if (!isArray(choices) || choices.length === 0) return -1
    try { return askChoose(prompt, choices, isNumber(maxDisplay) ? maxDisplay : Math.min(choices.length, 12)) } catch(e) { return -1 }
  }
  function confirmAction(prompt, yesLabel) {
    var options = ["No", yesLabel || "Yes"]
    var selected = choose(prompt, options, options.length)
    if (selected >= 0) return selected === 1
    var answer = promptLine(prompt + " (yes/no)", "no")
    return answer === "yes" || answer === "y"
  }
  function selectType(defaultType) {
    var choices = allTypeNames.map(function(t) {
      var info = CHManager.typeRegistry[t] || {}
      return typeIcon(t) + " " + t + (isString(info.desc) ? " - " + info.desc : "")
    })
    var selected = choose("Choose channel type: ", choices, Math.min(choices.length, 12))
    if (selected >= 0 && selected < allTypeNames.length) return allTypeNames[selected]
    return promptLine("type [" + allTypeNames.join("|") + "]", defaultType || "simple")
  }

  // Single-char BMP symbols for type icons (table-safe, single display width)
  var typeIcons = {
    "simple"       : ["▪", "FG(153)"],
    "big"          : ["▴", "FG(153)"],
    "file"         : ["≡", "FG(222)"],
    "db"           : ["⊞", "FG(215)"],
    "cache"        : ["◈", "FG(220)"],
    "buffer"       : ["▣", "FG(183)"],
    "proxy"        : ["⇌", "FG(249)"],
    "dummy"        : ["∅", "FG(240)"],
    "ops"          : ["⚙", "FG(249)"],
    "remote"       : ["⇢", "FG(81)"],
    "elasticsearch": ["⊛", "FG(214)"],
    "prometheus"   : ["⊙", "FG(214)"],
    "redis"        : ["⊕", "FG(196)"],
    "falkordb"     : ["⊗", "FG(135)"],
    "vectordb"     : ["⊜", "FG(117)"],
    "searchdb"     : ["⊟", "FG(117)"],
    "rocksdb"      : ["◆", "FG(180)"],
    "s3"           : ["☁", "FG(159)"],
    "dynamo"       : ["⊡", "FG(214)"],
    "awssecrets"   : ["⊠", "FG(214)"],
    "etcd3"        : ["≋", "FG(180)"],
    "cq"           : ["≫", "FG(180)"],
    "mongo"        : ["◉", "FG(112)"],
    "gist"         : ["◎", "FG(249)"]
  }
  function typeIcon(t) {
    var e = typeIcons[t]
    return e ? col(e[1], e[0]) : col("dim", "○")
  }

  // ─── CHManager instance ─────────────────────────────────────────────────────
  var chm = new CHManager()
  chm.init({ libs: args.libs })

  // ─── Startup banner ─────────────────────────────────────────────────────────
  function printBanner() {
    print("")
    printBox(md("**📡 CHManager**  OpenAF Channel Manager\n\n💾 Definitions: `~/.openaf-ch-manager/channels.yaml`\n\n💡 Type `/help` for commands"), C.prompt, C.dim, format.withSideLineThemes().openCurvedRect)
    print("")
  }

  // ─── Help text ─────────────────────────────────────────────────────────────
  function printHelp() {
    var groups = [
      {
        icon: "📋", label: "CHANNELS",
        cmds: [
          ["/channels [filter]",    "List channel definitions"],
          ["/types [filter]",       "List available channel types"],
          ["/add <name>",           "Wizard: add new channel definition"],
          ["/edit <name>",          "Edit existing channel definition"],
          ["/info <name>",          "Show channel definition details"],
          ["/delete <name>",        "Delete channel definition"],
          ["/open <name>",          "Open/create a channel"],
          ["/close <name>",         "Close/destroy a channel"]
        ]
      },
      {
        icon: "📦", label: "DATA",
        cmds: [
          ["/keys <name> [page]",       "Browse keys (paginated, 20/page)"],
          ["/get <name> <key>",         "Get value by JSON key"],
          ["/set <name> <key> <json>",  "Set key/value (JSON)"],
          ["/unset <name> <key>",       "Remove a key"],
          ["/getall <name> [page]",     "Get all values (paginated)"],
          ["/size <name>",              "Number of entries"],
          ["/clear <name>",             "Clear all entries (confirmation required)"]
        ]
      },
      {
        icon: "🌐", label: "NETWORK",
        cmds: [
          ["/expose <name> <port> [path]",       "Expose channel via HTTP"],
          ["/unexpose <name>",                   "Remove expose (tracking only)"],
          ["/peer <name> <port> <path> <urls>",  "Peer channel (comma-sep URLs)"],
          ["/unpeer <name> [url]",               "Unpeer channel"],
          ["/remote <def> <url> [login] [p]",    "Define remote channel"]
        ]
      },
      {
        icon: "📡", label: "SUBSCRIBERS",
        cmds: [
          ["/mirror <src> <target>",          "Add mirror subscriber"],
          ["/housekeep <name> <maxKeys>",     "Add housekeep subscriber"],
          ["/buffer <src> <target> <idxs>",   "Add buffer subscriber (comma-sep idxs)"],
          ["/subscribe <name>",               "Live watch channel changes (Ctrl-C to stop)"],
          ["/unsubscribe <name> <subId>",     "Remove a subscriber"],
          ["/sync <src> <target> <idxs>",     "Sync two channels"]
        ]
      },
      {
        icon: "💿", label: "IMPORT / EXPORT",
        cmds: [
          ["/import <name> <file>",  "Bulk import from JSON/YAML file"],
          ["/export <name> <file>",  "Bulk export to JSON/YAML file"]
        ]
      },
      {
        icon: "ℹ", label: "SYSTEM ",
        cmds: [
          ["/help",  "Show this help"],
          ["/quit",  "Exit"]
        ]
      }
    ]

    var lines = [ "# CHManager", "" ]
    groups.forEach(function(g) {
      lines.push("## " + g.icon + " " + g.label)
      lines.push("")
      lines.push("| Command | Description |")
      lines.push("| --- | --- |")
      g.cmds.forEach(function(c) {
        lines.push("| `" + mdCell(c[0]) + "` | " + mdCell(c[1]) + " |")
      })
      lines.push("")
    })
    printBox(md(lines.join("\n")), C.prompt, C.dim, format.withSideLineThemes().openCurvedRect)
    print("")
  }

  // ─── Channel list ───────────────────────────────────────────────────────────
  function printChannelList(filter) {
    var defs = chm.listDefs()
    if (isString(filter) && filter.length > 0) defs = defs.filter(function(d) { return d.name.indexOf(filter) >= 0 })
    if (defs.length === 0) { infoMsg("📭 No channel definitions found."); return }
    print("")
    printRows(defs.map(function(d) {
      var status = []
      status.push(d.isOpen ? "open" : "closed")
      if (d.isExposed) status.push("exposed")
      if (d.isPeered)  status.push("peered")
      if (d.autoOpen)  status.push("auto")
      return {
        Name  : d.name,
        Type  : d.type,
        Status: status.join(", ")
      }
    }))
  }

  // ─── Type list ──────────────────────────────────────────────────────────────
  function printTypeList(filter) {
    var types = chm.listTypes(filter)
    if (types.length === 0) { infoMsg("No channel types match the filter."); return }
    print("")
    printRows(types.map(function(t) {
      return {
        Type       : typeIcon(t.type) + " " + t.type,
        OPack      : t.opack,
        Available  : t.available ? "yes" : "no",
        Options    : t.options ? Object.keys(t.options).length : 0,
        ODoc       : t.odoc || "",
        Description: t.desc
      }
    }))
  }

  // ─── Key browser ────────────────────────────────────────────────────────────
  function printKeyList(name, page) {
    var p = isNumber(parseInt(page)) && !isNaN(parseInt(page)) ? parseInt(page) : 1
    var res = chm.getKeys(name, p, 20)
    var keys = isArray(res) ? res : res.keys
    var total = isArray(res) ? res.length : res.total
    print("")
    infoMsg("🗝 Keys for " + name + (isArray(res) ? "" : " | page " + p + "/" + Math.ceil(total/20) + " | " + total + " total"))
    if (keys.length === 0) { infoMsg("(empty)"); return }
    printRows(keys.map(function(k, i) {
      return { "#": (p-1)*20 + i + 1, Key: toSLON(k) }
    }))
    if (!isArray(res) && total > p * 20) infoMsg("Use /keys " + name + " " + (p+1) + " for next page.")
  }

  // ─── Value display ──────────────────────────────────────────────────────────
  function printValue(key, val) {
    print("")
    printBox(md("**🔑 Key**\n\n`" + toSLON(parseMaybeJSSLON(key)).replace(/`/g, "\\`") + "`"), C.prompt, C.dim)
    printBox("📄 Value", C.info, C.dim)
    printObject(val)
    print("")
  }

  function printDefinitionInfo(name) {
    var def = chm.getDef(name)
    if (!def) { errorMsg("❌ Definition '" + name + "' not found"); return }
    var state = chm.listDefs().filter(function(d) { return d.name === name })[0] || {}
    var info = CHManager.typeRegistry[def.type] || {}
    print("")
    printBox(md("## Channel Info\n\n`" + name + "`"), C.prompt, C.dim, format.withSideLineThemes().openCurvedRect)
    printTypeInfo(def.type)
    printObject({
      name     : name,
      type     : def.type,
      autoOpen : def.autoOpen === true,
      state    : {
        open   : state.isOpen === true,
        exposed: state.isExposed === true,
        peered : state.isPeered === true
      },
      options  : def.options || {},
      typeInfo : {
        desc   : info.desc,
        odoc   : info.odoc,
        options: info.options || {}
      },
      expose   : def.exposeConfig,
      peer     : def.peerConfig
    })
    print("")
  }

  // ─── Add wizard ─────────────────────────────────────────────────────────────
  function promptLine(label, def) {
    var prompt = col("accent", "  " + label + (isString(def) ? " [" + def + "]" : "") + ": ")
    var answer
    try {
      answer = con.readLinePrompt(prompt)
    } catch(e) {
      answer = readline(prompt)
    }
    answer = (answer || "").trim()
    if (answer.length === 0 && isString(def)) return def
    return answer
  }

  function promptBoolean(label, def) {
    var selected = choose(label + "?", [ def ? "Yes (current)" : "Yes", def ? "No" : "No (current)" ], 2)
    if (selected >= 0) return selected === 0
    var val = promptLine(label + " (y/n)", def ? "y" : "n")
    return val === "y" || val === "yes" || val === "true"
  }

  var allTypeNames = Object.keys(CHManager.typeRegistry)

  function addWizard(name) {
    print("")
    printBox(md("## ✨ Add channel\n\nName: `" + name + "`"), C.prompt, C.dim, format.withSideLineThemes().openCurvedRect)
    var type = selectType("simple")
    if (!type || type.trim().length === 0) type = "simple"

    var info = CHManager.typeRegistry[type]
    printTypeInfo(type)
    var options = {}
    if (info && isMap(info.options) && Object.keys(info.options).length > 0) {
      printBox(md("**⚙ Options**\n\nPress Enter to accept the default value."), C.info, C.dim)
      Object.keys(info.options).forEach(function(key) {
        var spec  = info.options[key]
        var label = "  " + (spec.required ? col("error", "⚠ required") : col("dim", "  optional")) + " " + col("accent", key) + " (" + spec.type + ")"
        if (spec.desc) label += " – " + col("dim", spec.desc)
        var def = optionDefaultString(spec)
        var val = promptLine(label, def || "")
        if (val.length > 0) {
          options[key] = parseOptionValue(val, spec)
        }
      })
    } else {
      printBox(md("**⚙ Custom options**\n\nEnter `key=value` pairs. Leave empty to finish."), C.info, C.dim)
      while (true) {
        var pair = promptLine("key=value", "")
        if (pair.length === 0) break
        var eq = pair.indexOf("=")
        if (eq < 0) { print(col("error", "  ⚠ Use key=value format")); continue }
        options[pair.substring(0, eq).trim()] = af.fromJSSLON(pair.substring(eq + 1).trim())
      }
    }

    var autoOpen = promptBoolean("🔄 Auto-open on startup", false)
    chm.addDef(name, type, options, autoOpen)
    okMsg("✅ Definition '" + name + "' saved (type: " + type + ")")
  }

  function editWizard(name) {
    var def = chm.getDef(name)
    if (!def) { errorMsg("❌ Definition '" + name + "' not found"); return }
    print("")
    printBox(md("## ✏ Edit channel\n\nName: `" + name + "`\n\nType: `" + def.type + "`"), C.prompt, C.dim, format.withSideLineThemes().openCurvedRect)
    var info = CHManager.typeRegistry[def.type]
    printTypeInfo(def.type)
    var options = merge({}, def.options)
    if (info && isMap(info.options) && Object.keys(info.options).length > 0) {
      printBox(md("Press Enter to keep the current value."), C.info, C.dim)
      Object.keys(info.options).forEach(function(key) {
        var spec  = info.options[key]
        var cur   = optionDefaultString(spec, options[key])
        var label = "  " + col("accent", key) + " (" + spec.type + ")" + (spec.desc ? " – " + col("dim", spec.desc) : "")
        var val   = promptLine(label, cur)
        if (val.length > 0) {
          options[key] = parseOptionValue(val, spec)
        }
      })
    } else {
      printBox(md("**Current options**\n\n```slon\n" + toSLON(options) + "\n```\n\nEnter `key=value` pairs to update. Leave empty to finish."), C.info, C.dim)
      while (true) {
        var pair = promptLine("key=value", "")
        if (pair.length === 0) break
        var eq = pair.indexOf("=")
        if (eq >= 0) options[pair.substring(0, eq).trim()] = af.fromJSSLON(pair.substring(eq + 1).trim())
      }
    }
    var autoOpen = promptBoolean("🔄 Auto-open on startup", def.autoOpen)
    chm.editDef(name, { options: options, autoOpen: autoOpen })
    okMsg("✅ Definition '" + name + "' updated")
  }

  // ─── Command dispatch ────────────────────────────────────────────────────────
  function dispatch(input) {
    input = (input || "").trim()
    if (input.length === 0) return
    if (!input.startsWith("/")) {
      infoMsg("💡 Use /help to see available commands")
      return
    }

    var parts = input.slice(1).match(/(?:[^\s"]+|"[^"]*")+/g) || []
    var cmd   = (parts[0] || "").toLowerCase()
    var rest  = parts.slice(1).map(function(p) { return p.replace(/^"|"$/g, "") })

    try {
      switch(cmd) {
        case "help": printHelp(); break

        case "channels": printChannelList(rest[0]); break

        case "types": printTypeList(rest[0]); break

        case "add":
          if (!rest[0]) { errorMsg("❌ Usage: /add <name>"); return }
          addWizard(rest[0])
          break

        case "edit":
          if (!rest[0]) { errorMsg("❌ Usage: /edit <name>"); return }
          editWizard(rest[0])
          break

        case "info":
        case "def":
          if (!rest[0]) { errorMsg("❌ Usage: /info <name>"); return }
          printDefinitionInfo(rest[0])
          break

        case "delete":
          if (!rest[0]) { errorMsg("❌ Usage: /delete <name>"); return }
          var confirm = confirmAction("Delete '" + rest[0] + "'?", "Yes, delete")
          if (confirm === true) { chm.removeDef(rest[0]); okMsg("✅ Deleted '" + rest[0] + "'") }
          else infoMsg("↩ Cancelled")
          break

        case "open":
          if (!rest[0]) { errorMsg("❌ Usage: /open <name>"); return }
          chm.open(rest[0])
          okMsg("🟢 Opened: " + rest[0])
          break

        case "close":
          if (!rest[0]) { errorMsg("❌ Usage: /close <name>"); return }
          chm.close(rest[0])
          infoMsg("⚫ Closed: " + rest[0])
          break

        case "keys":
          if (!rest[0]) { errorMsg("❌ Usage: /keys <name> [page]"); return }
          printKeyList(rest[0], rest[1])
          break

        case "get":
          if (!rest[0] || !rest[1]) { errorMsg("❌ Usage: /get <name> <key>"); return }
          var val = chm.get(rest[0], rest[1])
          printValue(rest[1], val)
          break

        case "set":
          if (!rest[0] || !rest[1] || !rest[2]) { errorMsg("❌ Usage: /set <name> <key> <json>"); return }
          chm.set(rest[0], rest[1], rest[2])
          okMsg("✅ Set")
          break

        case "unset":
          if (!rest[0] || !rest[1]) { errorMsg("❌ Usage: /unset <name> <key>"); return }
          chm.unset(rest[0], rest[1])
          okMsg("🗑 Unset")
          break

        case "getall":
          if (!rest[0]) { errorMsg("❌ Usage: /getall <name> [page]"); return }
          var page = rest[1] ? parseInt(rest[1]) : 1
          var res  = chm.getAll(rest[0], page, 20)
          var vals = isArray(res) ? res : res.values
          var tot  = isArray(res) ? res.length : res.total
          print("")
          infoMsg("📄 Values for " + rest[0] + " | page " + page + "/" + Math.ceil(tot/20) + " | " + tot + " total")
          if (vals.length === 0) { infoMsg("(empty)"); return }
          printRows(vals.map(function(v, i) {
            return { "#": (page-1)*20+i+1, Value: toSLON(v) }
          }))
          if (!isArray(res) && tot > page * 20) infoMsg("Use /getall " + rest[0] + " " + (page+1) + " for next page.")
          break

        case "size":
          if (!rest[0]) { errorMsg("❌ Usage: /size <name>"); return }
          infoMsg("📊 " + chm.size(rest[0]) + " entries in " + rest[0])
          break

        case "clear":
          if (!rest[0]) { errorMsg("❌ Usage: /clear <name>"); return }
          var cf = confirmAction("Clear ALL entries in '" + rest[0] + "'?", "Yes, clear")
          if (cf === true) {
            var n = chm.clearAll(rest[0])
            okMsg("✅ Removed " + n + " entries from " + rest[0])
          } else infoMsg("↩ Cancelled")
          break

        case "expose":
          if (!rest[0] || !rest[1]) { errorMsg("❌ Usage: /expose <name> <port> [path]"); return }
          var uuid = chm.expose(rest[0], parseInt(rest[1]), rest[2])
          okMsg("🌐 Exposed '" + rest[0] + "' on port " + rest[1] + (rest[2] ? " at " + rest[2] : ""))
          break

        case "unexpose":
          if (!rest[0]) { errorMsg("❌ Usage: /unexpose <name>"); return }
          chm.unexpose(rest[0])
          okMsg("✅ Unexposed: " + rest[0])
          break

        case "peer":
          if (!rest[0] || !rest[1] || !rest[2]) { errorMsg("❌ Usage: /peer <name> <port> <path> <urls>"); return }
          var peerURLs = rest.slice(3).join(",").split(",").map(function(u){return u.trim()}).filter(function(u){return u.length>0})
          chm.peer(rest[0], parseInt(rest[1]), rest[2], peerURLs)
          okMsg("🔗 Peered '" + rest[0] + "' with " + peerURLs.length + " remote(s)")
          break

        case "unpeer":
          if (!rest[0]) { errorMsg("❌ Usage: /unpeer <name> [url]"); return }
          chm.unpeer(rest[0], rest[1])
          okMsg("✅ Unpeered: " + rest[0])
          break

        case "remote":
          if (!rest[0] || !rest[1]) { errorMsg("❌ Usage: /remote <defName> <url> [login] [pass]"); return }
          chm.createRemote(rest[0], rest[1], rest[2], rest[3])
          okMsg("📡 Remote definition '" + rest[0] + "' created")
          break

        case "mirror":
          if (!rest[0] || !rest[1]) { errorMsg("❌ Usage: /mirror <src> <target>"); return }
          var mid = chm.addMirrorSubscriber(rest[0], rest[1])
          okMsg("🪞 Mirror subscriber added (id: " + mid + ")")
          break

        case "housekeep":
          if (!rest[0] || !rest[1]) { errorMsg("❌ Usage: /housekeep <name> <maxKeys>"); return }
          var hid = chm.addHousekeepSubscriber(rest[0], parseInt(rest[1]))
          okMsg("🧹 Housekeep subscriber added (id: " + hid + ", max: " + rest[1] + ")")
          break

        case "buffer":
          if (!rest[0] || !rest[1] || !rest[2]) { errorMsg("❌ Usage: /buffer <src> <target> <idxs> [byNum] [byTime]"); return }
          var bid = chm.addBufferSubscriber(rest[0], rest[1], rest[2], rest[3] ? parseInt(rest[3]) : __, rest[4] ? parseInt(rest[4]) : __)
          okMsg("📦 Buffer subscriber added (id: " + bid + ")")
          break

        case "subscribe":
          if (!rest[0]) { errorMsg("❌ Usage: /subscribe <name>"); return }
          infoMsg("📡 Watching " + rest[0] + " - press Ctrl-C to stop...")
          var watchStop = false
          var watchId = chm.subscribe(rest[0], function(ch, op, key, val) {
            var isUnset  = op.indexOf("unset") >= 0
            var opColor  = isUnset ? "error" : "ok"
            var opIcon   = isUnset ? "🗑 " : "✏ "
            printBox("[" + new Date().toISOString() + "] " + opIcon + _pad(op, 8) + "  " + toSLON(key) + (isUnset ? "" : " -> " + toSLON(val)), isUnset ? C.error : C.ok, C.dim)
          }, true)
          if (typeof addOnOpenAFShutdown === "function") {
            addOnOpenAFShutdown(function() { try { chm.unsubscribe(rest[0], watchId) } catch(e) {} })
          }
          okMsg("✅ Subscribed (id: " + watchId + "). Detach: /unsubscribe " + rest[0] + " " + watchId)
          break

        case "unsubscribe":
          if (!rest[0] || !rest[1]) { errorMsg("❌ Usage: /unsubscribe <name> <subId>"); return }
          chm.unsubscribe(rest[0], rest[1])
          okMsg("✅ Unsubscribed")
          break

        case "sync":
          if (!rest[0] || !rest[1] || !rest[2]) { errorMsg("❌ Usage: /sync <src> <target> <idxs>"); return }
          chm.syncChannels(rest[2], rest[0], rest[1])
          okMsg("✅ Sync complete")
          break

        case "import":
          if (!rest[0] || !rest[1]) { errorMsg("❌ Usage: /import <name> <file>"); return }
          var n = chm.importFile(rest[0], rest[1])
          okMsg("📥 Imported " + n + " entries into " + rest[0])
          break

        case "export":
          if (!rest[0] || !rest[1]) { errorMsg("❌ Usage: /export <name> <file>"); return }
          var ne = chm.exportFile(rest[0], rest[1])
          okMsg("📤 Exported " + ne + " entries -> " + rest[1])
          break

        case "quit":
        case "exit":
          infoMsg("👋 Bye!")
          java.lang.System.exit(0)
          break

        default:
          errorMsg("❌ Unknown command: /" + cmd + " - use /help")
      }
    } catch(e) {
      errorMsg("❌ Error: " + e)
    }
  }

  // ─── Main loop ───────────────────────────────────────────────────────────────
  printBanner()

  // If a command was passed as argument, run it and optionally exit
  if (isString(args.cmd) && args.cmd.trim().length > 0) {
    dispatch(args.cmd.startsWith("/") ? args.cmd : "/" + args.cmd)
    if (!toBoolean(args.interactive)) java.lang.System.exit(0)
  }

  var slashCommands = Object.keys({channels:1,types:1,add:1,edit:1,info:1,def:1,delete:1,open:1,close:1,keys:1,get:1,set:1,unset:1,getall:1,size:1,clear:1,expose:1,unexpose:1,peer:1,unpeer:1,remote:1,mirror:1,housekeep:1,buffer:1,subscribe:1,unsubscribe:1,sync:1,import:1,export:1,help:1,quit:1,exit:1})

  // Tab completion
  if (isDef(consoleReader)) {
    try {
      consoleReader.addCompleter(new Packages.jline.console.completer.StringsCompleter(
        java.util.Arrays.asList.apply(null, slashCommands.map(function(c) { return "/" + c }))
      ))
    } catch(e) {}
  }

  while (true) {
    var defs    = chm.listDefs()
    var openN   = defs.filter(function(d) { return d.isOpen }).length
    var prompt  = col("prompt", " ⚡ ch-manager") + col("dim", " [" + defs.length + " defs · " + openN + " open]") + col("accent", " ➤ ")
    var input
    try {
      input = con.readLinePrompt(prompt)
    } catch(e) {
      input = readline(prompt)
    }
    if (input === null || input === undefined) break
    dispatch(input.trim())
  }

} catch(e) {
  printErr("CHManager error: " + e)
  if (e.stack) printErr(e.stack)
}
