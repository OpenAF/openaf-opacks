(function() {
  var LIB_PATH = (isDef(getOPackPaths()["jdbc-oracle"]) ? getOPackPaths()["jdbc-oracle"]+"/" : ".");
  if (Object.keys(Packages.oracle.jdbc.OracleDriver).length <= 2) {
      delete Packages.oracle.jdbc.OracleDriver;
      $from(io.listFiles(LIB_PATH).files).ends("filename", ".jar").select(function(r) {
          af.externalAddClasspath("file:///" + r.canonicalPath.replace(/\\/g, "/"));
      });
      if (isNull(Packages.openaf.core.DB.drivers.get("jdbc:oracle:"))) {
        Packages.openaf.core.DB.drivers.put("jdbc:oracle:", "oracle.jdbc.OracleDriver");
      }
  }

  global.DBoracle = function(aURL, aUser, aPass, aTimeout) {
      _$(aURL).isString().$_("Missing aURL (jdbc:oracle:{{type}}:@{{host}}:{{port}}:{{database}}) (docs: https://docs.oracle.com/en/database/oracle/oracle-database/19/jajdb/oracle/jdbc/OracleDriver.html)");

      // Docs: https://docs.oracle.com/en/database/oracle/oracle-database/19/jajdb/oracle/jdbc/OracleDriver.html
      // URL : jdbc:oracle:{{type}}:@{{host}}:{{port}}:{{database}}
      return new DB("oracle.jdbc.OracleDriver", aURL, aUser, aPass, aTimeout);
  }
})();
