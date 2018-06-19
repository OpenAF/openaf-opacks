ow.loadServer();

var packPath = getOPackPath("CopyFiles") || ".";
var separator = (isDefined(getOPackPath("CopyFiles"))) ? " " : ";";

var params = processExpr(separator);

var TEST = (isDefined(params.test)) ? true : false;
var NOT = (isDefined(params.not)) ? true : false;
var ONLYNEW = (isDefined(params.onlynew)) ? true : false;
var EXCLUDEFILE = (isDefined(params.excludefile)) ? params.excludefile : undefined;
var FILTER = undefined;
var NUMTHREADS = (isDef(NUMTHREADS)) ? NUMTHREADS : getNumberOfCores();

if (isDefined(params.filter)) {
   if (isDefined(params.filterParam))
      FILTER = new RegExp(params.filter, params.filterParam);
   else
      FILTER = new RegExp(params.filter);
}
var KEY = (isDefined(params.key)) ? params.key : undefined;

if (isDefined(params.config)) {
   ow.server.checkIn(packPath + "/" + params.config + ".pid", function() {
      log("CopyFiles for configuration " + params.config + " is already running.");
      return false;
   }, function() {
      log("Done");
   })
   log("Loading configuration '" + params.config + "'");
   load(packPath + "/" + params.config);
   load(packPath + "/lib/copyFiles.js");
} else {
   print("Please provide a configuration to be used: opack exec CopyFiles config=myconfig.js");
   print("To build one you can find a sample in " + packPath + "/sample.js. Do place any of your configuration files also in " + packPath);
   print("");
}
