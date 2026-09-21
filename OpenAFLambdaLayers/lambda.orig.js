// Author: Nuno Aguiar

ow.loadObj();

function __exec(aIn) {
   var handler = String(getEnv("_HANDLER"));
   var type = (handler.endsWith(".yaml") || handler.endsWith(".yml") || handler.endsWith(".json")) ? "ojob" : "openaf";
   var extension = handler.substring(handler.lastIndexOf(".") + 1).toLowerCase();
   if (["js", "json", "yaml", "yml"].indexOf(extension) < 0 || handler.indexOf("..") >= 0 || handler.startsWith("/")) {
      throw "Invalid Lambda handler: " + handler;
   }
   var filename = handler;
   if (isUnDef(aIn)) aIn = {};

   __pmIn = aIn;
   __pm = __pmIn;
   __pmOut = __pm;
   if (type == "ojob") {
      $ch("oJob::log").destroy(); $ch("oJob::todo").destroy();  $ch("oJob::jobs").destroy(); $ch("oJob::oJob").destroy(); $ch("oJob::locks").destroy(); ow.oJob = __;
      oJobRunFile(filename, __pmIn);
   } else {
      load(filename);
   }
}

// Initialization
//try { __exec(); } catch(e) { __error = e; sprintErr(e); }

while(1) {
  var h = new ow.obj.http(__,__,__,__,__,1200000,__,{callTimeout:1200000,readTimeout:1200000,writeTimeout:1200000}), __requestId = "";
  try {
     var res = h.get("http://" + getEnv("AWS_LAMBDA_RUNTIME_API") + "/2018-06-01/runtime/invocation/next");
     __requestId = h.responseHeaders()["lambda-runtime-aws-request-id"];
     if (isUnDef(__requestId) || __requestId == "") throw "Lambda runtime API did not return a request id.";
     __exec(jsonParse(res.response));
     h.exec("http://" + getEnv("AWS_LAMBDA_RUNTIME_API") + "/2018-06-01/runtime/invocation/" + __requestId + "/response", "POST", stringify(__pmOut, void 0, ""));
  }  catch(e) {
     printErr(e);
     if (isDef(__requestId) && __requestId != "") {
        var error = { errorMessage: String(e), errorType: (isDef(e.name) ? String(e.name) : "OpenAFError") };
        h.exec("http://" + getEnv("AWS_LAMBDA_RUNTIME_API") + "/2018-06-01/runtime/invocation/" + __requestId + "/error", "POST", stringify(error, void 0, ""));
     }
  }
}
