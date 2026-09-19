/** OpenTelemetry OTLP/HTTP JSON provider for OpenAF generic instrumentation. */
var OpenTelemetry = function(options) {
  if (!ow.loadInstrumentation) throw "OpenTelemetry requires OpenAF with ow.loadInstrumentation() (instrumentation API v1). Rebuild or upgrade OpenAF.";
  this.instrumentation = ow.loadInstrumentation();
  if (this.instrumentation.apiVersion !== 1) throw "Unsupported OpenAF instrumentation API version";
  var o = options || {}, env = function(k) { var v = java.lang.System.getenv(k); return v == null ? undefined : String(v); };
  var protocol = o.protocol || env("OTEL_EXPORTER_OTLP_PROTOCOL") || "http/json";
  if (protocol !== "http/json") throw "OpenTelemetry supports only http/json";
  this.options = Object.assign({ intervalMs: 5000, batchSize: 512, maxPending: 2048, timeoutMs: Number(env("OTEL_EXPORTER_OTLP_TIMEOUT")) || 5000, maxSeries: 2000 }, o);
  this.resource = {};
  (env("OTEL_RESOURCE_ATTRIBUTES") || "").split(",").forEach(function(p) { var n = p.indexOf("="); if (n > 0) this.resource[p.slice(0,n)] = decodeURIComponent(p.slice(n+1)); }, this);
  if (env("OTEL_SERVICE_NAME")) this.resource["service.name"] = env("OTEL_SERVICE_NAME");
  Object.assign(this.resource, o.resource || {});
  if (o.serviceName) this.resource["service.name"] = o.serviceName;
  var parseHeaders = function(v) { var h = {}; (v || "").split(",").forEach(function(p) { var n=p.indexOf("="); if(n>0) h[p.slice(0,n).trim()] = decodeURIComponent(p.slice(n+1)); }); return h; };
  this.signals = {};
  ["Span", "Metric", "Log"].forEach(function(s) {
    var kind = { Span: "traces", Metric: "metrics", Log: "logs" }[s], key = kind.toUpperCase(), specific = o[kind] || {};
    if ((specific.protocol || env("OTEL_EXPORTER_OTLP_"+key+"_PROTOCOL") || protocol) !== "http/json") throw "OpenTelemetry supports only http/json for " + kind;
    var base = o.endpoint || env("OTEL_EXPORTER_OTLP_ENDPOINT"), endpoint = specific.endpoint || (o.endpoint ? undefined : env("OTEL_EXPORTER_OTLP_"+key+"_ENDPOINT")) || (base ? base.replace(/\/$/, "") + "/v1/" + kind : undefined);
    if (!endpoint || !/^https?:\/\//.test(endpoint)) throw "Configure an HTTP(S) OTLP endpoint for " + kind;
    this.signals[s] = { endpoint: endpoint, headers: Object.assign({}, parseHeaders(env("OTEL_EXPORTER_OTLP_HEADERS")), parseHeaders(env("OTEL_EXPORTER_OTLP_"+key+"_HEADERS")), o.headers || {}, specific.headers || {}), timeoutMs: specific.timeoutMs || o.timeoutMs || Number(env("OTEL_EXPORTER_OTLP_"+key+"_TIMEOUT")) || this.options.timeoutMs };
  }, this);
  this._name = "opentelemetry:" + this.instrumentation._id();
  this._series = {}; this._seriesCount = 0; this._seriesDropped = 0;
  this._lock = new java.util.concurrent.locks.ReentrantLock();
  this._running = false;
};
(function(P) {
  function value(v) {
    if (typeof v === "string") return { stringValue: v };
    if (typeof v === "boolean") return { boolValue: v };
    if (typeof v === "number") return isFinite(v) ? { doubleValue: v } : { stringValue: String(v) };
    if (Array.isArray(v)) return { arrayValue: { values: v.map(value) } };
    if (v && typeof v === "object") return { kvlistValue: { values: attributes(v) } };
    return { stringValue: String(v) };
  }
  function attributes(a) { return Object.keys(a || {}).sort().filter(function(k) { return typeof a[k] !== "undefined"; }).map(function(k) { return { key: k, value: value(a[k]) }; }); }
  P._metric = function(r) {
    var self = this, ins = self.instrumentation;
    return ins._locked(self._lock, function() {
      var resource = Object.assign({ "service.name": "openaf" }, r.resource, self.resource), key = JSON.stringify([resource, r.scope, r.name, r.type, r.unit, attributes(r.attributes), r.bounds]);
      var s = self._series[key];
      if (!s) {
        if (self._seriesCount >= self.options.maxSeries) { self._seriesDropped++; return undefined; }
        s = self._series[key] = { start: r.timeUnixNano, value: 0, count: 0, sum: 0, buckets: (r.bounds || []).map(function() { return 0; }).concat([0]) }; self._seriesCount++;
      }
      if (r.type === "histogram") {
        s.count++; s.sum += r.value; if (r.value < 0) s.negative = true; var b = 0; while (b < r.bounds.length && r.value > r.bounds[b]) b++; s.buckets[b]++;
        s.min = typeof s.min === "undefined" ? r.value : Math.min(s.min, r.value); s.max = typeof s.max === "undefined" ? r.value : Math.max(s.max, r.value);
      } else if (r.type === "gauge" || r.type === "cumulative") {
        if (r.type === "cumulative" && r.value < s.value) s.start = r.timeUnixNano;
        s.value = r.value;
      } else s.value += r.value;
      var out = ins._copy(r); out.aggregate = ins._copy(s); out.seriesKey = key;
      return out;
    });
  };
  P.encode = function(signal, records) {
    var self = this, groups = {}, field = { Span: "resourceSpans", Log: "resourceLogs", Metric: "resourceMetrics" }[signal];
    if (signal === "Metric") { var latest = {}; records.forEach(function(r) { latest[r.seriesKey || r.id] = r; }); records = Object.keys(latest).map(function(k) { return latest[k]; }); }
    records.forEach(function(r) {
      var resource = Object.assign({ "service.name": "openaf" }, r.resource || {}, self.resource), key = JSON.stringify(attributes(resource)), scopeKey = JSON.stringify(r.scope || { name: "openaf" });
      if (!groups[key]) groups[key] = { resource: { attributes: attributes(resource) }, scopes: {} };
      var scopes = groups[key].scopes;
      if (!scopes[scopeKey]) scopes[scopeKey] = { scope: r.scope || { name: "openaf" }, items: [] };
      var item;
      if (signal === "Span") {
        item = { traceId: r.traceId, spanId: r.spanId, name: r.name, kind: { INTERNAL: 1, SERVER: 2, CLIENT: 3, PRODUCER: 4, CONSUMER: 5 }[r.kind] || 1, startTimeUnixNano: r.startTimeUnixNano, endTimeUnixNano: r.endTimeUnixNano, attributes: attributes(r.attributes), flags: r.sampled ? 1 : 0, status: { code: { UNSET: 0, OK: 1, ERROR: 2 }[(r.status || {}).code] || 0 }, events: (r.events || []).map(function(e) { return { name: e.name, timeUnixNano: e.timeUnixNano, attributes: attributes(e.attributes) }; }) };
        if (r.parentSpanId) item.parentSpanId = r.parentSpanId;
        if (r.traceState) item.traceState = r.traceState;
        if (r.status && r.status.message) item.status.message = r.status.message;
      } else if (signal === "Log") {
        item = { timeUnixNano: r.timeUnixNano, observedTimeUnixNano: r.timeUnixNano, severityText: r.severity, severityNumber: { TRACE: 1, DEBUG: 5, INFO: 9, WARN: 13, ERROR: 17, FATAL: 21 }[r.severity] || 0, body: value(r.body), attributes: attributes(r.attributes) };
        if (r.traceId) { item.traceId = r.traceId; item.spanId = r.spanId; item.flags = r.sampled ? 1 : 0; }
      } else {
        var a = r.aggregate, point = { attributes: attributes(r.attributes), startTimeUnixNano: a.start, timeUnixNano: r.timeUnixNano };
        item = { name: r.name, description: r.description || "", unit: r.unit || "" };
        if (r.type === "histogram") {
          Object.assign(point, { count: String(a.count), sum: a.sum, min: a.min, max: a.max, explicitBounds: r.bounds, bucketCounts: a.buckets.map(String) });
          if (a.negative) delete point.sum;
          item.histogram = { aggregationTemporality: 2, dataPoints: [point] };
        } else {
          point.asDouble = a.value;
          if (r.type === "gauge") item.gauge = { dataPoints: [point] };
          else item.sum = { aggregationTemporality: 2, isMonotonic: r.type !== "upDownCounter", dataPoints: [point] };
        }
      }
      if (signal === "Metric") {
        var dataType = item.histogram ? "histogram" : (item.sum ? "sum" : "gauge");
        var existing = scopes[scopeKey].items.filter(function(m) { return m.name === item.name && m.unit === item.unit && m[dataType]; })[0];
        if (existing) existing[dataType].dataPoints.push(item[dataType].dataPoints[0]);
        else scopes[scopeKey].items.push(item);
      } else scopes[scopeKey].items.push(item);
    });
    var result = {}; result[field] = Object.keys(groups).map(function(k) {
      var g = groups[k], out = { resource: g.resource }, scopeField = { Span: "scopeSpans", Metric: "scopeMetrics", Log: "scopeLogs" }[signal], itemField = { Span: "spans", Metric: "metrics", Log: "logRecords" }[signal];
      out[scopeField] = Object.keys(g.scopes).map(function(s) { var v = { scope: g.scopes[s].scope }; v[itemField] = g.scopes[s].items; return v; }); return out;
    }); return result;
  };
  P._send = function(signal, records, remaining) {
    var config = this.signals[signal], http = new ow.obj.http(), timeout = Math.max(1, Math.min(remaining, config.timeoutMs));
    try {
      http.setThrowExceptions(false);
      http.client = http.client.newBuilder().retryOnConnectionFailure(false).build();
      var response = http.exec(config.endpoint, "POST", JSON.stringify(this.encode(signal, records)), Object.assign({}, config.headers, { "Content-Type": "application/json" }), false, timeout, false, { timeout: timeout, instrumentation: false });
      var code = Number(response.responseCode);
      if ([429, 502, 503, 504].indexOf(code) >= 0) {
        var headers = http.responseHeaders(), retry;
        Object.keys(headers || {}).forEach(function(k) { if (k.toLowerCase() === "retry-after") { var v = String(headers[k]); retry = /^\d+$/.test(v) ? Number(v) * 1000 : Math.max(0, Date.parse(v) - Date.now()); } });
        return { retry: true, retryAfterMs: isFinite(retry) ? retry : undefined };
      }
      if (code < 200 || code >= 300) return { rejected: records.length };
      var body;
      try { body = response.response ? JSON.parse(response.response) : {}; } catch(e) { return { rejected: records.length }; }
      var partial = body.partialSuccess || {};
      var rejected = Number(partial.rejectedSpans || partial.rejectedLogRecords || partial.rejectedDataPoints || 0);
      return { rejected: Math.min(records.length, rejected) };
    } finally { http.close(); }
  };
  P.start = function() {
    if (this._running) return this;
    var self = this, ins = self.instrumentation;
    ow.loadObj();
    self._provider = ins.batchProvider(function(s, rs, remaining) { return self._send(s, rs, remaining); }, Object.assign({}, self.options, { beforeFlush: function() { if (self.options.metricMappings) ins.collectMetrics(self.options.metricMappings); } }));
    var provider = self._provider, original = provider.onMetric;
    provider.onMetric = function(r) { var record = self._metric(r); if (record) original(record); };
    ins.registerProvider(self._name, provider); self._running = true;
    if (!self._shutdownRegistered) { addOnOpenAFShutdown(function() { self.stop(5000); }); self._shutdownRegistered = true; }
    return self;
  };
  P.flush = function(timeoutMs) {
    if (this._provider) {
      if (this.options.metricMappings) this.instrumentation.collectMetrics(this.options.metricMappings);
      this._provider.flush(typeof timeoutMs === "number" ? timeoutMs : 5000);
    }
    return this.getStats();
  };
  P.stop = function(timeoutMs) {
    if (this._running) {
      this.instrumentation.unregisterProvider(this._name);
      this._provider.shutdown(typeof timeoutMs === "number" ? timeoutMs : 5000);
      this._running = false;
    }
    return this.getStats();
  };
  P.getStats = function() { return Object.assign({ running: this._running, series: this._seriesCount, seriesDropped: this._seriesDropped }, this._provider ? this._provider.getStats() : {}); };
})(OpenTelemetry.prototype);
if (typeof exports !== "undefined") exports.OpenTelemetry = OpenTelemetry;
