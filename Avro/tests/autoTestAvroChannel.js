(function() {
    loadLib("avro.js")

    var _tmpFile = function() {
        var tmp = java.io.File.createTempFile("avro-ch-test", ".avro")
        tmp.delete()
        return String(tmp.getPath())
    }

    // -----------------------------------------------------------------------
    // Basic set/get/size (options.key shortcut)
    // -----------------------------------------------------------------------
    exports.testSetGetSize = function() {
        var file = _tmpFile()
        $ch("avroChTest1").create(1, "avro", { file: file, key: "id" })

        try {
            $ch("avroChTest1").set({ id: "u1" }, { id: "u1", name: "John", age: 30 })
            $ch("avroChTest1").set({ id: "u2" }, { id: "u2", name: "Jane", age: 25 })

            ow.test.assert($ch("avroChTest1").size(), 2,
                "size should reflect the number of set records")
            ow.test.assert($ch("avroChTest1").get({ id: "u1" }).name, "John",
                "get should retrieve the record matching the key field")
        } finally {
            $ch("avroChTest1").destroy()
        }
    }

    // -----------------------------------------------------------------------
    // Persistence across channel destroy/recreate on the same file
    // -----------------------------------------------------------------------
    exports.testPersistenceAcrossReload = function() {
        var file = _tmpFile()
        $ch("avroChTest2").create(1, "avro", { file: file, key: "id" })
        $ch("avroChTest2").set({ id: "u1" }, { id: "u1", name: "John" })
        $ch("avroChTest2").set({ id: "u2" }, { id: "u2", name: "Jane" })
        $ch("avroChTest2").destroy()

        $ch("avroChTest2b").create(1, "avro", { file: file, key: "id" })
        try {
            ow.test.assert($ch("avroChTest2b").size(), 2,
                "reopening the channel on the same file should restore all previously set records")
            ow.test.assert($ch("avroChTest2b").get({ id: "u2" }).name, "Jane",
                "reopened records should keep their field values")
        } finally {
            $ch("avroChTest2b").destroy()
        }
    }

    // -----------------------------------------------------------------------
    // unset removes the record and, once empty, the backing file
    // -----------------------------------------------------------------------
    exports.testUnsetRemovesRecordAndEmptiesFile = function() {
        var file = _tmpFile()
        $ch("avroChTest3").create(1, "avro", { file: file, key: "id" })
        $ch("avroChTest3").set({ id: "u1" }, { id: "u1", name: "John" })

        try {
            $ch("avroChTest3").unset({ id: "u1" })
            ow.test.assert($ch("avroChTest3").size(), 0,
                "unset should remove the record")
            ow.test.assert(io.fileExists(file), false,
                "emptying the channel should remove the now-empty backing Avro file")
        } finally {
            $ch("avroChTest3").destroy()
        }
    }

    // -----------------------------------------------------------------------
    // setAll / unsetAll batch operations
    // -----------------------------------------------------------------------
    exports.testSetAllUnsetAll = function() {
        var file = _tmpFile()
        $ch("avroChTest4").create(1, "avro", { file: file })

        try {
            $ch("avroChTest4").setAll(["name"], [
                { name: "a", v: 1 },
                { name: "b", v: 2 },
                { name: "c", v: 3 }
            ])
            ow.test.assert($ch("avroChTest4").size(), 3,
                "setAll should insert every record from the array")

            $ch("avroChTest4").unsetAll(["name"], [ { name: "b" } ])
            ow.test.assert($ch("avroChTest4").size(), 2,
                "unsetAll should remove the matching record")
        } finally {
            $ch("avroChTest4").destroy()
        }
    }

    // -----------------------------------------------------------------------
    // getAll / getKeys / getSortedKeys / forEach
    // -----------------------------------------------------------------------
    exports.testGetAllGetKeysForEach = function() {
        var file = _tmpFile()
        $ch("avroChTest5").create(1, "avro", { file: file, key: "id" })

        try {
            $ch("avroChTest5").set({ id: "u1" }, { id: "u1", v: 1 })
            $ch("avroChTest5").set({ id: "u2" }, { id: "u2", v: 2 })

            ow.test.assert($ch("avroChTest5").getAll().length, 2,
                "getAll should return every record's value")
            ow.test.assert($ch("avroChTest5").getKeys().length, 2,
                "getKeys should return one key per record")
            ow.test.assert($ch("avroChTest5").getSortedKeys().length, 2,
                "getSortedKeys should return one key per record")

            var seen = 0
            $ch("avroChTest5").forEach(function(k, v) { seen++ })
            ow.test.assert(seen, 2,
                "forEach should visit every record")
        } finally {
            $ch("avroChTest5").destroy()
        }
    }

    // -----------------------------------------------------------------------
    // pop / shift (FIFO/LIFO removal via ow.ch's own get+unset sequence)
    // -----------------------------------------------------------------------
    exports.testPopShift = function() {
        var file = _tmpFile()
        $ch("avroChTest6").create(1, "avro", { file: file, key: "id" })

        try {
            $ch("avroChTest6").set({ id: "a" }, { id: "a", v: 1 })
            $ch("avroChTest6").set({ id: "b" }, { id: "b", v: 2 })
            $ch("avroChTest6").set({ id: "c" }, { id: "c", v: 3 })

            var shifted = $ch("avroChTest6").shift()
            ow.test.assert(shifted.id, "a",
                "shift should remove and return the first inserted record")
            ow.test.assert($ch("avroChTest6").size(), 2,
                "shift should reduce the channel size by one")

            var popped = $ch("avroChTest6").pop()
            ow.test.assert(popped.id, "c",
                "pop should remove and return the last inserted record")
            ow.test.assert($ch("avroChTest6").size(), 1,
                "pop should reduce the channel size by one")
        } finally {
            $ch("avroChTest6").destroy()
        }
    }

    // -----------------------------------------------------------------------
    // getSet
    // -----------------------------------------------------------------------
    exports.testGetSet = function() {
        var file = _tmpFile()
        $ch("avroChTest7").create(1, "avro", { file: file, key: "id" })

        try {
            $ch("avroChTest7").set({ id: "u1" }, { id: "u1", v: 1 })

            $ch("avroChTest7").getSet(function(v) { return isDef(v) && v.v == 1 }, { id: "u1" }, { id: "u1", v: 99 })
            ow.test.assert($ch("avroChTest7").get({ id: "u1" }).v, 99,
                "getSet should update the record when the match function returns true")

            $ch("avroChTest7").getSet(function(v) { return isDef(v) && v.v == 1 }, { id: "u1" }, { id: "u1", v: -1 })
            ow.test.assert($ch("avroChTest7").get({ id: "u1" }).v, 99,
                "getSet should not update the record when the match function returns false")
        } finally {
            $ch("avroChTest7").destroy()
        }
    }

    // -----------------------------------------------------------------------
    // Nested map/array field values round-trip through JSON
    // -----------------------------------------------------------------------
    exports.testNestedValuesRoundTrip = function() {
        var file = _tmpFile()
        $ch("avroChTest8").create(1, "avro", { file: file, key: "id" })

        try {
            $ch("avroChTest8").set({ id: "u1" }, { id: "u1", tags: [ "a", "b" ], meta: { x: 1, y: "z" } })
            var v = $ch("avroChTest8").get({ id: "u1" })

            ow.test.assert(isArray(v.tags), true,
                "an array field value should round-trip back into a native JS array")
            ow.test.assert(v.tags.join(","), "a,b",
                "an array field value should preserve its elements")
            ow.test.assert(isMap(v.meta), true,
                "a map field value should round-trip back into a native JS map")
            ow.test.assert(v.meta.y, "z",
                "a map field value should preserve its nested fields")
        } finally {
            $ch("avroChTest8").destroy()
        }
    }

    // -----------------------------------------------------------------------
    // S3-backed channel (using an injected mock S3 client, no live S3 needed)
    // -----------------------------------------------------------------------
    exports.testS3BackedChannel = function() {
        var storeDir = io.createTempFile("avro-ch-s3-", "")
        io.rm(storeDir)
        io.mkdir(storeDir)
        var store = {}

        var fakeS3 = {
            objectExists: function(bucket, obj) { return isDef(store[bucket + "/" + obj]) },
            getObject: function(bucket, obj, localPath) { io.cp(storeDir + "/" + bucket + "_" + obj, localPath) },
            putObject: function(bucket, obj, localPath) { io.cp(localPath, storeDir + "/" + bucket + "_" + obj); store[bucket + "/" + obj] = true },
            removeObject: function(bucket, obj) { io.rm(storeDir + "/" + bucket + "_" + obj); delete store[bucket + "/" + obj] },
            close: function() {}
        }

        $ch("avroChTest9").create(1, "avro", {
            key: "id",
            s3: { bucket: "test-bucket", object: "table.avro", client: fakeS3 }
        })

        try {
            $ch("avroChTest9").set({ id: "x" }, { id: "x", v: 42 })
            ow.test.assert($ch("avroChTest9").size(), 1,
                "setting a record on a S3-backed channel should update its in-memory state")
            ow.test.assert(fakeS3.objectExists("test-bucket", "table.avro"), true,
                "setting a record on a S3-backed channel should upload the Avro file to S3")
        } finally {
            $ch("avroChTest9").destroy()
        }

        $ch("avroChTest9b").create(1, "avro", {
            key: "id",
            s3: { bucket: "test-bucket", object: "table.avro", client: fakeS3 }
        })
        try {
            ow.test.assert($ch("avroChTest9b").size(), 1,
                "reopening a S3-backed channel should download and restore the previously uploaded records")
            ow.test.assert($ch("avroChTest9b").get({ id: "x" }).v, 42,
                "reopened S3-backed records should keep their field values")

            $ch("avroChTest9b").unset({ id: "x" })
            ow.test.assert(fakeS3.objectExists("test-bucket", "table.avro"), false,
                "emptying a S3-backed channel should remove the now-empty object from S3")
        } finally {
            $ch("avroChTest9b").destroy()
        }
    }
})()
