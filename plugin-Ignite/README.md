# plugin-Ignite oPack

OpenAF plugin that embeds [Apache Ignite](https://ignite.apache.org/) so jobs can use distributed caches, compute grids, and data
structures. The plugin wraps core Ignite APIs and exports them through the OpenAF plugin mechanism.

## Installation

```bash
opack install plugin-Ignite
```

## Example

```javascript
plugin("Ignite");
var ignite = new Ignite();
var cache = ignite.getOrCreateCache("sessions");
cache.put("user1", { lastSeen: Date.now() });
cprint(cache.get("user1"));
```

Consult the generated OpenAF documentation (`opack doc plugin-Ignite`) for the full list of helpers around cache configuration,
SQL queries, and cluster management. The oPack bundles `ignite-core`, `javax.cache`, and JetBrains annotations.
