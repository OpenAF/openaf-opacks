try {
// Run from this opack directory: oaf -f tests/regression.js
// External services are replaced with deterministic test doubles.
ow.loadObj();
function check(actual, expected, message) {
  if (stringify(actual) != stringify(expected)) throw new Error(message + ": " + stringify(actual));
}
var Docker = new Function("loadExternalJars", io.readFileString("docker.js") + ";return Docker;")(function() {});
var docker = Object.create(Docker.prototype);
var config = { NetworkingConfig: { EndpointsConfig: { first: { Aliases: ["alias"] } } } };
check(docker.extraNetwork(config, "second"), { NetworkingConfig: { EndpointsConfig: { first: { Aliases: ["alias"] }, second: {} } } }, "adding a network preserves existing endpoints");
check(docker.extraNetwork(config, "first").NetworkingConfig.EndpointsConfig.first.Aliases, ["alias"], "existing endpoint settings retained");
check(docker.extraNetwork(__, "new").NetworkingConfig.EndpointsConfig, { new: {} }, "creates config when omitted");
print("PASS Docker regression");
} catch(e) { printErr(e); exit(1); }
