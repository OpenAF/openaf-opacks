ow.loadCh()
ow.loadObj()
ow.loadServer()

// Load external jars bundled with this OPack
var __path = getOPackPath("Lucene") || "."
loadExternalJars(__path)

/**
 * <odoc>
 * <key>new LuceneIndex(options)</key>
 * Creates a simple Lucene index helper. Options: path (string, default
 * ./lucene-index), idField (default "id"), textField (default "text"),
 * vectorField (default "vector"), metaField (default "meta"), dimension
 * (number, optional for validation), autoCommit (boolean, default true) and
 * similarity (VectorSimilarityFunction, default cosine).
 * </odoc>
 */
var LuceneIndex = function(options) {
    options              = _$(options, "options").isMap().default({})
    options.path         = _$(options.path, "options.path").isString().default("./lucene-index")
    options.idField      = _$(options.idField, "options.idField").isString().default("id")
    options.textField    = _$(options.textField, "options.textField").isString().default("text")
    options.vectorField  = _$(options.vectorField, "options.vectorField").isString().default("vector")
    options.metaField    = _$(options.metaField, "options.metaField").isString().default("meta")
    options.dimension    = _$(options.dimension, "options.dimension").isNumber().default(__)
    options.autoCommit   = _$(options.autoCommit, "options.autoCommit").isBoolean().default(true)
    options.similarity   = _$(options.similarity, "options.similarity").default(Packages.org.apache.lucene.index.VectorSimilarityFunction.COSINE)
    this.options         = options

    this.__dir           = Packages.org.apache.lucene.store.FSDirectory.open(java.nio.file.Paths.get(options.path))
    var cfg              = new Packages.org.apache.lucene.index.IndexWriterConfig(new Packages.org.apache.lucene.analysis.core.WhitespaceAnalyzer())
    this.writer          = new Packages.org.apache.lucene.index.IndexWriter(this.__dir, cfg)
}

LuceneIndex.prototype.__toFloatArray = function(arr) {
    _$(arr, "vector").isArray().$_()
    var jArr = java.lang.reflect.Array.newInstance(java.lang.Float.TYPE, arr.length)
    for (var i = 0; i < arr.length; i++) {
        jArr[i] = java.lang.Float.valueOf(Number(arr[i])).floatValue()
    }
    return jArr
}

LuceneIndex.prototype.__checkDimension = function(vector) {
    if (isNumber(this.options.dimension) && isDef(vector)) {
        if (vector.length !== this.options.dimension) {
            throw new Error("Vector dimension mismatch. Expected " + this.options.dimension + " but got " + vector.length)
        }
    }
}

LuceneIndex.prototype.addVector = function(entry) {
    entry = _$(entry, "entry").isMap().$_()
    var id     = _$(entry.id, "entry.id").isString().$_()
    var text   = _$(entry.text, "entry.text").isString().default("")
    var vector = _$(entry.vector, "entry.vector").isArray().$_()
    this.__checkDimension(vector)
    var meta   = _$(entry.meta, "entry.meta").default(__)

    var doc = new Packages.org.apache.lucene.document.Document()
    doc.add(new Packages.org.apache.lucene.document.StringField(this.options.idField, id, Packages.org.apache.lucene.document.Field.Store.YES))
    doc.add(new Packages.org.apache.lucene.document.StoredField(this.options.textField, text))
    doc.add(new Packages.org.apache.lucene.document.KnnFloatVectorField(this.options.vectorField, this.__toFloatArray(vector), this.options.similarity))
    if (isDef(meta)) doc.add(new Packages.org.apache.lucene.document.StoredField(this.options.metaField, stringify(meta, void 0, "")))

    this.writer.updateDocument(new Packages.org.apache.lucene.index.Term(this.options.idField, id), doc)
    if (this.options.autoCommit) this.writer.commit()
}

