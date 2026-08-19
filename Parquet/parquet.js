loadExternalJars(getOPackPath("Parquet") || ".")

/**
 * <odoc>
 * <key>Parquet.Parquet() : Parquet</key>
 * Creates a new Parquet wrapper instance to read and write Apache Parquet files.
 * </odoc>
 */
var Parquet = function() {
    this._file = __
    this._fi   = __
}

/**
 * <odoc>
 * <key>Parquet.loadFile(aFile) : Parquet</key>
 * Loads a Parquet file from aFile for subsequent reading (getSchema, getMeta, getStats, forEach, toArray).
 * </odoc>
 */
Parquet.prototype.loadFile = function(aFile) {
    if (io.fileExists(aFile)) {
        this._fi   = io.fileInfo(aFile)
        this._file = new java.io.File(aFile)
    } else {
        throw "File not found."
    }

    return this
}

/**
 * <odoc>
 * <key>Parquet.close()</key>
 * Resets the currently loaded Parquet file.
 * </odoc>
 */
Parquet.prototype.close = function() {
    this._file = __
    this._fi   = __
}

/**
 * <odoc>
 * <key>Parquet.getSchema() : Array</key>
 * Returns an array describing each top-level field of the Parquet file's schema (name, type, repetition and,
 * when present, logicalType). Nested group fields are reported with type "GROUP" without descending into them.
 * </odoc>
 */
Parquet.prototype.getSchema = function() {
    if (this._file == __) throw "No file loaded. Please use loadFile first."

    var footer = Packages.blue.strategic.parquet.ParquetReader.readMetadata(this._file)
    var fields = af.fromJavaArray(footer.getFileMetaData().getSchema().getFields().toArray())

    return fields.map(f => {
        var _f = {
            name      : String(f.getName()),
            repetition: String(f.getRepetition().name()),
            type      : f.isPrimitive() ? String(f.asPrimitiveType().getPrimitiveTypeName().name()) : "GROUP"
        }
        if (f.getLogicalTypeAnnotation() != null) _f.logicalType = String(f.getLogicalTypeAnnotation().toString())
        return _f
    })
}

/**
 * <odoc>
 * <key>Parquet.getMeta() : Map</key>
 * Returns a map with the key/value metadata stored in the Parquet file.
 * </odoc>
 */
Parquet.prototype.getMeta = function() {
    if (this._file == __) throw "No file loaded. Please use loadFile first."

    var kv   = Packages.blue.strategic.parquet.ParquetReader.readMetadata(this._file).getFileMetaData().getKeyValueMetaData()
    var it   = kv.keySet().iterator()
    var _meta = {}
    while(it.hasNext()) {
        var k = it.next()
        _meta[String(k)] = String(kv.get(k))
    }
    return _meta
}

/**
 * <odoc>
 * <key>Parquet.getStats() : Map</key>
 * Returns a map with the row group (block) count, total row count, compressed/uncompressed sizes, codec and file size.
 * </odoc>
 */
Parquet.prototype.getStats = function() {
    if (this._file == __) throw "No file loaded. Please use loadFile first."

    var footer = Packages.blue.strategic.parquet.ParquetReader.readMetadata(this._file)
    var blocks = af.fromJavaArray(footer.getBlocks().toArray())

    var _rowCount = 0, _compressedSize = 0, _uncompressedSize = 0, _codec = __

    blocks.forEach(b => {
        _rowCount         += Number(b.getRowCount())
        _compressedSize   += Number(b.getCompressedSize())
        _uncompressedSize += Number(b.getTotalByteSize())
        if (_codec == __) {
            var cols = af.fromJavaArray(b.getColumns().toArray())
            if (cols.length > 0) _codec = String(cols[0].getCodec().name())
        }
    })

    return {
        blockCount              : blocks.length,
        rowCount                : _rowCount,
        compressedSizeInBytes   : _compressedSize,
        uncompressedSizeInBytes : _uncompressedSize,
        codec                   : _codec,
        fileSizeInBytes         : this._fi.size
    }
}

/**
 * <odoc>
 * <key>Parquet.forEach(aFn, fieldMapper)</key>
 * Executes aFn for each row in the Parquet file. Each row is passed as a plain map keyed by the dot-joined
 * column path (e.g. "tags.environment" for a MAP column entry). An optional fieldMapper function can be
 * provided to control which fields are read: it receives the raw String[] column path and should return
 * either a string to use as the row's key for that field, or __/null to skip the field entirely.
 * </odoc>
 */
