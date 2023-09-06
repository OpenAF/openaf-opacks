// Author: Nuno Aguiar

ow.loadObj();

function __exec(aIn) {
   var handler = String(getEnv("_HANDLER"));
   var type = (handler.endsWith(".yaml") || handler.endsWith(".json")) ? "ojob" : "openaf";
   var ext = (type == "ojob") ? handler.substring(handler.lastIndexOf(".") + 1, handler.length) : "js";
   var filename = handler.substring(0, handler.indexOf(".")) + "." + ext;
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
  var h = new ow.obj.http(__,__,__,__,__,1200000,__,{callTimeout:1200000,readTimeout:1200000,writeTimeout:1200000}), __error, __requestId = "";
  try {
     var res, c = 0
     do {
       try {
         res = h.get("http://" + getEnv("AWS_LAMBDA_RUNTIME_API") + "/2018-06-01/runtime/invocation/next");
         __requestId = h.responseHeaders()["lambda-runtime-aws-request-id"];
         __exec(jsonParse(res.response));
       } catch(ee) {
         c++
       }
     } while(__requestId == "" && c < 3)
  }  catch(e) {
     __error = e;
     printErr(__error);
  } finally {
     var h2 = new ow.obj.http(__,__,__,__,__,1200000,__,{callTimeout:1200000,readTimeout:1200000,writeTimeout:1200000});
     h2.exec("http://" + getEnv("AWS_LAMBDA_RUNTIME_API") + "/2018-06-01/runtime/invocation/" + __requestId + "/response", "POST", stringify(__pmOut, void 0, ""));
  }
}