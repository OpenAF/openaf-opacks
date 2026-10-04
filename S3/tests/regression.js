// Run from S3/: oaf -f tests/regression.js. No external service required.
try {
    load("s3.js");
    var count = 0, failures = [];
    function check(actual, expected, message) {
        count++;
        if (stringify(actual) != stringify(expected)) failures.push(message + ": " + stringify(actual));
    }
    var s3 = Object.create(S3.prototype), deleted = [], errors = [];
    var move = [[{ cmd: "copy", sourceBucket: "source", source: "a", targetBucket: "dest", target: "a" }],
                [{ cmd: "delRemote", sourceBucket: "source", source: "a" }]];
    s3.copyObject = function() { throw new Error("copy failed"); };
    s3.removeObject = function(bucket, key) { deleted.push(key); };
    var quiet = function() {}, onError = function(e) { errors.push(String(e)); };
    check(s3.execActions(move, quiet, onError, 1), false, "failed move reports failure");
    check(deleted, [], "failed copy never deletes source");
    check(errors.length, 1, "copy error reported");
    deleted = [];
    s3.copyObject = function() {};
    check(s3.execActions(move, quiet, onError, 1), true, "successful move reports success");
    check(deleted, ["a"], "successful copy allows deletion");
    deleted = [];
    check(s3.execActions(move, quiet, onError, 1, ["copy"]), false, "skipped prerequisite is incomplete");
    check(deleted, [], "skipped copy never deletes source");
    check(s3.execActions([], quiet, onError, 1), true, "empty action list succeeds");
    check(s3.execActions([{ cmd: "typo" }], quiet, onError, 1), false, "unknown commands fail");
    ["a+b", "a[1]", "a.b", "a("].forEach(function(prefix) {
        s3.listObjects = function() { return [{ filename: prefix + "/nested/file" }]; };
        try {
            var actions = s3.renameFolderActions("source", prefix, "dest", "archive/$&");
            check(actions[0][0].target, "archive/$&/nested/file", "literal rename prefix " + prefix);
            check(actions[1][0].source, prefix + "/nested/file", "original deletion key " + prefix);
        } catch(e) { failures.push("literal rename prefix " + prefix + ": " + e); }
    });
    // A partially completed parallel copy group must also block all deletes.
    var copied = $atomic(0), removed = $atomic(0);
    s3.copyObject = function(bucket, key) {
        if (key == "bad") throw new Error("partial copy failure");
        copied.inc();
    };
    s3.removeObject = function() { removed.inc(); };
    var copies = ["good", "bad"].map(function(key) {
        return { cmd: "copy", sourceBucket: "source", source: key, targetBucket: "dest", target: key };
    });
    check(s3.execActions([copies, move[1]], quiet, quiet, 2), false, "partial parallel group fails");
    check(copied.get(), 1, "successful parallel action still completes");
    check(removed.get(), 0, "partial parallel failure blocks deletion group");
    var local = io.createTempFile("s3-actions-", ".txt");
    try {
        check(s3.execActions([{ cmd: "delLocal", source: local }], quiet, onError, 1), true, "local deletion succeeds");
        check(io.fileExists(local), false, "local file deleted");
        check(s3.execActions([{ cmd: "delLocal", source: local }], quiet, quiet, 1), false, "failed local deletion reported");
    } finally { if (io.fileExists(local)) io.rm(local); }
    if (failures.length) throw new Error(failures.join("\n"));
    print("PASS S3: " + count + " regression checks");
} catch(e) { printErr(e); exit(1); }
