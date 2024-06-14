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