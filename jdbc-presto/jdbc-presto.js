(function() {
  var LIB_PATH = (isDef(getOPackPaths()["jdbc-presto"]) ? getOPackPaths()["jdbc-presto"]+"/" : ".");
  if (Object.keys(Packages.com.facebook.presto.jdbc.PrestoDriver).length <= 2) {
      delete Packages.com.facebook.presto.jdbc.PrestoDriver;
      $from(io.listFiles(LIB_PATH).files).ends("filename", ".jar").select(function(r) {
          af.externalAddClasspath("file:///" + r.canonicalPath.replace(/\\/g, "/"));
      });
      if (isNull(Packages.openaf.core.DB.drivers.get("jdbc:presto:"))) {
        Packages.openaf.core.DB.drivers.put("jdbc:presto:", "com.facebook.presto.jdbc.PrestoDriver");
      }
  }

  global.DBpresto = function(aURL, aUser, aPass, aTimeout) {
      _$(aURL).isString().$_("Missing aURL (jdbc:presto:{{host}}:{{port}}/{{catalog}}/{{schema}}) (docs: https://prestodb.io/docs/current/installation/jdbc.html)");

      // Docs: https://prestodb.io/docs/current/installation/jdbc.html
      // URL : jdbc:presto:{{host}}:{{port}}/{{catalog}}/{{schema}}
      return new DB("com.facebook.presto.jdbc.PrestoDriver", aURL, aUser, aPass, aTimeout);
  }
})();
