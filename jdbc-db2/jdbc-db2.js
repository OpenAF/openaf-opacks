(function() {
  var LIB_PATH = (isDef(getOPackPaths()["jdbc-db2"]) ? getOPackPaths()["jdbc-db2"]+"/" : ".");
  if (Object.keys(Packages.com.ibm.db2.jcc.DB2Driver).length <= 2) {
      delete Packages.com.ibm.db2.jcc.DB2Driver;
      $from(io.listFiles(LIB_PATH).files).ends("filename", ".jar").select(function(r) {
          af.externalAddClasspath("file:///" + r.canonicalPath.replace(/\\/g, "/"));
      });
      if (isNull(Packages.openaf.core.DB.drivers.get("jdbc:db2:"))) {
        Packages.openaf.core.DB.drivers.put("jdbc:db2:", "com.ibm.db2.jcc.DB2Driver");
      }
  }

  global.DBdb2 = function(aURL, aUser, aPass, aTimeout) {
      _$(aURL).isString().$_("Missing aURL (jdbc:db2://{{server}}:{{port}}/{{database}}) (docs: https://www.ibm.com/docs/en/db2/11.5?topic&#x3D;cdsudidsdjs-url-format-data-server-driver-jdbc-sqlj-type-4-connectivity)");

      // Docs: https://www.ibm.com/docs/en/db2/11.5?topic&#x3D;cdsudidsdjs-url-format-data-server-driver-jdbc-sqlj-type-4-connectivity
      // URL : jdbc:db2://{{server}}:{{port}}/{{database}}
      return new DB("com.ibm.db2.jcc.DB2Driver", aURL, aUser, aPass, aTimeout);
  }
})();
