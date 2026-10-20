(function() {
  var root = String(new java.io.File(".").getCanonicalPath());
  var assert = function(a, b, text) { ow.test.assert(a, b, text); };
  exports.testLockAndAvailability = function() {
    var lock = io.readFileJSON(root + "/javafx-lock.json");
    assert(lock.version, "21.0.12", "Pinned maintenance release");
    ["win", "mac", "mac-aarch64", "linux", "linux-aarch64"].forEach(function(platform) {
      assert(lock.platforms[platform].length, 5, "Complete JavaFX web module closure");
      lock.platforms[platform].forEach(function(a) { assert(/^[a-f0-9]{64}$/.test(a.sha256), true, "SHA-256 artifact lock"); });
    });
    var p = require(root + "/desktop-javafx.js").create(root);
    assert(p.describe().spi, 1, "Portable provider SPI");
    var before = java.lang.System.getProperty("java.awt.headless");
    java.lang.System.setProperty("java.awt.headless", "true");
    try { assert(p.probe({}).available, false, "Headless fails without starting toolkit"); }
    finally { if (before == null) java.lang.System.clearProperty("java.awt.headless"); else java.lang.System.setProperty("java.awt.headless", before); }
    p = require(root + "/desktop-javafx.js").create(root + "/not-installed");
    assert(p.probe({}).available, false, "Missing dependencies fail clearly");
  };
  exports.testGraphicalContract = function() {
    if (String(java.lang.System.getenv("OPENAF_DESKTOP_TEST_GUI")) != "1") { print("SKIP JavaFX graphical contract: set OPENAF_DESKTOP_TEST_GUI=1 with a usable display"); return; }
    var helper = java.lang.System.getenv("OPENAF_DESKTOP_JAVA");
    var cfg = { provider: "javafx", timeout: 15000 };
    if (helper != null) cfg.providerOptions = { javafx: { java: String(helper) } };
    var code = 'var d=ow.loadDesktop(' + JSON.stringify(cfg) + ');d.registerProvider(require(' + JSON.stringify(root + "/desktop-javafx.js") + ').create(' + JSON.stringify(root) + '));' +
      'var done=false,seen=0,unsafe=false,other;' +
      'var w=d.window({html:\'<h1>OpenAF JavaFX integration</h1><script>openafDesktop.onMessage(function(m){if(m.type==="status")openafDesktop.send("done",{value:m.payload.value});});openafDesktop.ready.then(function(){openafDesktop.send("click",{value:21,javaAccess:typeof Java!=="undefined"||typeof java!=="undefined"||typeof Packages!=="undefined"});});</script>\',messaging:{types:["click","status","done"]}});' +
      'w.on("message",function(e){if(e.message.type=="click"){unsafe=e.message.payload.javaAccess;seen++;w.send("status",{value:e.message.payload.value+1});}if(e.message.type=="done"){done=e.message.payload.value==22;w.close();other.close();}});' +
      'other=d.window({html:"<h1>Second window</h1>"});w.show();other.show();d.wait(20000);' +
      'if(!done||unsafe||seen!=1||d.info().state!="stopped")throw "Graphical contract failed";print("DESKTOP_GRAPHICAL_OK");';
    var result = $sh([String(java.lang.System.getProperty("java.home")) + "/bin/java", "--enable-native-access=ALL-UNNAMED", "-Dopenaf.cds.training=true", "-jar", getOpenAFJar(), "-c", 'try{' + code + '}catch(e){printErr(e);exit(1);}']).timeout(35000).get(0);
    assert(String(result.stderr).indexOf("Main Java thread is detached") < 0, true, "Clean native JavaFX teardown");
    assert(result.exitcode, 0, "Bounded JavaFX subprocess: " + result.stdout + result.stderr);
    assert(String(result.stdout).indexOf("DESKTOP_GRAPHICAL_OK") >= 0, true, "Actual renderer round trip and two-window cleanup");
  };
  exports.testHelperEOF = function() {
    if (String(java.lang.System.getenv("OPENAF_DESKTOP_TEST_GUI")) != "1") { print("SKIP JavaFX helper EOF: set OPENAF_DESKTOP_TEST_GUI=1"); return; }
    var exe = java.lang.System.getenv("OPENAF_DESKTOP_JAVA");
    if (exe == null) exe = String(java.lang.System.getProperty("java.home")) + "/bin/java";
    var os = String(java.lang.System.getProperty("os.name")).toLowerCase(), arm = /^(aarch64|arm64)$/.test(String(java.lang.System.getProperty("os.arch")));
    var classifier = os.indexOf("mac") >= 0 ? (arm ? "mac-aarch64" : "mac") : os.indexOf("linux") >= 0 ? (arm ? "linux-aarch64" : "linux") : "win";
    [String(java.lang.ProcessHandle.current().pid()), "2147483647"].forEach(function(owner) {
      var cache = String(java.nio.file.Files.createTempDirectory("openaf-desktop-eof-")), child;
      try {
        var args = new java.util.ArrayList();
        [String(exe), "-Djavafx.cachedir=" + cache, "--enable-native-access=javafx.graphics,javafx.media,javafx.web", "--module-path", root + "/lib/" + classifier, "--add-modules", "javafx.web", "-cp", root + "/desktop-javafx.jar" + java.io.File.pathSeparator + getOpenAFJar(), "openaf.desktop.javafx.DesktopBootstrap", "--owner-pid=" + owner].forEach(function(a) { args.add(a); });
        child = new java.lang.ProcessBuilder(args).redirectErrorStream(true).start();
        child.getOutputStream().close();
        assert(child.waitFor(8, java.util.concurrent.TimeUnit.SECONDS), true, "EOF/missing owner exits within deadline");
        assert(child.exitValue(), 0, "Helper exits without a protocol handshake");
      } finally {
        if (child && child.isAlive()) { child.destroyForcibly(); child.waitFor(2, java.util.concurrent.TimeUnit.SECONDS); }
        io.rm(cache);
      }
    });
  };
})();
