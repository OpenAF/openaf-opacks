# Kube

Kube oPack encapsulating a Kubernetes client.

## Install and using it

### Installing

```
opack install kube
```

> In some cases you might also need to install BouncyCastle crypto libs: ```opack install BouncyCastle```

### Using it

First, load the library:

```javascript
loadLib("kube.js")
```

Getting a list of all namespaces:

```javascript
$kube().getNS() // get all namespaces
```

Getting a list of all pods in a namespace:

```javascript
$kube().getFPO("kube-system") // get all pods in the kube-system namespace
```

Creating/Deleting a namespace:

```javascript
var def = {
  "apiVersion": "v1",
  "kind": "Namespace",
  "metadata": {
    "labels": {
      "kubernetes.io/metadata.name": "test"
    },
    "name": "test"
  }
}

$kube().apply(def) // Creating a namespace
$kube().delete(def) // Deleting a namespace
```

> You can transform an existing YAML definition into a JSON by executing: ```var def = io.readFileYAML('myobj.yaml')```

Getting a list of all horizontal pod autoscalers in a namespace:

```javascript
$kube().getHPAs("default")
$kube().getHPA("my-hpa", "default")
```

Getting a list of custom resource objects:

```javascript
$kube().list({
  apiVersion: "argoproj.io/v1alpha1",
  kind: "Application",
  plural: "applications",
  namespaced: true
}, "argocd")
```

Getting and deleting a custom resource object:

```javascript
$kube().get({
  apiVersion: "argoproj.io/v1alpha1",
  kind: "Application",
  plural: "applications",
  namespaced: true
}, "guestbook", "argocd")

$kube().deleteObject({
  apiVersion: "argoproj.io/v1alpha1",
  kind: "Application",
  plural: "applications",
  namespaced: true
}, "guestbook", "argocd")
```

## Corrections (2026-09-18)

`scaleWithDeps` accepts resource maps or deployment-name strings and defaults `scaleDown` to `false`. Pod exec calls keep their completion waiters local to each call.

Run the service-independent regression checks from this directory:

```sh
oaf -f tests/regression.js
```

These checks use local fixtures and test doubles; they do not verify a live external service.

## Docker/k3d integration tests

Run from this checkout with OpenAF (`oaf`), Docker, k3d and kubectl on `PATH`,
with the Docker daemon running:

```sh
bash tests/k3d.sh
```

The runner first executes `tests/regression.js`, then creates a uniquely named,
single-server k3d cluster with a loopback API port and a private temporary
kubeconfig. It does not change your default kubeconfig or current context. It
loads `kube.js` and the JARs from this checkout, even when another Kube oPack is
installed. OpenAF runs on the host; Kubernetes runs in Docker.

The live tests cover namespace creation/listing, ConfigMap create/update/get/list,
deployment readiness and scaling, pod logs, repeated exec calls, and generic and
manifest deletion. Deletion checks verify that resources disappear from the API,
rather than relying only on the client's Boolean return value. Failed assertions
return a nonzero exit code. Cluster creation
and readiness waits are bounded; the runner prints pod/event diagnostics on test
failure and deletes its cluster and temporary kubeconfig on exit (including
interrupts). Force-killing the runner can leave a `kube-test-*` cluster behind;
remove that specific cluster with `k3d cluster delete <name>`.

Images default to `rancher/k3s:v1.35.5-k3s1` and `busybox:1.37.0`; initial runs need
registry access to pull them. Override these explicitly when testing other versions:

```sh
K3D_IMAGE=rancher/k3s:v1.35.5-k3s1 KUBE_TEST_IMAGE=busybox:1.37.0 bash tests/k3d.sh
```

No existing Kubernetes cluster or external credentials are required. Do not run
`tests/k3d.js` directly against a shared cluster; use the disposable-cluster runner.
