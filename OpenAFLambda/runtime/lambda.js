// OpenAF Lambda custom runtime. The bootstrap runs preparation once, then reuses the invocation JVM.
(function() {
  var files = java.nio.file.Files;
  var paths = java.nio.file.Paths;
  var root = env("OAF_LAMBDA_ROOT", env("LAMBDA_TASK_ROOT", "/var/task"));
  var state = env("OAF_LAMBDA_STATE", "");
  var api = env("AWS_LAMBDA_RUNTIME_API", "");
  var maxBytes = Number(env("OJOB_MAX_BYTES", "268435456"));
  var reserve = 16777216;
  var polling = false;
  var environmentMap;

  function env(key, fallback) {
    var value = getEnv(key);
    return isUnDef(value) || String(value) == "" ? fallback : String(value);
  }

  function path(value) { return paths.get(String(value)); }
  function fail(message) { throw new Error(message); }
  function logRuntime(message, requestId) {
    var record = { component: "OpenAFLambda", message: message };
    if (requestId) record.requestId = requestId;
    printErr(env("OJOB_JSONLOG", "false").toLowerCase() == "true" ? JSON.stringify(record) :
      "OpenAFLambda" + (requestId ? " [" + requestId + "]" : "") + " | " + message);
  }
  function errorBody(error) {
    return { errorMessage: String(error.message || error), errorType: String(error.name || "OpenAFError") };
  }
  function readText(stream) {
    if (stream == null) return "";
    try { return String(new java.lang.String(stream.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8)); }
    finally { stream.close(); }
  }

  // Runtime API failures are fatal: never replay a handler after an uncertain response delivery.
  function runtimeRequest(route, body) {
    if (!api) fail("AWS_LAMBDA_RUNTIME_API is required.");
    var connection = new java.net.URI("http://" + api + "/2018-06-01/runtime/" + route).toURL().openConnection();
    try {
      connection.setConnectTimeout(10000);
      connection.setReadTimeout(isUnDef(body) ? 0 : 10000);
      if (isDef(body)) {
        connection.setRequestMethod("POST");
        connection.setDoOutput(true);
        connection.setRequestProperty("Content-Type", "application/json");
        var bytes = new java.lang.String(body).getBytes(java.nio.charset.StandardCharsets.UTF_8);
        connection.setFixedLengthStreamingMode(bytes.length);
        var output = connection.getOutputStream();
        try { output.write(bytes); } finally { output.close(); }
      }
      var status = Number(connection.getResponseCode());
      if (status < 200 || status >= 300) fail("Runtime API " + route + " returned HTTP " + status);
      return {
        body: readText(connection.getInputStream()),
        requestId: String(connection.getHeaderField("Lambda-Runtime-Aws-Request-Id") || ""),
        arn: String(connection.getHeaderField("Lambda-Runtime-Invoked-Function-Arn") || ""),
        deadline: Number(connection.getHeaderField("Lambda-Runtime-Deadline-Ms")),
        traceId: String(connection.getHeaderField("Lambda-Runtime-Trace-Id") || "")
      };
    } finally { connection.disconnect(); }
  }

  function checkSpace(target, count) {
    if (count > maxBytes) fail("Workload exceeds OJOB_MAX_BYTES.");
    if (Number(target.toFile().getUsableSpace()) < reserve) fail("Insufficient temporary storage for workload.");
  }
  function copyStream(input, target, budget) {
    files.createDirectories(target.getParent());
    var output = files.newOutputStream(target);
    var buffer = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, 65536);
    var length;
    try {
      while ((length = input.read(buffer)) != -1) {
        budget.bytes += Number(length);
        checkSpace(target.getParent(), budget.bytes);
        output.write(buffer, 0, length);
      }
    } finally { try { output.close(); } finally { input.close(); } }
  }
  function download(url, destination, basicAuth) {
    var uri = new java.net.URI(url);
    for (var redirect = 0; redirect <= 5; redirect++) {
      var scheme = String(uri.getScheme()).toLowerCase();
      if (scheme != "http" && scheme != "https") fail("Download requires HTTP or HTTPS.");
      if (uri.getUserInfo() != null) fail("Use login/pass environment variables for HTTP authentication.");
      var connection = uri.toURL().openConnection();
      try {
        connection.setInstanceFollowRedirects(false);
        connection.setConnectTimeout(10000);
        connection.setReadTimeout(60000);
        if (basicAuth) connection.setRequestProperty("Authorization", basicAuth);
        var status = Number(connection.getResponseCode());
        if ([301,302,303,307,308].indexOf(status) >= 0) {
          var location = connection.getHeaderField("Location");
          if (location == null || redirect == 5) fail("Invalid or excessive download redirects.");
          var next = uri.resolve(String(location));
          if (scheme == "https" && String(next.getScheme()) != "https") fail("HTTPS downgrade redirect rejected.");
          if (String(next.getAuthority()) != String(uri.getAuthority())) basicAuth = __;
          uri = next;
          continue;
        }
        if (status != 200) fail("Workload download returned HTTP " + status);
        var length = Number(connection.getContentLengthLong());
        if (length > maxBytes) fail("Download exceeds OJOB_MAX_BYTES.");
        copyStream(connection.getInputStream(), destination, { bytes: 0 });
        return;
      } catch (error) {
        // Do not expose presigned URLs or HTTP credentials through transport exceptions.
        if (String(error.message || error).indexOf("Workload ") == 0 ||
            String(error.message || error).indexOf("Download ") == 0) throw error;
        fail("Workload download failed (network, redirect, storage or TLS error).");
      } finally { connection.disconnect(); }
    }
  }
  function relative(base, name) {
    if (!name || /[\\\x00\r\n]/.test(name) || name.startsWith("/") || /^[A-Za-z]:/.test(name)) fail("Invalid workload path.");
    var target = base.resolve(name).normalize();
    if (!target.startsWith(base) || target.equals(base)) fail("Workload path escapes its directory.");
    return target;
  }
  function verify(source) {
    [["OJOB_HASH", "SHA-1", 40], ["OJOB_SHA256", "SHA-256", 64]].forEach(function(item) {
      var expected = env(item[0], "").toLowerCase();
      if (!expected) return;
      if (!(new RegExp("^[a-f0-9]{" + item[2] + "}$")).test(expected)) fail("Invalid " + item[0] + ".");
      var digest = java.security.MessageDigest.getInstance(item[1]);
      var input = files.newInputStream(source);
      var buffer = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, 65536);
      var count;
      try { while ((count = input.read(buffer)) != -1) digest.update(buffer, 0, count); }
      finally { input.close(); }
      var actual = "";
      var bytes = digest.digest();
      for (var i = 0; i < bytes.length; i++) actual += ("0" + (bytes[i] & 255).toString(16)).slice(-2);
      if (actual != expected) fail(item[0] + " mismatch.");
    });
  }
  function unpack(source, destination) {
    var zip = new java.util.zip.ZipFile(source.toFile());
    var budget = { bytes: 0 }, seen = {}, count = 0;
    try {
      var entries = zip.entries();
      while (entries.hasMoreElements()) {
        if (++count > 10000) fail("ZIP contains too many entries.");
        var entry = entries.nextElement();
        var target = relative(destination, String(entry.getName()));
        var key = String(target);
        if (seen[key]) fail("ZIP contains duplicate paths.");
        seen[key] = true;
        if (entry.isDirectory()) files.createDirectories(target);
        else copyStream(zip.getInputStream(entry), target, budget);
      }
      if (count == 0) fail("ZIP is empty.");
    } finally { zip.close(); }
  }
  function copyDirectory(source, destination) {
    var stream = files.walk(source);
    var budget = { bytes: 0 }, count = 0;
    try {
      var iterator = stream.iterator();
      while (iterator.hasNext()) {
        var item = iterator.next();
        if (++count > 10000) fail("Local workload contains too many entries.");
        if (files.isSymbolicLink(item)) fail("Local workload symlinks are not supported.");
        var target = destination.resolve(source.relativize(item));
        if (files.isDirectory(item)) files.createDirectories(target);
        else if (files.isRegularFile(item)) copyStream(files.newInputStream(item), target, budget);
        else fail("Local workload contains a non-regular file.");
      }
    } finally { stream.close(); }
  }
  function prepare() {
    if (!state || !isFinite(maxBytes) || maxBytes < 1) fail("Invalid runtime state or OJOB_MAX_BYTES.");
    var method = env("OJOB_METHOD", "none").toLowerCase();
    if (["none", "local", "http", "s3"].indexOf(method) < 0) fail("Unsupported OJOB_METHOD.");
    var config = env("OJOB_CONFIG", "");
    var entrypoint = env("OJOB_ENTRYPOINT", env("_HANDLER", "main.yaml"));
    var staging = path(state).resolve("staging").toAbsolutePath().normalize();
    files.createDirectories(staging);
    var source, filename;
    if (method == "http" || method == "s3") {
      if (!config) fail("OJOB_CONFIG is required for remote workloads.");
      source = path(state).resolve("download");
      if (method == "s3") {
        loadLib("aws_s3.js");
        var aws = new AWS();
        var bucket = env("OJOB_S3_BUCKET", "");
        var key = config;
        if (config.startsWith("s3://")) {
          var parsed = aws.S3_ParseURL(config);
          bucket = parsed.Bucket; key = parsed.Key;
        }
        if (!bucket || !key) fail("S3 bucket and object key are required.");
        var region = env("OJOB_S3_REGION", env("AWS_REGION", env("AWS_DEFAULT_REGION", "")));
        if (!region) fail("AWS region is required for S3 workloads.");
        download(aws.S3_GetPresignedURL(region, bucket, key, 300), source);
        filename = key;
      } else {
        filename = String(new java.net.URI(config).getPath());
        var auth;
        if (env("login", "")) auth = "Basic " + String(java.util.Base64.getEncoder().encodeToString(
          new java.lang.String(env("login", "") + ":" + env("pass", "")).getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        download(config, source, auth);
      }
    } else {
      var localRoot = path(root).resolve("function").toAbsolutePath().normalize();
      source = config ? path(config) : relative(localRoot, entrypoint);
      if (!source.isAbsolute()) source = localRoot.resolve(source);
      source = source.toAbsolutePath().normalize();
      filename = String(source.getFileName());
      if (!files.isRegularFile(source) || files.isSymbolicLink(source)) fail("Local workload file does not exist or is a symlink.");
      if (Number(files.size(source)) > maxBytes) fail("Local workload exceeds OJOB_MAX_BYTES.");
      if (staging.startsWith(source.getParent())) fail("Local workload directory contains runtime staging.");
    }
    verify(source);
    if (/\.zip$/i.test(filename)) {
      unpack(source, staging);
    } else {
      if (!/\.(js|json|ya?ml)$/i.test(filename)) fail("Workload must be a ZIP, JavaScript, YAML or JSON file.");
      if (method == "none" || method == "local") copyDirectory(source.getParent(), staging);
      else copyStream(files.newInputStream(source), staging.resolve(String(path(filename).getFileName())), { bytes: 0 });
      entrypoint = String(source.getFileName());
      if (method == "http" || method == "s3") entrypoint = String(path(filename).getFileName());
    }
    var selected = relative(staging, entrypoint);
    if (!/\.(js|json|ya?ml)$/i.test(entrypoint) || !files.isRegularFile(selected)) fail("Selected workload entrypoint is missing or unsupported.");
    var workload = path(state).resolve("workload");
    files.move(staging, workload);
    var handler = workload.resolve(staging.relativize(selected));
    // Run in the entrypoint directory, so io.readFile* and script loads agree on relative paths.
    io.writeFileJSON(state + "/runtime.json", {
      handler: String(handler),
      prepareJvmUptimeMs: Number(java.lang.management.ManagementFactory.getRuntimeMXBean().getUptime())
    });
    io.writeFileString(state + "/workdir", String(handler.getParent()));
    logRuntime("Workload prepared (" + method + ").");
  }

  var jobEngine, jobDefaults, jobMain;
  function resetOJob() {
    // Keep one engine/constructor shutdown hook, but restore its initial per-run state.
    if (isUnDef(jobEngine)) {
      ow.loadOJob();
      jobEngine = ow.oJob;
      // The constructor's processExpr() includes __pmIn; it is not a reusable default.
      jobEngine.__expr = {};
      jobDefaults = {};
      Object.keys(jobEngine).forEach(function(key) {
        var value = jobEngine[key];
        jobDefaults[key] = key != "__sch" && (isMap(value) || isArray(value)) ? clone(value) : value;
      });
      jobMain = jobEngine.getMainCh().getAll();
      return;
    }
    jobEngine.stop();
    jobEngine.runAllShutdownJobs();
    jobEngine.__sch.stop();
    Object.keys(jobEngine).forEach(function(key) { if (!(key in jobDefaults)) delete jobEngine[key]; });
    Object.keys(jobDefaults).forEach(function(key) {
      var value = jobDefaults[key];
      jobEngine[key] = key != "__sch" && (isMap(value) || isArray(value)) ? clone(value) : value;
    });
    ["log", "todo", "jobs", "oJob", "locks", "metrics"].forEach(function(name) {
      $ch("oJob::" + name).destroy();
      $ch("oJob::" + name).create();
    });
    jobMain.forEach(function(record) { jobEngine.getMainCh().set({ uuid: record.uuid }, clone(record)); });
    ow.oJob = jobEngine;
  }
  function invoke(handler, event, request) {
    __pmIn = event;
    __pm = event;
    __pmOut = event;
    global.__lambdaContext = {
      awsRequestId: request.requestId,
      invokedFunctionArn: request.arn,
      deadlineMs: request.deadline,
      getRemainingTimeInMillis: function() { return Math.max(0, request.deadline - Date.now()); }
    };
    java.lang.System.setProperty("_X_AMZN_TRACE_ID", request.traceId);
    // X-Ray clients and getEnv() read System.getenv(), so update the JVM's backing environment map.
    if (isUnDef(environmentMap)) {
      var environment = java.lang.System.getenv();
      var field = environment.getClass().getDeclaredField("m");
      field.setAccessible(true);
      environmentMap = field.get(environment);
    }
    if (request.traceId) environmentMap.put("_X_AMZN_TRACE_ID", request.traceId);
    else environmentMap.remove("_X_AMZN_TRACE_ID");
    global.__lambdaContext.traceId = request.traceId;
    if (/\.js$/i.test(handler)) load(handler);
    else {
      if (!isMap(event)) fail("oJob invocations require a JSON object event.");
      resetOJob();
      ow.loadOJob();
      $set("res", {});
      ow.oJob.loadFile(handler, event);
      ow.oJob.__ojob.conAnsi = false;
      ow.oJob.__ojob.recordLog = true;
      ow.oJob.__ojob.logHistory = -1;
      try { ow.oJob.start(event, true); }
      finally {
        try { ow.oJob.runAllShutdownJobs(); }
        finally { ow.oJob.stop(); }
      }
      var errors = ow.oJob.getLogCh().getAll().filter(function(record) { return record.error === true; });
      if (errors.length) fail("oJob failed: " + errors.map(function(record) { return record.name; }).join(", "));
    }
    var result = JSON.stringify(__pmOut);
    return isUnDef(result) ? "null" : result;
  }
  function runMicrovm() {
    ow.loadServer();
    plugin("Threads");
    var config = io.readFileJSON(state + "/runtime.json");
    var lock = new java.util.concurrent.locks.ReentrantLock();
    var poisoned = new java.util.concurrent.atomic.AtomicBoolean(false);
    var timeout = Number(env("OAF_MICROVM_TIMEOUT", "60"));
    if (!isFinite(timeout) || timeout <= 0) fail("OAF_MICROVM_TIMEOUT must be positive.");
    function reply(status, value) {
      return ow.server.httpd.reply(JSON.stringify(isUnDef(value) ? null : value), status, "application/json", {});
    }
    function health() { return reply(poisoned.get() ? 503 : 200, { ready: !poisoned.get() }); }
    function handle(request) {
      if (String(request.uri) != "/invoke") return reply(404, {});
      if (String(request.method).toUpperCase() != "POST") return reply(405, {});
      if (poisoned.get()) return reply(503, { errorMessage: "Terminate and replace this unhealthy MicroVM." });
      var body = isDef(request.files) && isDef(request.files.postData) ? String(request.files.postData) : "";
      if (Number(new java.lang.String(body).getBytes(java.nio.charset.StandardCharsets.UTF_8).length) > 6291456) return reply(413, {});
      var event;
      try { event = JSON.parse(body); }
      catch (error) { return reply(400, { errorMessage: "Invalid JSON event." }); }
      if (!lock.tryLock()) return reply(409, { errorMessage: "One invocation is already running." });
      try {
        if (poisoned.get()) return reply(503, {});
        var result, status = 200;
        var worker = new Threads();
        worker.addThread(function() {
          try {
            result = JSON.parse(invoke(config.handler, event, {
              requestId: String(java.util.UUID.randomUUID()), arn: "", traceId: "", deadline: Date.now() + timeout * 1000
            }));
          } catch (error) { status = 500; result = errorBody(error); }
        });
        worker.startNoWait();
        worker.stop(false);
        if (!worker.waitForThreads(timeout * 1000)) {
          poisoned.set(true);
          worker.stop(true);
          return reply(408, { errorMessage: "Invocation timed out; terminate and replace this MicroVM." });
        }
        return reply(status, result);
      } finally { lock.unlock(); }
    }
    var application = ow.server.httpd.start(8080, "0.0.0.0");
    ow.server.httpd.route(application, {
      "/invoke": handle,
      "/health": function(request) { return String(request.uri) == "/health" ? health() : reply(404, {}); }
    }, function() { return reply(404, {}); });
    var hooks = ow.server.httpd.start(8081, "0.0.0.0");
    var routes = {};
    ["ready", "validate", "run", "resume"].forEach(function(name) {
      var uri = "/aws/lambda-microvms/runtime/v1/" + name;
      routes[uri] = function(request) {
        if (String(request.uri) != uri) return reply(404, {});
        return String(request.method).toUpperCase() == "POST" ? health() : reply(405, {});
      };
    });
    ow.server.httpd.route(hooks, routes, function() { return reply(404, {}); });
    logRuntime("MicroVM HTTP runtime ready.");
    while (true) sleep(1000, true);
  }

  function run() {
    var config = io.readFileJSON(state + "/runtime.json");
    logRuntime("Invocation runtime ready.");
    polling = true;
    while (true) {
      var request = runtimeRequest("invocation/next");
      if (!request.requestId) fail("Runtime API omitted request ID.");
      var route = "invocation/" + encodeURIComponent(request.requestId);
      var response, error = __;
      try { response = invoke(config.handler, JSON.parse(request.body), request); }
      catch (exception) { error = errorBody(exception); }
      if (error) {
        logRuntime(error.errorMessage, request.requestId);
        runtimeRequest(route + "/error", JSON.stringify(error));
      } else {
        runtimeRequest(route + "/response", response);
        logRuntime("Invocation completed.", request.requestId);
      }
    }
  }

  try {
    if (env("OAF_LAMBDA_PHASE", "invoke") == "prepare") prepare();
    else if (env("OAF_LAMBDA_PHASE", "invoke") == "microvm") runMicrovm();
    else run();
  } catch (error) {
    var body = errorBody(error);
    logRuntime(body.errorMessage);
    if (!polling && api) {
      try { runtimeRequest("init/error", JSON.stringify(body)); }
      catch (deliveryError) { logRuntime("Failed to report initialization error."); }
    }
    java.lang.System.exit(1);
  }
})();
