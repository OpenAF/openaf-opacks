(function() {
  var LIB_PATH = (isDef(getOPackPaths()["jdbc-yugabytedb"]) ? getOPackPaths()["jdbc-yugabytedb"]+"/" : ".");
  if (Object.keys(Packages.com.yugabyte.Driver).length <= 2) {
      delete Packages.com.yugabyte.Driver;
      $from(io.listFiles(LIB_PATH).files).ends("filename", ".jar").select(function(r) {
          af.externalAddClasspath("file:///" + r.canonicalPath.replace(/\\/g, "/"));
      });
      if (isNull(Packages.openaf.core.DB.drivers.get("jdbc:yugabytedb:"))) {
        Packages.openaf.core.DB.drivers.put("jdbc:yugabytedb:", "com.yugabyte.Driver");
      }
  }

  global.DByugabytedb = function(aURL, aUser, aPass, aTimeout) {
      _$(aURL).isString().$_("Missing aURL (jdbc:yugabytedb://{{host}}:{{port}}/{{database}}) (docs: https://github.com/yugabyte/jdbc-yugabytedb)");

      // Docs: https://github.com/yugabyte/jdbc-yugabytedb
      // URL : jdbc:yugabytedb://{{host}}:{{port}}/{{database}}
      return new DB("com.yugabyte.Driver", aURL, aUser, aPass, aTimeout);
  }
})();
