loadExternalJars(getOPackPath("Avro") || ".")

/**
 * <odoc>
 * <key>Avro.Avro() : Avro</key>
 * Some description of the Avro constructor.
 * </odoc>
 */
var Avro = function() {
    this._sr = __
    this._is = __
    this._fi = __
}

/**
 * <odoc>
 * <key>Avro.loadFile(aFile) : Avro</key>
 * Loads an Avro file from aFile.
 * </odoc>
 */
Avro.prototype.loadFile = function(aFile) {
    if (isDef(this._is)) this._is.close()
    if (io.fileExists(aFile)) {
        this._fi = io.fileInfo(aFile)
        this._is = io.readFileStream(aFile)
        this._sr = new Packages.org.apache.avro.file.DataFileStream(this._is, new Packages.org.apache.avro.generic.GenericDatumReader())
    } else {
        throw "File not found."
    }

    return this
}

/**
 * <odoc>
 * <key>Avro.loadStream(aStream) : Avro</key>
 * Loads an Avro file from aStream.
 * </odoc>
 */
Avro.prototype.loadStream = function(aStream) {
    if (isDef(this._is)) this._is.close()
    this._is = aStream
    this._sr = new Packages.org.apache.avro.file.DataFileStream(this._is, new Packages.org.apache.avro.generic.GenericDatumReader())
    return this
}

/**
 * <odoc>
 * <key>Avro.close()</key>
 * Closes the current Avro reader and input stream.
 * </odoc>
 */
Avro.prototype.close = function() {
    if (isDef(this._sr)) this._sr.close()
    if (isDef(this._is)) this._is.close()
    this._sr = __
    this._is = __
    this._fi = __
}

/**
 * <odoc>
 * <key>Avro.getMeta() : Map</key>
 * Returns a map with the metadata from the Avro file.
 * </odoc>
 */
Avro.prototype.getMeta = function() {
    if (this._sr == __) throw "No stream reader loaded. Please use loadFile first."

    var _meta = {}
    this._sr.getMetaKeys().forEach(k => {
        var v = String(this._sr.getMetaString(k))
        _meta[String(k)] = v.startsWith("{") ? jsonParse("[" + v + "]")[0] : v
    })
    return _meta
}

/**
 * <odoc>
 * <key>Avro.getStats() : Map</key>
 * Returns a map with the count of records and the total size of the records in the Avro file.
 * </odoc>
 */
Avro.prototype.getStats = function() {
    if (this._sr == __) throw "No stream reader loaded. Please use loadFile first."

    var _c = 0
    var _s = 0
    var _fileSize = this._fi.size

    while(this._sr.hasNext()) {
        _c += this._sr.getBlockCount()
        _s += this._sr.getBlockSize()
        this._sr.nextBlock()
    }

    var _codec = this._sr.getMetaString("avro.codec")

    var _r = {
        blockCount: _c,
        sizeInBytes: _s,
        avgSizePerBlockInBytes: Math.round(_s / _c),
        codec: _codec == null ? null : String(_codec),
        fileSizeInBytes: _fileSize
    }

    this.close()
    return _r
}

/**
 * <odoc>
 * <key>Avro.getSchema() : Map</key>
 * Returns the Avro schema as a JSON object.
 * </odoc>
 */
Avro.prototype.getSchema = function() {
    if (this._sr == __) throw "No stream reader loaded. Please use loadFile first."
    return jsonParse(this._sr.getSchema().toString(true))
}

/**
 * <odoc>
 * <key>Avro.forEach(aFn, dontConvert)</key>
 * Executes aFn for each record in the Avro file. If dontConvert is true the record will be passed as a Java object, otherwise it will be converted to a JSON object.
 * </odoc>
 */
Avro.prototype.forEach = function(aFn, dontConvert) {
    if (this._sr == __) throw "No stream reader loaded. Please use loadFile first."

    while(this._sr.hasNext()) {
        var record = this._sr.next()
        aFn(dontConvert ? record : jsonParse(record.toString()) )
    }
    
    this.close()
}

/**
 * <odoc>
 * <key>Avro.fromArray(aFile, aArray, codecToUse, aSchema)</key>
 * Given an aArray of records, aFile, an optional codecToUse (snappy, bzip2, deflate, xz, zstandard) and an optional aSchema (if not provided it will be generated from the first record) this function will create an Avro file.
 * Example:\
 * \
 * var avro = new Avro()\
 * avro.fromArray("test.avro", [\
 *    { name: "John", age: 30 },\
 *    { name: "Jane", age: 25 }\
 * ], "snappy")\
 * \
 * The above example will create a file "test.avro" with two records.\
 * If you want to use a specific schema you can provide it as the last parameter.\
 * If you want to use a specific codec you can provide it as the third parameter.\
 * </odoc>
 */
