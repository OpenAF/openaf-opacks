try {
// Run from this opack directory: oaf -f tests/regression.js
// External services are replaced with deterministic test doubles.
ow.loadObj();
function check(actual, expected, message) {
  if (stringify(actual) != stringify(expected)) throw new Error(message + ": " + stringify(actual));
}
load("redis.js");
var redis = Object.create(Redis.prototype), calls = [];
redis.jedis = { lpop: function(key) { check(arguments.length, 1, "lpop overload"); return "item"; }, zadd: function(key, score, member) { calls.push([key, score, member]); } };
check(redis.lists_pop("queue"), "item", "list pop returns item");
redis.set("rank", [{ element: "alice", score: 3 }, { element: "bob", score: 7 }]);
check(calls, [["rank", 3, "alice"], ["rank", 7, "bob"]], "sorted-set members and scores preserved");
redis.jedis.select = function(db) { return "OK"; };
check(redis.select(4), "OK", "select result retained");
check(redis.dbid, 4, "channel database tracks selection");
redis.jedis.zincrby = function(key, increment, member) { calls.push([key, increment, member]); return 8; };
check(redis.sortedSets_increment("rank", 1, "bob"), 8, "sorted-set increment result");
check(calls[2], ["rank", 1, "bob"], "sorted-set increment identifies member");
var type = ow.ch.__types.redis, name = "regression", values = { first: { a: "1" }, second: ["x", "y"] };
var create = type.create, destroy = type.destroy;
type.create = function(aName) { this.__channels[aName] = { r: {
  getKeys: function() { return Object.keys(values); }, get: function(key) { return values[key]; },
  del: function(key) { delete values[key]; }, size: function() { return Object.keys(values).length; }
} }; };
type.destroy = function(aName) { delete this.__channels[aName]; };
try {
  $ch(name).create(1, "redis");
  check($ch(name).get("first"), { a: "1" }, "hash read does not call trim");
  check($ch(name).pop(), ["x", "y"], "public pop returns last value");
  check(Object.keys(values), ["first"], "pop removes returned key");
  check($ch(name).shift(), { a: "1" }, "public shift returns first value");
  check($ch(name).pop(), __, "empty pop returns undefined");
} finally {
  $ch(name).destroy(); type.create = create; type.destroy = destroy;
}
print("PASS Redis regression");
} catch(e) { printErr(e); exit(1); }