Parquet.prototype.forEach = function(aFn, fieldMapper) {
    if (this._file == __) throw "No file loaded. Please use loadFile first."

    var hydrator = new JavaAdapter(Packages.blue.strategic.parquet.Hydrator, {
        start : function() { return {} },
        add   : function(target, field, value) {
            var key = isDef(fieldMapper) ? field : af.fromJavaArray(field).join(".")

            if (value == null) {
                target[key] = value
            } else if (value instanceof java.lang.Boolean) {
                target[key] = value.booleanValue() ? true : false
            } else if (value instanceof java.lang.Number) {
                target[key] = Number(value)
            } else {
                target[key] = String(value)
            }

            return target
        },
        finish: function(target) { return target }
    })

    var stream
    if (isDef(fieldMapper)) {
        var mapperFn = new JavaAdapter(java.util.function.Function, {
            apply: function(field) {
                var res = fieldMapper(af.fromJavaArray(field))
                return isDef(res) && res != null ? res : null
            }
        })
        stream = Packages.blue.strategic.parquet.ParquetReader.streamContent(this._file, hydrator, mapperFn)
    } else {
        stream = Packages.blue.strategic.parquet.ParquetReader.streamContent(this._file, hydrator)
    }

    var it = stream.iterator()
    while(it.hasNext()) {
        aFn(it.next())
    }
}

/**
 * <odoc>
 * <key>Parquet.toArray(fieldMapper) : Array</key>
 * Returns an array with all the rows in the Parquet file. See Parquet.forEach for the fieldMapper argument.
 * </odoc>
 */
Parquet.prototype.toArray = function(fieldMapper) {
    var res = []
    this.forEach(row => res.push(row), fieldMapper)
    return res
}

/**
 * <odoc>
 * <key>Parquet.fromArray(aFile, aArray, aSchema)</key>
 * Given an aArray of rows and aFile this function will create a Parquet file. If aSchema is not provided it
 * will be inferred from the first row's fields (numbers become DOUBLE, booleans become BOOLEAN, everything
 * else -- including dates, converted with toISOString() -- becomes a BINARY/string field). All inferred
 * fields are OPTIONAL so rows may omit keys. To force a schema pass an array of { name, type } where type is
 * one of "DOUBLE", "BOOLEAN" or "STRING".
 * Example:\
 * \
 * var parquet = new Parquet()\
 * parquet.fromArray("test.parquet", [\
 *    { name: "John", age: 30 },\
 *    { name: "Jane", age: 25 }\
 * ])\
 * \
 * The above example will create a file "test.parquet" with two records.\
 * </odoc>
 */
Parquet.prototype.fromArray = function(aFile, aArray, aSchema) {
    _$(aFile, "file").isString().$_()
    _$(aArray, "array").isArray().$_()

    var Types = Packages.org.apache.parquet.schema.Types
    var PTN   = Packages.org.apache.parquet.schema.PrimitiveType.PrimitiveTypeName
    var LTA   = Packages.org.apache.parquet.schema.LogicalTypeAnnotation

    var fieldDefs
    if (isUnDef(aSchema)) {
        fieldDefs = Object.keys(aArray[0]).map(k => {
            var jsType = descType(aArray[0][k])
            var fType

            switch(jsType) {
            case "number" : fType = "DOUBLE" ; break
            case "boolean": fType = "BOOLEAN"; break
            default       : fType = "STRING" ; break
            }

            return { name: k, type: fType }
        })
    } else {
        fieldDefs = aSchema
    }

    // Build schema
    var mb = Types.buildMessage()
    fieldDefs.forEach(f => {
        var pb = mb.optional(f.type == "DOUBLE" ? PTN.DOUBLE : (f.type == "BOOLEAN" ? PTN.BOOLEAN : PTN.BINARY))
        if (f.type != "DOUBLE" && f.type != "BOOLEAN") pb = pb.as(LTA.stringType())
        pb.named(f.name)
    })
    var schema = mb.named("record")

    // Create writer
    var dehydrator = new JavaAdapter(Packages.blue.strategic.parquet.Dehydrator, {
        dehydrate: function(record, valueWriter) {
            fieldDefs.forEach(f => {
                var v = record[f.name]
                if (isUnDef(v) || v == null) return

                if (f.type == "DOUBLE") {
                    valueWriter.write(f.name, Number(v))
                } else if (f.type == "BOOLEAN") {
                    valueWriter.write(f.name, Boolean(v))
                } else {
                    valueWriter.write(f.name, String(isDate(v) ? v.toISOString() : v))
                }
            })
        }
    })

    var writer = Packages.blue.strategic.parquet.ParquetWriter.writeFile(schema, new java.io.File(aFile), dehydrator)
    aArray.forEach(r => writer.write(r))
    writer.close()
}

/**
 * <odoc>
 * <key>Parquet.getFile() : Object</key>
 * Returns the current internal Java java.io.File currently loaded.
 * </odoc>
 */
Parquet.prototype.getFile = function() {
    return this._file
}
