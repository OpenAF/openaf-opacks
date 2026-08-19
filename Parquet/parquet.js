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

ow.loadCh()
// parquet implementation
//
/**
* <odoc>
* <key>ow.ch.types.parquet</key>
* The parquet channel OpenAF simplistic implementation keeps a full table of records, in memory, backed by
* a single Parquet file (either local or in a S3 bucket). Every mutating operation (set/setAll/unset/unsetAll/
* pop/shift) rewrites the entire Parquet file so this channel type is best suited for small/medium sized tables.
* The creation options are:\
* \
*    - file    (String)  The local Parquet file to use (required unless options.s3 is provided).\
*    - key     (String)  Optional field name to use as the record's unique key (otherwise the whole record is used as the key).\
*    - schema  (Array)   Optional explicit Parquet schema (an array of { name, type } where type is one of DOUBLE, BOOLEAN or STRING) to use instead of inferring one from the union of all record fields.\
*    - s3      (Map)     Optional map to keep the Parquet file in a S3 bucket instead of a local file:\
*       - bucket          (String)  The S3 bucket name.\
*       - object          (String)  The S3 object name/path to use for the Parquet file.\
*       - client          (Object)  Optional, an already created S3 object (see the S3 opack). If not provided one will be created with the following options.\
*       - url             (String)  The S3 service URL.\
*       - accessKey       (String)  The S3 access key.\
*       - secret          (String)  The S3 secret key.\
*       - region          (String)  Optional S3 region.\
*       - useVersion1     (Boolean) Optional, use S3 API version 1 where possible.\
*       - ignoreCertCheck (Boolean) Optional, ignore SSL certificate checks.\
* \
* Map or array field values are stored as JSON strings and automatically parsed back on read (fields that read back as text
* starting/ending with "{"/"}" or "["/"]" are parsed as JSON).\
* \
* </odoc>
*/
ow.ch.__types.parquet = {
    __channels: {},
    __id: function(o, aK) {
        if (isDef(o.key) && isMap(aK) && isDef(aK[o.key])) aK = { key: aK[o.key] }
        if (isMap(aK) && isDef(aK.key)) return String(aK.key)
        return stringify(sortMapKeys(aK), __, "")
    },
    __encode: function(row) {
        var r = {}
        Object.keys(row).forEach(k => {
            var v = row[k]
            r[k] = (isMap(v) || isArray(v)) ? stringify(v, __, "") : v
        })
        return r
    },
    __decode: function(row) {
        var r = {}
        Object.keys(row).forEach(k => {
            var v = row[k]
            if (isString(v) &&
                ((v.startsWith("{") && v.endsWith("}")) || (v.startsWith("[") && v.endsWith("]")))) {
                try { v = jsonParse(v, true) } catch(e) {}
            }
            r[k] = v
        })
        return r
    },
    __buildSchema: function(rows) {
        var order = [], sample = {}
        rows.forEach(row => {
            Object.keys(row).forEach(k => {
                if (order.indexOf(k) < 0) order.push(k)
                if (isUnDef(sample[k]) && isDef(row[k]) && row[k] !== null) sample[k] = row[k]
            })
        })

        return order.map(k => {
            var jsType = descType(sample[k])
            var fType
            switch(jsType) {
            case "number" : fType = "DOUBLE" ; break
            case "boolean": fType = "BOOLEAN"; break
            default       : fType = "STRING" ; break
            }
            return { name: k, type: fType }
        })
    },
    __load: function(aName) {
        var o = this.__channels[aName]
        o.data = {}
        o.keys = {}

        if (isDef(o.s3)) {
            if (o.s3.client.objectExists(o.s3.bucket, o.s3.object)) {
                o.s3.client.getObject(o.s3.bucket, o.s3.object, o._local)
            } else {
                return
            }
        }

        if (!io.fileExists(o._local) || io.fileInfo(o._local).size <= 0) return

        var rows = new Parquet().loadFile(o._local).toArray()
        var parent = this
        rows.forEach(row => {
            var r  = parent.__decode(row)
            var aK = isDef(o.key) ? { key: r[o.key] } : r
            var id = parent.__id(o, aK)
            o.keys[id] = aK
            o.data[id] = r
        })
    },
    __flush: function(aName) {
        var o = this.__channels[aName]
        var rows = Object.keys(o.data).map(id => this.__encode(o.data[id]))

        if (rows.length == 0) {
            if (io.fileExists(o._local)) io.rm(o._local)
        } else {
            var schema = isDef(o.schema) ? o.schema : this.__buildSchema(rows)
            new Parquet().fromArray(o._local, rows, schema)
        }

        if (isDef(o.s3)) {
            if (rows.length == 0) {
                if (o.s3.client.objectExists(o.s3.bucket, o.s3.object)) o.s3.client.removeObject(o.s3.bucket, o.s3.object)
            } else {
                o.s3.client.putObject(o.s3.bucket, o.s3.object, o._local)
            }
        }
    },
    create       : function(aName, shouldCompress, options) {
        options = _$(options, "options").isMap().default({})

        var o = {}
        o.key    = _$(options.key, "options.key").isString().default(__)
        o.schema = _$(options.schema, "options.schema").default(__)

        if (isDef(options.s3)) {
            var s3cfg = _$(options.s3, "options.s3").isMap().$_()
            _$(s3cfg.bucket, "options.s3.bucket").isString().$_()
            _$(s3cfg.object, "options.s3.object").isString().$_()

            o.s3 = {}
            o.s3.bucket = s3cfg.bucket
            o.s3.object = s3cfg.object
            if (isDef(s3cfg.client)) {
                o.s3.client = s3cfg.client
                o.s3.ownClient = false
            } else {
                loadLib("s3.js")
                o.s3.client = new S3(s3cfg.url, s3cfg.accessKey, s3cfg.secret, s3cfg.region, s3cfg.useVersion1, s3cfg.ignoreCertCheck)
                o.s3.ownClient = true
            }
            o._local = io.createTempFile("parquet-ch-", ".parquet")
            io.rm(o._local)
        } else {
            o.file = _$(options.file, "options.file").isString().$_()
            o._local = o.file
        }

        this.__channels[aName] = o
        this.__load(aName)
    },
    destroy      : function(aName) {
        var o = this.__channels[aName]
        if (isDef(o.s3)) {
            if (o.s3.ownClient) o.s3.client.close()
            if (io.fileExists(o._local)) io.rm(o._local)
        }
        delete this.__channels[aName]
    },
    size         : function(aName) {
        return Object.keys(this.__channels[aName].data).length
    },
    forEach      : function(aName, aFunction) {
        var o = this.__channels[aName]
        Object.keys(o.data).forEach(id => aFunction(o.keys[id], o.data[id]))
    },
    getAll       : function(aName, full) {
        var o = this.__channels[aName]
        return Object.keys(o.data).map(id => o.data[id])
    },
    getKeys      : function(aName, full) {
        var o = this.__channels[aName]
        return Object.keys(o.data).map(id => o.keys[id])
    },
    getSortedKeys: function(aName, full) {
        return this.getKeys(aName, full)
    },
    getSet       : function getSet(aName, aMatch, aK, aV, aTimestamp)  {
        var res = this.get(aName, aK)
        if ($stream([res]).anyMatch(aMatch)) {
            return this.set(aName, aK, aV, aTimestamp)
        }
        return __
    },
    set          : function(aName, aK, aV, aTimestamp) {
        var o  = this.__channels[aName]
        var id = this.__id(o, aK)
        o.keys[id] = aK
        o.data[id] = aV
        this.__flush(aName)
        return aK
    },
    setAll       : function(aName, aKs, aVs, aTimestamp) {
        ow.loadObj()
        var o = this.__channels[aName]
        aVs.forEach(v => {
            var aK = ow.obj.filterKeys(aKs, v)
            var id = this.__id(o, aK)
            o.keys[id] = aK
            o.data[id] = v
        })
        this.__flush(aName)
    },
    unsetAll     : function(aName, aKs, aVs, aTimestamp) {
        ow.loadObj()
        var o = this.__channels[aName]
        aVs.forEach(v => {
            var aK = ow.obj.filterKeys(aKs, v)
            var id = this.__id(o, aK)
            delete o.data[id]
            delete o.keys[id]
        })
        this.__flush(aName)
    },
    get          : function(aName, aK) {
        var o  = this.__channels[aName]
        var id = this.__id(o, aK)
        return o.data[id]
    },
    pop          : function(aName) {
        // ow.ch.pop() calls this to get a key, then does its own get(key)+unset(key), so
        // this must return the key (not the value) and must not mutate state itself.
        var o  = this.__channels[aName]
        var ks = Object.keys(o.data)
        if (ks.length == 0) return __
        return o.keys[ks[ks.length - 1]]
    },
    shift        : function(aName) {
        // ow.ch.shift() calls this to get a key, then does its own get(key)+unset(key), so
        // this must return the key (not the value) and must not mutate state itself.
        var o  = this.__channels[aName]
        var ks = Object.keys(o.data)
        if (ks.length == 0) return __
        return o.keys[ks[0]]
    },
    unset        : function(aName, aK, aTimestamp) {
        var o  = this.__channels[aName]
        var id = this.__id(o, aK)
        var v  = o.data[id]
        delete o.data[id]
        delete o.keys[id]
        this.__flush(aName)
        return v
    }
}
