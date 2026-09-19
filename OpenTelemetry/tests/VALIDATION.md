# Validation — 2026-09-19

Validated against the sibling OpenAF source checkout, rebuilt into a runnable
JAR. The core remains disabled by default.

- All seven core instrumentation test groups passed: span/provider behavior,
  concurrent context isolation and logs, HTTP client/server propagation,
  bounded channels and authenticated read-only inspection, oJob execution,
  propagation between two JVM processes, and remote channel forwarding.
- Legacy `http0` coverage passed with the existing Apache HTTP client/core JARs
  supplied explicitly on the test classpath.
- All six OpenTelemetry regression groups passed, covering OTLP encoding,
  aggregation and series limits, a real local HTTP receiver, retry and partial
  rejection behavior, restart, resource precedence, resets, and scheduled
  collector mappings.
- An actual `otel/opentelemetry-collector:0.123.0` container accepted one span,
  one correlated log, and three metric records with zero exporter rejections,
  failures, or pending records. Its debug output confirmed counter value 3,
  gauge value 21, and histogram count 1 / sum 8 with bounds 5 and 10.
  The disposable container was removed after verification.

The complete OpenAF suite reported **269 / 274 passing**. The five failures were
MCP modern-era `resultType`, Anthropic prompt-caching headers, structured Markdown,
custom DNS-over-HTTPS, and the HTTP plugin's query-free request. Each failure also
reproduced in a fresh process with the original HTTP/server JavaScript modules
loaded and instrumentation disabled. This is a scoped baseline comparison,
not a pristine checkout rebuild. The full suite preceded the final small fix
for `ojob.instrumentation.enabled: false`; focused core tests were rerun after
that fix.

Build verification used `buildos.js`, explicit runtime repacking, and generation
of `ojob.saved.json`. The normal build wrapper encountered existing local
launcher/pom preparation problems. No cloud backend, sustained-load benchmark,
crash durability, or exactly-once delivery claim is made. Transport is bounded,
in-memory, and best-effort.
