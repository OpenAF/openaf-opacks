(function() {
  var LIB_PATH = (isDef(getOPackPaths()["jdbc-postgresql"]) ? getOPackPaths()["jdbc-postgresql"]+"/" : ".");
  if (Object.keys(Packages.org.postgresql.Driver).length <= 2) {
      delete Packages.org.postgresql.Driver;
      $from(io.listFiles(LIB_PATH).files).ends("filename", ".jar").select(function(r) {
          af.externalAddClasspath("file:///" + r.canonicalPath.replace(/\\/g, "/"));
      });
      if (isNull(Packages.openaf.core.DB.drivers.get("jdbc:postgresql:"))) {
        Packages.openaf.core.DB.drivers.put("jdbc:postgresql:", "org.postgresql.Driver");
      }
  }

  global.DBpostgresql = function(aURL, aUser, aPass, aTimeout) {
      _$(aURL).isString().$_("Missing aURL (jdbc:postgresql://{{host}}:{{port}}/{{database}}) (docs: https://jdbc.postgresql.org/documentation/head/connect.html)");

      // Docs: https://jdbc.postgresql.org/documentation/head/connect.html
      // URL : jdbc:postgresql://{{host}}:{{port}}/{{database}}
      return new DB("org.postgresql.Driver", aURL, aUser, aPass, aTimeout);
  }
})();
