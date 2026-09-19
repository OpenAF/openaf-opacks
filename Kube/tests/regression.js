try {
// Run from this opack directory: oaf -f tests/regression.js
// External services are replaced with deterministic test doubles.
ow.loadObj();
function check(actual, expected, message) {
  if (stringify(actual) != stringify(expected)) throw new Error(message + ": " + stringify(actual));
}
load("kube.js");
var kube = Object.create(Kube.prototype), scaled = [], ready = false;
kube.getDeployments = function() { return [{ Kind: "Deployment", Metadata: { Name: "app" }, Status: { Replicas: ready ? 1 : 0, ReadyReplicas: ready ? 1 : 0 } }]; };
kube.getStatefulSets = function() { return []; };
kube.scale = function(ns, type, name, replicas) { scaled.push([ns, type, name, replicas]); ready = true; };
kube.scaleWithDeps("default", ["app"], __, 100, 0);
check(scaled, [["default", "deploy", "app", 1]], "string entry normalized and scaled once with default scaleDown");
print("PASS Kube regression");
} catch(e) { printErr(e); exit(1); }
