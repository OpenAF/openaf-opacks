// Test script for Maven oPack
var _basePath = "";
if (io.fileExists("maven.js")) {
  _basePath = io.fileInfo(".").canonicalPath;
} else if (io.fileExists("../maven.js")) {
  _basePath = io.fileInfo("..").canonicalPath;
} else if (io.fileExists("Maven/maven.js")) {
  _basePath = io.fileInfo("Maven").canonicalPath;
} else {
  _basePath = getOPackPath("Maven");
}
if (_basePath !== "") {
  loadExternalJars(_basePath);
}
load(_basePath + "/maven.js");


try {
  log("1. Testing Dependency Resolution via Maven...");
  var m = new Maven();
  var resolved = m.resolve("org.apache.commons:commons-email:1.5");
  if (resolved && resolved.length > 0) {
    log("Resolved " + resolved.length + " artifacts successfully.");
    for (var i = 0; i < resolved.length; i++) {
      log(" - " + resolved[i].groupId + ":" + resolved[i].artifactId + ":" + resolved[i].version + " -> " + resolved[i].file);
    }
  } else {
    throw new Error("No artifacts resolved!");
  }
  
  log("2. Testing Dependency Resolution via MavenResolver alias...");
  var mr = new MavenResolver();
  var resolvedAlias = mr.resolve("org.apache.commons:commons-email:1.5");
  if (resolvedAlias && resolvedAlias.length > 0) {
    log("Resolved " + resolvedAlias.length + " artifacts successfully via alias.");
  } else {
    throw new Error("No artifacts resolved via alias!");
  }

  log("3. Testing POM parsing...");
  // Parse the main pom.xml in the openaf-opacks root directory
  var parentPom = "../pom.xml";
  var pom = m.parsePom(parentPom);
  log("Parsed POM: " + pom.artifactId + " v" + pom.version);
  log("Found " + pom.dependencies.length + " dependencies.");

  log("Tests completed successfully.");
} catch (e) {
  logErr("Test failed: " + e);
  exit(-1);
}
