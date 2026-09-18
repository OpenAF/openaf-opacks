// Run from this opack directory: oaf -f tests/regression.js
try {
  load("jdbc-yugabytedb.js");
  var driver = String(Packages.openaf.core.DB.drivers.get("jdbc:yugabytedb:"));
  if (driver != "com.yugabyte.Driver") throw new Error("Wrong registered driver: " + driver);
  if (!(new Packages.com.yugabyte.Driver()).acceptsURL("jdbc:yugabytedb://localhost/test")) throw new Error("Driver rejects documented URL");
  var call;
  new Function("DB", io.readFileString("jdbc-yugabytedb.js"))(function(name, url) { call = [name, url]; });
  DByugabytedb("jdbc:yugabytedb://localhost/test");
  if (call[0] != driver) throw new Error("Convenience wrapper uses wrong driver");
  print("PASS jdbc-yugabytedb regression");
} catch(e) { printErr(e); exit(1); }
