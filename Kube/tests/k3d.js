// Use bash tests/k3d.sh: this suite only accepts its disposable cluster context.
var kube, failed = false, passed = 0;
function check(value, message) {
  if (!value) throw new Error(message);
}
function test(name, fn) {
  try {
    fn();
    passed++;
    print("PASS " + name);
  } catch (e) {
    failed = true;
    printErr("FAIL " + name + ": " + e);
  }
}
function eventually(message, fn) {
  var deadline = now() + 120000;
  while (now() < deadline) {
    if (fn()) return;
    sleep(1000, true);
  }
  throw new Error("Timed out: " + message);
}
function descriptor(kind, plural, version) {
  return { apiVersion: version || "v1", kind: kind, plural: plural, namespaced: true };
}
try {
  ow.loadObj();
  var config = getEnv("KUBE_TEST_CONFIG"), context = getEnv("KUBE_TEST_CONTEXT");
  check(isString(config) && io.fileExists(config), "Run via tests/k3d.sh");
  check(isString(context) && context.indexOf("k3d-kube-test-") == 0, "Expected disposable k3d context");
  check(io.readFileYAML(config)["current-context"] == context, "Unexpected kubeconfig context");
  // Force both source and JARs from this checkout, even if Kube is installed elsewhere.
  var originalGetOPackPath = getOPackPath;
  getOPackPath = function(name) {
    return name.toLowerCase() == "kube" ? String(new java.io.File(".").getCanonicalPath()) : originalGetOPackPath(name);
  };
  load("kube.js");
  kube = $kube({ url: config }).ns("kube-integration");
  var ns = "kube-integration", cm = descriptor("ConfigMap", "configmaps");
  test("namespace create and list", function() {
    kube.apply({ apiVersion: "v1", kind: "Namespace", metadata: { name: ns } });
    check(kube.getNS().some(function(n) { return n.Metadata.Name == ns; }), "Namespace missing");
  });
  test("ConfigMap apply, get, update and list", function() {
    var obj = { apiVersion: "v1", kind: "ConfigMap", metadata: { name: "settings", namespace: ns }, data: { message: "first" } };
    kube.apply(obj);
    check(kube.get(cm, "settings").data.message == "first", "Initial data missing");
    obj.data.message = "updated";
    kube.applyObject(obj);
    check(kube.get(cm, "settings").data.message == "updated", "Update missing");
    check(kube.list(cm, ns, true).items.some(function(o) { return o.metadata.name == "settings"; }), "Generic list missing ConfigMap");
    check(kube.getCM().some(function(o) { return o.Metadata.Name == "settings"; }), "Typed list missing ConfigMap");
  });
  test("deployment readiness, logs and repeated exec", function() {
    kube.apply({ apiVersion: "apps/v1", kind: "Deployment", metadata: { name: "worker", namespace: ns }, spec: {
      replicas: 1, selector: { matchLabels: { app: "kube-test" } }, template: {
        metadata: { labels: { app: "kube-test" } }, spec: { containers: [{ name: "worker", image: getEnv("KUBE_TEST_IMAGE"),
          command: ["sh", "-c", "echo kube-test-ready; sleep 3600"] }] }
      }
    } });
    var pod;
    eventually("worker ready", function() {
      var pods = kube.getFPO().items || [];
      pod = pods.filter(function(p) { return p.status && (p.status.conditions || []).some(function(c) {
        return c.type == "Ready" && c.status == "True";
      }); })[0];
      return isDef(pod);
    });
    check(kube.getLog(ns, pod.metadata.name, "worker").indexOf("kube-test-ready") >= 0, "Missing log output");
    ["first", "second"].forEach(function(value) {
      check(String(kube.exec(pod.metadata.name, ["echo", value], 10000, false, "worker")).trim() == value, "Exec output mismatch: " + value);
    });
  });
  test("deployment scale down", function() {
    kube.scale("deploy", "worker", 0);
    eventually("deployment scaled to zero", function() {
      var deployment = kube.get(descriptor("Deployment", "deployments", "apps/v1"), "worker");
      return deployment.spec.replicas == 0 && (kube.getFPO().items || []).length == 0;
    });
  });
  test("generic delete", function() {
    check(kube.deleteObject(cm, "settings"), "Delete request failed");
    eventually("ConfigMap deleted", function() {
      return !(kube.list(cm, ns, true).items || []).some(function(o) { return o.metadata.name == "settings"; });
    });
  });
  test("manifest delete", function() {
    check(kube.delete({ apiVersion: "apps/v1", kind: "Deployment", metadata: { name: "worker", namespace: ns } }), "Deployment delete failed");
    eventually("deployment deleted", function() { return (kube.getFDeploy().items || []).length == 0; });
  });
} catch (e) {
  failed = true;
  printErr(e);
} finally {
  if (isDef(kube)) {
    try { kube.close(); } catch (e) { failed = true; printErr(e); }
  }
}
print("Kube k3d integration: " + passed + "/6 passed");
exit(failed ? 1 : 0);
