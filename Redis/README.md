# Redis oPack

Wrapper around the [Jedis](https://github.com/redis/jedis) client to provide a convenient Redis API for OpenAF scripts. Besides
exposing the underlying Jedis object, the oPack includes helpers to manage keys, hashes, lists, sets, and sorted sets with native
JavaScript data structures.

This package bundles Jedis 8.0.1.

## Installation

```bash
opack install Redis
```

## Quick start

```javascript
loadLib("redis.js");

var redis = new Redis("localhost", 6379);
redis.set("greeting", "hello world");
print(redis.get("greeting"));
print("Number of keys: " + redis.size());
redis.close();
```

The wrapper automatically loads the bundled dependencies (`jedis`, `commons-pool2`, authentication helpers, and JSON support) so
that you can focus on automation logic. For advanced scenarios call `redis.getObj()` to access the underlying Jedis instance.

## Constructor

```javascript
var redis = new Redis(aHost, aPort, aDBId);
```

- `aHost` is the Redis server hostname or IP address.
- `aPort` is the Redis server port, usually `6379`.
- `aDBId` is optional and selects the Redis logical database after connecting.

Always call `redis.close()` when the script is finished with the connection.

## Common operations

```javascript
loadLib("redis.js");

var redis = new Redis("localhost", 6379, 0);

// Strings
redis.set("app:greeting", "hello");
print(redis.get("app:greeting"));

// Hashes
redis.set("app:user:1", {
  name: "Ana",
  role: "admin"
});
print(redis.get("app:user:1").name);

// Lists
redis.set("app:queue", [ "first", "second" ]);
print(redis.get("app:queue"));

// Sets
redis.set("app:tags", [ "blue", "green" ], "set");
print(redis.get("app:tags"));

// Sorted sets
redis.sortedSets_set("app:rank", "low", 1);
redis.sortedSets_set("app:rank", "high", 2);
print(redis.get("app:rank"));

redis.close();
```

`redis.set(key, value)` infers the Redis type for strings, JavaScript maps, and arrays. Arrays are stored as lists by default. Pass
`"set"` as the third argument to store an array as a Redis set. Use `sortedSets_set(key, element, score)` for sorted sets.

## Key management

```javascript
print(redis.getKeys("app:*"));
print(redis.type("app:greeting"));
redis.rename("app:greeting", "app:message");
redis.move("app:message", 1);
redis.del("app:message");
```

`getKeys(pattern)` defaults to `"*"`. Avoid broad key scans in large production databases unless that is acceptable for your Redis
deployment.

## OpenAF channels

The opack registers a Redis-backed `$ch` type. Values and map keys are serialized to JSON when needed.

```javascript
loadLib("redis.js");

$ch("cache").create(1, "redis", {
  host: "localhost",
  port: 6379,
  dbid: 0
});

$ch("cache").set({ key: "app:answer" }, { value: { answer: 42 } });
print($ch("cache").get({ key: "app:answer" }).answer);
$ch("cache").destroy();
```

## Connection pool

The opack also registers `ow.obj.pool.REDIS(host, port, dbid)` for scripts that need pooled Redis connections:

```javascript
loadLib("redis.js");

var pool = ow.obj.pool.REDIS("localhost", 6379, 0);
var redis = pool.checkOut();
try {
  print(redis.ping());
} finally {
  pool.checkIn(redis);
}
```

## JSON documents

Native Redis JSON is available in Redis 8 or older installations with RedisJSON enabled.
The existing `set()` inference remains unchanged. Use the explicit JSON helpers to
preserve nested maps, arrays, booleans, numbers and nulls:

```javascript
var redis = new Redis("localhost", 6379, 0);
try {
  if (redis.supports("JSON.SET")) {
    redis.json_set("app:document", { stats: { hits: 0 }, events: [] });
    redis.json_increment("app:document", "$.stats.hits");
    redis.json_arrayAppend("app:document", "$.events", [{ kind: "visit" }]);
    print(redis.json_get("app:document"));
    print(redis.json_get("app:document", "$.stats.hits")); // [1]
  }
} finally {
  redis.close();
}
```

| Helper | Behavior |
| --- | --- |
| `supports(command)` | Checks `COMMAND INFO`; returns false for an unavailable command. Connection and ACL errors propagate. Availability does not guarantee execution permission. |
| `json_set(key, value, path)` | Sets a JSON value; path defaults to `$` (whole document). Returns `"OK"`, or undefined when Redis reports no update. |
| `json_get(key, path)` | With no path, returns the document as native JavaScript values. Explicit JSONPath expressions such as `$.stats.hits` return arrays of matches, including an empty array for no matches. Missing keys return undefined; stored JSON null returns null. |
| `json_del(key, path)` | Deletes matching values; defaults to deleting the whole document. Returns the deletion count. |
| `json_increment(key, path, amount)` | Atomically increments matching numbers; amount defaults to 1. |
| `json_arrayAppend(key, path, values)` | Atomically appends every item in the nonempty `values` array. Wrap a nested array in another array to append it as one value. |
| `json_arrayPop(key, path, index)` | Atomically removes and returns elements; index defaults to -1. |
| `json_setWithTTL(key, value, ttlms)` | Atomically writes a whole JSON document and sets a positive lifetime in milliseconds. Requires Redis 7+ with JSON support and `EVAL`, `JSON.SET`, and `PEXPIRE` permissions. |

Path-based operations follow Redis response semantics: `$` JSONPath expressions
return arrays of matches/results; legacy paths can return scalar results. Use `$`
paths for consistent new code. JSON values must be JSON serializable; JavaScript
functions, undefined, cycles and custom Java objects are not supported document values.

`get(key)` also recognizes native JSON keys. JSON helpers use the same connection
as `getObj()`, which continues to return a Jedis instance. Unsupported JSON commands
fail explicitly. Existing string, hash or list keys are never automatically migrated
to JSON; JSON writes to those keys fail with a Redis type error. Use separate keys or
perform an explicit migration. Ordinary `json_set()` follows Redis JSON TTL behavior;
use `json_setWithTTL()` to assign or refresh a lifetime.

## Cache lifetime and conditional string writes

```javascript
redis.strings_set("app:cache", "cached text", { ttlms: 60000 });
redis.strings_set("app:claim", "worker-1", { ttlms: 10000, nx: true });
redis.strings_set("app:cache", "replacement", { ttlms: 60000, xx: true });
redis.expire("app:cache", 30000);
print(redis.ttl("app:cache"));
redis.persist("app:cache");
```

`strings_set(key, value, options)` accepts `ttlms`, `nx` (only create) and `xx`
(only replace). NX and XX are mutually exclusive. It returns `"OK"` on success or
undefined when the condition is unmet. Expiration is applied in the same `SET`
command. A successful plain SET without `ttlms` removes the old expiration.

All wrapper lifetime arguments are **milliseconds**, and must be positive safe
integers. `expire()` returns whether an existing key received expiration;
`persist()` returns whether expiration was removed. `ttl()` returns remaining
milliseconds, -1 for a persistent key, or -2 for a missing key.

## JSON and cache channels

Channel creation accepts two additional options:

```javascript
var channel = redis.getCh("documents", { json: true, ttlms: 60000 });
// Equivalent: $ch("documents").create(1, "redis", {
//   host: "localhost", port: 6379, dbid: 0, json: true, ttlms: 60000
// });
try {
  channel.set({ key: "app:channel-document" }, { value: { nested: [1, false, null] } });
  print(channel.get({ key: "app:channel-document" }));
} finally {
  channel.destroy();
}
```

- `json: true` opts into native JSON documents. Creation checks JSON command
  availability; it fails and closes the new connection when unavailable.
- `ttlms` sets a cache lifetime refreshed on every successful write. It works
  with the default string-backed channels as well as JSON channels. JSON writes
  with TTL use a Lua script that checks write/expiration permissions before changing data.
- Defaults retain the existing channel storage behavior. JSON channels can read
  legacy keys, but writing native JSON over a legacy key requires explicit migration.
- Nested nulls are supported. Root null is supported by the direct JSON API, but
  JSON channel writes reject it because OpenAF's public channel `get()` cannot
  return root null safely. Wrap it in a map or array. Reading an externally written
  root null through channel `get()` raises an explanatory error; use `json_get()`.
- Keys and the existing `{key: ...}` / `{value: ...}` envelopes retain their usual
  meaning. Wrap literal documents containing a `value` field inside the value envelope.
- `getCh(name, options)` takes host, port and database from the Redis object.
  Destroying the channel closes its own connection, independently of that object.

## Incremental key scanning

```javascript
var cursor = "0";
do {
  var page = redis.scan(cursor, "app:*", 100);
  page.keys.forEach(key => print(key));
  cursor = page.cursor;
} while (cursor != "0");

redis.scanKeys("app:*", function(key) {
  print(key);
  // Return false to stop early.
}, 100);
```

`scan(cursor, pattern, count)` returns `{cursor, keys}`. Defaults are `"0"`, `"*"`
and 100. Keep cursors as strings. COUNT is a work hint, not a page-size limit;
empty pages can have a nonzero cursor. SCAN can return duplicates and does not
provide a snapshot when keys change. `scanKeys(pattern, callback, count)` iterates
incrementally without collecting all keys in memory. Existing `keys()` and
`getKeys()` retain their `KEYS` behavior.

## Tests

Run the local smoke tests from this folder:

```bash
ojob tests/tests.yaml
```

By default, tests that need a live Redis server are skipped. To run the full integration suite:

```bash
REDIS_TEST_HOST=localhost REDIS_TEST_PORT=6379 REDIS_TEST_DB=15 ojob tests/tests.yaml
```

Run a disposable Docker matrix (Redis 8.10.2 with JSON and Redis 7 without JSON):

```bash
bash tests/docker.sh
```

The runner requires Docker, `oaf` and `ojob`, binds random ports on localhost,
and removes its containers on exit. It runs the service-independent regressions
and both integration suites. For manual integration runs, optional
`REDIS_TEST_JSON=true` or `false` asserts the expected JSON availability.
JSON integration includes ACL failure tests and requires permission to create
and delete a temporary `openaf-test-json-*` user. Use an isolated test server/database.

The integration tests clean up keys matching `openaf-test:*` in the selected database before and after each Redis-backed test.

## Corrections (2026-09-18)

List pops use the single-item Jedis overload. `set(key, [{ element: "member", score: 3 }])` writes sorted-set members with their scores. Increment one member with `sortedSets_increment(key, amount, member)`; the amount defaults to 1 when omitted using `__`.

`select(dbid)` also updates the database used by subsequent `getCh` calls. Channel reads support hashes and lists, and public `$ch` pop/shift operations return and remove the selected value.

Run the service-independent regression checks from this directory:

```sh
oaf -f tests/regression.js
```

These checks use local fixtures and test doubles; they do not verify a live external service.

## Corrections (2026-10-04)

Channel array values are stored as JSON, preserving order, nested values and empty
arrays. Repeated channel writes replace the previous value instead of appending
to a Redis list. Existing native Redis lists remain readable; writing an array
through the channel replaces that key with a JSON string. Direct `Redis.set` list
operations retain their existing behavior.
