(function() {
  var LIB_PATH = (isDef(getOPackPaths()["jdbc-sqlserver"]) ? getOPackPaths()["jdbc-sqlserver"]+"/" : ".");
  if (Object.keys(Packages.com.microsoft.sqlserver.jdbc.SQLServerDriver).length <= 2) {
      delete Packages.com.microsoft.sqlserver.jdbc.SQLServerDriver;
      $from(io.listFiles(LIB_PATH).files).ends("filename", ".jar").select(function(r) {
          af.externalAddClasspath("file:///" + r.canonicalPath.replace(/\\/g, "/"));
      });
      if (isNull(Packages.openaf.core.DB.drivers.get("jdbc:sqlserver:"))) {
        Packages.openaf.core.DB.drivers.put("jdbc:sqlserver:", "com.microsoft.sqlserver.jdbc.SQLServerDriver");
      }
  }

  global.DBsqlserver = function(aURL, aUser, aPass, aTimeout) {
      _$(aURL).isString().$_("Missing aURL (jdbc:sqlserver://{{server}}:{{port}};databaseName={{databaseName}}) (docs: https://docs.microsoft.com/en-us/sql/connect/jdbc/microsoft-jdbc-driver-for-sql-server)");

      // Docs: https://docs.microsoft.com/en-us/sql/connect/jdbc/microsoft-jdbc-driver-for-sql-server
      // URL : jdbc:sqlserver://{{server}}:{{port}};databaseName={{databaseName}}
      return new DB("com.microsoft.sqlserver.jdbc.SQLServerDriver", aURL, aUser, aPass, aTimeout);
  }
})();
