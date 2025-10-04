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
