(function() {
  var LIB_PATH = (isDef(getOPackPaths()["jdbc-csv"]) ? getOPackPaths()["jdbc-csv"]+"/" : ".");
  if (Object.keys(Packages.org.xbib.jdbc.csv.CsvDriver).length <= 2) {
      delete Packages.org.xbib.jdbc.csv.CsvDriver;
      $from(io.listFiles(LIB_PATH).files).ends("filename", ".jar").select(function(r) {
          af.externalAddClasspath("file:///" + r.canonicalPath.replace(/\\/g, "/"));
      });
      if (isNull(Packages.openaf.core.DB.drivers.get("jdbc:xbib:"))) {
        Packages.openaf.core.DB.drivers.put("jdbc:xbib:", "org.xbib.jdbc.csv.CsvDriver");
      }
  }

  global.DBcsv = function(aURL, aUser, aPass, aTimeout) {
      _$(aURL).isString().$_("Missing aURL (jdbc:xbib:csv:{{folder}}) (docs: https://github.com/jprante/jdbc-driver-csv)");

      // Docs: https://github.com/jprante/jdbc-driver-csv
      // URL : jdbc:xbib:csv:{{folder}}
      return new DB("org.xbib.jdbc.csv.CsvDriver", aURL, aUser, aPass, aTimeout);
  }
})();
