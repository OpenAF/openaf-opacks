// Render the same paged values returned by the API. Insert HTML after Markdown
// conversion so record contents never pass through the Markdown interpreter.
function esc(v) {
  return String(v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]))
}

function prefix(opts) {
  return String((global.__ojobHttpUriPrefix || {})[opts.port] || "").replace(/\/$/, "")
}

function treeAssets(opts) {
  var base = esc(prefix(opts))
  return '<link rel="stylesheet" href="' + base + '/css/nJSMap.css"><script src="' + base + '/js/openafsigil.js"></script>' +
    '<script src="' + base + '/js/njsmap.js"></script>'
}

function inspectorAssets(opts) {
  return treeAssets(opts) + `<script>
    if (window.customElements && !customElements.get("dynamo-json-tree")) {
      customElements.define("dynamo-json-tree", class extends HTMLElement {
        connectedCallback() {
          var pre = this.querySelector("pre")
          if (!pre || pre.hidden || typeof nJSMap === "undefined" || typeof nJSMap.mount !== "function") return
          var tree = document.createElement("div")
          try {
            this.appendChild(tree)
            nJSMap.mount(tree, JSON.parse(pre.textContent), { collapseAll: this.dataset.jsonTree === "collapsed" })
            pre.hidden = true
          } catch (e) { tree.remove() }
        }
      })
    }
    </script>`
}

function page(title, content, opts, trees) {
  var shell = ow.template.parseMD2HTML('<div id="dynamo-browser"></div>', true, __, __, __, prefix(opts))
  return String(shell).replace('<div id="dynamo-browser"></div>', () =>
    '<main id="dynamo-browser"><h1>' + esc(title) + '</h1>' + content + '</main>' + (trees ? inspectorAssets(opts) : ""))
}

function tree(value, collapsed) {
  return '<dynamo-json-tree data-json-tree="' + (collapsed ? 'collapsed' : 'expanded') + '"><pre>' +
    esc(JSON.stringify(value, null, 2)) + '</pre></dynamo-json-tree>'
}

function cell(value, format) {
  if (typeof value == "undefined") return ""
  if (!isMap(value) && !isArray(value)) return esc(value)
  var json = JSON.stringify(value), slon = af.toSLON(value), yaml = af.toYAML(value).trimEnd()
  var text = format == "slon" ? slon : format == "yaml" ? yaml : json
  return '<dynamo-value data-json="' + esc(json) + '" data-slon="' + esc(slon) + '" data-yaml="' + esc(yaml) +
    '"><code>' + esc(text) + '</code></dynamo-value>'
}

