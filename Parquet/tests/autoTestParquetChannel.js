(function() {
    loadLib("parquet.js")

    var _tmpFile = function() {
        var tmp = java.io.File.createTempFile("parquet-ch-test", ".parquet")
        tmp.delete()
        return String(tmp.getPath())
    }

    // -----------------------------------------------------------------------
    // Basic set/get/size (options.key shortcut)
    // -----------------------------------------------------------------------
    exports.testSetGetSize = function() {
        var file = _tmpFile()
        $ch("parquetChTest1").create(1, "parquet", { file: file, key: "id" })

        try {
            $ch("parquetChTest1").set({ id: 1 }, { id: 1, name: "John", age: 30 })
            $ch("parquetChTest1").set({ id: 2 }, { id: 2, name: "Jane", age: 25 })

            ow.test.assert($ch("parquetChTest1").size(), 2,
                "size should reflect the number of set records")
            ow.test.assert($ch("parquetChTest1").get({ id: 1 }).name, "John",
                "get should retrieve the record matching the key field")
        } finally {
            $ch("parquetChTest1").destroy()
        }
    }

    // -----------------------------------------------------------------------
    // Persistence across channel destroy/recreate on the same file
    // -----------------------------------------------------------------------
    exports.testPersistenceAcrossReload = function() {
        var file = _tmpFile()
        $ch("parquetChTest2").create(1, "parquet", { file: file, key: "id" })
        $ch("parquetChTest2").set({ id: 1 }, { id: 1, name: "John" })
        $ch("parquetChTest2").set({ id: 2 }, { id: 2, name: "Jane" })
        $ch("parquetChTest2").destroy()

        $ch("parquetChTest2b").create(1, "parquet", { file: file, key: "id" })
        try {
            ow.test.assert($ch("parquetChTest2b").size(), 2,
                "reopening the channel on the same file should restore all previously set records")
            ow.test.assert($ch("parquetChTest2b").get({ id: 2 }).name, "Jane",
                "reopened records should keep their field values")
        } finally {
            $ch("parquetChTest2b").destroy()
        }
    }

    // -----------------------------------------------------------------------
    // unset removes the record and, once empty, the backing file
    // -----------------------------------------------------------------------
    exports.testUnsetRemovesRecordAndEmptiesFile = function() {
        var file = _tmpFile()
        $ch("parquetChTest3").create(1, "parquet", { file: file, key: "id" })
        $ch("parquetChTest3").set({ id: 1 }, { id: 1, name: "John" })

        try {
            $ch("parquetChTest3").unset({ id: 1 })
            ow.test.assert($ch("parquetChTest3").size(), 0,
                "unset should remove the record")
            ow.test.assert(io.fileExists(file), false,
                "emptying the channel should remove the now-empty backing Parquet file")
        } finally {
            $ch("parquetChTest3").destroy()
        }
    }

    // -----------------------------------------------------------------------
    // setAll / unsetAll batch operations
    // -----------------------------------------------------------------------
    exports.testSetAllUnsetAll = function() {
        var file = _tmpFile()
        $ch("parquetChTest4").create(1, "parquet", { file: file })

        try {
            $ch("parquetChTest4").setAll(["name"], [
                { name: "a", v: 1 },
                { name: "b", v: 2 },
                { name: "c", v: 3 }
            ])
            ow.test.assert($ch("parquetChTest4").size(), 3,
                "setAll should insert every record from the array")

            $ch("parquetChTest4").unsetAll(["name"], [ { name: "b" } ])
            ow.test.assert($ch("parquetChTest4").size(), 2,
                "unsetAll should remove the matching record")
        } finally {
            $ch("parquetChTest4").destroy()
        }
    }

    // -----------------------------------------------------------------------
    // getAll / getKeys / getSortedKeys / forEach
    // -----------------------------------------------------------------------
    exports.testGetAllGetKeysForEach = function() {
        var file = _tmpFile()
        $ch("parquetChTest5").create(1, "parquet", { file: file, key: "id" })

        try {
            $ch("parquetChTest5").set({ id: 1 }, { id: 1, v: 1 })
            $ch("parquetChTest5").set({ id: 2 }, { id: 2, v: 2 })

            ow.test.assert($ch("parquetChTest5").getAll().length, 2,
                "getAll should return every record's value")
            ow.test.assert($ch("parquetChTest5").getKeys().length, 2,
                "getKeys should return one key per record")
            ow.test.assert($ch("parquetChTest5").getSortedKeys().length, 2,
                "getSortedKeys should return one key per record")

            var seen = 0
            $ch("parquetChTest5").forEach(function(k, v) { seen++ })
            ow.test.assert(seen, 2,
                "forEach should visit every record")
        } finally {
            $ch("parquetChTest5").destroy()
        }
    }

    // -----------------------------------------------------------------------
    // pop / shift (FIFO/LIFO removal via ow.ch's own get+unset sequence)
    // -----------------------------------------------------------------------
    exports.testPopShift = function() {
        var file = _tmpFile()
        $ch("parquetChTest6").create(1, "parquet", { file: file, key: "id" })

        try {
            $ch("parquetChTest6").set({ id: 1 }, { id: 1, v: 1 })
            $ch("parquetChTest6").set({ id: 2 }, { id: 2, v: 2 })
            $ch("parquetChTest6").set({ id: 3 }, { id: 3, v: 3 })

            var shifted = $ch("parquetChTest6").shift()
            ow.test.assert(shifted.id, 1,
                "shift should remove and return the first inserted record")
            ow.test.assert($ch("parquetChTest6").size(), 2,
                "shift should reduce the channel size by one")

            var popped = $ch("parquetChTest6").pop()
            ow.test.assert(popped.id, 3,
                "pop should remove and return the last inserted record")
            ow.test.assert($ch("parquetChTest6").size(), 1,
                "pop should reduce the channel size by one")
        } finally {
            $ch("parquetChTest6").destroy()
        }
    }

    // -----------------------------------------------------------------------
    // getSet
    // -----------------------------------------------------------------------
    exports.testGetSet = function() {
        var file = _tmpFile()
        $ch("parquetChTest7").create(1, "parquet", { file: file, key: "id" })

        try {
            $ch("parquetChTest7").set({ id: 1 }, { id: 1, v: 1 })

            $ch("parquetChTest7").getSet(function(v) { return isDef(v) && v.v == 1 }, { id: 1 }, { id: 1, v: 99 })
            ow.test.assert($ch("parquetChTest7").get({ id: 1 }).v, 99,
                "getSet should update the record when the match function returns true")

            $ch("parquetChTest7").getSet(function(v) { return isDef(v) && v.v == 1 }, { id: 1 }, { id: 1, v: -1 })
            ow.test.assert($ch("parquetChTest7").get({ id: 1 }).v, 99,
                "getSet should not update the record when the match function returns false")
        } finally {
            $ch("parquetChTest7").destroy()
        }
    }

    // -----------------------------------------------------------------------
    // Nested map/array field values round-trip through JSON
    // -----------------------------------------------------------------------
    exports.testNestedValuesRoundTrip = function() {
        var file = _tmpFile()
        $ch("parquetChTest8").create(1, "parquet", { file: file, key: "id" })

        try {
            $ch("parquetChTest8").set({ id: 1 }, { id: 1, tags: [ "a", "b" ], meta: { x: 1, y: "z" } })
            var v = $ch("parquetChTest8").get({ id: 1 })

            ow.test.assert(isArray(v.tags), true,
                "an array field value should round-trip back into a native JS array")
            ow.test.assert(v.tags.join(","), "a,b",
                "an array field value should preserve its elements")
            ow.test.assert(isMap(v.meta), true,
                "a map field value should round-trip back into a native JS map")
            ow.test.assert(v.meta.y, "z",
                "a map field value should preserve its nested fields")
        } finally {
            $ch("parquetChTest8").destroy()
        }
    }

    // -----------------------------------------------------------------------
    // S3-backed channel (using an injected mock S3 client, no live S3 needed)
    // -----------------------------------------------------------------------
    exports.testS3BackedChannel = function() {
        var storeDir = io.createTempFile("parquet-ch-s3-", "")
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

        $ch("parquetChTest9").create(1, "parquet", {
            key: "id",
            s3: { bucket: "test-bucket", object: "table.parquet", client: fakeS3 }
        })

        try {
            $ch("parquetChTest9").set({ id: 1 }, { id: 1, v: 42 })
            ow.test.assert($ch("parquetChTest9").size(), 1,
                "setting a record on a S3-backed channel should update its in-memory state")
            ow.test.assert(fakeS3.objectExists("test-bucket", "table.parquet"), true,
                "setting a record on a S3-backed channel should upload the Parquet file to S3")
        } finally {
            $ch("parquetChTest9").destroy()
        }

        $ch("parquetChTest9b").create(1, "parquet", {
            key: "id",
            s3: { bucket: "test-bucket", object: "table.parquet", client: fakeS3 }
        })
        try {
            ow.test.assert($ch("parquetChTest9b").size(), 1,
                "reopening a S3-backed channel should download and restore the previously uploaded records")
            ow.test.assert($ch("parquetChTest9b").get({ id: 1 }).v, 42,
                "reopened S3-backed records should keep their field values")

            $ch("parquetChTest9b").unset({ id: 1 })
            ow.test.assert(fakeS3.objectExists("test-bucket", "table.parquet"), false,
                "emptying a S3-backed channel should remove the now-empty object from S3")
        } finally {
            $ch("parquetChTest9b").destroy()
        }
    }
})()
