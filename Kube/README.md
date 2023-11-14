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