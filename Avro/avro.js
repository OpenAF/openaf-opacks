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
        _meta[k] = this._sr.getMetaString(k)
        if (_meta[k].startsWith("{")) _meta[k] = jsonParse("[" + _meta[k] + "]")[0]
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

    var _r = {
        blockCount: _c,
        sizeInBytes: _s,
        avgSizePerBlockInBytes: Math.round(_s / _c),
        codec: this._sr.getMetaString("avro.codec"),
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