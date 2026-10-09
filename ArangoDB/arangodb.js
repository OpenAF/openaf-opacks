/**
 * <odoc>
 * <key>ArangoDB.ArangoDB(aHost, aPort, aDatabase, aUser, aPass, aUseSSL)</key>
 * Creates a new ArangoDB wrapper instance.
 * </odoc>
 */
var ArangoDB = function(aHost, aPort, aDatabase, aUser, aPass, aUseSSL) {
  var path = getOPackPath("ArangoDB") || ".";
  $path(io.listFiles(path).files, "[?ends_with(filename, '.jar') == `true`].canonicalPath").forEach((v) => {
    af.externalAddClasspath("file:///" + v.replace(/\\/g, "/"));
  });

  this.host = _$(aHost).isString().default("127.0.0.1");
  this.port = _$(aPort).isNumber().default(8529);
  this.database = _$(aDatabase).isString().default("_system");
  this.user = _$(aUser).isString().default("root");
  this.pass = _$(aPass).default("");
  this.useSSL = _$(aUseSSL).isBoolean().default(false);

  var builder = new Packages.com.arangodb.ArangoDB.Builder()
    .host(this.host, this.port)
    .user(this.user)
    .password(String(this.pass))
    .useSsl(this.useSSL);

  this.__adb = builder.build();
  this.__db = this.__adb.db(this.database);
};

/**
 * <odoc>
 * <key>ArangoDB.query(aAQL, aBindVars) : Array</key>
 * Executes the provided AQL query and returns an array with results.
 * </odoc>
 */
ArangoDB.prototype.query = function(aAQL, aBindVars) {
  _$(aAQL).isString().$_("Please provide an AQL query.");

  var vars = isDef(aBindVars) ? af.toJavaMap(aBindVars) : new java.util.HashMap();
  var cursor = this.__db.query(aAQL, vars, null, java.util.Map.class);
  var res = [];

  while(cursor.hasNext()) {
    res.push(af.fromJavaMap(cursor.next()));
  }

  return res;
};

ArangoDB.prototype.getDatabase = function() {
  return this.__db;
};

ArangoDB.prototype.getObj = function() {
  return this.__adb;
};

ArangoDB.prototype.close = function() {
  this.__adb.shutdown();
};

