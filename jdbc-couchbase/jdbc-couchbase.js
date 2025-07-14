(function() {
  var LIB_PATH = (isDef(getOPackPaths()["jdbc-couchbase"]) ? getOPackPaths()["jdbc-couchbase"]+"/" : ".");
  if (Object.keys(Packages.com.couchbase.jdbc.CBDriver).length <= 2) {
      delete Packages.com.couchbase.jdbc.CBDriver;
      $from(io.listFiles(LIB_PATH).files).ends("filename", ".jar").select(function(r) {
          af.externalAddClasspath("file:///" + r.canonicalPath.replace(/\\/g, "/"));
      });
      if (isNull(Packages.openaf.core.DB.drivers.get("jdbc:couchbase:"))) {
        Packages.openaf.core.DB.drivers.put("jdbc:couchbase:", "com.couchbase.jdbc.CBDriver");
      }
  }

  global.DBcouchbase = function(aURL, aUser, aPass, aTimeout) {
      _$(aURL).isString().$_("Missing aURL (jdbc:couchbase://{{host}}:{{port}}) (docs: https://github.com/jdbc-json/jdbc-cb)");

      // Docs: https://github.com/jdbc-json/jdbc-cb
      // URL : jdbc:couchbase://{{host}}:{{port}}
      return new DB("com.couchbase.jdbc.CBDriver", aURL, aUser, aPass, aTimeout);
  }
})();