function columnAssets(opts) {
  return treeAssets(opts) + `<style>
    .dynamo-heading { display:flex; align-items:center; gap:.25em }
    dynamo-column-tools { display:inline-flex; align-items:center; margin-inline-start:auto }
    .dynamo-heading .sorter-container { float:none; white-space:nowrap; margin:0 }
    dynamo-column-tools button { display:inline-grid; place-items:center; width:1.5rem; height:1.5rem; padding:0;
      color:var(--browse-fg,currentColor); border:0; border-radius:3px; background:transparent; cursor:pointer }
    dynamo-column-tools button:hover, dynamo-column-tools button:focus-visible { color:var(--browse-hover,currentColor); background:var(--browse-soft,rgba(127,127,127,.12)) }
    dynamo-column-tools [aria-expanded="true"] svg { transform:rotate(180deg) }
    dynamo-value > code { white-space:pre-wrap; overflow-wrap:anywhere }
    dynamo-value { display:flex; align-items:flex-start; gap:.25em }
    dynamo-value > div { flex:1; min-width:0 }
    dynamo-value[data-folded] { color:var(--browse-fg,currentColor) }
    dynamo-value .dynamo-cell-toggle { flex:none; display:inline-grid; place-items:center; width:1.25rem; height:1.25rem; padding:0;
      color:var(--browse-fg,currentColor); border:0; border-radius:3px; background:transparent; cursor:pointer }
    dynamo-value .dynamo-cell-toggle:hover, dynamo-value .dynamo-cell-toggle:focus-visible { color:var(--browse-hover,currentColor); background:var(--browse-soft,rgba(127,127,127,.12)) }
    dynamo-value [aria-expanded="true"] svg { transform:rotate(180deg) }
  </style><script>
    if (window.customElements && !customElements.get("dynamo-column-tools")) {
      const modes = ["njsmap", "slon", "yaml", "json"]
      const names = {njsmap:"Rendered tree", slon:"Inline SLON", yaml:"YAML", json:"Inline JSON"}
      const paths = {
        njsmap:"M3 2v10h4M3 6h4M9 4h4v4H9zM9 10h4v4H9z",
        slon:"M5 3c-3 2-3 8 0 10m6-10c3 2 3 8 0 10M7 6h2m-2 4h2",
        yaml:"M2 4h2m2 0h7M4 8h2m2 0h5M6 12h2m2 0h3",
        json:"M6 2H5c-2 0 0 6-3 6 3 0 1 6 3 6h1m4-12h1c2 0 0 6 3 6-3 0-1 6-3 6h-1",
        fold:"m4.5 4 3.5 3 3.5-3m-7 5 3.5 3 3.5-3"
      }
      function icon(button, kind, label) {
        button.title = label
        button.setAttribute("aria-label", label)
        button.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + paths[kind] + '"/></svg>'
      }
      customElements.define("dynamo-column-tools", class extends HTMLElement {
        connectedCallback() {
          // sortTab can append its controls on DOMContentLoaded. Wait for it and
          // for the rows of a newly inserted live-search fragment to be attached.
          const ready = () => requestAnimationFrame(() => { if (this.isConnected && !this.childElementCount) this.setup() })
          if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready, {once:true})
          else ready()
        }
        setup() {
          const header = this.closest("th"), index = header.cellIndex, field = this.dataset.field
          const cells = Array.from(header.closest("table").tBodies[0].rows, row => row.cells[index]?.firstElementChild)
            .filter(cell => cell?.localName === "dynamo-value")
          const heading = this.parentElement
          const sorter = header.querySelector(".sorter-container")
          if (sorter) heading.append(sorter)
          const modeButton = document.createElement("button"), foldButton = document.createElement("button")
          modeButton.type = foldButton.type = "button"
          this.append(modeButton, foldButton)
          // Remember the choice per table column in this browser. An explicit
          // format in the URL takes precedence over the remembered mode.
          const key = JSON.stringify(["dynamo-column", location.pathname, field])
          let mode = this.dataset.format, folded = true
          try {
            const saved = JSON.parse(localStorage.getItem(key))
            if (saved && modes.includes(saved.mode) && this.dataset.explicit !== "true") mode = saved.mode
            if (saved && typeof saved.folded === "boolean") folded = saved.folded
          } catch (e) {}
          const states = new Map(cells.map(cell => [cell, folded]))
          const render = cell => {
            const cellFolded = states.get(cell)
            const toggle = document.createElement("button")
            toggle.type = "button"
            toggle.className = "dynamo-cell-toggle"
            icon(toggle, "fold", cellFolded ? "Expand cell" : "Collapse cell")
            toggle.setAttribute("aria-expanded", String(!cellFolded))
            toggle.onclick = () => { states.set(cell, !states.get(cell)); render(cell) }
            cell.toggleAttribute("data-folded", cellFolded)
            if (cellFolded) {
              const summary = document.createElement("code")
              summary.textContent = cell.dataset.json.startsWith("[") ? "[…]" : "{…}"
              cell.replaceChildren(toggle, summary)
              return
            }
            if (mode === "njsmap" && typeof window.nJSMap?.mount === "function") {
              const host = document.createElement("div")
              try {
                nJSMap.mount(host, JSON.parse(cell.dataset.json), {collapseAll:true})
                cell.replaceChildren(toggle, host)
                return
              } catch (e) { /* Show the inline JSON fallback. */ }
            }
            const code = document.createElement("code")
            code.textContent = cell.dataset[mode === "njsmap" ? "json" : mode]
            cell.replaceChildren(toggle, code)
          }
          const update = () => {
            const next = modes[(modes.indexOf(mode) + 1) % modes.length]
            icon(modeButton, mode, field + " · " + names[mode] + " · Switch to " + names[next])
            icon(foldButton, "fold", (folded ? "Expand" : "Collapse") + " all cells in " + field)
            foldButton.setAttribute("aria-expanded", String(!folded))
            cells.forEach(render)
          }
          const save = () => {
            try { localStorage.setItem(key, JSON.stringify({mode, folded})) } catch (e) {}
            update()
          }
          modeButton.onclick = () => { mode = modes[(modes.indexOf(mode) + 1) % modes.length]; save() }
          foldButton.onclick = () => { folded = !folded; cells.forEach(cell => states.set(cell, folded)); save() }
          update()
        }
      })
    }
    </script>`
}

function hidden(params, keys) {
  return keys.filter(key => isDef(params[key]) && params[key] !== "").map(key =>
    '<input type="hidden" name="' + key + '" value="' + esc(params[key]) + '">').join("")
}

function selector(label, name, choices, active, keep) {
  return '<form method="get">' + keep + '<label>' + label + ' <select name="' + name + '">' +
    choices.map(choice => '<option value="' + esc(choice) + '"' + (choice == active ? ' selected' : '') + '>' +
      esc(choice || "All records") + '</option>').join("") + '</select></label> <button>Apply</button></form>'
}

