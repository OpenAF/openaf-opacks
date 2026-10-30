// Invoked in a separate OpenAF process to exercise the actual oafp engine.
try {
var base = String(java.lang.System.getProperty('user.dir'));
require(base + '/grpc.js').install(base);
loadOAFP();
var config = jsonParse(String(java.lang.System.getenv('GRPC_OAFP_PARAMS')));
oafp(config);
} catch(error) { printErr(error); printErr(error.stack); exit(1); }
