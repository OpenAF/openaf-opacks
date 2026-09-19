try {
// Run from this opack directory: oaf -f tests/regression.js
// External services are replaced with deterministic test doubles.
ow.loadObj();
function check(actual, expected, message) {
  if (stringify(actual) != stringify(expected)) throw new Error(message + ": " + stringify(actual));
}
var Client = new Function("loadExternalJars", io.readFileString("s3.js") + ";return S3;")(function() {});
var client = Object.create(Client.prototype), seen;
client.listObjects = function(bucket, prefix, full, recursive) { seen = [bucket, prefix, recursive]; return [{ filename: "folder/file" }]; };
check(client.deleteFolderActions("bucket", "folder", true), [{ cmd: "delRemote", source: "folder/file", sourceBucket: "bucket" }], "delete action generated");
check(seen, ["bucket", "folder/", true], "recursive option forwarded");
client.deleteFolderActions("bucket", "folder", false);
check(seen[2], false, "nonrecursive option forwarded");
client.deleteFolderActions("bucket", "folder");
check(seen[2], __, "default recursion delegated to listing");
print("PASS S3 regression");
} catch(e) { printErr(e); exit(1); }
