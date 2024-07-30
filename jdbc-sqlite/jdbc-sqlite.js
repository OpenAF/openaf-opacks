(function() {
  var LIB_PATH = (isDef(getOPackPaths()["jdbc-sqlite"]) ? getOPackPaths()["jdbc-sqlite"]+"/" : ".");
  if (Object.keys(Packages.org.sqlite.JDBC).length <= 2) {
      delete Packages.org.sqlite.JDBC;
      $from(io.listFiles(LIB_PATH).files).ends("filename", ".jar").select(function(r) {
          af.externalAddClasspath("file:///" + r.canonicalPath.replace(/\\/g, "/"));
      });
      if (isNull(Packages.openaf.core.DB.drivers.get("jdbc:sqlite:"))) {
        Packages.openaf.core.DB.drivers.put("jdbc:sqlite:", "org.sqlite.JDBC");
      }
  }

  global.DBsqlite = function(aURL, aUser, aPass, aTimeout) {
      _$(aURL).isString().$_("Missing aURL (jdbc:sqlite:{{file}}) (docs: https://github.com/xerial/sqlite-jdbc)");

      // Docs: https://github.com/xerial/sqlite-jdbc
      // URL : jdbc:sqlite:{{file}}
      return new DB("org.sqlite.JDBC", aURL, aUser, aPass, aTimeout);
  }
})();
