var classPath;

if (__expr.match(/--update/)) {
        throw "Not supported temporarially.";
}

if (typeof classPath === 'undefined') {
	classPath = getOPackPath("GoogleCompiler") + "/compiler.jar";
	classPath = classPath.replace(/\\/g, "/");
}

var javaHome  = java.lang.System.getProperty("java.home") + "";
var parameters = __expr.replace(/^exec GoogleCompiler/i, "");
af.sh(javaHome + "/bin/java -jar " + classPath + "  " + parameters, "", null, true);
if (__exitcode != 0) printErr(__stderr);
