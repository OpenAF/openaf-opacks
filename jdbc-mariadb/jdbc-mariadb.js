(function() {
  var LIB_PATH = (isDef(getOPackPaths()["jdbc-mariadb"]) ? getOPackPaths()["jdbc-mariadb"]+"/" : ".");
  if (Object.keys(Packages.org.mariadb.jdbc.Driver).length <= 2) {
      delete Packages.org.mariadb.jdbc.Driver;
      $from(io.listFiles(LIB_PATH).files).ends("filename", ".jar").select(function(r) {
          af.externalAddClasspath("file:///" + r.canonicalPath.replace(/\\/g, "/"));
      });
      if (isNull(Packages.openaf.core.DB.drivers.get("jdbc:mariadb:"))) {
        Packages.openaf.core.DB.drivers.put("jdbc:mariadb:", "org.mariadb.jdbc.Driver");
      }
  }

  global.DBmariadb = function(aURL, aUser, aPass, aTimeout) {
      _$(aURL).isString().$_("Missing aURL (jdbc:mariadb://{{host}}:{{port}}/{{database}}) (docs: https://mariadb.com/kb/en/about-mariadb-connector-j)");

      // Docs: https://mariadb.com/kb/en/about-mariadb-connector-j
      // URL : jdbc:mariadb://{{host}}:{{port}}/{{database}}
      return new DB("org.mariadb.jdbc.Driver", aURL, aUser, aPass, aTimeout);
  }
})();
