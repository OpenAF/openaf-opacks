(function() {
  var LIB_PATH = (isDef(getOPackPaths()["jdbc-neptune"]) ? getOPackPaths()["jdbc-neptune"]+"/" : ".");
  if (Object.keys(Packages.software.aws.neptune.NeptuneDriver).length <= 2) {
      delete Packages.software.aws.neptune.NeptuneDriver;
      $from(io.listFiles(LIB_PATH).files).ends("filename", ".jar").select(function(r) {
          af.externalAddClasspath("file:///" + r.canonicalPath.replace(/\\/g, "/"));
      });
      if (isNull(Packages.openaf.core.DB.drivers.get("jdbc:neptune:"))) {
        Packages.openaf.core.DB.drivers.put("jdbc:neptune:", "software.aws.neptune.NeptuneDriver");
      }
  }

  global.DBneptune = function(aURL, aUser, aPass, aTimeout) {
      _$(aURL).isString().$_("Missing aURL (jdbc:neptune:opencypher://{{host}}:{{port}}) (docs: https://github.com/aws/amazon-neptune-jdbc-driver)");

      // Docs: https://github.com/aws/amazon-neptune-jdbc-driver
      // URL : jdbc:neptune:opencypher://{{host}}:{{port}}
      return new DB("software.aws.neptune.NeptuneDriver", aURL, aUser, aPass, aTimeout);
  }
})();
