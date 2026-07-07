# Redis oPack

Wrapper around the [Jedis](https://github.com/redis/jedis) client to provide a convenient Redis API for OpenAF scripts. Besides
exposing the underlying Jedis object, the oPack includes helpers to manage keys, hashes, lists, sets, and sorted sets with native
JavaScript data structures.

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

## Tests

Run the local smoke tests from this folder:

```bash
ojob tests/tests.yaml
```

By default, tests that need a live Redis server are skipped. To run the full integration suite:

```bash
REDIS_TEST_HOST=localhost REDIS_TEST_PORT=6379 REDIS_TEST_DB=15 ojob tests/tests.yaml
```

The integration tests clean up keys matching `openaf-test:*` in the selected database before and after each Redis-backed test.
