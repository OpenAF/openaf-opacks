(function() {
  var LIB_PATH = (isDef(getOPackPaths()["jdbc-paradox"]) ? getOPackPaths()["jdbc-paradox"]+"/" : ".");
  if (Object.keys(Packages.com.googlecode.paradox.Driver).length <= 2) {
      delete Packages.com.googlecode.paradox.Driver;
      $from(io.listFiles(LIB_PATH).files).ends("filename", ".jar").select(function(r) {
          af.externalAddClasspath("file:///" + r.canonicalPath.replace(/\\/g, "/"));
      });
      if (isNull(Packages.openaf.core.DB.drivers.get("jdbc:paradox:"))) {
        Packages.openaf.core.DB.drivers.put("jdbc:paradox:", "com.googlecode.paradox.Driver");
      }
  }

  global.DBparadox = function(aURL, aUser, aPass, aTimeout) {
      _$(aURL).isString().$_("Missing aURL (jdbc:paradox:{{path}}) (docs: https://github.com/leonhad/paradoxdriver)");

      // Docs: https://github.com/leonhad/paradoxdriver
      // URL : jdbc:paradox:{{path}}
      return new DB("com.googlecode.paradox.Driver", aURL, aUser, aPass, aTimeout);
  }
})();
