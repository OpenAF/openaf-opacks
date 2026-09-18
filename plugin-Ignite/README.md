# plugin-Ignite

Apache Ignite **3.1.0** for OpenAF. Includes embedded server, thin client, JSON channels and distributed JavaScript compute. Package version: **20260918**.

This release must be paired with the updated `owrap.ch.js`, `owrap.dev.js` and `owrap.server.js` in OpenAF. Rebuild/distribute OpenAF with those sources; replacing the oPack alone does not update the wrappers already inside `openaf.jar`.

## Runtime and startup

Use a current OpenAF on JDK 21 or newer. Start scripts with the bundled launcher:

```sh
OPENAF_JAR=/path/to/openaf.jar sh /path/to/plugin-Ignite/ignite.sh -f your-script.js
```

The launcher supplies the JVM module access flags and puts Ignite on the application classpath. It accepts ordinary OpenAF arguments and honors `JAVA_HOME` and `OAF_JARGS`. When `OPENAF_JAR` is omitted it looks beside the `oaf` command on PATH.

**Embedded mode requires this launch configuration.** Loading the JARs only after the JVM starts is insufficient for Ignite 3's native storage callbacks. The plugin rejects that configuration with a startup error. An equivalent custom `java -cp ... openaf.AFCmdOS` launcher is also supported; use `ignite.sh` for its required flags.

```javascript
loadExternalJars(getOPackPath("plugin-Ignite"));
plugin("Ignite");
var ignite = new Ignite();
ignite.configure({workDir: "/srv/openaf/ignite3", clusterName: "openaf"});
ignite.start("node1");
$ch("sessions").create(1, "ignite", {ignite: ignite});
$ch("sessions").set({user: "user1"}, {lastSeen: Date.now()});
cprint($ch("sessions").get({user: "user1"}));
// Stop explicitly when the application shuts down:
ignite.stop();
```

The default embedded configuration uses network port 3344, thin-client port 10800, and Ignite's default REST port. It initializes a single-node cluster. Without `workDir`, each new start uses a fresh temporary directory; these directories remain on disk after shutdown. Set a stable `workDir` to retain data across restarts.

For multiple nodes supply separate work directories and Ignite 3 HOCON `configFile` files with unique ports and matching `network.nodeFinder.netClusterNodes`. Set `initCluster: false` on joining nodes; initialize the cluster only from the bootstrap node, optionally specifying `metaStorageNodes`. Node startup waits for cluster initialization. `startupTimeout` (milliseconds, default 60000) bounds the initialization wait and client connect timeout, not every stage of server startup.

```javascript
var client = new Ignite();
client.configure({addresses: ["ignite.example:10800"]});
client.start("client1", undefined, true);
$ch("remoteSessions").create(1, "ignite", {
  ignite: client, cacheName: "sessions", keepOnDestroy: true
});
```

`getConfiguration()` returns a mutable options map; `configure(map)` copies options before startup. Named starts reuse an existing wrapper-managed node/client of the same mode. Use distinct names for distinct endpoints/configurations. `stop(name)` closes that named connection for all wrappers sharing it; `stopAll()` closes all wrapper-managed connections. The legacy `cancel` and constructor `shouldLog` parameters remain accepted; Ignite 3 controls shutdown and JVM logging controls output.

## Compatibility

The OpenAF interfaces retain their intent:

- `$ch(...).create(1, "ignite", options)` supports CRUD, bulk methods, iteration, pop/shift and atomic conditional writes. Each channel retains its own connection. Keys are canonical JSON maps; values are JSON. Functions, Java objects, cycles and prototype identity are not transported. Dates become JSON strings. Key enumeration is deterministic JSON-key order, not insertion order.
- `gridName`, `client`, `ignite` and `persist` remain supported. `persist` now denotes an **Ignite 3 work directory**. Additional options are `configuration` (passed to `configure`), `cacheName` (shared backing table name), and `keepOnDestroy` (default false). Destroying a channel normally drops its backing table; it does not stop its shared node.
- `ow.dev.loadIgnite(gridName, ignite, secretKey, isClient, options)` retains registered grids and adds `thenAny`/`thenAll` to promises. The optional grid argument selects a registered grid; if omitted, the latest `loadIgnite` grid is used. Function source is sent without quote escaping, including arrow functions. Closures are not transferred. Results must be JSON-serializable or undefined; broadcast returns an array.
- `new ow.server.locks(false, undefined, options)` forwards Ignite channel options. Initialization, expiry and acquisition use conditional writes; failed comparisons return undefined. Storage failures propagate instead of silently resetting a held lock. Local locks remain supported.

Ignite 3 is not binary/API, protocol or disk-format compatible with Ignite 2. `getIgnite()` now exposes the native Ignite 3 tables/SQL/compute API; `getConfiguration()` is no longer an Ignite 2 bean. Native Ignite 2/JCache callers must migrate. `getOrCreateCache(name)` is a small JSON-string key/value facade used by channels, not a JCache implementation. Ignite 2 data must be exported and imported into a fresh Ignite 3 directory. Never reuse the old persistence directory. Existing Ignite 2 clusters cannot accept these clients.

The old connector `secretKey` is rejected explicitly. Configure Ignite 3 cluster authentication and supply `username`/`password` for thin clients instead. Do not load Ignite 2 and 3 JARs in the same JVM.

Compute requires OpenAF initialized and this plugin (including `Ignite$OpenAFJob`) available on every eligible server node's classpath. A generic Ignite server alone cannot execute OpenAF JavaScript jobs.

## Build and verification

`.maven.yaml` pins `ignite-runner` and `ignite-client` to 3.1.0. The bundled runtime dependencies support embedded mode. OpenAF-provided duplicate dependencies are removed by `checkOAFJars`; use the current OpenAF dependency set. `pom.xml` in the parent repository is aligned with the two entry dependencies. `LICENSES.txt` collects available embedded notices and Maven license declarations for the distributed JARs.

Run `ojob compile.yaml` from this directory to refresh dependencies, compile Java (release 11 bytecode), build `plugin-ignite.jar` and regenerate API help. Then run `opack genpack .`.

Run `sh tests/run.sh`, setting `OPENAF_JAR` and `OPENAF_SOURCE` if necessary. The test starts a disposable local server on ports 34444–34446 (override `IGNITE_TEST_PORT`), connects a thin client, loads the modified OpenAF source wrappers, and checks channels, compute, promises, locks and persistence after restart. It uses real Ignite services, but does not verify multi-host deployment, authenticated clusters or production failover.

Verified on 2026-09-18 with OpenAF 20260918 and JDK 26: `ojob compile.yaml`, package regeneration, and 39 assertions through `tests/run.sh` passed. The suite includes simulated concurrent lock extension and storage failure checks alongside real server/client operations.
