# etcd3 oPack

Channel implementation backed by [etcd v3](https://etcd.io/) using IBM's `etcd-java` client. It enables OpenAF workflows to store
state, watch keys, and coordinate jobs against an etcd cluster with minimal setup.

## Installation

```bash
opack install etcd3
```

## Connecting

```javascript
loadLib("etcd3.js");

ow.ch.use("etcd3");
ow.ch.create("coordination", false, {
  host: "127.0.0.1",
  port: 2379,
  namespace: "openaf/",
  watch: true
});

ow.ch.set("coordination", "locks/demo", { owner: ow.server.getHostname(), at: Date.now() });
```

The channel exposes helpers such as `size`, `forEach`, `getAll`, `subscribe`, and automatic JSON encoding/decoding. Optional
settings let you control namespaces, default values, or suppress exceptions when connectivity issues occur.
