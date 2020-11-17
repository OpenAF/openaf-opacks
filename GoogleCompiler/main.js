var classPath;

if (__expr.match(/--update/)) {
        throw "Not supported temporarially.";

	/*plugin("HTTP");
        plugin("ZIP");
        log("Downloading Google Closure Compiler from Google...");
	var down = new HTTP("https://dl.google.com/closure-compiler/compiler-latest.zip", "GET", "", {}, true, 5000);
        var zip = new ZIP();
        zip.load(down.responseBytes());
        af.writeFileBytes(getOPackPath("GoogleCompiler") + "/compiler.jar", zip.getFile("compiler.jar")); 
        zip.close();
        log("Done downloading.");*/
}

if (typeof classPath === 'undefined') {
	classPath = getOPackPath("GoogleCompiler") + "/compiler.jar";
	classPath = classPath.replace(/\\/g, "/");
}

var javaHome  = java.lang.System.getProperty("java.home") + "";
var parameters = __expr.replace(/^exec GoogleCompiler/i, "");
af.sh(javaHome + "/bin/java -jar " + classPath + "  " + parameters, "", null, true);
if (__exitcode != 0) printErr(__stderr);
