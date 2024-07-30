(function() {
  var LIB_PATH = (isDef(getOPackPaths()["jdbc-mysql"]) ? getOPackPaths()["jdbc-mysql"]+"/" : ".");
  if (Object.keys(Packages.com.mysql.cj.jdbc.Driver).length <= 2) {
      delete Packages.com.mysql.cj.jdbc.Driver;
      $from(io.listFiles(LIB_PATH).files).ends("filename", ".jar").select(function(r) {
          af.externalAddClasspath("file:///" + r.canonicalPath.replace(/\\/g, "/"));
      });
      if (isNull(Packages.openaf.core.DB.drivers.get("jdbc:mysql:"))) {
        Packages.openaf.core.DB.drivers.put("jdbc:mysql:", "com.mysql.cj.jdbc.Driver");
      }
  }

  global.DBmysql = function(aURL, aUser, aPass, aTimeout) {
      _$(aURL).isString().$_("Missing aURL (jdbc:mysql://{{host}}:{{port}}/{{database}}) (docs: https://dev.mysql.com/doc/connector-j/en/connector-j-reference-jdbc-url-format.html)");

      // Docs: https://dev.mysql.com/doc/connector-j/en/connector-j-reference-jdbc-url-format.html
      // URL : jdbc:mysql://{{host}}:{{port}}/{{database}}
      return new DB("com.mysql.cj.jdbc.Driver", aURL, aUser, aPass, aTimeout);
  }
})();
