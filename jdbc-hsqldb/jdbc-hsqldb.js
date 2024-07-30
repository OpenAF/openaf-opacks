(function() {
  var LIB_PATH = (isDef(getOPackPaths()["jdbc-hsqldb"]) ? getOPackPaths()["jdbc-hsqldb"]+"/" : ".");
  if (Object.keys(Packages.org.hsqldb.jdbc.JDBCDriver).length <= 2) {
      delete Packages.org.hsqldb.jdbc.JDBCDriver;
      $from(io.listFiles(LIB_PATH).files).ends("filename", ".jar").select(function(r) {
          af.externalAddClasspath("file:///" + r.canonicalPath.replace(/\\/g, "/"));
      });
      if (isNull(Packages.openaf.core.DB.drivers.get("jdbc:hsqldb:"))) {
        Packages.openaf.core.DB.drivers.put("jdbc:hsqldb:", "org.hsqldb.jdbc.JDBCDriver");
      }
  }

  global.DBhsqldb = function(aURL, aUser, aPass, aTimeout) {
      _$(aURL).isString().$_("Missing aURL (jdbc:hsqldb:{{file}}) (docs: http://hsqldb.org/doc/2.0/guide/dataaccess-chapt.html#dac_jdbc_overview)");

      // Docs: http://hsqldb.org/doc/2.0/guide/dataaccess-chapt.html#dac_jdbc_overview
      // URL : jdbc:hsqldb:{{file}}
      return new DB("org.hsqldb.jdbc.JDBCDriver", aURL, aUser, aPass, aTimeout);
  }
})();
