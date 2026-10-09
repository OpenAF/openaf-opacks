(function() {
  load("redis.js");

  function getEnv(aName, aDefault) {
    var value = java.lang.System.getenv(aName);
    if (value == null || isUnDef(value) || String(value).trim().length === 0) return aDefault;
    return String(value);
  }

  function getRedisOptions() {
    return {
      host: getEnv("REDIS_TEST_HOST", __),
      port: Number(getEnv("REDIS_TEST_PORT", "6379")),
      dbid: Number(getEnv("REDIS_TEST_DB", "15"))
    };
  }

  function shouldSkipIntegration() {
    var opts = getRedisOptions();
    if (isUnDef(opts.host)) {
      logWarn("REDIS_TEST_HOST is not set. Skipping Redis integration test.");
      return true;
    }
    return false;
  }

  function withRedis(aFunction) {
    var opts = getRedisOptions();
    var redis = new Redis(opts.host, opts.port, opts.dbid);
    try {
      redis.getKeys("openaf-test:*").forEach(k => redis.del(k));
      return aFunction(redis);
    } finally {
      try {
        redis.getKeys("openaf-test:*").forEach(k => redis.del(k));
      } finally {
        redis.close();
      }
    }
  }

  function sorted(aArray) {
    return aArray.sort().join(",");
  }

  exports.testLibraryLoads = function() {
    ow.test.assert(typeof Redis, "function", "Redis constructor should be defined.");
    ow.test.assert(isDef(ow.obj.pool.REDIS), true, "ow.obj.pool.REDIS should be registered.");
    ow.test.assert(isDef(ow.ch.__types.redis), true, "redis $ch type should be registered.");
  };

  exports.testPackageFilesExist = function() {
    var pkg = io.readFileYAML(".package.yaml");

    ow.test.assert(pkg.name, "Redis", "Package name should be Redis.");
    ow.test.assert(pkg.files.indexOf("redis.js") >= 0, true, "redis.js should be packaged.");
    ow.test.assert(pkg.files.indexOf("README.md") >= 0, true, "README.md should be packaged.");
    pkg.files.forEach(f => {
      ow.test.assert(io.fileExists(f), true, "Packaged file does not exist: " + f);
    });
  };

  exports.testRedisRoundTrip = function() {
    if (shouldSkipIntegration()) {
      ow.test.assert(true, true, "Integration test skipped.");
      return;
    }

    withRedis(function(redis) {
      ow.test.assert(String(redis.ping()), "PONG", "Redis should respond to ping.");

      redis.set("openaf-test:string", "hello");
      ow.test.assert(String(redis.get("openaf-test:string")), "hello", "String round trip failed.");

      redis.set("openaf-test:hash", { a: "1", b: "2" });
      ow.test.assert(String(redis.get("openaf-test:hash").a), "1", "Hash round trip failed.");

      redis.set("openaf-test:list", [ "one", "two" ]);
      ow.test.assert(sorted(redis.get("openaf-test:list")), "one,two", "List round trip failed.");

      redis.set("openaf-test:set", [ "red", "blue" ], "set");
      ow.test.assert(sorted(redis.get("openaf-test:set")), "blue,red", "Set round trip failed.");

      redis.sortedSets_set("openaf-test:zset", "low", 1);
      redis.sortedSets_set("openaf-test:zset", "high", 2);
      var zset = redis.get("openaf-test:zset");
      ow.test.assert(String(zset[0].element), "low", "Sorted set first element failed.");
      ow.test.assert(Number(zset[1].score), 2, "Sorted set second score failed.");
    });
  };

  exports.testChannelRoundTrip = function() {
    if (shouldSkipIntegration()) {
      ow.test.assert(true, true, "Channel integration test skipped.");
      return;
    }

    var opts = getRedisOptions();
    var chName = "redis-test-" + now();
    var ch = $ch(chName).create(1, "redis", opts);
    try {
      ch.set({ key: "openaf-test:channel" }, { value: { answer: 42 } });
      var value = ch.get({ key: "openaf-test:channel" });
      ow.test.assert(Number(value.answer), 42, "$ch redis value round trip failed.");
      ow.test.assert(String(ch.getKeys()).indexOf("openaf-test:channel") >= 0, true, "$ch redis key lookup failed.");
    } finally {
      ch.unset({ key: "openaf-test:channel" });
      ch.destroy();
    }
  };
  function equal(aActual, aExpected, aMessage) {
    ow.test.assert(stringify(aActual), stringify(aExpected), aMessage);
  }

  function throws(aFunction, aText) {
    var message = "";
    try { aFunction(); } catch(e) { message = String(e); }
    ow.test.assert(message.indexOf(aText) >= 0, true, "Expected error containing " + aText + ", got: " + message);
  }

  exports.testCacheAndScan = function() {
    if (shouldSkipIntegration()) return;
    withRedis(function(redis) {
      equal(redis.supports("SET"), true, "SET capability");
      equal(redis.supports("openaf-no-such-command"), false, "Unknown capability");
      var key = "openaf-test:cache";
      equal(redis.strings_set(key, "first", { ttlms: 10000, nx: true }), "OK", "Initial conditional write");
      var ttl = redis.ttl(key);
      ow.test.assert(ttl > 0 && ttl <= 10000, true, "Write and expiration applied together");
      equal(redis.strings_set(key, "second", { nx: true }), __, "NX prevents replacement");
      equal(String(redis.get(key)), "first", "NX retains old value");
      equal(redis.strings_set(key, "second", { xx: true, ttlms: 20000 }), "OK", "XX replaces existing value");
      equal(redis.strings_set(key + ":missing", "value", { xx: true }), __, "XX does not create a key");
      equal(redis.persist(key), true, "Remove expiration");
      equal(redis.ttl(key), -1, "Persistent TTL sentinel");
      equal(redis.persist(key), false, "Already persistent");
      equal(redis.ttl(key + ":missing"), -2, "Missing TTL sentinel");
      equal(redis.expire(key + ":missing", 1000), false, "Cannot expire absent key");
      equal(redis.expire(key, 20), true, "Set expiration");
      var deadline = now() + 3000;
      while (redis.ttl(key) != -2 && now() < deadline) sleep(10);
      equal(redis.ttl(key), -2, "Expired key disappears");
      redis.strings_set(key, "unchanged");
      [0, -1, 1.5, NaN, Infinity, 9007199254740992].forEach(v => {
        throws(function() { redis.strings_set(key, "bad", { ttlms: v }); }, "positive safe integer");
      });
      throws(function() { redis.strings_set(key, "bad", { nx: true, xx: true }); }, "mutually exclusive");
      equal(String(redis.get(key)), "unchanged", "Invalid options do not write");
      for (var i = 0; i < 150; i++) redis.strings_set("openaf-test:scan:" + i, "v");
      var cursor = "0", seen = {}, pages = 0;
      do {
        var page = redis.scan(cursor, "openaf-test:scan:*", 5);
        ow.test.assert(typeof page.cursor, "string", "Cursor stays a string");
        page.keys.forEach(k => { seen[k] = true; });
        cursor = page.cursor;
        pages++;
      } while (cursor != "0" && pages < 1000);
      equal(cursor, "0", "SCAN terminates");
      equal(Object.keys(seen).length, 150, "SCAN visits all stable matching keys");
      var count = 0;
      redis.scanKeys("openaf-test:scan:*", function(k) { count++; return false; }, 5);
      equal(count, 1, "Callback can stop scanning early");
      count = 0;
      redis.scanKeys("openaf-test:absent:*", function(k) { count++; });
      equal(count, 0, "Empty scan");
      throws(function() { redis.scan("invalid"); }, "decimal cursor");
      throws(function() { redis.scan("0", "*", 0); }, "positive safe integer");

      var channelName = "redis-ttl-" + now(), channel = redis.getCh(channelName, { ttlms: 10000 });
      try {
        channel.set({ key: key }, { value: [1, false, null, { nested: [] }] });
        equal(channel.get({ key: key }), [1, false, null, { nested: [] }], "Legacy cache channel array round trip");
        ow.test.assert(redis.ttl(key) > 0, true, "Legacy cache channel TTL");
        redis.expire(key, 500);
        channel.set({ key: key }, { value: [] });
        ow.test.assert(redis.ttl(key) > 500, true, "Channel write refreshes TTL");
        equal(channel.get({ key: key }), [], "Cache channel replaces arrays");
      } finally { channel.destroy(); }
    });
  };

  exports.testNativeJSON = function() {
    if (shouldSkipIntegration()) return;
    withRedis(function(redis) {
      var hasJSON = redis.supports("JSON.SET");
      var expected = getEnv("REDIS_TEST_JSON", __);
      if (isDef(expected)) equal(hasJSON, expected == "true", "Expected server JSON availability");
      var key = "openaf-test:json";
      if (!hasJSON) {
        throws(function() { redis.json_set(key, {}); }, "not supported");
        throws(function() { redis.getCh("redis-no-json", { json: true }); }, "requires JSON");
        equal(isUnDef(ow.ch.__types.redis.__channels["redis-no-json"]), true, "Failed channel not registered");
        equal(String(redis.type(key)), "none", "Unsupported JSON does not write");
        return;
      }
      var document = { title: "Olá 🐈", stats: { hits: 1 }, items: [false, null, 0, { nested: [] }] };
      equal(redis.json_set(key, document), "OK", "JSON SET");
      equal(redis.json_get(key), document, "Nested JSON types and Unicode");
      equal(redis.get(key), document, "Generic get recognizes native JSON");
      equal(redis.json_get(key, "$.stats.hits"), [1], "Explicit JSONPath match array");
      equal(redis.json_get(key, "$.missing"), [], "Unmatched path");
      equal(redis.json_get(key + ":missing"), __, "Missing JSON key");
      equal(redis.json_set(key, 2, "$.stats.hits"), "OK", "Nested update");
      equal(redis.json_increment(key, "$.stats.hits", 3), [5], "Atomic increment");
      equal(redis.json_increment(key, "$.stats.hits"), [6], "Default increment");
      equal(redis.json_arrayAppend(key, "$.items", ["quoted \" text", { value: [1] }]), [6], "Append JSON values");
      equal(redis.json_arrayPop(key, "$.items"), [{ value: [1] }], "Pop nested JSON value");
      equal(redis.json_arrayPop(key, "$.items", 0), [false], "Pop false value");
      equal(redis.json_del(key, "$.stats"), 1, "Delete nested value");
      equal(redis.json_get(key, "$.stats"), [], "Deleted path absent");
      [null, false, 0, "{\"literal\":true}", "[1,2]", [], {}].forEach(value => {
        redis.json_set(key, value);
        equal(redis.json_get(key), value, "Root scalar or container round trip");
      });
      redis.json_setWithTTL(key, document, 10000);
      ow.test.assert(redis.ttl(key) > 0 && redis.ttl(key) <= 10000, true, "JSON document TTL");
      throws(function() { redis.json_setWithTTL(key, {}, -1); }, "positive safe integer");
      equal(redis.json_get(key), document, "Invalid TTL preserves document");
      redis.strings_set(key + ":string", "legacy");
      throws(function() { redis.json_set(key + ":string", {}); }, "wrong Redis type");
      equal(String(redis.get(key + ":string")), "legacy", "No implicit storage conversion");
      throws(function() { redis.json_set(key, __); }, "JSON serializable");
      throws(function() { redis.json_increment(key, "$.stats.hits", Infinity); }, "finite");
      throws(function() { redis.json_arrayAppend(key, "$.items", []); }, "at least one");

      var name = "redis-json-" + now(), channel = redis.getCh(name, { json: true, ttlms: 10000 });
      try {
        equal(String(ow.ch.__types.redis.__channels[name].r.getObj().getClass().getName()), "redis.clients.jedis.Jedis", "Jedis public contract preserved");
        equal(Number(ow.ch.__types.redis.__channels[name].r.getCurrentDBId()), getRedisOptions().dbid, "Channel database preserved");
        [document, { value: { literal: true } }, [1, null, false], [], false, 0, "{\"literal\":true}", "[1,2]"].forEach(value => {
          channel.set({ key: key }, { value: value });
          equal(channel.get({ key: key }), value, "JSON channel round trip");
          equal(String(redis.type(key)), "ReJSON-RL", "Channel uses native JSON");
        });
        throws(function() { channel.set({ key: key }, { value: null }); }, "root null");
        equal(channel.get({ key: key }), "[1,2]", "Rejected root null does not change document");
        redis.json_set(key, null);
        throws(function() { channel.get({ key: key }); }, "root null");
        equal(channel.getAll("openaf-test:json"), [null], "getAll preserves JSON null");
        var visited = {};
        channel.forEach(function(k, v) { visited[k] = v; });
        equal(visited[key], null, "forEach preserves JSON null");
        channel.setAll(["key"], [{ key: "openaf-test:bulk:1", data: [] }, { key: "openaf-test:bulk:2", data: { x: false } }]);
        equal(channel.get({ key: "openaf-test:bulk:1" }), { key: "openaf-test:bulk:1", data: [] }, "JSON channel bulk write");
        channel.unsetAll(["key"], [{ key: "openaf-test:bulk:1" }, { key: "openaf-test:bulk:2" }]);
        equal(channel.get({ key: "openaf-test:bulk:1" }), __, "JSON channel bulk removal");
        equal(channel.get({ key: key + ":string" }), "legacy", "JSON channel can read legacy keys");
        throws(function() { channel.set({ key: key + ":string" }, { value: {} }); }, "wrong Redis type");
      } finally { channel.destroy(); redis.del("openaf-test:bulk:1"); redis.del("openaf-test:bulk:2"); }

      // Check script permissions before JSON.SET: Lua errors do not roll back writes.
      var user = "openaf-test-json-" + now(), restricted;
      try {
        redis.getObj().aclSetUser(user, ["on", ">openaf-test-password", "~openaf-test:*", "+select", "+command|info", "+json.set", "+eval"]);
        var opts = getRedisOptions();
        restricted = new Redis(opts.host, opts.port, opts.dbid);
        restricted.getObj().auth(user, "openaf-test-password");
        redis.json_set(key, { protected: true });
        redis.persist(key);
        throws(function() { restricted.json_setWithTTL(key, { replaced: true }, 10000); }, "NOPERM");
        equal(redis.json_get(key), { protected: true }, "Denied expiration does not mutate document");
        equal(redis.ttl(key), -1, "Denied expiration preserves lifetime");
      } finally {
        if (restricted) restricted.close();
        redis.getObj()["aclDelUser(java.lang.String[])"]([user]);
      }
      equal(redis.json_del(key), 1, "Delete whole JSON document");
    });
  };

})();
