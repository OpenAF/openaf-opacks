(function() {
  var LIB_PATH = (isDef(getOPackPaths()["jdbc-trino"]) ? getOPackPaths()["jdbc-trino"]+"/" : ".");
  if (Object.keys(Packages.io.trino.jdbc.TrinoDriver).length <= 2) {
      delete Packages.io.trino.jdbc.TrinoDriver;
      $from(io.listFiles(LIB_PATH).files).ends("filename", ".jar").select(function(r) {
          af.externalAddClasspath("file:///" + r.canonicalPath.replace(/\\/g, "/"));
      });
      if (isNull(Packages.openaf.core.DB.drivers.get("jdbc:trino:"))) {
        Packages.openaf.core.DB.drivers.put("jdbc:trino:", "io.trino.jdbc.TrinoDriver");
      }
  }

  global.DBtrino = function(aURL, aUser, aPass, aTimeout) {
      _$(aURL).isString().$_("Missing aURL (jdbc:trino:{{host}}:{{port}}/{{catalog}}/{{schema}}) (docs: https://trino.io/docs/current/client/jdbc.html)");

      // Docs: https://trino.io/docs/current/client/jdbc.html
      // URL : jdbc:trino:{{host}}:{{port}}/{{catalog}}/{{schema}}
      return new DB("io.trino.jdbc.TrinoDriver", aURL, aUser, aPass, aTimeout);
  }
})();
