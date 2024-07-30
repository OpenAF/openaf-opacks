(function() {
  var LIB_PATH = (isDef(getOPackPaths()["jdbc-h2"]) ? getOPackPaths()["jdbc-h2"]+"/" : ".");
  if (Object.keys(Packages.org.h2.Driver).length <= 2) {
      delete Packages.org.h2.Driver;
      $from(io.listFiles(LIB_PATH).files).ends("filename", ".jar").select(function(r) {
          af.externalAddClasspath("file:///" + r.canonicalPath.replace(/\\/g, "/"));
      });
      if (isNull(Packages.openaf.core.DB.drivers.get("jdbc:h2:"))) {
        Packages.openaf.core.DB.drivers.put("jdbc:h2:", "org.h2.Driver");
      }
  }

  global.DBh2 = function(aURL, aUser, aPass, aTimeout) {
      _$(aURL).isString().$_("Missing aURL (jdbc:h2:{{file}}) (docs: http://www.h2database.com/html/cheatSheet.html)");

      // Docs: http://www.h2database.com/html/cheatSheet.html
      // URL : jdbc:h2:{{file}}
      return new DB("org.h2.Driver", aURL, aUser, aPass, aTimeout);
  }
})();
