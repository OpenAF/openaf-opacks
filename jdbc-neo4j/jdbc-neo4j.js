(function() {
  var LIB_PATH = (isDef(getOPackPaths()["jdbc-neo4j"]) ? getOPackPaths()["jdbc-neo4j"]+"/" : ".");
  if (Object.keys(Packages.org.neo4j.jdbc.Neo4jDriver).length <= 2) {
      delete Packages.org.neo4j.jdbc.Neo4jDriver;
      $from(io.listFiles(LIB_PATH).files).ends("filename", ".jar").select(function(r) {
          af.externalAddClasspath("file:///" + r.canonicalPath.replace(/\\/g, "/"));
      });
      if (isNull(Packages.openaf.core.DB.drivers.get("jdbc:neo4j:"))) {
        Packages.openaf.core.DB.drivers.put("jdbc:neo4j:", "org.neo4j.jdbc.Neo4jDriver");
      }
  }

  global.DBneo4j = function(aURL, aUser, aPass, aTimeout) {
      _$(aURL).isString().$_("Missing aURL (jdbc:neo4j://{{host}}:{{port}}/{{database}}) (docs: https://neo4j.com/docs/jdbc-manual/current/)");

      // Docs: https://neo4j.com/docs/jdbc-manual/current/
      // URL : jdbc:neo4j://{{host}}:{{port}}/{{database}}
      return new DB("org.neo4j.jdbc.Neo4jDriver", aURL, aUser, aPass, aTimeout);
  }
})();
