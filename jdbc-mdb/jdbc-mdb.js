(function() {
  var LIB_PATH = (isDef(getOPackPaths()["jdbc-mdb"]) ? getOPackPaths()["jdbc-mdb"]+"/" : ".");
  if (Object.keys(Packages.net.ucanaccess.jdbc.UcanaccessDriver).length <= 2) {
      delete Packages.net.ucanaccess.jdbc.UcanaccessDriver;
      $from(io.listFiles(LIB_PATH).files).ends("filename", ".jar").select(function(r) {
          af.externalAddClasspath("file:///" + r.canonicalPath.replace(/\\/g, "/"));
      });
      if (isNull(Packages.openaf.core.DB.drivers.get("jdbc:ucanaccess:"))) {
        Packages.openaf.core.DB.drivers.put("jdbc:ucanaccess:", "net.ucanaccess.jdbc.UcanaccessDriver");
      }
  }

  global.DBmdb = function(aURL, aUser, aPass, aTimeout) {
      _$(aURL).isString().$_("Missing aURL (jdbc:ucanaccess://{{file}};memory=false) (docs: http://ucanaccess.sourceforge.net/site.html)");

      // Docs: http://ucanaccess.sourceforge.net/site.html
      // URL : jdbc:ucanaccess://{{file}};memory=false
      return new DB("net.ucanaccess.jdbc.UcanaccessDriver", aURL, aUser, aPass, aTimeout);
  }
})();
