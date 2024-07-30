(function() {
  var LIB_PATH = (isDef(getOPackPaths()["jdbc-drill"]) ? getOPackPaths()["jdbc-drill"]+"/" : ".");
  if (Object.keys(Packages.org.apache.drill.jdbc.Driver).length <= 2) {
      delete Packages.org.apache.drill.jdbc.Driver;
      $from(io.listFiles(LIB_PATH).files).ends("filename", ".jar").select(function(r) {
          af.externalAddClasspath("file:///" + r.canonicalPath.replace(/\\/g, "/"));
      });
      if (isNull(Packages.openaf.core.DB.drivers.get("jdbc:drill:"))) {
        Packages.openaf.core.DB.drivers.put("jdbc:drill:", "org.apache.drill.jdbc.Driver");
      }
  }

  global.DBdrill = function(aURL, aUser, aPass, aTimeout) {
      _$(aURL).isString().$_("Missing aURL (jdbc:drill:zk={{host}}:{{port}}/{{directory}}/{{clusterId}}) (docs: https://drill.apache.org/docs/using-the-jdbc-driver)");

      // Docs: https://drill.apache.org/docs/using-the-jdbc-driver
      // URL : jdbc:drill:zk={{host}}:{{port}}/{{directory}}/{{clusterId}}
      return new DB("org.apache.drill.jdbc.Driver", aURL, aUser, aPass, aTimeout);
  }
})();
