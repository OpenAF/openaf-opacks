var classPath;

if (typeof classPath === 'undefined') {
	classPath = getOPackPath("InstallCert") + "/lib";
	classPath = classPath.replace(/\\/g, "/");
}

var javaHome  = java.lang.System.getProperty("java.home") + "";
var params = __expr.replace(/exec InstallCert/i, "");
sh(javaHome + "/bin/java -cp \"" + classPath + "\" InstallCert " + params, "", null, true);
if (__exitcode != 0) printErr(__stderr);
