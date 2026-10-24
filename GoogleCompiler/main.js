var classPath;

if (__expr.match(/--update/)) {
    //throw "Not supported temporarially.";
	ow.loadJava()
	var m = new ow.java.maven()
	var ver = m.getLatestVersionString("com.google.javascript.closure-compiler")
	m.getFile("com.google.javascript.closure-compiler", "closure-compiler-{{version}}.jar", ".")

	var orig = md5(io.readFileBytes("compiler11.jar"))
	var dest = md5(io.readFileBytes("closure-compiler-" + ver + ".jar"))
	if (orig == dest) {
		io.rm("closure-compiler-" + ver + ".jar")
		log("No update needed.")
	} else {
		io.mv("closure-compiler-" + ver + ".jar", "compiler11.jar")
		log("Updated to version " + ver)
	}
	exit(0)
}

if (isUnDef(classPath)) {
  var majorVersion = Number(String(java.lang.System.getProperty("java.specification.version")).replace(/^1\./, ""))
  var compilerPath = getOPackPath("GoogleCompiler")
  plugin("ZIP")
  var zip = new ZIP()
  var requiredJava
  try {
    var header = zip.streamGetFile(compilerPath + "/compiler11.jar", "com/google/javascript/jscomp/CommandLineRunner.class")
    requiredJava = ((header[6] & 255) * 256 + (header[7] & 255)) - 44
  } finally { zip.close() }
  var jarFile = majorVersion >= requiredJava ? "compiler11.jar" : "compiler.jar"
  classPath = compilerPath + "/" + jarFile;
	classPath = classPath.replace(/\\/g, "/");
}

var javaHome  = java.lang.System.getProperty("java.home") + "";
var parameters = __expr.replace(/^exec +GoogleCompiler/i, "");
var res = $sh(javaHome + "/bin/java -jar " + classPath + "  " + parameters).exec(0) 

if (res.exitcode != 0) {
	yprint(res)
}
