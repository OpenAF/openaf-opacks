// Only the selected provider is required; no JavaFX classes enter the OpenAF JVM.
exports.create = function(root) {
  var process, writer, pending = new java.util.concurrent.ConcurrentHashMap(), emit, session, timeout = 30000, stopping = false, cache, startupMs, ready = false;
  function error(code, text) { var e = new Error(text); e.code = code; return e; }
  function platform() {
    var os = String(java.lang.System.getProperty("os.name")).toLowerCase(), arch = String(java.lang.System.getProperty("os.arch")).toLowerCase();
    var arm = arch == "aarch64" || arch == "arm64", x64 = arch == "amd64" || arch == "x86_64";
    if (!arm && !x64) return null;
    if (os.indexOf("mac") >= 0) return arm ? "mac-aarch64" : "mac";
    if (os.indexOf("linux") >= 0) return arm ? "linux-aarch64" : "linux";
    if (os.indexOf("windows") >= 0 && x64) return "win";
    return null;
  }
  function config(options) {
    var p = options.providerOptions && options.providerOptions.javafx || {};
    Object.keys(p).forEach(function(k) { if (["java"].indexOf(k) < 0) throw error("INVALID_ARGUMENT", "Unknown JavaFX option: " + k); });
    return { java: p.java || String(java.lang.System.getProperty("java.home")) + "/bin/java", classifier: platform() };
  }
  function daemon(name, fn) {
    var t = new java.lang.Thread(new java.lang.Runnable({ run: fn }), "OpenAF JavaFX " + name);
    t.setDaemon(true); t.start(); return t;
  }
  function request(envelope) {
    if (!process || !process.isAlive()) throw error("PROVIDER_FAILED", "JavaFX helper is not running");
    var queue = new java.util.concurrent.ArrayBlockingQueue(1), id = envelope.requestId;
    pending.put(id, queue);
    try {
      writer.write(JSON.stringify(envelope)); writer.newLine(); writer.flush();
      var line = queue.poll(timeout, java.util.concurrent.TimeUnit.MILLISECONDS);
      if (line == null) throw error("TIMEOUT", "JavaFX operation timed out: " + envelope.operation);
      var result = JSON.parse(String(line));
      if (result.error) throw error(result.error.code, result.error.message);
      return result.payload;
    } finally { pending.remove(id); }
  }
  return {
    describe: function() { return { id: "javafx", version: "20261018", spi: 1, engineVersion: "21.0.12", execution: "helper" }; },
    probe: function(options) {
      try {
        var c = config(options);
        if (!c.classifier) return { available: false, reason: "Unsupported OS/architecture" };
        if (String(java.lang.System.getProperty("java.awt.headless")) == "true") return { available: false, reason: "Headless JVM" };
        if (c.classifier.indexOf("linux") == 0 && java.lang.System.getenv("DISPLAY") == null && java.lang.System.getenv("WAYLAND_DISPLAY") == null) return { available: false, reason: "No display environment" };
        if (!io.fileExists(root + "/desktop-javafx.jar") || !io.fileExists(root + "/lib/" + c.classifier + "/javafx-web-21.0.12-" + c.classifier + ".jar")) return { available: false, reason: "Run the provider install.js and compile.yaml first" };
        var r = $sh([c.java, "--list-modules"]).timeout(10000).get(0);
        if (r.exitcode != 0 || !/java.base@(2[1-9]|[3-9][0-9])/.test(String(r.stdout)) || String(r.stdout).indexOf("jdk.jsobject@") < 0) return { available: false, reason: "JavaFX 21 needs a JVM containing jdk.jsobject (Java 21-25); set providerOptions.javafx.java" };
        return { available: true };
      } catch(e) { return { available: false, reason: String(e.message || e) }; }
    },
    start: function(cfg, callback) {
      if (process) throw error("INVALID_STATE", "JavaFX provider has already started");
      emit = callback; session = cfg.sessionId; timeout = cfg.timeout; stopping = false; ready = false;
      var began = now(), c = config(cfg.options), sep = java.io.File.pathSeparator;
      cache = String(java.nio.file.Files.createTempDirectory("openaf-desktop-javafx-"));
      var args = [c.java, "-Djavafx.cachedir=" + cache, "--enable-native-access=javafx.graphics,javafx.media,javafx.web", "--module-path", root + "/lib/" + c.classifier, "--add-modules", "javafx.web", "-cp", root + "/desktop-javafx.jar" + sep + getOpenAFJar(), "openaf.desktop.javafx.DesktopBootstrap", "--owner-pid=" + java.lang.ProcessHandle.current().pid()];
      var list = new java.util.ArrayList(); args.forEach(function(a) { list.add(String(a)); });
      process = new java.lang.ProcessBuilder(list).start();
      writer = new java.io.BufferedWriter(new java.io.OutputStreamWriter(process.getOutputStream(), "UTF-8"));
      daemon("responses", function() {
        var input = new java.io.BufferedReader(new java.io.InputStreamReader(process.getInputStream(), "UTF-8"));
        try {
          var line;
          while ((line = input.readLine()) != null) {
            if (line.length() > 9 * 1024 * 1024) throw new Error("Oversized helper frame");
            var data = JSON.parse(String(line));
            if (data.version != 1 || data.sessionId !== session) throw new Error("Invalid helper protocol");
            if (data.requestId) {
              var queue = pending.get(String(data.requestId));
              if (queue != null && !queue.offer(String(line))) throw new Error("Duplicate helper response");
            } else if (data.event) emit(data.event);
          }
        } catch(e) {
          if (!stopping) logErr("JavaFX protocol failed: " + e);
        } finally {
          input.close();
          pending.forEach(function(id, q) { q.offer(JSON.stringify({ error: { code: "PROVIDER_FAILED", message: "JavaFX helper disconnected" } })); });
          if (!stopping && ready) emit({ type: "providerFailed", error: { code: "PROVIDER_FAILED", message: "JavaFX helper disconnected" } });
        }
      });
      daemon("diagnostics", function() {
        var input = new java.io.BufferedReader(new java.io.InputStreamReader(process.getErrorStream(), "UTF-8"));
        try { var line; while ((line = input.readLine()) != null) logErr("JavaFX: " + String(line).substring(0, 1024)); } finally { input.close(); }
      });
      var caps = request({ version: 1, sessionId: session, requestId: String(java.util.UUID.randomUUID()), operation: "session.start", payload: {} });
      startupMs = now() - began;
      ready = true;
      return caps;
    },
    diagnostics: function() { return { pid: process ? Number(process.pid()) : null, startupMs: startupMs || null }; },
    request: request,
    stop: function() {
      stopping = true;
      if (!process) { if (cache) { io.rm(cache); cache = null; } return; }
      try { if (writer) writer.close(); } catch(e) {}
      if (!process.waitFor(3000, java.util.concurrent.TimeUnit.MILLISECONDS)) {
        process.destroy();
        if (!process.waitFor(1000, java.util.concurrent.TimeUnit.MILLISECONDS)) { process.destroyForcibly(); process.waitFor(1000, java.util.concurrent.TimeUnit.MILLISECONDS); }
      }
      pending.clear();
      if (cache && !process.isAlive()) { io.rm(cache); cache = null; }
    }
  };
};
