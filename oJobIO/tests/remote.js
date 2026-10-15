// From oJobIO: OJOBIO_TEST_BASE=http://localhost:8088 oaf -f tests/remote.js
// Requires an oJobIO service containing hello/world; selected jobs are inspected, never executed.
ow.loadFormat();
var base = String(java.lang.System.getenv("OJOBIO_TEST_BASE") || "http://localhost:8088").replace(/\/$/, "");
var source = io.readFileString("launcher.js"), home = io.createTempDir("ojobio-remote-", "");
try {
  ["/hello/world.yaml", "/hello/world.json", "/hello/world"].forEach(function(path) {
    var closed = false, runs = 0, output = [], reads = 0;
    var ui = {
      ansi: true, console: {}, read: function() {}, size: function() { return { width: 100, height: 24 }; },
      raw: function(fn) { return fn(); }, write: function(s) { output.push(String(s)); }, close: function() { closed = true; }
    };
    var launcher = new Function("askConsole", "askKey", "askChoose", "askChooseMultiple", "ask", "oJobRun", "return (\n" + source + "\n);")(
      function() { return ui; }, function() { return reads++ == 0 ? "enter" : "ctrl-c"; },
      function() { return 0; }, function() { throw "Unexpected multiple-choice prompt"; }, function() { throw "Unexpected argument prompt"; },
      function(job) {
        if (!closed) throw "Terminal was not closed before execution";
        if (!isArray(job.todo) || !isArray(job.jobs)) throw "Remote response was not parsed into an oJob";
        if (job.help.text.indexOf("Hello world") < 0) throw "Unexpected job help";
        runs++;
      }
    );
    launcher({ name: "HTTP test", home: home, ids: [base + path], catalog: [], args: {} });
    if (runs != 1 || !closed) throw "Remote launcher failed for " + path + ": " + output.join("\n");
    print("PASS " + path);
  });
} finally { io.rm(home); }
