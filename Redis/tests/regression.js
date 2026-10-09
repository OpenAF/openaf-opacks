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
// Exercise public channel dispatch with the real Redis.set type selection.
var store = {}, arrayRedis = Object.create(Redis.prototype);
arrayRedis.strings_set = function(key, value) { store[key] = value; };
arrayRedis.lists_push = function(key, value) {
  if (!store[key]) store[key] = [];
  store[key].unshift(value);
};
arrayRedis.get = function(key) { return store[key]; };
arrayRedis.getKeys = function() { return Object.keys(store); };
arrayRedis.del = function(key) { delete store[key]; };
arrayRedis.size = function() { return Object.keys(store).length; };
type.create = function(aName) { this.__channels[aName] = { r: arrayRedis }; };
type.destroy = function(aName) { delete this.__channels[aName]; };
try {
  var ch = $ch(name).create(1, "redis");
  ch.set({ key: "array" }, { value: ["first", "second"] });
  check(ch.get({ key: "array" }), ["first", "second"], "array order survives channel write");
  ch.set({ key: "array" }, { value: ["replacement"] });
  check(ch.get({ key: "array" }), ["replacement"], "array write replaces previous value");
  ch.set({ key: "array" }, { value: [] });
  check(ch.get({ key: "array" }), [], "empty array replaces previous value");
  ch.set({ key: "array" }, { value: [{ id: 1 }, false, 0, null, ["nested"]] });
  check(ch.get({ key: "array" }), [{ id: 1 }, false, 0, null, ["nested"]], "nested array values retain types");
} finally {
  $ch(name).destroy(); type.create = create; type.destroy = destroy;
}
// Live Jedis returns java.lang.String; ensure the channel parses that boundary.
values.javaString = new java.lang.String('{"answer":42}');
type.__channels[name] = { r: { get: function() { return values.javaString; } } };
try {
  check(type.get(name, "javaString"), { answer: 42 }, "Java string channel JSON decode");
} finally { delete type.__channels[name]; }
check(redis._jsonEncode({ nested: [null, false, 0, "text"] }), '{"nested":[null,false,0,"text"]}', "JSON encode preserves nested types");
var invalid = [__, function() {}, NaN, Infinity, { value: __ }];
var cycle = {}; cycle.self = cycle; invalid.push(cycle);
invalid.forEach(function(value) {
  var failed = false;
  try { redis._jsonEncode(value); } catch(e) { failed = String(e).indexOf("JSON serializable") >= 0; }
  check(failed, true, "Reject invalid JSON value");
});
var scanner = Object.create(Redis.prototype), scanned = [], cursors = [];
scanner.scan = function(cursor) {
  cursors.push(cursor);
  return cursor == "0" ? { cursor: "1844674407370955161", keys: [] } : { cursor: "0", keys: ["one", "one", "two"] };
};
scanner.scanKeys("*", function(key) { scanned.push(key); });
check(cursors, ["0", "1844674407370955161"], "Continue after empty nonterminal SCAN page with string cursor");
check(scanned, ["one", "one", "two"], "SCAN callback preserves duplicates");
print("PASS Redis regression");
} catch(e) { printErr(e); exit(1); }
