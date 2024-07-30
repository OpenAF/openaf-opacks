(function() {
  var LIB_PATH = (isDef(getOPackPaths()["jdbc-odbc"]) ? getOPackPaths()["jdbc-odbc"]+"/" : ".");
  if (Object.keys(Packages.sun.jdbc.odbc.JdbcOdbcDriver).length <= 2) {
      delete Packages.sun.jdbc.odbc.JdbcOdbcDriver;
      $from(io.listFiles(LIB_PATH).files).ends("filename", ".jar").select(function(r) {
          af.externalAddClasspath("file:///" + r.canonicalPath.replace(/\\/g, "/"));
      });
      if (isNull(Packages.openaf.core.DB.drivers.get("jdbc:odbc:"))) {
        Packages.openaf.core.DB.drivers.put("jdbc:odbc:", "sun.jdbc.odbc.JdbcOdbcDriver");
      }
  }

  global.DBodbc = function(aURL, aUser, aPass, aTimeout) {
      _$(aURL).isString().$_("Missing aURL (jdbc:odbc:{{db}}) (docs: https://www.oracle.com/database/technologies/maven-central-guide.html)");

      // Docs: https://www.oracle.com/database/technologies/maven-central-guide.html
      // URL : jdbc:odbc:{{db}}
      return new DB("sun.jdbc.odbc.JdbcOdbcDriver", aURL, aUser, aPass, aTimeout);
  }
})();
