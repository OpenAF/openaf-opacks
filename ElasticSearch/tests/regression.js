try {
// Run from this opack directory: oaf -f tests/regression.js
// External services are replaced with deterministic test doubles.
ow.loadObj();
function check(actual, expected, message) {
  if (stringify(actual) != stringify(expected)) throw new Error(message + ": " + stringify(actual));
}
var requested;
var ElasticSearch = new Function("$rest", io.readFileString("elasticsearch.js") + ";return ElasticSearch;")(function() { return { get: function(url) { requested = url; return {}; } }; });
var es = Object.create(ElasticSearch.prototype); es.url = "https://example.invalid";
es.getIndexSettings("logs");
check(requested, "https://example.invalid/logs/_settings", "index settings path");
var sentinel = global.aIndex, stream = af.fromString2InputStream("");
es.importStream2Index("logs", stream, {});
check(global.aIndex, sentinel, "import index selector must not leak globally");
print("PASS ElasticSearch regression");
} catch(e) { printErr(e); exit(1); }
