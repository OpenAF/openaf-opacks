(function() {
"use strict";

var state = {
  buffer   : [],      // [{ts,pod,container,text,isError}], ring-buffer (oldest evicted first)
  maxBuffer: 5000,
  order    : "asc",   // "asc" = oldest first, "desc" = newest first
  filter   : "",
  namespace: "",
  uuid     : null,
  es       : null,
  pods     : []
};

var $ = function(id) { return document.getElementById(id); };

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", function() {
  $("startBtn").addEventListener("click", startSession);
  $("stopBtn").addEventListener("click", stopSession);
  $("namespace").addEventListener("change", function() {
    state.namespace = this.value;
    if (state.namespace) loadPods(state.namespace);
  });
  $("selectAllBtn").addEventListener("click", function() { setAllTargets(true); });
  $("selectNoneBtn").addEventListener("click", function() { setAllTargets(false); });
  $("orderBtn").addEventListener("click", toggleOrder);
  $("clearBtn").addEventListener("click", clearBuffer);
  $("exportBtn").addEventListener("click", exportLog);
  $("search").addEventListener("input", debounce(function() {
    state.filter = $("search").value || "";
    render();
  }, 150));

  loadConfig();
  loadTransforms();
  loadNamespaces();
});

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------
function loadConfig() {
  fetch("/api/config").then(function(r) { return r.json(); }).then(function(cfg) {
    if (cfg.tailLines) $("tailLines").value = cfg.tailLines;
    if (cfg.namespace) state.namespace = cfg.namespace;
  }).catch(function() {});
}

function loadTransforms() {
  fetch("/api/transforms").then(function(r) { return r.json(); }).then(function(data) {
    var sel = $("transform");
    sel.innerHTML = "";
    (data.transforms || ["none"]).forEach(function(name) {
      var opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      sel.appendChild(opt);
    });
  }).catch(function() {});
}

function loadNamespaces() {
  fetch("/api/namespaces").then(function(r) { return r.json(); }).then(function(data) {
    var sel = $("namespace");
    sel.innerHTML = "";
    var namespaces = data.namespaces || [];
    if (namespaces.length === 0) {
      sel.innerHTML = "<option value=''>(no namespaces found)</option>";
      return;
    }
    namespaces.forEach(function(ns) {
      var opt = document.createElement("option");
      opt.value = ns;
      opt.textContent = ns;
      sel.appendChild(opt);
    });
    if (state.namespace && namespaces.indexOf(state.namespace) >= 0) {
      sel.value = state.namespace;
    } else {
      state.namespace = sel.value;
    }
    if (state.namespace) loadPods(state.namespace);
  }).catch(function(e) {
    $("namespace").innerHTML = "<option value=''>(error loading namespaces)</option>";
  });
}

function loadPods(namespace) {
  var panel = $("targets");
  panel.innerHTML = "<p class='hint'>Loading&hellip;</p>";
  fetch("/api/pods?namespace=" + encodeURIComponent(namespace)).then(function(r) { return r.json(); }).then(function(data) {
    state.pods = data.pods || [];
    renderTargets();
  }).catch(function() {
    panel.innerHTML = "<p class='hint'>Failed to load pods.</p>";
  });
}

function renderTargets() {
  var panel = $("targets");
  panel.innerHTML = "";
  if (state.pods.length === 0) {
    panel.innerHTML = "<p class='hint'>No pods in this namespace.</p>";
    return;
  }
  state.pods.forEach(function(pod) {
    var podEl = document.createElement("div");
    podEl.className = "pod";

    var podHead = document.createElement("div");
    podHead.className = "pod-head";
    podHead.innerHTML = "<span class='pod-name'>" + escapeHtml(pod.name) + "</span>" +
      "<span class='pod-phase phase-" + escapeHtml((pod.phase || "").toLowerCase()) + "'>" + escapeHtml(pod.phase || "") + "</span>";
    podEl.appendChild(podHead);

    (pod.containers || []).forEach(function(c) {
      var row = document.createElement("label");
      row.className = "container-row";

      var cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = true;
      cb.dataset.pod = pod.name;
      cb.dataset.container = c.name;
      cb.addEventListener("change", onTargetToggle);

      var label = document.createElement("span");
      label.textContent = c.name + (c.ready ? "" : " (not ready)") + (c.restartCount ? " ↻" + c.restartCount : "");
      label.style.color = colorFor(pod.name + "/" + c.name);

      var snapBtn = document.createElement("button");
      snapBtn.type = "button";
      snapBtn.className = "snap-btn";
      snapBtn.title = "Fetch current log for just this container (one-shot, doesn't affect live tracking)";
      snapBtn.textContent = "📄";
      snapBtn.addEventListener("click", function(ev) {
        ev.preventDefault();
        fetchOneShot(pod.name, c.name);
      });

      row.appendChild(cb);
      row.appendChild(label);
      row.appendChild(snapBtn);
      podEl.appendChild(row);
    });

    panel.appendChild(podEl);
  });
}

