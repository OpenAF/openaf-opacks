# cq oPack

Bindings for [Chronicle Queue](https://chronicle.software/products/chronicle-queue/) providing a persisted high-throughput queue
that can be used from OpenAF. The oPack takes care of loading the extensive Chronicle dependency set and exposes a convenient
wrapper for appending and reading JSON messages.

## Installation

```bash
opack install cq
```

## Basic usage

```javascript
loadLib("cq.js");

var queue = new CQ("./queue-data", "DAILY");
queue.append({ event: "start", timestamp: Date.now() });
queue.appendAll([{ event: "finish" }]);
print(queue.size());
print(af.toYAML(queue.readAll()));
queue.close(true);
```

You can also stream entries by calling `queue.forEach(fn)` and react to roll cycles via the constructor callback. This is useful
for durable event logs or hand-offs between OpenAF jobs.
