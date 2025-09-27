// VectorDB OPack for MiniA / OpenAF
//
// Author: Nuno Aguiar

ow.loadCh()
ow.loadObj()

// Load external jars
var __path = getOPackPath("VectorDB") || "."
loadExternalJars(__path)

// Define the vectordb openaf channel
ow.ch.__types.vectordb = {
    __channels: {},
    __ensureChannel: function(aName) {
        if (isUnDef(this.__channels[aName])) throw new Error("VectorDB channel '" + aName + "' not found.")
        return this.__channels[aName]
    },
    __keyValue: function(channel, aK) {
        var keyField = channel.options.idField
        if (isUnDef(aK))  throw new Error("Key is mandatory")
        if (isString(aK)) return String(aK)
        if (isObject(aK) && isDef(aK[keyField])) return String(aK[keyField])
        if (isObject(aK) && Object.keys(aK).length == 1) {
            var k = Object.keys(aK)[0]
            return String(aK[k])
        }
        throw new Error("Unable to determine key value for '" + keyField + "'")
    },
    __toFloatArray: function(arr) {
        _$(arr, "vector").isArray().$_();
        var jArr = java.lang.reflect.Array.newInstance(java.lang.Float.TYPE, arr.length);
        for (var i = 0; i < arr.length; i++) {
            jArr[i] = java.lang.Float.valueOf(Number(arr[i])).floatValue();
        }
        return jArr;
    },
    __similarity: function(name) {
        if (isUnDef(name)) name = "cosine"
        switch(String(name).toLowerCase()) {
        case "dot"        :
        case "dot_product":
            return Packages.org.apache.lucene.index.VectorSimilarityFunction.DOT_PRODUCT
        case "l2"       :
        case "euclidean":
            return Packages.org.apache.lucene.index.VectorSimilarityFunction.EUCLIDEAN
        case "cos"   :
        case "cosine":
        default:
            return Packages.org.apache.lucene.index.VectorSimilarityFunction.COSINE
        }
    },
    __refresh: function(channel, force) {
        if (channel.options.autoRefresh || force === true) {
            channel.searcherManager.maybeRefreshBlocking()
        }
    },
    __commit: function(channel, force) {
        if (channel.options.autoCommit || force === true) {
            channel.writer.commit()
        }
    },
    __documentFrom: function(channel, keyValue, value) {
        var vector = _$(value.vector, "value.vector").isArray().$_()
        if (vector.length != channel.options.dimension) throw new Error("Vector dimension mismatch. Expected " + channel.options.dimension + " but got " + vector.length)
        var payload = {}
        if (isObject(value.payload)) {
            payload = value.payload;
        } else if (isObject(value)) {
            var keys = Object.keys(value)
            for (var idx = 0; idx < keys.length; idx++) {
                var kk = keys[idx]
                if (kk == "vector" || kk == "payload") continue
                payload[kk] = value[kk]
            }
        }
        var doc = new Packages.org.apache.lucene.document.Document()
        doc.add(new Packages.org.apache.lucene.document.StringField(channel.options.idField, keyValue, Packages.org.apache.lucene.document.Field.Store.YES))
        doc.add(new Packages.org.apache.lucene.document.StoredField(channel.options.vectorStoreField, stringify(vector, void 0, "")))
        doc.add(new Packages.org.apache.lucene.document.StoredField(channel.options.payloadField, stringify(payload, void 0, "")))
        doc.add(new Packages.org.apache.lucene.document.KnnFloatVectorField(channel.options.vectorField, this.__toFloatArray(vector), channel.similarity))
        if (isObject(payload)) {
            var keys = Object.keys(payload)
            for (var i = 0; i < keys.length; i++) {
                var k = keys[i]
                var val = payload[k]
                if (isUnDef(val)) continue
                if (isString(val)) {
                    doc.add(new Packages.org.apache.lucene.document.StringField(channel.options.metaPrefix + k, val, Packages.org.apache.lucene.document.Field.Store.YES))
                } else if (isNumber(val)) {
                    doc.add(new Packages.org.apache.lucene.document.StoredField(channel.options.metaPrefix + k, Number(val)))
                } else if (isBoolean(val)) {
                    doc.add(new Packages.org.apache.lucene.document.StringField(channel.options.metaPrefix + k, String(val), Packages.org.apache.lucene.document.Field.Store.YES))
                }
            }
        }
        return doc
    },
    __docToObj: function(channel, doc, score) {
        if (isUnDef(doc)) return __
        var payload = doc.get(channel.options.payloadField)
        var vector  = doc.get(channel.options.vectorStoreField)
        var res = { }
        res[channel.options.idField] = doc.get(channel.options.idField)
        if (isDef(payload)) {
            try { res.payload = jsonParse(payload) } catch(e) { res.payload = payload }
        }
        if (isDef(vector)) {
            try { res.vector = jsonParse(vector) } catch(e) { res.vector = vector }
        }
        if (isDef(score)) res.score = score
        return res
    },
    __getDocument: function(searcher, docId) {
        // Try multiple access patterns because different JS hosts expose Java objects differently.
        try {
            // Modern Lucene API - IndexSearcher.storedFields().document(docId)
            if (searcher.storedFields && typeof searcher.storedFields === 'function') {
                try {
                    var storedFields = searcher.storedFields()
                    if (storedFields && typeof storedFields.document === 'function') {
                        var doc = storedFields.document(docId)
                        if (doc) return doc
                    }
                } catch(e) {
                    // Continue to fallback methods
                }
            }
            
            // Fallback: Try old IndexSearcher.doc(docId) API
            if (typeof searcher.doc === 'function') {
                try { 
                    var doc = searcher.doc(docId)
                    if (doc) return doc
                } catch(e) {}
            }

            // Fallback: Try searcher.document(docId)
            if (typeof searcher.document === 'function') {
                try { 
                    var doc = searcher.document(docId)
                    if (doc) return doc
                } catch(e) {}
            }

            // Fallback: Try through IndexReader
            var reader = null
            try { reader = searcher.getIndexReader() } catch(e) { 
                try { reader = searcher.getReader() } catch(er) { reader = null }
            }

            if (reader) {
                if (typeof reader.document === 'function') {
                    try { 
                        var doc = reader.document(docId)
                        if (doc) return doc
                    } catch(e) {}
                }
                if (typeof reader.doc === 'function') {
                    try { 
                        var doc = reader.doc(docId)
                        if (doc) return doc
                    } catch(e) {}
                }
            }

            // Final fallback: iterate through leaves
            var leaves = null
            try { leaves = reader.leaves() } catch(e) { try { leaves = reader.getContext().leaves() } catch(er) { leaves = null } }
            if (leaves) {
                var size = (typeof leaves.size === 'function') ? leaves.size() : leaves.length
                for (var li = 0; li < size; li++) {
                    var leaf = (typeof leaves.get === 'function') ? leaves.get(li) : leaves[li]
                    if (!leaf) continue
                    var base = (leaf.docBase !== undefined) ? leaf.docBase : (leaf.getDocBase ? leaf.getDocBase() : null)
                    var leafReader = null
                    try { leafReader = (typeof leaf.reader === 'function') ? leaf.reader() : (leaf.getReader ? leaf.getReader() : leaf.reader) } catch(e) { leafReader = (leaf.reader ? leaf.reader : null) }
                    if (!leafReader) continue
                    var maxDoc = (typeof leafReader.maxDoc === 'function') ? leafReader.maxDoc() : (leafReader.getMaxDoc ? leafReader.getMaxDoc() : null)
                    if (base !== null && maxDoc !== null && docId >= base && docId < base + maxDoc) {
                        var localId = docId - base
                        // try leafReader.document(localId)
                        try { if (typeof leafReader.document === 'function') return leafReader.document(localId) } catch(e) {}
                        try { if (typeof leafReader.getDocument === 'function') return leafReader.getDocument(localId) } catch(e) {}
                        return __
                    }
                }
            }
        } catch(e) {
            // swallow and return undefined
        }
        return __
    },
    create: function(aName, shouldCompress, options) {
        options                  = _$(options, "options").isMap().default({})
        _$(options.path, "options.path").isString().$_()
        options.dimension        = _$(options.dimension, "options.dimension").isNumber().default(384)
        options.idField          = _$(options.idField, "options.idField").isString().default("id")
        options.vectorField      = _$(options.vectorField, "options.vectorField").isString().default("vector")
        options.vectorStoreField = _$(options.vectorStoreField, "options.vectorStoreField").isString().default(options.vectorField + "_stored")
        options.payloadField     = _$(options.payloadField, "options.payloadField").isString().default("payload")
        options.metaPrefix       = _$(options.metaPrefix, "options.metaPrefix").isString().default("meta_")
        options.autoCommit       = _$(options.autoCommit, "options.autoCommit").default(true)
        options.autoRefresh      = _$(options.autoRefresh, "options.autoRefresh").default(true)
        options.similarity       = _$(options.similarity, "options.similarity").default("cosine")

        if (!io.fileExists(options.path)) io.mkdir(options.path)

        var analyzer        = new Packages.org.apache.lucene.analysis.standard.StandardAnalyzer()
        var directory       = Packages.org.apache.lucene.store.FSDirectory.open(java.nio.file.Paths.get(options.path))
        var iwc             = new Packages.org.apache.lucene.index.IndexWriterConfig(analyzer)
        iwc.setOpenMode(Packages.org.apache.lucene.index.IndexWriterConfig.OpenMode.CREATE_OR_APPEND)
        var writer          = new Packages.org.apache.lucene.index.IndexWriter(directory, iwc)
        var searcherManager = new Packages.org.apache.lucene.search.SearcherManager(writer, true, true, null)

        this.__channels[aName] = {
            analyzer: analyzer,
            directory: directory,
            writer: writer,
            searcherManager: searcherManager,
            options: options,
            similarity: this.__similarity(options.similarity)
        }
    },
    destroy: function(aName) {
        var channel = this.__channels[aName]
        if (isDef(channel)) {
            this.__commit(channel, true)
            channel.searcherManager.close()
            channel.writer.close()
            channel.directory.close()
            delete this.__channels[aName]
        }
    },
    size: function(aName) {
        var channel = this.__ensureChannel(aName);
        return Number(channel.writer.getDocStats().numDocs)
    },
    forEach: function(aName, fn) {
        var all = this.getAll(aName)
        if (isUnDef(all)) return
        for (var i = 0; i < all.length; i++) {
            var item = all[i]
            fn(item[channel.options.idField], item.payload)
        }
    },
    getAll: function(aName, full) {
        if (isMap(full)) {
            return this.search(aName, full.vector, full.k, full.filterFn)
        }
        var channel = this.__ensureChannel(aName)
        this.__refresh(channel)
        var searcher = channel.searcherManager.acquire()
        try {
            var count = channel.writer.getDocStats().numDocs
            if (count <= 0) return []
            var maxHits = Number(count)
            if (maxHits > java.lang.Integer.MAX_VALUE) maxHits = java.lang.Integer.MAX_VALUE
            var topDocs = searcher.search(new Packages.org.apache.lucene.search.MatchAllDocsQuery(), maxHits)
            var hits = topDocs.scoreDocs
            var results = []
            for (var i = 0; i < hits.length; i++) {
                var doc = this.__getDocument(searcher, hits[i].doc)
                if (isDef(doc)) {
                    var obj = this.__docToObj(channel, doc)
                    if (isDef(obj)) {
                        results.push(obj)
                    }
                }
            }
            return results
        } finally {
            channel.searcherManager.release(searcher)
        }
    },
    getKeys: function(aName, full) {
        var channel = this.__ensureChannel(aName)
        this.__refresh(channel)
        var searcher = channel.searcherManager.acquire()
        try {
            var count = channel.writer.getDocStats().numDocs
            if (count <= 0) return []
            var maxHits = Number(count)
            if (maxHits > java.lang.Integer.MAX_VALUE) maxHits = java.lang.Integer.MAX_VALUE
            var topDocs = searcher.search(new Packages.org.apache.lucene.search.MatchAllDocsQuery(), maxHits)
            var hits = topDocs.scoreDocs
            var keys = []
            for (var i = 0; i < hits.length; i++) {
                var doc = this.__getDocument(searcher, hits[i].doc)
                if (isDef(doc)) {
                    keys.push(doc.get(channel.options.idField))
                }
            }
            return keys
        } finally {
            channel.searcherManager.release(searcher)
        }
    },
    getSortedKeys: function(aName, full) {
        return this.getKeys(aName, full)
    },
    get: function(aName, aK) {
        var channel = this.__ensureChannel(aName)
        var keyValue = this.__keyValue(channel, aK)
        this.__refresh(channel)
        var searcher = channel.searcherManager.acquire()
        try {
            var term = new Packages.org.apache.lucene.index.Term(channel.options.idField, keyValue)
            var query = new Packages.org.apache.lucene.search.TermQuery(term)
            var topDocs = searcher.search(query, 1)
            var totalHits = (typeof topDocs.totalHits.value === 'function') ? topDocs.totalHits.value() : topDocs.totalHits.value
            if (totalHits > 0) {
                var doc = this.__getDocument(searcher, topDocs.scoreDocs[0].doc)
                if (isDef(doc)) {
                    return this.__docToObj(channel, doc)
                }
            }
            return __
        } finally {
            channel.searcherManager.release(searcher)
        }
    },
    getSet: function(aName, aMatch, aK, aV, aTimestamp) {
        var res = this.get(aName, aK)
        if ($stream([res]).anyMatch(aMatch)) {
            return this.set(aName, aK, aV, aTimestamp)
        }
        return __
    },
    set: function(aName, aK, aV, aTimestamp) {
        var channel = this.__ensureChannel(aName)
        var keyValue = this.__keyValue(channel, aK)
        var doc = this.__documentFrom(channel, keyValue, aV)
        var term = new Packages.org.apache.lucene.index.Term(channel.options.idField, keyValue)
        channel.writer.updateDocument(term, doc)
        this.__commit(channel)
        this.__refresh(channel)
        return aK
    },
    setAll: function(aName, aKs, aVs, aTimestamp) {
        var channel = this.__ensureChannel(aName)
        if (isUnDef(aVs) || !isArray(aVs)) return
        for (var i = 0; i < aVs.length; i++) {
            var keys = isArray(aKs) ? aKs[i] : aKs
            var keyValue = this.__keyValue(channel, keys)
            var doc = this.__documentFrom(channel, keyValue, aVs[i])
            var term = new Packages.org.apache.lucene.index.Term(channel.options.idField, keyValue)
            channel.writer.updateDocument(term, doc)
        }
        this.__commit(channel)
        this.__refresh(channel)
    },
    unset: function(aName, aK, aTimestamp) {
        var channel = this.__ensureChannel(aName)
        var keyValue = this.__keyValue(channel, aK)
        var term = new Packages.org.apache.lucene.index.Term(channel.options.idField, keyValue)
        channel.writer.deleteDocuments(term)
        this.__commit(channel)
        this.__refresh(channel)
    },
    unsetAll: function(aName, aKs, aVs, aTimestamp) {
        if (isUnDef(aKs) || !isArray(aKs)) return
        var channel = this.__ensureChannel(aName)
        for (var i = 0; i < aKs.length; i++) {
            var keyValue = this.__keyValue(channel, aKs[i])
            var term = new Packages.org.apache.lucene.index.Term(channel.options.idField, keyValue)
            channel.writer.deleteDocuments(term)
        }
        this.__commit(channel)

    },
    pop: function(aName) {
        var keys = this.getKeys(aName)
        if (keys.length == 0) return __
        return keys[keys.length - 1]
    },
    shift: function(aName) {
        var keys = this.getKeys(aName)
        if (keys.length == 0) return __
        return keys[0]
    },
    // k-NN search with optional filter function for post-processing results (e.g. to apply metadata-based filtering)
    // - aName: channel name
    // - vector: query vector
    // - k: number of nearest neighbours to retrieve (default: 10)
    // - filterFn: optional function to filter results, receives each result object and should return true to include it
    search: function(aName, vector, k, filterFn) {
        var channel = this.__ensureChannel(aName)
        vector = _$(vector, "vector").isArray().$_()
        k = Number(isDef(k) ? k : 10)
        this.__refresh(channel)
        var searcher = channel.searcherManager.acquire()
        try {
            var maxHits = Number(k)
            if (maxHits > java.lang.Integer.MAX_VALUE) maxHits = java.lang.Integer.MAX_VALUE
            var query = new Packages.org.apache.lucene.search.KnnFloatVectorQuery(channel.options.vectorField, this.__toFloatArray(vector), maxHits)
            var topDocs = searcher.search(query, maxHits)
            var hits = topDocs.scoreDocs
            var results = []
            for (var i = 0; i < hits.length; i++) {
                var doc = this.__getDocument(searcher, hits[i].doc)
                if (isDef(doc)) {
                    var obj = this.__docToObj(channel, doc, hits[i].score)
                    if (isDef(obj)) {
                        if (isFunction(filterFn)) {
                            if (filterFn(obj)) results.push(obj)
                        } else {
                            results.push(obj)
                        }
                    }
                }
            }
            return results
        } finally {
            channel.searcherManager.release(searcher)
        }
    }
}