function setAllTargets(checked) {
  var boxes = document.querySelectorAll("#targets input[type=checkbox]");
  var changedAdd = [], changedRemove = [];
  boxes.forEach(function(cb) {
    if (cb.checked !== checked) {
      cb.checked = checked;
      (checked ? changedAdd : changedRemove).push({ pod: cb.dataset.pod, container: cb.dataset.container });
    }
  });
  if (state.uuid && (changedAdd.length || changedRemove.length)) {
    updateSession(changedAdd, changedRemove);
  }
}

function onTargetToggle(ev) {
  if (!state.uuid) return; // no running session -- selection just affects the next Start
  var t = { pod: ev.target.dataset.pod, container: ev.target.dataset.container };
  if (ev.target.checked) updateSession([t], []);
  else updateSession([], [t]);
}

function getSelectedTargets() {
  var out = [];
  document.querySelectorAll("#targets input[type=checkbox]:checked").forEach(function(cb) {
    out.push({ pod: cb.dataset.pod, container: cb.dataset.container });
  });
  return out;
}

// ---------------------------------------------------------------------------
// Session lifecycle
// ---------------------------------------------------------------------------
function startSession() {
  if (!state.namespace) { setStatus("pick a namespace first"); return; }
  var targets = getSelectedTargets();
  if (targets.length === 0) { setStatus("select at least one container"); return; }

  setStatus("starting…");
  fetch("/api/session", {
    method : "POST",
    headers: { "Content-Type": "application/json" },
    body   : JSON.stringify({
      namespace: state.namespace,
      targets  : targets,
      transform: $("transform").value,
      tailLines: Number($("tailLines").value) || 200,
      order    : state.order
    })
  }).then(function(r) { return r.json(); }).then(function(data) {
    if (data.error) { setStatus("error: " + data.error); return; }
    state.uuid = data.uuid;
    openStream(state.uuid);
    $("startBtn").disabled = true;
    $("stopBtn").disabled = false;
  }).catch(function(e) { setStatus("failed to start: " + e); });
}

function openStream(uuid) {
  var es = new EventSource("/stream?uuid=" + encodeURIComponent(uuid));
  state.es = es;

  es.addEventListener("ready", function() { setStatus("live"); });
  es.addEventListener("line", function(ev) {
    try { appendLine(JSON.parse(ev.data)); } catch(e) {}
  });
  es.addEventListener("dropped", function(ev) {
    try {
      var d = JSON.parse(ev.data);
      setStatus("live (dropped " + d.count + " old lines, buffer full)");
    } catch(e) {}
  });
  es.addEventListener("watcherError", function(ev) {
    try {
      var d = JSON.parse(ev.data);
      appendLine({ ts: null, pod: d.pod, container: d.container, text: "[watcher error] " + d.message, isError: true });
    } catch(e) {}
  });
  es.addEventListener("error", function(ev) {
    setStatus("stream error");
  });
  es.onerror = function() {
    if (state.uuid) setStatus("disconnected");
  };
}

function stopSession() {
  if (!state.uuid) return;
  var uuid = state.uuid;
  state.uuid = null;
  if (state.es) { state.es.close(); state.es = null; }
  fetch("/api/session/stop?uuid=" + encodeURIComponent(uuid), { method: "POST" }).catch(function() {});
  $("startBtn").disabled = false;
  $("stopBtn").disabled = true;
  setStatus("stopped");
}

function updateSession(add, remove) {
  if (!state.uuid) return;
  fetch("/api/session/update?uuid=" + encodeURIComponent(state.uuid), {
    method : "POST",
    headers: { "Content-Type": "application/json" },
    body   : JSON.stringify({ add: add, remove: remove })
  }).catch(function() {});
}