// oJobBrowse owns the search form, keyboard shortcuts, fragment protocol,
// paging, sort controls and operations. Only the record cells and table-specific
// controls need different markup from its directory/file listing.
exports.list = function(render, result, server, request, opts, table) {
  var p = request.params || {}, query = opts.query || {}, format = p.format || (table && table.complexFormat) || "njsmap"
  var layout = Object.assign({}, result, { alignFields: result.fields.map(() => "left") })
  var caption = "", rows = ""
  if (table) {
    if (Object.keys(table.filters || {}).length) caption += selector("Filter", "preset", [""].concat(Object.keys(table.filters)),
      p.preset || "", hidden(p, ["format", "q", "wildcards", "recursive", "size", "pageSize"]))
    if (result.error) caption += '<p role="alert">' + esc(result.error) + '</p>'
    else {
      var notice = result.searchInfo.truncated ? "Partial inventory. Results and aggregates cover only the loaded records." : ""
      if (notice && !(query.enabled && p.q)) caption += '<p role="status">' + notice + '</p>'
      layout.searchInfo = notice || !result.list.length ? Object.assign({}, result.searchInfo, { message: notice || "No matches." }) : undefined
    }
    var root = esc(prefix(opts) + opts.parentURI.replace(/\/$/, "") + "/" + table.name + "/")
    var complex = new Set()
    rows = result.list.map(row => '<tr><td>' + (row.item ? '<a href="' + root + row.item + '">Inspect</a>' : '') + '</td>' +
      layout.fields.map((field, index) => {
        var value = row.values[field]
        if (isMap(value) || isArray(value)) complex.add(index)
        return '<td>' + cell(value, format) + '</td>'
      }).join("") + '</tr>').join("")
    // Keep record text out of Markdown and file URLs. Let the renderer create
    // its regular header, navigation row and options button, then append cells.
    layout.list = []
    layout.defaultPresent = false
    if (!layout.fields.length) { layout.fields = [""]; layout.alignFields = ["left"] }
    if (!query.enabled && !(opts.sortTab && layout.sortInfo)) layout.fields = layout.fields.map(global.__ojobHttpEscapeText)
  }

  var reply = render(layout, server, request, opts)
  if (isMap(reply) && (reply.status != 200 || !isString(reply.data))) return reply
  var html = String(isMap(reply) ? reply.data : reply)
  if (!html) return reply
  // The shared Markdown shell can use the process-wide asset prefix even
  // when this HTTP server has its own mount prefix.
  var mount = prefix(opts)
  if (mount && !isMap(reply)) html = html.replace(/(<(?:script|link)\b[^<>]*?\s(?:src|href)=")(\/(?:js|css|fonts)\/[^"]*)"/gi,
    (all, attr, url) => url.startsWith(mount + "/") ? all : attr + esc(mount) + url + '"')
  var searchState = hidden(p, ["preset", "format"])
  html = html.replace(/<form\b[^>]*\bid="browse-search-form"[^>]*>/, form => form + searchState)
  if (table) {
    var listingTable = opts.old === true ? /(<table>)([\s\S]*?)<\/table>/ : /(<table\b[^>]*\bid="browse-listing"[^>]*>)([\s\S]*?)<\/table>/
    html = html.replace(listingTable, (all, start, body) => {
      var contents = body.includes("</tbody>") ? body.replace("</tbody>", () => rows + "</tbody>") : body + "<tbody>" + rows + "</tbody>"
      var column = -1 // The first header contains the shared table options.
      contents = contents.replace(/<th\b([^>]*)>([\s\S]*?)<\/th>/g, (header, attrs, label) => {
        var index = column++
        if (!complex.has(index)) return header
        return '<th' + attrs + '><span class="dynamo-heading"><span>' + label + '</span><dynamo-column-tools data-field="' +
          esc(result.fields[index]) + '" data-format="' + esc(format) + '"' + (p.format ? ' data-explicit="true"' : '') + '></dynamo-column-tools></span></th>'
      })
      return start + (caption ? "<caption>" + caption + "</caption>" : "") + contents + "</table>" + (isMap(reply) ? "" : columnAssets(opts))
    })
  }
  if (result.error) return { data: html, status: 422, mimetype: "text/html; charset=utf-8", header: {} }
  return isMap(reply) ? Object.assign({}, reply, { data: html }) : html
}

exports.item = function(obj, server, request, opts) {
  var p = request.params || {}, headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" }
  if (p.raw == "true") return { data: JSON.stringify(obj.data, null, 2), mimetype: "application/json",
    status: 200, header: Object.assign({ "Content-Disposition": 'attachment; filename="item.json"' }, headers) }
  var table = global.__ojobHttpRelativePath(request.uri, opts.parentURI).split("/")[0]
  var back = esc(prefix(opts) + opts.parentURI.replace(/\/$/, "") + "/" + table + "/")
  var raw = p.action == "preview" ? "?action=preview&amp;browseUri=" + encodeURIComponent(opts.parentURI) +
    "&amp;path=" + encodeURIComponent(p.path) + "&amp;raw=true" : "?raw=true"
  var content = '<nav><a href="' + back + '">' + esc(table) + '</a> · <a href="' + raw +
    '" download="item.json">Download JSON</a></nav>' + tree(obj.data, false)
  return { data: page("Item", content, opts, true), status: 200, mimetype: "text/html; charset=utf-8", header: headers }
}
