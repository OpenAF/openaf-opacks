// Embedded by rebuild.yaml: no extra download is needed by index.json clients.
(function(cfg) {
  if (cfg.args.ui == "legacy") return false;
  if (typeof askConsole != "function" || typeof askKey != "function" ||
      typeof askChoose != "function" || typeof askChooseMultiple != "function" || typeof ask != "function") return false;
  ow.loadFormat();
  var fmt = ow.format.string;
  if (typeof fmt.ansiClip != "function" || typeof fmt.ansiPad != "function") return false;
  var ui;
  try {
    ui = askConsole();
    if (!ui.ansi || ["read", "size", "raw", "write", "close"].some(function(k) { return typeof ui[k] != "function"; })) {
      if (ui && typeof ui.close == "function") ui.close();
      return false;
    }
  } catch(e) {
    if (ui && typeof ui.close == "function") ui.close();
    return false;
  }
  var cancelled = {}, selectedJob, runArgs, entries = [], state = { version: 1, favorites: [], recent: [] };
  var stateFile = cfg.home + "/launcher-state.json", query = "", scope = "all", category = "", position = 0;
  var write = function(s) { ui.write(s); };
  // Help and filenames can contain control characters; never interpret them as terminal commands.
  var clean = function(s) { return String(s == null ? "" : s).replace(/\x1b\[[0-?]*[ -\/]*[@-~]/g, "").replace(/[\x00-\x1f\x7f-\x9f]/g, " "); };
  var color = function(style, s) { return ansiColor(style, clean(s)); };
  var themed = function(path, fallback) {
    var value = typeof __colorFormat == "undefined" ? {} : __colorFormat;
    path.split(".").forEach(function(k) { value = value && value[k]; });
    return typeof value == "string" ? value : fallback;
  };
  var accent = themed("askChoose", "BOLD,CYAN"), heading = themed("md.heads.h3", "BOLD"), muted = themed("md.line", "FAINT");
  var panel = function(text) {
    var width = Math.max(1, ui.size().width - 1);
    if (width >= 8 && typeof ow.format.withSideLine == "function" && typeof ow.format.withSideLineThemes == "function") {
      var themes = ow.format.withSideLineThemes();
      return ow.format.withSideLine(text, width, themed("md.note.line", "FAINT"), "RESET",
        themes[themed("md.note.theme", "simpleLine")] || themes.simpleLine);
    }
    return text;
  };
  var description = function(text) {
    // Preserve Markdown paragraphs, but strip terminal control sequences from remote help.
    var safe = String(text || "No description available.").replace(/\x1b\[[0-?]*[ -\/]*[@-~]/g, "")
      .replace(/[\x00-\x09\x0b-\x1f\x7f-\x9f]/g, " ");
    return typeof ow.format.withMD == "function" ? ow.format.withMD(safe, "ITALIC", Math.max(1, ui.size().width - 4)) : color("ITALIC", safe);
  };
  var helpOf = function(j) {
    if (j && j.help) return j.help;
    var jobs = j && j.jobs || [];
    for (var i = 0; i < jobs.length; i++) if (jobs[i].name == "Help") return jobs[i].help || {};
    return {};
  };
  var readJob = function(e) {
    if (e.source != "remote") return /\.ya?ml$/.test(e.file) ? io.readFileYAML(e.file) : io.readFileJSON(e.file);
    var job = $rest().get(e.id);
    // Explicit YAML URLs are served as text; JSON may already be decoded by $rest.
    if (typeof job == "string") job = /^\s*[\[{]/.test(job) ? jsonParse(job) : af.fromYAML(job);
    return job;
  };
  var save = function() {
    try { io.writeFileJSON(stateFile, state); }
    catch(e) { write("Could not save favorites/recent jobs: " + clean(e)); }
  };
  var choose = function(prompt, values) {
    var n = askChoose(prompt, values, Math.max(1, Math.min(8, ui.size().height - 5)), undefined, ui);
    if (typeof n != "number") throw cancelled;
    return n;
  };
  var favorite = function(id) {
    var n = state.favorites.indexOf(id);
    if (n < 0) state.favorites.push(id); else state.favorites.splice(n, 1);
    save();
  };
  var matching = function() {
    var words = query.toLowerCase().trim().split(/\s+/).filter(function(s) { return s.length; });
    var rows = entries.filter(function(e) {
      if (e.unavailable && scope != "favorites" && scope != "recent") return false;
      if (scope == "favorites" && state.favorites.indexOf(e.id) < 0) return false;
      if (scope == "recent" && state.recent.indexOf(e.id) < 0) return false;
      if (scope == "category" && e.category != category) return false;
      var text = (e.path + " " + e.description).toLowerCase();
      return words.every(function(w) { return text.indexOf(w) >= 0; });
    });
    var rank = function(e) {
      var p = e.path.toLowerCase(), q = query.toLowerCase().trim();
      return !q || p.indexOf(q) == 0 ? 0 : (words.every(function(w) { return p.indexOf(w) >= 0; }) ? 1 : 2);
    };
    rows.sort(function(a, b) {
      if (scope == "recent" && !query) return state.recent.indexOf(a.id) - state.recent.indexOf(b.id);
      return rank(a) - rank(b) || (a.path < b.path ? -1 : a.path > b.path ? 1 : a.id < b.id ? -1 : 1);
    });
    return rows;
  };
  // Redraw only this inline block; the rest of terminal scrollback is retained.
  var browse = function() {
    var drawn = 0, lastSize = "";
    var erase = function() {
      if (drawn) ui.write("\x1b[" + drawn + "A\r\x1b[J", false);
      drawn = 0;
    };
    return ui.raw(function() {
      try {
        while (true) {
          var size = ui.size(), width = Math.max(1, size.width - 1), height = Math.max(1, Math.min(10, size.height - 5));
          var rows = matching();
          position = Math.max(0, Math.min(position, rows.length - 1));
          var start = Math.max(0, position - height + 1);
          erase();
          var lines = [color(heading, cfg.name) + "  " + color(muted, scope == "category" ? category : scope),
            color(muted, "Search: ") + color("BOLD", query) + color(muted, "  (" + rows.length + " results)")];
          rows.slice(start, start + height).forEach(function(e, i) {
            var selected = start + i == position;
            var path = (selected ? "> " : "  ") + (state.favorites.indexOf(e.id) >= 0 ? "* " : "  ") + e.path;
            var label = (selected ? color(accent, path) : clean(path)) + color(muted, " [" + e.source + "]");
            if (width >= 65) label = fmt.ansiPad(fmt.ansiClip(label, Math.floor(width * 0.5)), Math.floor(width * 0.5)) + " " + color("FAINT,ITALIC", e.description);
            lines.push(label);
          });
          if (!rows.length) lines.push(color("FAINT,ITALIC", "No matching jobs. Change the search or press Tab."));
          lines.push(color(muted, "Type to search | arrows/PgUp/PgDn | Enter review | Tab views | Esc back | Ctrl-C exit"));
          lines.forEach(function(l) { write(fmt.ansiClip(l, width)); });
          drawn = lines.length;
          lastSize = size.width + ":" + size.height;
          var key = askKey(ui, 150);
          if (key === undefined) {
            var nextSize = ui.size();
            // Polling also detects a terminal resize without consuming process stdin.
            while (nextSize.width + ":" + nextSize.height == lastSize && key === undefined) {
              key = askKey(ui, 150); nextSize = ui.size();
            }
            if (key === undefined) continue;
          }
          if (key == "ctrl-c" || key == "eof") throw cancelled;
          if (key == "esc") {
            if (query) { query = ""; position = 0; }
            else if (scope != "all") { scope = "all"; position = 0; }
            else throw cancelled;
          } else if (key == "tab") { erase(); return { navigation: true }; }
          else if (key == "enter" && rows.length) { erase(); return rows[position]; }
          else if (key == "up") position--;
          else if (key == "down") position++;
          else if (key == "pgup") position -= height;
          else if (key == "pgdn") position += height;
          else if (key == "home") position = 0;
          else if (key == "end") position = rows.length - 1;
          else if (key == "backspace") { query = query.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]$|[\s\S]$/, ""); position = 0; }
          else if (key && (key.length == 1 || /^[\uD800-\uDBFF][\uDC00-\uDFFF]$/.test(key))) { query += key; position = 0; }
        }
      } finally { erase(); }
    });
  };
  var collect = function(help, values) {
    (help.expects || []).forEach(function(p) {
      if (!p.name) return;
      write(color("ITALIC", p.desc || p.name));
      while (true) {
        var value, prompt = clean(p.name) + (p.mandatory ? " (*)" : "") + ": ";
        if (p.options && !p.secret) {
          var labels = p.options.map(clean), offset = 0, hasCurrent = Object.prototype.hasOwnProperty.call(values, p.name);
          if (!p.mandatory) { labels.unshift("Omit argument"); offset++; }
          if (hasCurrent) { labels.unshift("Keep current: " + clean(values[p.name])); offset++; }
          var choice = choose(prompt, labels);
          if (hasCurrent && choice == 0) value = values[p.name];
          else if (!p.mandatory && choice == (hasCurrent ? 1 : 0)) value = undefined;
          else value = p.options[choice - offset];
        }
        else if (p.moptions && !p.secret) {
          // askChooseMultiple returns values: use numeric identities to avoid clipped/duplicate label ambiguity.
          var ids = p.moptions.map(function(v, i) { return String(i + 1); });
          p.moptions.forEach(function(v, i) { write((i + 1) + ". " + clean(v)); });
          var picked = askChooseMultiple(prompt, ids, 8, undefined, ui);
          if (!picked) throw cancelled;
          value = picked.map(function(id) { return p.moptions[Number(id) - 1]; }).join(",");
        } else {
          if (Object.prototype.hasOwnProperty.call(values, p.name)) write(color("FAINT", "Current: ") + (p.secret ? "***" : clean(values[p.name])) + color("FAINT,ITALIC", " (blank keeps it)"));
          value = ask(prompt, p.secret ? String.fromCharCode(0) : undefined, ui.console, false, ui.write);
          if (value == null) throw cancelled;
          if (String(value).length == 0 && Object.prototype.hasOwnProperty.call(values, p.name)) value = values[p.name];
        }
        if (p.mandatory && (value == null || String(value).length == 0)) { write(color("YELLOW", "A value is required.")); continue; }
        if (value != null && String(value).length) values[p.name] = value; else delete values[p.name];
        break;
      }
    });
    return values;
  };
  var additionalArguments = function(values) {
    write("Enter one name=value at a time; values are literal (no shell quotes). Blank finishes.");
    while (true) {
      var input = ask("Additional argument: ", undefined, ui.console, false, ui.write);
      if (input == null) throw cancelled;
      input = String(input);
      if (!input.trim().length) return;
      var equals = input.indexOf("="), name = input.substring(0, equals).trim();
      if (equals < 1 || !name.length || /[\s\x00-\x1f\x7f]/.test(name)) {
        write("Use name=value, for example __format=json.");
        continue;
      }
      Object.defineProperty(values, name, { value: input.substring(equals + 1),
        writable: true, enumerable: true, configurable: true });
    }
  };
  var preview = function(e, help, values) {
    var secret = {};
    (help.expects || []).forEach(function(p) { if (p.secret) secret[p.name] = true; });
    var windows = ow.format.isWindows();
    // PowerShell on Windows; POSIX shell elsewhere. Never execute this display string.
    var quote = function(s) {
      s = clean(s);
      if (/^[a-zA-Z0-9_@%+=:,./-]+$/.test(s)) return s;
      return '"' + s.replace(windows ? /[`$"\\]/g : /[\\"$`]/g, function(c) {
        // Backslashes are literal in PowerShell, including before a closing quote.
        return windows && c == "\\" ? c : (windows ? "`" : "\\") + c;
      }) + '"';
    };
    var parts = ["ojob", quote(e.source == "remote" ? e.id : e.file)], masked = false;
    Object.keys(values).forEach(function(k) {
      var value = secret[k] ? "***" : values[k];
      if (secret[k]) masked = true;
      parts.push(quote(k) + "=" + quote(value));
    });
    var title = color(heading, "Run command") + color(muted, " (" + (windows ? "PowerShell" : "POSIX shell") + (masked ? "; secrets masked" : "") + ")");
    var command = parts.join(" ");
    // Do not insert panel prefixes into a long command: leave terminal soft wrapping copyable.
    if (typeof visibleLength == "function" && visibleLength(command) <= ui.size().width - 4) {
      write(panel(title + "\n" + color(accent, command)));
    } else {
      write(panel(title));
      write(color(accent, command));
    }
  };
  try {
    if (io.fileExists(stateFile)) {
      try {
        var loaded = io.readFileJSON(stateFile);
        if (loaded.version != 1 || !Array.isArray(loaded.favorites) || !Array.isArray(loaded.recent)) throw "Unsupported state format";
        state.favorites = loaded.favorites.filter(function(s) { return typeof s == "string"; });
        state.recent = loaded.recent.filter(function(s) { return typeof s == "string"; }).slice(0, 20);
      } catch(e) { write("Could not read saved favorites/recent jobs; starting empty."); }
    }
    var catalog = cfg.catalog || [], seen = {};
    cfg.ids.forEach(function(id) {
      if (seen[id]) return;
      seen[id] = true;
      var source = id.indexOf("_local/") == 0 ? "local" : id.indexOf("_global/") == 0 ? "global" : "remote";
      var path = source == "remote" ? id.replace(new RegExp("^https?://[^/]+/"), "") : id;
      path = path.replace(/\.(ya?ml|json)$/, "");
      var entry = { id: id, path: path, source: source, description: "", category: path.indexOf("/") >= 0 ? path.slice(0, path.lastIndexOf("/")) : "(root)" };
      if (source != "remote") entry.file = source == "local" ? cfg.home + id.replace(/^_local\//, "/ojobs/") : cfg.globalPath.replace(/\/$/, "") + id.replace(/^_global\//, "/");
      if (source == "remote") {
        for (var i = 0; i < catalog.length; i++) if (catalog[i].id == id) { entry.description = clean(catalog[i].description); break; }
      } else {
        try { entry.description = clean(helpOf(readJob(entry)).text); }
        catch(e) { write("Could not read " + clean(path) + ": " + clean(e)); }
      }
      entries.push(entry);
    });
    state.favorites.concat(state.recent).forEach(function(id) {
      if (!seen[id]) { seen[id] = true; entries.push({ id: id, path: id, description: "Unavailable saved job", category: "(unavailable)", unavailable: true }); }
    });
    while (!selectedJob) {
      var entry = browse();
      if (entry.navigation) {
        {
          var view = choose("View", ["All jobs", "Categories", "Favorites", "Recent jobs", "Back"]);
          if (view == 4) continue;
          if (view == 1) {
            var categories = [];
            entries.forEach(function(e) { if (!e.unavailable && categories.indexOf(e.category) < 0) categories.push(e.category); });
            categories.sort();
            if (!categories.length) { write("No categories available."); continue; }
            var categoryChoice = choose("Category", categories.concat(["Back"]));
            if (categoryChoice == categories.length) continue;
            category = categories[categoryChoice];
          }
          scope = ["all", "category", "favorites", "recent"][view]; query = ""; position = 0;
        }
        continue;
      }
      if (entry.unavailable) {
        write(clean(entry.path) + " is unavailable.");
        var remove = choose("Saved job", ["Remove from saved jobs", "Back"]);
        if (remove == 0) {
          state.favorites = state.favorites.filter(function(id) { return id != entry.id; });
          state.recent = state.recent.filter(function(id) { return id != entry.id; });
          entries = entries.filter(function(e) { return e.id != entry.id; }); save();
        }
        continue;
      }
      var job, help;
      try {
        write(color("FAINT,ITALIC", "Loading " + entry.path + "..."));
        job = readJob(entry);
        if (!job || typeof job != "object" || (!job.jobs && !job.todo)) throw "Not an oJob document";
        help = helpOf(job);
        if (help.expects != null && !Array.isArray(help.expects)) throw "Invalid argument definitions";
      } catch(e) { write("Could not load job: " + clean(e)); continue; }
      var reviewing = true, values = {};
      // oJob adds execution metadata and processExpr exposes the launcher URL as a key.
      // Preserve user options (including __format), rather than dropping all __ names.
      Object.keys(cfg.args).forEach(function(k) {
        if (["ui", "init", "objId", "__id", "execid", ""].indexOf(k) < 0 &&
            !/^https?:\/\//i.test(k) && k != cfg.entrypoint) values[k] = cfg.args[k];
      });
      while (reviewing && !selectedJob) {
        write(panel(color(heading, entry.path) + color(muted, " [" + entry.source + "]") + "\n" + description(help.text)));
        var parameters = (help.expects || []).map(function(p) {
          return { Parameter: clean(p.name) + (p.mandatory ? " (*)" : ""), Description: clean(p.desc) };
        });
        if (parameters.length) write(ow.oJob.output(parameters, {
          __format: "btable", __width: Math.max(1, ui.size().width - 1)
        }, undefined, true));
        var action = choose("Job", ["Configure and run", state.favorites.indexOf(entry.id) < 0 ? "Favorite" : "Unfavorite", "Back"]);
        if (action == 2) { reviewing = false; continue; }
        if (action == 1) { favorite(entry.id); continue; }
        try {
          var configuring = true, editArguments = true;
          while (configuring) {
            if (editArguments) collect(help, values);
            editArguments = false;
            preview(entry, help, values);
            var confirm = choose("Execution", ["Run", "Edit arguments", "Back", "Cancel", "Additional arguments"]);
            if (confirm == 0) { selectedJob = job; runArgs = values; state.recent = [entry.id].concat(state.recent.filter(function(id) { return id != entry.id; })).slice(0, 20); save(); configuring = false; }
            else if (confirm == 1) editArguments = true;
            else if (confirm == 4) additionalArguments(values);
            else if (confirm == 2) configuring = false;
            else if (confirm == 3) throw cancelled;
          }
        } catch(e) {
          if (e === cancelled) throw e;
          write("Could not configure job: " + clean(e));
        }
      }
    }
  } catch(e) {
    if (e !== cancelled) write("Launcher error: " + clean(e));
  } finally { ui.close(); }
  if (selectedJob) {
    var result = oJobRun(selectedJob, runArgs, now());
    if (isDef(result)) ow.oJob.output(result, runArgs);
  }
  return true;
})