function fetchOneShot(pod, container) {
  var url = "/api/log?namespace=" + encodeURIComponent(state.namespace) +
    "&pod=" + encodeURIComponent(pod) + "&container=" + encodeURIComponent(container) +
    "&tailLines=" + encodeURIComponent($("tailLines").value || 200) +
    "&order=" + encodeURIComponent(state.order);
  setStatus("fetching " + pod + "/" + container + "…");
  fetch(url).then(function(r) { return r.json(); }).then(function(data) {
    if (data.error) {
      appendLine({ ts: null, pod: pod, container: container, text: "[fetch error] " + data.error, isError: true });
    } else {
      (data.lines || []).forEach(appendLine);
    }
    setStatus(state.uuid ? "live" : "idle");
  }).catch(function(e) {
    setStatus("fetch failed: " + e);
  });
}

// ---------------------------------------------------------------------------
// Buffer / rendering
// ---------------------------------------------------------------------------
function appendLine(lineObj) {
  state.buffer.push(lineObj);
  if (state.buffer.length > state.maxBuffer) state.buffer.shift();

  if (!matchesFilter(lineObj, state.filter)) { updateCounts(); return; }

  var row = buildRow(lineObj);
  var log = $("log");
  var atBottom = (log.scrollTop + log.clientHeight) >= (log.scrollHeight - 24);

  if (state.order === "asc") log.appendChild(row);
  else log.insertBefore(row, log.firstChild);

  if (state.order === "asc" && atBottom) log.scrollTop = log.scrollHeight;
  updateCounts();
}

function render() {
  var log = $("log");
  log.innerHTML = "";
  var visible = applyFilterAndOrder(state.buffer, state.filter, state.order);
  var frag = document.createDocumentFragment();
  visible.forEach(function(l) { frag.appendChild(buildRow(l)); });
  log.appendChild(frag);
  if (state.order === "asc") log.scrollTop = log.scrollHeight;
  updateCounts();
}

function applyFilterAndOrder(buffer, filter, order) {
  var out = buffer.filter(function(l) { return matchesFilter(l, filter); });
  if (order === "desc") out = out.slice().reverse();
  return out;
}

function matchesFilter(lineObj, filter) {
  if (!filter) return true;
  var hay = (lineObj.pod || "") + "/" + (lineObj.container || "") + " " + (lineObj.text || "");
  return hay.toLowerCase().indexOf(filter.toLowerCase()) >= 0;
}

function buildRow(l) {
  var row = document.createElement("div");
  row.className = "line" + (l.isError ? " line-error" : "");

  var meta = document.createElement("span");
  meta.className = "line-meta";
  meta.style.color = colorFor((l.pod || "") + "/" + (l.container || ""));
  meta.textContent = (l.ts ? formatTs(l.ts) + " " : "") + (l.pod || "?") + "/" + (l.container || "?");

  var text = document.createElement("span");
  text.className = "line-text";
  text.textContent = l.text || "";

  row.appendChild(meta);
  row.appendChild(text);
  return row;
}

function formatTs(ts) {
  var d = new Date(ts);
  if (isNaN(d.getTime())) return ts;
  return d.toISOString().replace("T", " ").replace("Z", "");
}

function toggleOrder() {
  state.order = (state.order === "asc") ? "desc" : "asc";
  $("orderBtn").textContent = (state.order === "asc") ? "Oldest first" : "Newest first";
  render();
}

function clearBuffer() {
  state.buffer = [];
  render();
}

function updateCounts() {
  var visible = state.buffer.filter(function(l) { return matchesFilter(l, state.filter); }).length;
  $("counts").textContent = visible + " / " + state.buffer.length + " lines";
}

function setStatus(text) {
  $("status").textContent = text;
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------
function exportLog() {
  var visible = applyFilterAndOrder(state.buffer, state.filter, state.order);
  var text = visible.map(function(l) {
    return "[" + (l.ts || "") + "] " + (l.pod || "?") + "/" + (l.container || "?") + ": " + (l.text || "");
  }).join("\n");
  var blob = new Blob([text], { type: "text/plain" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = "kubelogs-" + (state.namespace || "ns") + "-" + Date.now() + ".txt";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------
var palette = ["#e6194b", "#3cb44b", "#4363d8", "#f58231", "#911eb4", "#46f0f0", "#f032e6", "#bcf60c", "#fabebe", "#008080", "#e6beff", "#9a6324"];
var colorCache = {};
function colorFor(key) {
  if (colorCache[key]) return colorCache[key];
  var hash = 0;
  for (var i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  var color = palette[hash % palette.length];
  colorCache[key] = color;
  return color;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function(c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
  });
}

function debounce(fn, wait) {
  var t;
  return function() {
    var args = arguments, ctx = this;
    clearTimeout(t);
    t = setTimeout(function() { fn.apply(ctx, args); }, wait);
  };
}

})();
