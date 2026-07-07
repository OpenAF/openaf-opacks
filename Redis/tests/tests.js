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
})();
