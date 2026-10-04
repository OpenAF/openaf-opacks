// Run from S3/: oaf -f tests/legacy.js. Uses local files and transport doubles.
try {
    load("s3.js");
    var count = 0, failures = [];
    function check(actual, expected, label) {
        count++;
        if (stringify(actual) != stringify(expected)) failures.push(label + ": " + stringify(actual));
    }
    var dir = String(java.nio.file.Files.createTempDirectory("s3-legacy-"));
    dir = String(new java.io.File(dir).getCanonicalPath());
    try {
        var file = dir + "/same.txt";
        io.writeFileString(file, "local");
        var info = io.fileInfo(file), client = Object.create(S3.prototype);
        [-10000, 0, 10000].forEach(function(delta) {
            client.listObjects = function() {
                return [{ filename: "prefix/same.txt", size: info.size + 1, lastModified: info.lastModified + delta }];
            };
            check(client.squashLocalActions("bucket", "prefix", dir), [{ cmd: "get", status: "replace", source: "prefix/same.txt", sourceBucket: "bucket", target: file }], "remote authoritative, time delta " + delta);
            check(client.squashRemoteActions("bucket", "prefix", dir), [{ cmd: "put", status: "replace", source: file, target: "prefix/same.txt", targetBucket: "bucket" }], "local authoritative, time delta " + delta);
            if (delta) check(client.syncActions("bucket", "prefix", dir)[0].cmd, delta > 0 ? "get" : "put", "bidirectional newest wins");
        });
        client.listObjects = function() { return [{ filename: "prefix/same.txt", size: info.size, lastModified: info.lastModified }]; };
        check(client.squashLocalActions("bucket", "prefix", dir), [], "equal files need no download");
        check(client.squashRemoteActions("bucket", "prefix", dir), [], "equal files need no upload");
        client.listObjects = function() { return [{ filename: "prefix/remote.txt", size: 5, lastModified: info.lastModified }]; };
        check(client.squashLocalActions("bucket", "prefix", dir).map(function(a) { return a.cmd; }).sort(), ["delLocal", "get"], "local mirror handles unique files");
        check(client.squashRemoteActions("bucket", "prefix", dir).map(function(a) { return a.cmd; }).sort(), ["delRemote", "put"], "remote mirror handles unique files");
    } finally { io.rm(dir); }

    var jobs = io.readFileYAML("s3.yaml").jobs;
    function job(name) { return jobs.filter(function(j) { return j.name == name; })[0]; }
    var syncJob = job("S3 Sync folder"), copy = job("S3 Copy object");
    function run(definition, args, instance) {
        new Function("args", "S3", "loadLib", definition.exec)(args, function() { return instance; }, function() {});
    }
    ["", "local", "remote"].forEach(function(mode) {
        var closed = 0, received, executions = 0;
        var instance = { close: function() { closed++; }, execActions: function() { executions++; return true; } };
        ["syncActions", "squashLocalActions", "squashRemoteActions"].forEach(function(method) {
            instance[method] = function(bucket, prefix, path) { received = [method, bucket, prefix, path]; return []; };
        });
        var args = { bucket: "bucket", prefix: "prefix", localPath: "/local", squash: mode, execute: false };
        try { run(syncJob, args, instance); } catch(e) { failures.push("sync mode " + mode + ": " + e); }
        check(received, [mode == "" ? "syncActions" : mode == "local" ? "squashLocalActions" : "squashRemoteActions", "bucket", "prefix", "/local"], "sync job arguments " + mode);
        check(closed, 1, "sync closes client " + mode);
        check(executions, 0, "sync defaults to planning " + mode);
    });
    var closed = 0, failed = false;
    try { run(syncJob, { squash: "remote", execute: true }, {
        squashRemoteActions: function() { return []; }, execActions: function() { return false; }, close: function() { closed++; }
    }); } catch(e) { failed = true; }
    check(failed, true, "sync job surfaces incomplete execution");
    check(closed, 1, "sync closes on execution failure");
    closed = 0;
    try { run(syncJob, { squash: "local" }, { squashLocalActions: function() { throw new Error("listing failed"); }, close: function() { closed++; } }); } catch(e) {}
    check(closed, 1, "sync closes on planning failure");
    var copyArgs = { url: "http://example.invalid", sourceBucket: "source", sourceObject: "a", targetBucket: "dest", targetObject: "b" };
    try {
        Object.keys(copy.check.in).forEach(function(k) { if (copy.check.in[k] == "isString") _$(copyArgs[k], k).isString().$_(); });
        count++;
    } catch(e) { failures.push("documented copy arguments rejected: " + e); }
    closed = 0;
    try { run(copy, copyArgs, { copyObject: function() { throw new Error("copy failed"); }, close: function() { closed++; } }); } catch(e) {}
    check(closed, 1, "copy closes on transport failure");
    var executed, plan = [{ cmd: "get" }];
    closed = 0;
    run(syncJob, { bucket: "bucket", prefix: "prefix", localPath: "/local", squash: "", execute: true, numThreads: 3, ignore: ["put"] }, {
        syncActions: function() { return plan; },
        execActions: function(actions, log, err, threads, ignore) { executed = [actions, threads, ignore]; return true; },
        close: function() { closed++; }
    });
    check(executed, [plan, 3, ["put"]], "sync forwards execution options");
    check(closed, 1, "successful execution closes client");
    var copiedArgs;
    closed = 0;
    run(copy, copyArgs, { copyObject: function(sb, so, tb, to) { copiedArgs = [sb, so, tb, to]; }, close: function() { closed++; } });
    check(copiedArgs, ["source", "a", "dest", "b"], "copy forwards source and target");
    check(closed, 1, "successful copy closes client");
    check(syncJob.typeArgs.shortcut.args.ignore, "ignore", "shortcut forwards ignore option");
    if (failures.length) throw new Error(failures.join("\n"));
    print("PASS S3 legacy: " + count + " checks");
} catch(e) { printErr(e); exit(1); }
