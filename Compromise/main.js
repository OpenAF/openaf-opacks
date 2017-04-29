ow.loadTest();

var LIB = getOPackPath("Compromise") || ".";
var params = processExpr(" ");

if (isDef(params.update)) {
   try {
      log("Trying to update...");

      plugin("HTTP");
      var check = md5(io.readFileStream(LIB + "/compromise.js"));
      var newVersion = (new HTTP("https://raw.githubusercontent.com/nlp-compromise/compromise/master/builds/compromise.min.js")).response();
      if (md5(newVersion) != check) { 
         log("Need to update...");
         io.writeFileString(LIB + "/compromise.js.tmp", newVersion);
  
         var res = ow.test.test("Test new version", function() { 
            load(LIB + "/compromise.js.tmp");
            var p = nlp("I was born on 2017"); 
            ow.test.assert(p.values().data()[0].number, 2017, "Couldn't get the year");
            ow.test.assert(p.verbs().data()[0].parts.verb, "born", "Couldn't get the verb");
        
            return 1;
         });

         if (isDef(res) && res == 1) {
            af.mv(LIB + "/compromise.js.tmp", LIB + "/compromise.js");
         }
         log("Updated!");
      } else {
         log("No need to update.");
      }
   } catch(e) {
      logErr("Couldn't update: " + e);
   }
}
