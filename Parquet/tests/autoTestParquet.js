(function() {
    loadLib("parquet.js")

    var _tmpFile = function() {
        var tmp = java.io.File.createTempFile("parquet-test", ".parquet")
        tmp.delete()
        return String(tmp.getPath())
    }

    // -----------------------------------------------------------------------
    // Write + read round-trip / type inference
    // -----------------------------------------------------------------------
    exports.testWriteReadRoundTrip = function() {
        var file = _tmpFile()
        var p    = new Parquet()
        p.fromArray(file, [
            { name: "John", age: 30, active: true },
            { name: "Jane", age: 25, active: false }
        ])

        var p2  = new Parquet()
        var arr = p2.loadFile(file).toArray()

        ow.test.assert(arr.length, 2,
            "toArray should return one row per written record")
        ow.test.assert(arr[0].name, "John",
            "toArray should preserve string field values")
        ow.test.assert(arr[0].age, 30,
            "toArray should preserve numeric field values")
        ow.test.assert(arr[1].active, false,
            "toArray should preserve boolean false (not coerce truthy from the wrapped Java object)")
        ow.test.assert(arr[0].active, true,
            "toArray should preserve boolean true")
    }

    exports.testInferredTypesAreNative = function() {
        var file = _tmpFile()
        var p    = new Parquet()
        p.fromArray(file, [ { name: "John", age: 30, active: true } ])

        var row = new Parquet().loadFile(file).toArray()[0]

        ow.test.assert(typeof row.name, "string",
            "an inferred string field should read back as a native JS string")
        ow.test.assert(typeof row.age, "number",
            "an inferred number field should read back as a native JS number")
        ow.test.assert(typeof row.active, "boolean",
            "an inferred boolean field should read back as a native JS boolean")
    }

    exports.testDateFieldsBecomeISOStrings = function() {
        var file = _tmpFile()
        var p    = new Parquet()
        var d    = new Date(Date.UTC(2024, 0, 15, 10, 30, 0))
        p.fromArray(file, [ { name: "John", createdAt: d } ])

        var row = new Parquet().loadFile(file).toArray()[0]
        ow.test.assert(row.createdAt, d.toISOString(),
            "a Date value should be written/read back as its ISO string representation")
    }

    // -----------------------------------------------------------------------
    // Optional / missing fields
    // -----------------------------------------------------------------------
    exports.testMissingFieldsReadAsNull = function() {
        var file = _tmpFile()
        var p    = new Parquet()
        p.fromArray(file, [
            { name: "John", age: 30 },
            { name: "Jane" }
        ])

        var arr = new Parquet().loadFile(file).toArray()
        ow.test.assert(arr[1].age, null,
            "a row missing an inferred-optional field should read back that field as null")
        ow.test.assert(arr[0].age, 30,
            "a row that does provide the field should still read back its value")
    }

    // -----------------------------------------------------------------------
    // Explicit schema override
    // -----------------------------------------------------------------------
    exports.testExplicitSchemaOverride = function() {
        var file = _tmpFile()
        var p    = new Parquet()
        p.fromArray(file, [
            { id: 1, label: "a" },
            { id: 2, label: "b" }
        ], [ { name: "id", type: "DOUBLE" }, { name: "label", type: "STRING" } ])

        var arr = new Parquet().loadFile(file).toArray()
        ow.test.assert(arr.length, 2,
            "an explicit schema should still write/read all rows")
        ow.test.assert(arr[0].id, 1,
            "an explicit DOUBLE field should read back as a number")
        ow.test.assert(arr[1].label, "b",
            "an explicit STRING field should read back as a string")
    }

    // -----------------------------------------------------------------------
    // forEach / fieldMapper
    // -----------------------------------------------------------------------
    exports.testForEachVisitsEveryRow = function() {
        var file = _tmpFile()
        new Parquet().fromArray(file, [
            { name: "John", age: 30 },
            { name: "Jane", age: 25 },
            { name: "Mike", age: 41 }
        ])

        var count = 0
        new Parquet().loadFile(file).forEach(row => { count++ })
        ow.test.assert(count, 3,
            "forEach should invoke the callback once per row")
    }

    exports.testFieldMapperSkipsField = function() {
        var file = _tmpFile()
        new Parquet().fromArray(file, [ { name: "John", age: 30, active: true } ])

        var row = new Parquet().loadFile(file).toArray(function(path) {
            if (path[0] == "active") return null
            return path[0]
        })[0]

        ow.test.assert(isDef(row.active), false,
            "a fieldMapper returning null for a path should skip that field entirely")
        ow.test.assert(row.name, "John",
            "fields not skipped by the fieldMapper should still be present")
    }

    exports.testFieldMapperRenamesField = function() {
        var file = _tmpFile()
        new Parquet().fromArray(file, [ { name: "John", age: 30 } ])

        var row = new Parquet().loadFile(file).toArray(function(path) {
            return path[0] == "name" ? "n" : path[0]
        })[0]

        ow.test.assert(row.n, "John",
            "a fieldMapper should be able to rename the key used for a field")
        ow.test.assert(isDef(row.name), false,
            "the original field name should no longer be present once renamed")
    }

    // -----------------------------------------------------------------------
    // getSchema / getMeta / getStats
    // -----------------------------------------------------------------------
    exports.testGetSchema = function() {
        var file = _tmpFile()
        new Parquet().fromArray(file, [ { name: "John", age: 30, active: true } ])

        var schema = new Parquet().loadFile(file).getSchema()
        ow.test.assert(schema.length, 3,
            "getSchema should report one entry per top-level field")

        var byName = {}
        schema.forEach(f => byName[f.name] = f)

        ow.test.assert(byName.name.type, "BINARY",
            "a string field should be schema'd as BINARY")
        ow.test.assert(byName.name.logicalType, "STRING",
            "a string field should carry the STRING logical type annotation")
        ow.test.assert(byName.age.type, "DOUBLE",
            "a number field should be schema'd as DOUBLE")
        ow.test.assert(byName.active.type, "BOOLEAN",
            "a boolean field should be schema'd as BOOLEAN")
        ow.test.assert(byName.name.repetition, "OPTIONAL",
            "inferred fields should default to OPTIONAL repetition")
    }

    exports.testGetMeta = function() {
        var file = _tmpFile()
        new Parquet().fromArray(file, [ { name: "John" } ])

        var meta = new Parquet().loadFile(file).getMeta()
        ow.test.assert(isMap(meta), true,
            "getMeta should return a map")
        ow.test.assert(meta["writer.model.name"], "blue.strategic.parquet.ParquetWriter",
            "getMeta should include the writer.model.name key written by parquet-floor")
    }

    exports.testGetStats = function() {
        var file = _tmpFile()
        new Parquet().fromArray(file, [
            { name: "John", age: 30 },
            { name: "Jane", age: 25 }
        ])

        var stats = new Parquet().loadFile(file).getStats()
        ow.test.assert(stats.rowCount, 2,
            "getStats should report the total row count across all blocks")
        ow.test.assert(stats.blockCount >= 1, true,
            "getStats should report at least one block")
        ow.test.assert(stats.fileSizeInBytes > 0, true,
            "getStats should report a positive file size")
        ow.test.assert(isDef(stats.codec), true,
            "getStats should report the compression codec used")
    }

    // -----------------------------------------------------------------------
    // Error handling
    // -----------------------------------------------------------------------
    exports.testLoadFileThrowsWhenMissing = function() {
        var threw = false
        try {
            new Parquet().loadFile("/tmp/__parquet_test_does_not_exist__.parquet")
        } catch(e) {
            threw = true
        }
        ow.test.assert(threw, true,
            "loadFile should throw when the given file does not exist")
    }

    exports.testGetSchemaThrowsWithoutLoadFile = function() {
        var threw = false
        try {
            new Parquet().getSchema()
        } catch(e) {
            threw = true
        }
        ow.test.assert(threw, true,
            "getSchema should throw if called before loadFile")
    }
})()
