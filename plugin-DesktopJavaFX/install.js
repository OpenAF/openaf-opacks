// Explicit installation only. Never invoked by ow.loadDesktop or a window operation.
exports.install = function(path) {
  if (typeof ow.loadDesktop != "function") throw "This provider requires an OpenAF build containing ow.loadDesktop";
  var root = String(new java.io.File(path || ".").getCanonicalPath());
  var lock = io.readFileJSON(root + "/javafx-lock.json");
  var os = String(java.lang.System.getProperty("os.name")).toLowerCase(), arch = String(java.lang.System.getProperty("os.arch")).toLowerCase();
  var arm = /^(aarch64|arm64)$/.test(arch), x64 = /^(amd64|x86_64)$/.test(arch);
  var platform = os.indexOf("mac") >= 0 ? (arm ? "mac-aarch64" : "mac") : os.indexOf("linux") >= 0 ? (arm ? "linux-aarch64" : "linux") : os.indexOf("windows") >= 0 && x64 ? "win" : "";
  if ((!arm && !x64) || !lock.platforms[platform]) throw "Unsupported JavaFX OS/architecture";
  var target = root + "/lib/" + platform;
  io.mkdir(target);
  var offline = java.lang.System.getenv("OPENAF_DESKTOP_ARTIFACTS");
  function hash(path) {
    var digest = java.security.MessageDigest.getInstance("SHA-256"), input = new java.io.FileInputStream(path);
    try {
      var buffer = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, 65536), n;
      while ((n = input.read(buffer)) != -1) digest.update(buffer, 0, n);
      return String(java.util.HexFormat.of().formatHex(digest.digest()));
    } finally { input.close(); }
  }
  lock.platforms[platform].forEach(function(artifact) {
    var dest = target + "/" + artifact.file;
    if (io.fileExists(dest) && hash(dest) == artifact.sha256) return;
    var tmp = dest + ".download";
    try {
      if (offline != null) {
        io.cp(String(offline) + "/" + artifact.file, tmp);
      } else {
        log("Downloading " + artifact.file);
        var connection = new java.net.URI(artifact.url).toURL().openConnection();
        connection.setConnectTimeout(15000); connection.setReadTimeout(60000);
        var input = connection.getInputStream();
        try { java.nio.file.Files.copy(input, java.nio.file.Path.of(tmp), java.nio.file.StandardCopyOption.REPLACE_EXISTING); } finally { input.close(); }
      }
      if (hash(tmp) != artifact.sha256) throw "JavaFX checksum mismatch: " + artifact.file;
      java.nio.file.Files.move(java.nio.file.Path.of(tmp), java.nio.file.Path.of(dest), java.nio.file.StandardCopyOption.REPLACE_EXISTING, java.nio.file.StandardCopyOption.ATOMIC_MOVE);
    } finally { if (io.fileExists(tmp)) io.rm(tmp); }
  });
  log("JavaFX " + lock.version + " installed for " + platform);
};