Avro.prototype.fromArray = function(aFile, aArray, codecToUse, aSchema) {
    _$(aFile, "file").isString().$_()
    _$(aArray, "array").isArray().$_()
    codecToUse = _$(codecToUse, "codecToUse").oneOf(["snappy", "bzip2", "deflate", "xz", "zstandard"]).isString().default("snappy")

    // Generate schema
    if (isUnDef(aSchema)) {
        aSchema = {
            type: 'record',
            name: 'record',
            fields: []
        }

        Object.keys(aArray[0]).forEach(k => {
            var jsType = descType(aArray[0][k])
            var avroType

            switch(jsType) {
            case "string":
                avroType = "string"
                break
            case "number":
                avroType = "double"
                break
            case "boolean":
                avroType = "boolean"
                break
            case "bytearray":
                avroType = "bytes"
                break
            case "array":
                avroType = "array"
                break
            case "map":
                avroType = "map"
                break
            default:
                avroType = "string"
                break
            }

            aSchema.fields.push({
                name: k,
                type: [ "null", avroType ]
            })
        })
    }

    // Create writer
    var schema = new Packages.org.apache.avro.Schema.Parser().parse(stringify(aSchema))
    var dataFileWriter = new Packages.org.apache.avro.file.DataFileWriter(new Packages.org.apache.avro.specific.SpecificDatumWriter(schema))

    if (isDef(codecToUse)) {
        switch(codecToUse) {
        case "bzip2":
            dataFileWriter.setCodec(Packages.org.apache.avro.file.CodecFactory.bzip2Codec())
            break
        case "deflate":
            dataFileWriter.setCodec(Packages.org.apache.avro.file.CodecFactory.deflateCodec(9))
            break
        case "xz":
            dataFileWriter.setCodec(Packages.org.apache.avro.file.CodecFactory.xzCodec(9))
            break
        case "zstandard":
            dataFileWriter.setCodec(Packages.org.apache.avro.file.CodecFactory.zstandardCodec(22))
            break
        case "snappy":
            dataFileWriter.setCodec(Packages.org.apache.avro.file.CodecFactory.snappyCodec())
            break
        }
    }

    dataFileWriter.create(schema, new java.io.File(aFile))

    // Write records
    aArray.forEach(r => {
        var record = new Packages.org.apache.avro.generic.GenericData.Record(schema)
        Object.keys(r).forEach(k => {
            var recordType = $from(aSchema.fields).equals("name", k).at(0).type
            if (!isArray(recordType)) recordType = [ recordType ]
            
            if (recordType.indexOf("double") >= 0) {
                record.put(k, Number(r[k]))
            } else if (recordType.indexOf("boolean") >= 0) {
                record.put(k, Boolean(r[k]))
            } else {
                record.put(k, String(isDate(r[k]) ? r[k].toISOString() : r[k]))
            }
        })
        dataFileWriter.append(record)
    })

    dataFileWriter.close()
}

/**
 * <odoc>
 * <key>Avro.toArray() : Array</key>
 * Returns an array with all the records in the Avro file.
 * </odoc>
 */
Avro.prototype.toArray = function() {
    var res = new Set()
    this.forEach(record => res.add(record) )
    return Array.from(res)
}

/**
 * <odoc>
 * <key>Avro.getStreamReader() : Object</key>
 * Returns the current internal Java stream reader.
 * </odoc>
 */
Avro.prototype.getStreamReader = function() {
    return this._sr
}

ow.loadCh()
// avro implementation
//
/**
* <odoc>
* <key>ow.ch.types.avro</key>
* The avro channel OpenAF simplistic implementation keeps a full table of records, in memory, backed by
* a single Avro file (either local or in a S3 bucket). Every mutating operation (set/setAll/unset/unsetAll/
* pop/shift) rewrites the entire Avro file so this channel type is best suited for small/medium sized tables.
* The creation options are:\
* \
*    - file    (String)  The local Avro file to use (required unless options.s3 is provided).\
*    - key     (String)  Optional field name to use as the record's unique key (otherwise the whole record is used as the key).\
*    - codec   (String)  Optional Avro codec to use when writing (snappy, bzip2, deflate, xz, zstandard). Defaults to Avro.fromArray's own default (snappy).\
*    - schema  (Map)     Optional explicit Avro schema to use instead of inferring one from the union of all record fields.\
*    - s3      (Map)     Optional map to keep the Avro file in a S3 bucket instead of (or besides downloading/uploading to) a local file:\
*       - bucket          (String)  The S3 bucket name.\
*       - object          (String)  The S3 object name/path to use for the Avro file.\
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
ow.ch.__types.avro = {
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

        return {
            type: "record",
            name: "record",
            fields: order.map(k => {
                var jsType = descType(sample[k])
                var avroType
                switch(jsType) {
                case "string"   : avroType = "string" ; break
                case "number"   : avroType = "double" ; break
                case "boolean"  : avroType = "boolean"; break
                case "bytearray": avroType = "bytes"  ; break
                default         : avroType = "string" ; break
                }
                return { name: k, type: [ "null", avroType ] }
            })
        }
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

        var rows = new Avro().loadFile(o._local).toArray()
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
            new Avro().fromArray(o._local, rows, o.codec, schema)
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
        o.codec  = _$(options.codec, "options.codec").isString().default(__)
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
            o._local = io.createTempFile("avro-ch-", ".avro")
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