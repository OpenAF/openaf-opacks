// Author: Nuno Aguiar

ow.loadObj();

function __exec(aIn) {
   var handler = String(getEnv("_HANDLER"));
   var type = (handler.endsWith(".yaml") || handler.endsWith(".json")) ? "ojob" : "openaf";
   var ext = (type == "ojob") ? handler.substring(handler.lastIndexOf(".") + 1, handler.length) : "js";
   var filename = handler.substring(0, handler.indexOf(".")) + "." + ext;

   __pmIn = aIn;
   if (type == "ojob") {
      $ch("oJob::log").destroy(); $ch("oJob::todo").destroy();  $ch("oJob::jobs").destroy(); $ch("oJob::oJob").destroy(); $ch("oJob::locks").destroy(); ow.oJob = void 0;
      oJobRunFile(filename, __pmIn);
   } else {
      load(filename);
   }
}

// Initialization
try { __exec(); } catch(e) { __error = e; sprintErr(e); }

while(1) {
  var h = new ow.obj.http(), __error, __requestId = "";
  try {
     var res = h.get("http://" + getEnv("AWS_LAMBDA_RUNTIME_API") + "/2018-06-01/runtime/invocation/next");
     __requestId = h.responseHeaders()["Lambda-Runtime-Aws-Request-Id"];
     __exec(jsonParse(res.response));
  } catch(e) {
     __error = e;
     printErr(__error);
  } finally {
     h.exec("http://" + getEnv("AWS_LAMBDA_RUNTIME_API") + "/2018-06-01/runtime/invocation/" + __requestId + "/response", "POST", stringify(__pmOut, void 0, ""));
  } 
}
