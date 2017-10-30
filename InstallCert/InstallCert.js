var classPath;

if (typeof classPath === 'undefined') {
	classPath = getOPackPath("InstallCert") + "/lib";
	classPath = classPath.replace(/\\/g, "/");
}

var javaHome  = String(java.lang.System.getProperty("java.home"));
var params = __expr.replace(/exec InstallCert/i, "");
var sep = java.io.File.separator;
sh("\"" + javaHome + sep + "bin" + sep + "java\" -cp \"" + classPath + "\" InstallCert " + params, "", null, true);
if (__exitcode != 0) printErr(__stderr);
