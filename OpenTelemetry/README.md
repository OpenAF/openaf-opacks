# OpenTelemetry

Export OpenAF traces, metrics and logs to an OpenTelemetry Collector or another
OTLP HTTP/JSON endpoint. No Java SDK or additional JARs are required.

Requires OpenAF generic instrumentation API v1 (`ow.loadInstrumentation`).
Installing or loading the opack does not enable telemetry or send requests.

```javascript
var OpenTelemetry = require("opentelemetry.js").OpenTelemetry;
var ins = ow.loadInstrumentation();
var exporter = new OpenTelemetry({
  endpoint: "http://127.0.0.1:4318",
  serviceName: "orders",
  resource: { "deployment.environment.name": "development" }
}).start();
ins.enable();
try {
  ins.withSpan("import", function() {
    log("Import started");
    ins.counter("orders.imported", { unit: "{order}" }).add(10);
    ins.histogram("orders.duration", { unit: "ms", bounds: [10, 100, 1000] }).record(25);
  });
} finally {
  exporter.stop(5000);
  ins.disable();
}
```

Core automatically captures oJob executions, HTTP clients/server routes and
standard logs after enablement. See OpenAF's `docs/instrumentation.md` for context,
manual helpers, exclusions, channels and redaction. Exporting all three signals
is supported; existing `ow.metrics` collectors require explicit mappings:

```javascript
var exporter = new OpenTelemetry({
  endpoint: "http://127.0.0.1:4318",
  metricMappings: [{ collector: "myCollector", path: "queueSize", name: "queue.size", type: "gauge", unit: "{item}" }]
}).start();
```

## Configuration

- `endpoint`: base HTTP(S) endpoint; `/v1/traces`, `/v1/metrics`, `/v1/logs` are appended.
- `traces`, `metrics`, `logs`: signal endpoint/header/timeout overrides.
- `metricMappings`: explicit mappings from existing `ow.metrics` collectors.
- `headers`: HTTP headers, including credentials when needed.
- `serviceName`, `resource`: service identity and additional resource attributes.
- `protocol`: only `http/json` is supported; unsupported protocols fail clearly.
- `intervalMs` (5000), `batchSize` (512), `maxPending` (2048 per signal),
  `timeoutMs` (5000), `retryBudgetMs` (30000), `maxSeries` (2000).

Supports `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_EXPORTER_OTLP_HEADERS`,
`OTEL_EXPORTER_OTLP_TIMEOUT`, `OTEL_EXPORTER_OTLP_PROTOCOL`, their
`TRACES`/`METRICS`/`LOGS` variants, `OTEL_SERVICE_NAME`, and
`OTEL_RESOURCE_ATTRIBUTES`. Explicit configuration overrides environment values.
Signal-specific endpoints are complete URLs. An endpoint must be configured;
there is no implicit localhost destination. Environment variables do not enable
core instrumentation.

`start()` registers the provider and starts a daemon export worker. `flush(ms)`
exports within the supplied budget. `stop(ms)` unregisters, drains within the
budget and stops the worker. Defaults are five seconds. Repeated calls are safe,
and a stopped exporter may be restarted. A bounded shutdown callback is
registered once after startup. Export traffic is excluded from instrumentation.

## Delivery and aggregation

Queues are bounded, in-memory and best-effort. Overflow drops oldest records.
Retryable network/OTLP responses use exponential backoff with jitter and honor
`Retry-After`. Permanent errors and partial rejections are counted and not retried.
A timeout can cause duplicate delivery; there is no exactly-once guarantee.
`getStats()` reports pending, sent, retries, dropped/rejected records and metric
series limits. A flush may leave records waiting for a later retry; `stop` drops
anything remaining after its deadline.

Counter and up/down observations become cumulative sums; gauges report the
latest value; histograms use cumulative explicit buckets. Existing collector
cumulative values replace snapshots rather than being added repeatedly, and a
counter reset changes its start timestamp. Attribute keys are explicitly allowed
by the core instrument. New series above `maxSeries` are dropped and counted.

## Verification

From `tests/`, using an OpenAF JAR containing instrumentation:

```sh
java -jar /path/to/openaf.jar -f regression.js
```

The tests validate IDs, timestamp encoding, metric aggregation, HTTP reception,
retry behavior, permanent/partial rejection and lifecycle. For an actual
Collector test, use `tests/collector.yaml`, publish its OTLP port on loopback,
and run `examples/collector-smoke.js` with `OTEL_EXPORTER_OTLP_ENDPOINT` set.
The Collector's detailed debug output should contain `openaf-smoke` traces,
correlated logs and metrics. No cloud credentials are needed.