LuceneIndex.prototype.search = function(vector, k) {
    vector = _$(vector, "vector").isArray().$_()
    this.__checkDimension(vector)
    k      = _$(k, "k").isNumber().default(5)

    var reader   = Packages.org.apache.lucene.index.DirectoryReader.open(this.writer)
    try {
        var searcher = new Packages.org.apache.lucene.search.IndexSearcher(reader)
        var query    = new Packages.org.apache.lucene.search.KnnFloatVectorQuery(this.options.vectorField, this.__toFloatArray(vector), k)
        var topDocs  = searcher.search(query, k)
        var results  = []
        for (var i = 0; i < topDocs.scoreDocs.length; i++) {
            var sd   = topDocs.scoreDocs[i]
            var doc  = searcher.storedFields().document(sd.doc)
            var meta = doc.get(this.options.metaField)
            results.push({
                id   : doc.get(this.options.idField),
                score: sd.score,
                text : doc.get(this.options.textField),
                meta : isDef(meta) ? (function(v) { try { return jsonParse(v) } catch(e) { return v } })(meta) : __
            })
        }
        return results
    } finally {
        reader.close()
    }
}

LuceneIndex.prototype.delete = function(id) {
    id = _$(id, "id").isString().$_()
    var term = new Packages.org.apache.lucene.index.Term(this.options.idField, id)
    var termArray = java.lang.reflect.Array.newInstance(Packages.org.apache.lucene.index.Term, 1)
    termArray[0] = term
    this.writer.deleteDocuments(termArray)
    if (this.options.autoCommit) this.writer.commit()
}

LuceneIndex.prototype.close = function() {
    try { this.writer.close() } catch(e) {}
    try { this.__dir.close() } catch(e) {}
}

var __jsonReply = function(server, obj, code) {
    var payload = stringify(obj)
    if (isDef(server.replyOKJSON) && (isUnDef(code) || code === 200)) return server.replyOKJSON(payload)
    var status  = isDef(code) ? code : 200
    return server.reply(payload, "application/json", status)
}

var __errorReply = function(server, err) {
    var msg = (isObject(err) && isDef(err.message)) ? err.message : String(err)
    return server.reply(stringify({ status: "error", message: msg }), "application/json", 500)
}

/**
 * <odoc>
 * <key>startVectorMemoryServer(options) : Map</key>
 * Starts a minimal HTTP vector memory server backed by Lucene. Options:
 * indexPath (string, default "vector-index"), port (number, default 8123) and
 * dimension (number, optional validation). Returns { server, index, stop }.
 * </odoc>
 */
var startVectorMemoryServer = function(options) {
    options           = _$(options, "options").isMap().default({})
    options.indexPath = _$(options.indexPath, "options.indexPath").isString().default("vector-index")
    options.port      = _$(options.port, "options.port").isNumber().default(8123)
    options.dimension = _$(options.dimension, "options.dimension").isNumber().default(__)
    var index         = new LuceneIndex({ path: options.indexPath, dimension: options.dimension })
    var server        = ow.server.httpd.start(options.port, "0.0.0.0")

    var readPayload = function(req) {
        if (isDef(req) && isDef(req.files) && isDef(req.files.postData)) return jsonParse(req.files.postData)
        return {}
    }

    ow.server.httpd.route(server, {
        "/add": function(req) {
            try {
                var body = readPayload(req)
                index.addVector(body)
                return __jsonReply(server, { status: "ok" })
            } catch(e) {
                return __errorReply(server, e)
            }
        },
        "/search": function(req) {
            try {
                var body    = readPayload(req)
                var results = index.search(_$(body.vector, "vector").isArray().$_(), _$(body.k, "k").isNumber().default(5))
                return __jsonReply(server, { results: results })
            } catch(e) {
                return __errorReply(server, e)
            }
        },
        "/delete": function(req) {
            try {
                var body = readPayload(req)
                index.delete(_$(body.id, "id").isString().$_())
                return __jsonReply(server, { status: "deleted" })
            } catch(e) {
                return __errorReply(server, e)
            }
        }
    })

    return {
        server: server,
        index : index,
        stop  : function() {
            try { server.stop() } catch(e) {}
            index.close()
        }
    }
}

