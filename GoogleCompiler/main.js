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
	var majorVersion = ow.format.getJavaVersion().match(/^\d+/)[0]
	var jarFile

	if (majorVersion < 11) jarFile = "compiler.jar"; else jarFile = "compiler11.jar"
	classPath = getOPackPath("GoogleCompiler") + "/" + jarFile;
	classPath = classPath.replace(/\\/g, "/");
}

var javaHome  = java.lang.System.getProperty("java.home") + "";
var parameters = __expr.replace(/^exec GoogleCompiler/i, "");
var res = $sh(javaHome + "/bin/java -jar " + classPath + "  " + parameters).exec(0) 

if (res.exitcode != 0) {
	yprint(res)
}