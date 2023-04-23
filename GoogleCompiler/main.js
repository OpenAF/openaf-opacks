var classPath;

if (__expr.match(/--update/)) {
        throw "Not supported temporarially.";
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