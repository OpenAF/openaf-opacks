var OpenTelemetry = require("../opentelemetry.js").OpenTelemetry;
var ins = ow.loadInstrumentation();
var exporter = new OpenTelemetry({ serviceName: "openaf-smoke" }).start();
ins.enable();
try {
  ins.withSpan("collector-smoke", function() {
    log("collector smoke correlated log");
    ins.counter("smoke.requests").add(3);
    ins.gauge("smoke.temperature").set(21);
    ins.histogram("smoke.duration", { unit: "ms", bounds: [5, 10] }).record(8);
  });
  var stats = exporter.flush(5000);
  print(JSON.stringify(stats));
  if (stats.sent !== 5 || stats.rejected || stats.failures) throw "Collector smoke failed: " + JSON.stringify(stats);
} finally { exporter.stop(1000); ins.disable(); }
