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
var deleted = new java.util.ArrayList(), deleteCalls = [];
kube.__getGenericResourceClient = function(ns, resource) {
  check(ns, "test-ns", "delete namespace");
  check(resource.kind, "ConfigMap", "delete resource kind");
  return { withName: function(name) {
    check(name, "settings", "delete resource name");
    return {
      delete: function() { throw new Error("Ambiguous delete overload used"); },
      "delete()": function() { deleteCalls.push(name); return deleted; }
    };
  } };
};
check(kube.deleteObject("test-ns", { kind: "ConfigMap" }, "settings"), false, "absent resource returns false");
deleted.add("settings");
check(kube.deleteObject("test-ns", { kind: "ConfigMap" }, "settings"), true, "deleted resource returns true");
check(deleteCalls.length, 2, "both delete requests invoked");
print("PASS Kube regression");
} catch(e) { printErr(e); exit(1); }
