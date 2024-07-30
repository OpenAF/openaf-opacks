(function() {
  var LIB_PATH = (isDef(getOPackPaths()["jdbc-couchbaseanalytics"]) ? getOPackPaths()["jdbc-couchbaseanalytics"]+"/" : ".");
  if (Object.keys(Packages.com.couchbase.client.jdbc.CouchbaseDriver).length <= 2) {
      delete Packages.com.couchbase.client.jdbc.CouchbaseDriver;
      $from(io.listFiles(LIB_PATH).files).ends("filename", ".jar").select(function(r) {
          af.externalAddClasspath("file:///" + r.canonicalPath.replace(/\\/g, "/"));
      });
      if (isNull(Packages.openaf.core.DB.drivers.get("jdbc:couchbase:"))) {
        Packages.openaf.core.DB.drivers.put("jdbc:couchbase:", "com.couchbase.client.jdbc.CouchbaseDriver");
      }
  }

  global.DBcouchbaseanalytics = function(aURL, aUser, aPass, aTimeout) {
      _$(aURL).isString().$_("Missing aURL (jdbc:couchbase:analytics:{{host}}/{{catalog}}/{{schema}}) (docs: https://github.com/couchbaselabs/couchbase-jdbc-driver)");

      // Docs: https://github.com/couchbaselabs/couchbase-jdbc-driver
      // URL : jdbc:couchbase:analytics:{{host}}/{{catalog}}/{{schema}}
      return new DB("com.couchbase.client.jdbc.CouchbaseDriver", aURL, aUser, aPass, aTimeout);
  }
})();
