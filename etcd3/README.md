# etcd3 oPack

Channel implementation backed by [etcd v3](https://etcd.io/) using the jetcd client. It enables OpenAF workflows to store
state, watch keys, and coordinate jobs against an etcd cluster with minimal setup.

## Installation

```bash
opack install etcd3
```

## Connecting

```javascript
loadLib("etcd3.js");

$ch("myChannel").create("etcd3", {
  host: "127.0.0.1",
  port: 2379,
  namespace: "openaf/"
});
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `host` | String | *(required)* | etcd host address |
| `port` | Number | *(required)* | etcd port (typically `2379`) |
| `namespace` | String | — | Key namespace prefix applied to all operations |
| `throwExceptions` | Boolean | `true` | When `false`, errors return defaults instead of throwing |
| `default` | any | `undefined` | Value returned on error when `throwExceptions` is `false` |
| `keyStamp` | Map | — | Extra fields merged into every key before storage |
| `stamp` | Map | — | Extra fields merged into every value before storage |
| `watch` | Boolean | `false` | Enable real-time watch for key changes via subscribers |
| `login` | String | — | etcd username for authentication |
| `pass` | String | — | etcd password for authentication |

## Basic Operations

```javascript
loadLib("etcd3.js");
$ch("cfg").create("etcd3", { host: "127.0.0.1", port: 2379 });

// Store a value
$ch("cfg").set({ app: "myapp", key: "timeout" }, { value: 30 });

// Retrieve a value
var v = $ch("cfg").get({ app: "myapp", key: "timeout" });
print(v.value); // 30

// Delete a key
$ch("cfg").unset({ app: "myapp", key: "timeout" });

// Count all keys
print($ch("cfg").size()); // 0
```

## Iterating Keys and Values

```javascript
// Get all values
var values = $ch("cfg").getAll();

// Get all keys
var keys = $ch("cfg").getKeys();

// Get keys sorted by version — most recently modified first
var sorted = $ch("cfg").getSortedKeys();

// Iterate every key-value pair
$ch("cfg").forEach(function(key, value) {
  print(key, value);
});
```

## Batch Operations

```javascript
// Store multiple records using a key template
var records = [
  { region: "eu", service: "api", status: "ok" },
  { region: "us", service: "api", status: "ok" }
];
$ch("cfg").setAll({ region: "", service: "" }, records);

// Delete multiple keys derived from the same template
$ch("cfg").unsetAll({ region: "", service: "" }, records);
```

## Watch / Subscribe

Enable `watch: true` to receive real-time notifications whenever keys change in etcd:

```javascript
loadLib("etcd3.js");
$ch("events").create("etcd3", {
  host: "127.0.0.1",
  port: 2379,
  watch: true
});

$ch("events").subscribe($ch().fn(function(aOp, aK, aV) {
  print("Operation:", aOp, "| Key:", aK, "| Value:", aV);
}));
```

## Atomic Conditional Update (getSet)

`getSet` acquires a distributed etcd lock before reading and conditionally writing, making
it safe for concurrent workers:

```javascript
// Set { owner: "worker-1" } only if the slot key does not yet exist
$ch("cfg").getSet(
  { slot: 1 },                        // key to test and conditionally write
  function(v) { return isUnDef(v); }, // condition: only write when currently undefined
  { slot: 1 },                        // key to write
  { owner: "worker-1" }               // value to write
);
```

## Key and Value Stamping

Use `keyStamp` and `stamp` to automatically merge extra fields into every key or value
stored through the channel:

```javascript
$ch("metrics").create("etcd3", {
  host: "127.0.0.1",
  port: 2379,
  keyStamp: { env: "prod" },    // merged into every key
  stamp:    { region: "eu" }    // merged into every value
});

// Stored key becomes:   { metric: "cpu", env: "prod" }
// Stored value becomes: { value: 0.42, region: "eu" }
$ch("metrics").set({ metric: "cpu" }, { value: 0.42 });
```

## Authentication

```javascript
$ch("secure").create("etcd3", {
  host: "127.0.0.1",
  port: 2379,
  login: "myuser",
  pass:  "mypassword"
});
```

## Error Handling

By default any etcd error is re-thrown. Set `throwExceptions: false` to suppress errors
and return a safe `default` value instead:

```javascript
$ch("safe").create("etcd3", {
  host: "127.0.0.1",
  port: 2379,
  throwExceptions: false,
  default: null
});

var v = $ch("safe").get({ key: "missing" }); // returns null instead of throwing
print($ch("safe").size());                    // returns undefined on connection error
```
