(function() {
    loadLib("avro.js")

    var _tmpFile = function() {
        var tmp = java.io.File.createTempFile("avro-test", ".avro")
        tmp.delete()
        return String(tmp.getPath())
    }

    // -----------------------------------------------------------------------
    // Write + read round-trip / type inference
    // -----------------------------------------------------------------------
    exports.testWriteReadRoundTrip = function() {
        var file = _tmpFile()
        var a    = new Avro()
        a.fromArray(file, [
            { name: "John", age: 30, active: true },
            { name: "Jane", age: 25, active: false }
        ])

        var a2  = new Avro()
        var arr = a2.loadFile(file).toArray()

        ow.test.assert(arr.length, 2,
            "toArray should return one row per written record")
        ow.test.assert(arr[0].name, "John",
            "toArray should preserve string field values")
        ow.test.assert(arr[0].age, 30,
            "toArray should preserve numeric field values")
        ow.test.assert(arr[1].active, false,
            "toArray should preserve boolean false")
        ow.test.assert(arr[0].active, true,
            "toArray should preserve boolean true")
    }

    exports.testInferredTypesAreNative = function() {
        var file = _tmpFile()
        new Avro().fromArray(file, [ { name: "John", age: 30, active: true } ])

        var row = new Avro().loadFile(file).toArray()[0]

        ow.test.assert(typeof row.name, "string",
            "an inferred string field should read back as a native JS string")
        ow.test.assert(typeof row.age, "number",
            "an inferred number field should read back as a native JS number")
        ow.test.assert(typeof row.active, "boolean",
            "an inferred boolean field should read back as a native JS boolean")
    }

    exports.testDateFieldsBecomeISOStrings = function() {
        var file = _tmpFile()
        var d    = new Date(Date.UTC(2024, 0, 15, 10, 30, 0))
        new Avro().fromArray(file, [ { name: "John", createdAt: d } ])

        var row = new Avro().loadFile(file).toArray()[0]
        ow.test.assert(row.createdAt, d.toISOString(),
            "a Date value should be written/read back as its ISO string representation")
    }

    exports.testSchemaInferenceUsesNullableUnion = function() {
        var file = _tmpFile()
        new Avro().fromArray(file, [ { name: "John", age: 30, active: true } ])

        var meta   = new Avro().loadFile(file).getMeta()
        var byName = {}
        meta["avro.schema"].fields.forEach(f => byName[f.name] = f)

        ow.test.assert(byName.name.type, [ "null", "string" ],
            "an inferred string field should be written as a nullable ['null','string'] union")
        ow.test.assert(byName.age.type, [ "null", "double" ],
            "an inferred number field should be written as a nullable ['null','double'] union")
        ow.test.assert(byName.active.type, [ "null", "boolean" ],
            "an inferred boolean field should be written as a nullable ['null','boolean'] union")
    }

    // -----------------------------------------------------------------------
    // Explicit schema override
    // -----------------------------------------------------------------------
    exports.testExplicitSchemaOverride = function() {
        // Note: fromArray's per-field coercion only special-cases types containing
        // "double" or "boolean" (anything else -- including Avro's own "int", "long",
        // "float" -- falls through to String(...)), so a custom schema's numeric
        // fields need to use "double" for the writer to serialize them correctly.
        var file   = _tmpFile()
        var schema = {
            type: "record",
            name: "record",
            fields: [
                { name: "id", type: "double" },
                { name: "label", type: "string" }
            ]
        }
        new Avro().fromArray(file, [
            { id: 1, label: "a" },
            { id: 2, label: "b" }
        ], "snappy", schema)

        var arr = new Avro().loadFile(file).toArray()
        ow.test.assert(arr.length, 2,
            "an explicit schema should still write/read all rows")
        ow.test.assert(arr[1].label, "b",
            "an explicit schema field should read back its value")
    }

    // -----------------------------------------------------------------------
    // Codecs
    // -----------------------------------------------------------------------
    exports.testDefaultCodecIsSnappy = function() {
        var file = _tmpFile()
        new Avro().fromArray(file, [ { name: "John" } ])

        var stats = new Avro().loadFile(file).getStats()
        ow.test.assert(stats.codec, "snappy",
            "fromArray should default to the snappy codec when none is given")
    }

    exports.testDeflateCodec = function() {
        var file = _tmpFile()
        new Avro().fromArray(file, [ { name: "John" } ], "deflate")

        var stats = new Avro().loadFile(file).getStats()
        ow.test.assert(stats.codec, "deflate",
            "fromArray should honor an explicitly requested codec")
    }

    exports.testUnrecognizedCodecIsSilentlyIgnored = function() {
        // Documents current behavior: codecToUse isn't validated against the
        // oneOf() list at runtime, so an unrecognized value falls through the
        // switch in fromArray() untouched and the file ends up with no codec
        // set (Avro's own "null"/uncompressed default) instead of raising an
        // error or falling back to "snappy".
        var file = _tmpFile()
        new Avro().fromArray(file, [ { name: "John" } ], "not-a-real-codec")

        var stats = new Avro().loadFile(file).getStats()
        ow.test.assert(stats.codec, null,
            "an unrecognized codecToUse is currently silently ignored rather than rejected or defaulted")
    }

    // -----------------------------------------------------------------------
    // forEach / dontConvert
    // -----------------------------------------------------------------------
    exports.testForEachVisitsEveryRow = function() {
        var file = _tmpFile()
        new Avro().fromArray(file, [
            { name: "John" }, { name: "Jane" }, { name: "Mike" }
        ])

        var count = 0
        new Avro().loadFile(file).forEach(row => { count++ })
        ow.test.assert(count, 3,
            "forEach should invoke the callback once per record")
    }

    exports.testForEachDontConvertReturnsRawJavaRecord = function() {
        var file = _tmpFile()
        new Avro().fromArray(file, [ { name: "John" } ])

        var seenClassName = __
        new Avro().loadFile(file).forEach(record => {
            seenClassName = String(record.getClass().getName())
        }, true)

        ow.test.assert(seenClassName, "org.apache.avro.generic.GenericData$Record",
            "forEach with dontConvert=true should pass the raw Avro GenericRecord instead of a parsed JS object")
    }

    // -----------------------------------------------------------------------
    // loadStream
    // -----------------------------------------------------------------------
    exports.testLoadStream = function() {
        var file = _tmpFile()
        new Avro().fromArray(file, [ { name: "John" }, { name: "Jane" } ])

        var stream = io.readFileStream(file)
        var arr    = new Avro().loadStream(stream).toArray()
        ow.test.assert(arr.length, 2,
            "loadStream should support reading from an already-open input stream")
    }

    // -----------------------------------------------------------------------
    // getMeta / getSchema / getStats / getStreamReader
    // -----------------------------------------------------------------------
    exports.testGetMeta = function() {
        var file = _tmpFile()
        new Avro().fromArray(file, [ { name: "John" } ])

        var meta = new Avro().loadFile(file).getMeta()
        ow.test.assert(isMap(meta), true,
            "getMeta should return a map")
        ow.test.assert(meta["avro.codec"], "snappy",
            "getMeta should surface the avro.codec key as a plain string")
        ow.test.assert(isMap(meta["avro.schema"]), true,
            "getMeta should JSON-parse the avro.schema key since its value starts with '{'")
    }

    exports.testGetSchema = function() {
        var file = _tmpFile()
        new Avro().fromArray(file, [ { name: "John", age: 30 } ])

        var schema = new Avro().loadFile(file).getSchema()
        ow.test.assert(schema.type, "record",
            "getSchema should return the parsed Avro schema as a JS object")
        ow.test.assert(schema.fields.length, 2,
            "getSchema should report one field entry per written column")
    }

    exports.testGetStats = function() {
        var file = _tmpFile()
        new Avro().fromArray(file, [ { name: "John" }, { name: "Jane" } ])

        var stats = new Avro().loadFile(file).getStats()
        ow.test.assert(stats.blockCount >= 1, true,
            "getStats should report at least one block")
        ow.test.assert(stats.fileSizeInBytes > 0, true,
            "getStats should report a positive file size")
        ow.test.assert(isDef(stats.codec), true,
            "getStats should report the compression codec used")
    }

    exports.testGetStreamReader = function() {
        var file = _tmpFile()
        new Avro().fromArray(file, [ { name: "John" } ])

        var a  = new Avro().loadFile(file)
        var sr = a.getStreamReader()
        ow.test.assert(String(sr.getClass().getName()), "org.apache.avro.file.DataFileStream",
            "getStreamReader should return the raw underlying DataFileStream")
    }

    // -----------------------------------------------------------------------
    // Sample fixture files (samples/*.avro)
    // -----------------------------------------------------------------------
    exports.testReadTwitterSample = function() {
        var a      = new Avro()
        var schema = a.loadFile("samples/twitter.snappy.avro").getSchema()
        ow.test.assert(schema.fields.map(f => f.name).sort().join(","), "timestamp,tweet,username",
            "the twitter.snappy.avro sample should expose username/tweet/timestamp fields")

        var a2  = new Avro()
        var arr = a2.loadFile("samples/twitter.snappy.avro").toArray()
        ow.test.assert(arr.length, 2,
            "the twitter.snappy.avro sample should contain 2 records")
    }

    exports.testReadUserdataSample = function() {
        var a     = new Avro()
        var stats = a.loadFile("samples/userdata5.avro").getStats()
        ow.test.assert(stats.blockCount, 1000,
            "the userdata5.avro sample should contain 1000 blocks/records")
        ow.test.assert(stats.codec, "snappy",
            "the userdata5.avro sample should be snappy-compressed")
    }

    // -----------------------------------------------------------------------
    // Error handling
    // -----------------------------------------------------------------------
    exports.testLoadFileThrowsWhenMissing = function() {
        var threw = false
        try {
            new Avro().loadFile("/tmp/__avro_test_does_not_exist__.avro")
        } catch(e) {
            threw = true
        }
        ow.test.assert(threw, true,
            "loadFile should throw when the given file does not exist")
    }

    exports.testGetSchemaThrowsWithoutLoadFile = function() {
        var threw = false
        try {
            new Avro().getSchema()
        } catch(e) {
            threw = true
        }
        ow.test.assert(threw, true,
            "getSchema should throw if called before loadFile/loadStream")
    }
})()
