// Local inspection and optional forwarding, independent of OpenTelemetry export.
var ins = ow.loadInstrumentation();
var provider = ins.channelProvider({ prefix: "exampleTelemetry" });
ins.registerProvider("channels", provider);
ins.enable();
try {
  ins.withSpan("example", function() { log("Inspect this execution"); });
  print(af.toYAML($ch(provider.channels.Span).getAll()));
} finally { ins.shutdown(1000); }
// For forwarding, configure remote.Span / remote.Log / remote.Metric with
// { url, login, password }; see OpenAF docs/instrumentation.md.
