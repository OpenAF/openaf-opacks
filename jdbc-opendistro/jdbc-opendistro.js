(function() {
  var LIB_PATH = (isDef(getOPackPaths()["jdbc-opendistro"]) ? getOPackPaths()["jdbc-opendistro"]+"/" : ".");
  if (Object.keys(Packages.org.opensearch.jdbc.Driver).length <= 2) {
      delete Packages.org.opensearch.jdbc.Driver;
      $from(io.listFiles(LIB_PATH).files).ends("filename", ".jar").select(function(r) {
          af.externalAddClasspath("file:///" + r.canonicalPath.replace(/\\/g, "/"));
      });
      if (isNull(Packages.openaf.core.DB.drivers.get("jdbc:opensearch:"))) {
        Packages.openaf.core.DB.drivers.put("jdbc:opensearch:", "org.opensearch.jdbc.Driver");
      }
  }

  global.DBopendistro = function(aURL, aUser, aPass, aTimeout) {
      _$(aURL).isString().$_("Missing aURL (jdbc:opensearch://{{scheme://}}{{host}}{{port}}) (docs: https://github.com/opensearch-project/sql-jdbc?tab&#x3D;readme-ov-file)");

      // Docs: https://github.com/opensearch-project/sql-jdbc?tab&#x3D;readme-ov-file
      // URL : jdbc:opensearch://{{scheme://}}{{host}}{{port}}
      return new DB("org.opensearch.jdbc.Driver", aURL, aUser, aPass, aTimeout);
  }
})();
