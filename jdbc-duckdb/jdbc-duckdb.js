(function() {
  var LIB_PATH = (isDef(getOPackPaths()["jdbc-duckdb"]) ? getOPackPaths()["jdbc-duckdb"]+"/" : ".");
  if (Object.keys(Packages.org.duckdb.DuckDBDriver).length <= 2) {
      delete Packages.org.duckdb.DuckDBDriver;
      $from(io.listFiles(LIB_PATH).files).ends("filename", ".jar").select(function(r) {
          af.externalAddClasspath("file:///" + r.canonicalPath.replace(/\\/g, "/"));
      });
      if (isNull(Packages.openaf.core.DB.drivers.get("jdbc:duckdb:"))) {
        Packages.openaf.core.DB.drivers.put("jdbc:duckdb:", "org.duckdb.DuckDBDriver");
      }
  }

  global.DBduckdb = function(aURL, aUser, aPass, aTimeout) {
      _$(aURL).isString().$_("Missing aURL (jdbc:duckdb:{{file}}) (docs: https://github.com/duckdb/duckdb-java)");

      // Docs: https://github.com/duckdb/duckdb-java
      // URL : jdbc:duckdb:{{file}}
      return new DB("org.duckdb.DuckDBDriver", aURL, aUser, aPass, aTimeout);
  }
})();
