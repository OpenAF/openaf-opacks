// lucene OPack for MiniA / OpenAF
//
// Author: Nuno Aguiar

ow.loadCh()
ow.loadObj()

// Load external jars
var __path = getOPackPath("lucene") || "."
loadExternalJars(__path)

// Define the vectordb openaf channel
ow.ch.__types.vectordb = {
    __channels: {},
    __ensureChannel: function(aName) {
        if (isUnDef(this.__channels[aName])) throw new Error("lucene channel '" + aName + "' not found.")
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
    /**
     * <odoc>
     * <key>ow.ch.types.vectordb</key>
     * A vector database channel type using Apache Lucene's k-NN capabilities.\
     * Supports storing vectors along with payload metadata, and performing similarity search.\
     * Options:\
     *   - path (string, required): filesystem path for Lucene index storage\
     *   - dimension (number, default: 384): dimensionality of the vectors\
     *   - idField (string, default: "id"): name of the field to use as the unique identifier for documents\
     *   - vectorField (string, default: "vector"): name of the field to store the vector for k-NN search\
     *   - vectorStoreField (string, default: vectorField + "_stored"): name of the field to store the vector as JSON for retrieval (since k-NN fields are not stored)\
     *   - payloadField (string, default: "payload"): name of the field to store the payload metadata as JSON\
     *   - metaPrefix (string, default: "meta_"): prefix to use for storing individual metadata fields for filtering\
     *   - autoCommit (boolean, default: true): whether to automatically commit after each write operation\
     *   - autoRefresh (boolean, default: true): whether to automatically refresh the searcher after each write operation\
     *   - similarity (string, default: "cosine"): similarity function to use for k-NN search ("cosine", "dot_product", or "euclidean")\
     *   Example usage:\
     *   // Create a vectordb channel\
     *   ow.ch.create("myVectors", "vectordb", { path: "./my_vector_index", dimension: 128 })\
     *   // Add a vector with payload\
     *   ow.ch.set("myVectors", "vec1", { vector: [0.1, 0.2, ...], payload: { name: "Vector 1", category: "A" } })\
     *   // Search for similar vectors\
     *   var results = ow.ch.search("myVectors", [0.1, 0.2, ...], 5, function(result) { return result.payload.category === "A" })\
     * </odoc>
     */
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
        var terms = java.lang.reflect.Array.newInstance(Packages.org.apache.lucene.index.Term, 1)
        terms[0] = term
        channel.writer.deleteDocuments(terms)
        this.__commit(channel)
        this.__refresh(channel)
    },
    unsetAll: function(aName, aKs, aVs, aTimestamp) {
        if (isUnDef(aKs) || !isArray(aKs)) return
        var channel = this.__ensureChannel(aName)
        for (var i = 0; i < aKs.length; i++) {
            var keyValue = this.__keyValue(channel, aKs[i])
            var term = new Packages.org.apache.lucene.index.Term(channel.options.idField, keyValue)
            var terms = java.lang.reflect.Array.newInstance(Packages.org.apache.lucene.index.Term, 1)
            terms[0] = term
            channel.writer.deleteDocuments(terms)
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

// Define the searchdb openaf channel (full-text search)
ow.ch.__types.searchdb = {
    __channels: {},
    __ensureChannel: function(aName) {
        if (isUnDef(this.__channels[aName])) throw new Error("searchdb channel '" + aName + "' not found.")
        return this.__channels[aName]
    },
    __isObj: function(v) {
        return (isMap(v) || (isObject(v) && !isArray(v)))
    },
    __keyValue: function(channel, aK) {
        var keyField = channel.options.idField
        if (isUnDef(aK)) throw new Error("Key is mandatory")
        if (isString(aK) || isNumber(aK) || isBoolean(aK)) return String(aK)
        if (isObject(aK) && isDef(aK[keyField])) return String(aK[keyField])
        if (isObject(aK) && Object.keys(aK).length == 1) return String(aK[Object.keys(aK)[0]])
        throw new Error("Unable to determine key value for '" + keyField + "'")
    },
    __asArray: function(v) {
        if (isUnDef(v)) return []
        return isArray(v) ? v : [v]
    },
    __vectorEnabled: function(channel) {
        return isDef(channel.options.vectorDimension)
    },
    __vectorSimilarity: function(name) {
        switch(String(name || "cosine").toLowerCase()) {
        case "dot":
        case "dot_product":
            return Packages.org.apache.lucene.index.VectorSimilarityFunction.DOT_PRODUCT
        case "l2":
        case "euclidean":
            return Packages.org.apache.lucene.index.VectorSimilarityFunction.EUCLIDEAN
        case "cos":
        case "cosine":
            return Packages.org.apache.lucene.index.VectorSimilarityFunction.COSINE
        default:
            throw new Error("Unsupported vector similarity '" + name + "'. Use cosine, dot_product or euclidean.")
        }
    },
    __validateVector: function(channel, vector, label) {
        label = label || "vector"
        if (!this.__vectorEnabled(channel)) throw new Error("Vector search is not enabled for this searchdb index. Set options.vectorDimension when creating it.")
        if (!isArray(vector)) throw new Error(label + " must be an array of finite numbers.")
        if (vector.length != channel.options.vectorDimension) throw new Error(label + " dimension mismatch. Expected " + channel.options.vectorDimension + " but got " + vector.length + ".")
        var out = java.lang.reflect.Array.newInstance(java.lang.Float.TYPE, vector.length)
        for (var i = 0; i < vector.length; i++) {
            if (!isNumber(vector[i]) || !isFinite(Number(vector[i]))) throw new Error(label + " contains a non-finite number at position " + i + ".")
            out[i] = java.lang.Float.valueOf(Number(vector[i])).floatValue()
        }
        return out
    },
    __providedVector: function(channel, value, content) {
        var vector = (this.__isObj(value) && isDef(value.vector)) ? value.vector : __
        if (isUnDef(vector) && isDef(channel.options.embeddingProvider)) {
            var provider = channel.options.embeddingProvider
            if (isFunction(provider)) vector = provider(content, value)
            else if (this.__isObj(provider) && isFunction(provider.embed)) vector = provider.embed(content)
            else throw new Error("options.embeddingProvider must be a function or an object with an embed(text) function.")
        }
        return vector
    },
    __toAnalyzer: function(opts) {
        var a = this.__isObj(opts.analyzer) ? opts.analyzer : { preset: opts.analyzer }
        var preset = String(_$(a.preset, "analyzer.preset").default("standard")).toLowerCase()
        try {
            switch(preset) {
            case "keyword":
                return new Packages.org.apache.lucene.analysis.core.KeywordAnalyzer()
            case "whitespace":
                return new Packages.org.apache.lucene.analysis.core.WhitespaceAnalyzer()
            case "english":
                return new Packages.org.apache.lucene.analysis.en.EnglishAnalyzer()
            case "portuguese":
                return new Packages.org.apache.lucene.analysis.pt.PortugueseAnalyzer()
            case "spanish":
                return new Packages.org.apache.lucene.analysis.es.SpanishAnalyzer()
            case "french":
                return new Packages.org.apache.lucene.analysis.fr.FrenchAnalyzer()
            case "german":
                return new Packages.org.apache.lucene.analysis.de.GermanAnalyzer()
            case "italian":
                return new Packages.org.apache.lucene.analysis.it.ItalianAnalyzer()
            case "standard":
                return new Packages.org.apache.lucene.analysis.standard.StandardAnalyzer()
            default:
                throw new Error("Unsupported language analyzer '" + preset + "'. Use standard, english, portuguese, spanish, french, german, italian, keyword or whitespace.")
            }
        } catch(e) {
            if (String(e).indexOf("Unsupported language analyzer") >= 0) throw e
            throw new Error("Unable to create Lucene analyzer '" + preset + "': " + e)
        }
    },
    __mergeMap: function(base, override) {
        var out = {}, k
        base = this.__isObj(base) ? base : {}
        override = this.__isObj(override) ? override : {}
        var keys = Object.keys(base)
        for (var i = 0; i < keys.length; i++) {
            k = keys[i]
            out[k] = this.__isObj(base[k]) ? this.__mergeMap(base[k], {}) : base[k]
        }
        keys = Object.keys(override)
        for (var j = 0; j < keys.length; j++) {
            k = keys[j]
            out[k] = this.__isObj(override[k]) && this.__isObj(out[k]) ? this.__mergeMap(out[k], override[k]) : override[k]
        }
        return out
    },
    __lexicalOptions: function(value) {
        var defaults = {
            language: "standard", asciiFolding: true,
            bm25: { k1: 1.2, b: 0.75 },
            stemming: { enabled: true }, synonyms: { enabled: false, expand: true, rules: [] },
            phrases: { enabled: true, boost: 2.0, slop: 1 },
            shingles: { enabled: true, minSize: 2, maxSize: 3, boost: 1.25 },
            characterNGrams: { enabled: false, minGram: 3, maxGram: 10, boost: 0.35 },
            queryExpansion: { enabled: false, maxTerms: 8, minDocFreq: 2, maxDocFreqRatio: 0.25, boost: 0.4 },
            pseudoRelevanceFeedback: { enabled: false, topDocuments: 5, maxTerms: 10, minTermFreq: 1, minDocFreq: 2, boost: 0.35 },
            fusion: { method: "weighted", lexicalWeight: 1, phraseWeight: 0.7, shingleWeight: 0.5, ngramWeight: 0.2, expansionWeight: 0.3, rrfK: 60 }
        }
        var o = this.__mergeMap(defaults, value)
        var aliases = { useSynonyms: "synonyms", useStemming: "stemming", usePhrases: "phrases", useShingles: "shingles", useCharacterNGrams: "characterNGrams", useQueryExpansion: "queryExpansion", usePseudoRelevanceFeedback: "pseudoRelevanceFeedback" }
        var aks = Object.keys(aliases)
        for (var ai = 0; ai < aks.length; ai++) if (isDef(o[aks[ai]])) o[aliases[aks[ai]]].enabled = (o[aks[ai]] == true)
        this.__validateLexicalOptions(o)
        return o
    },
    __validateLexicalOptions: function(o) {
        if (!(Number(o.bm25.k1) > 0)) throw new Error("lexical.bm25.k1 must be greater than zero.")
        if (Number(o.bm25.b) < 0 || Number(o.bm25.b) > 1) throw new Error("lexical.bm25.b must be between zero and one.")
        if (Number(o.shingles.minSize) < 2 || Number(o.shingles.maxSize) < Number(o.shingles.minSize)) throw new Error("Invalid lexical shingle sizes: minSize must be >= 2 and maxSize >= minSize.")
        if (Number(o.characterNGrams.minGram) < 1 || Number(o.characterNGrams.maxGram) < Number(o.characterNGrams.minGram)) throw new Error("Invalid lexical character n-gram sizes.")
        if (String(o.fusion.method) != "weighted" && String(o.fusion.method) != "rrf") throw new Error("Invalid lexical fusion method '" + o.fusion.method + "'. Use weighted or rrf.")
        var boosts = [o.phrases.boost, o.shingles.boost, o.characterNGrams.boost, o.queryExpansion.boost, o.pseudoRelevanceFeedback.boost]
        for (var i = 0; i < boosts.length; i++) if (Number(boosts[i]) < 0) throw new Error("Lexical boosts cannot be negative.")
        var rules = this.__synonymRules(o.synonyms)
        for (var r = 0; r < rules.length; r++) if (rules[r].length < 2) throw new Error("Malformed synonym rule: each rule needs at least two non-empty terms.")
    },
    __synonymRules: function(s) {
        var out = [], i, k, parts
        if (!this.__isObj(s)) return out
        var rules = this.__asArray(s.rules)
        for (i = 0; i < rules.length; i++) {
            if (!isString(rules[i])) throw new Error("Malformed synonym rule at position " + i + ": expected a comma-separated string.")
            parts = String(rules[i]).split(",").map(function(v){ return String(v).trim() }).filter(function(v){ return v.length > 0 })
            if (parts.length < 2) throw new Error("Malformed synonym rule '" + rules[i] + "'.")
            out.push(parts)
        }
        if (this.__isObj(s.map)) {
            var keys = Object.keys(s.map)
            for (i = 0; i < keys.length; i++) {
                k = keys[i]; parts = [String(k)]
                var vals = this.__asArray(s.map[k])
                for (var j = 0; j < vals.length; j++) if (String(vals[j]).trim().length > 0) parts.push(String(vals[j]).trim())
                if (parts.length < 2) throw new Error("Malformed synonym mapping for '" + k + "'.")
                out.push(parts)
            }
        }
        return out
    },
    __customAnalyzer: function(kind, o) {
        var b = Packages.org.apache.lucene.analysis.custom.CustomAnalyzer.builder().withTokenizer("standard").addTokenFilter("lowercase")
        if (o.asciiFolding) b = b.addTokenFilter("asciifolding")
        var p = new java.util.HashMap()
        if (kind == "shingle") {
            p.put("minShingleSize", String(o.shingles.minSize)); p.put("maxShingleSize", String(o.shingles.maxSize)); p.put("outputUnigrams", "false")
            b = b.addTokenFilter("shingle", p)
        } else if (kind == "ngram") {
            p.put("minGramSize", String(o.characterNGrams.minGram)); p.put("maxGramSize", String(o.characterNGrams.maxGram)); p.put("preserveOriginal", "true")
            b = b.addTokenFilter("ngram", p)
        }
        return b.build()
    },
    __extractValue: function(channel, value) {
        var contentField = channel.options.contentField
        var payload = {}
        var fields = {}
        var facets = {}
        var content = ""

        if (isString(value) || isNumber(value) || isBoolean(value)) {
            content = String(value)
        } else if (this.__isObj(value)) {
            if (isDef(value[contentField])) content = String(value[contentField])
            else if (isDef(value.content)) content = String(value.content)
            else if (isDef(value.text)) content = String(value.text)
            else content = stringify(value, void 0, "")

            if (this.__isObj(value.payload)) {
                payload = value.payload
            } else {
                var keys = Object.keys(value)
                for (var i = 0; i < keys.length; i++) {
                    var k = keys[i]
                    if (k == contentField || k == "content" || k == "text" || k == "payload" || k == "fields" || k == "facets" || k == channel.options.idField || (this.__vectorEnabled(channel) && k == "vector")) continue
                    payload[k] = value[k]
                }
            }

            if (this.__isObj(value.fields)) fields = value.fields
            if (this.__isObj(value.facets)) facets = value.facets
        } else {
            content = stringify(value, void 0, "")
        }

        if (!this.__isObj(fields) || Object.keys(fields).length == 0) {
            var schemaKeys = Object.keys(channel.options.schema)
            for (var sk = 0; sk < schemaKeys.length; sk++) {
                var sf = schemaKeys[sk]
                if (isDef(payload[sf])) fields[sf] = payload[sf]
            }
        }
        if (!this.__isObj(facets) || Object.keys(facets).length == 0) {
            for (var fi = 0; fi < channel.options.facetFields.length; fi++) {
                var ff = channel.options.facetFields[fi]
                if (isDef(payload[ff])) facets[ff] = payload[ff]
            }
        }

        return { content: content, payload: payload, fields: fields, facets: facets, vector: this.__providedVector(channel, value, content) }
    },
    __addTypedField: function(doc, fieldName, fieldType, fieldValue) {
        if (isUnDef(fieldValue)) return
        var t = String(fieldType).toLowerCase()
        var v
        switch(t) {
        case "text":
            doc.add(new Packages.org.apache.lucene.document.TextField(fieldName, String(fieldValue), Packages.org.apache.lucene.document.Field.Store.YES))
            break
        case "keyword":
        case "string":
            doc.add(new Packages.org.apache.lucene.document.StringField(fieldName, String(fieldValue), Packages.org.apache.lucene.document.Field.Store.YES))
            doc.add(new Packages.org.apache.lucene.document.SortedDocValuesField(fieldName, new Packages.org.apache.lucene.util.BytesRef(String(fieldValue))))
            break
        case "int":
            v = java.lang.Integer.valueOf(Number(fieldValue).intValue ? Number(fieldValue).intValue() : Number(fieldValue))
            doc.add(new Packages.org.apache.lucene.document.IntPoint(fieldName, v.intValue()))
            doc.add(new Packages.org.apache.lucene.document.StoredField(fieldName, v.intValue()))
            doc.add(new Packages.org.apache.lucene.document.NumericDocValuesField(fieldName, java.lang.Long.valueOf(v.intValue()).longValue()))
            break
        case "float":
            v = java.lang.Float.valueOf(Number(fieldValue).floatValue ? Number(fieldValue).floatValue() : Number(fieldValue))
            doc.add(new Packages.org.apache.lucene.document.FloatPoint(fieldName, v.floatValue()))
            doc.add(new Packages.org.apache.lucene.document.StoredField(fieldName, v.floatValue()))
            doc.add(new Packages.org.apache.lucene.document.FloatDocValuesField(fieldName, v.floatValue()))
            break
        case "double":
            v = java.lang.Double.valueOf(Number(fieldValue))
            doc.add(new Packages.org.apache.lucene.document.DoublePoint(fieldName, v.doubleValue()))
            doc.add(new Packages.org.apache.lucene.document.StoredField(fieldName, v.doubleValue()))
            doc.add(new Packages.org.apache.lucene.document.DoubleDocValuesField(fieldName, v.doubleValue()))
            break
        case "long":
        case "date":
        default:
            v = java.lang.Long.valueOf(String(Number(fieldValue)))
            doc.add(new Packages.org.apache.lucene.document.LongPoint(fieldName, v.longValue()))
            doc.add(new Packages.org.apache.lucene.document.StoredField(fieldName, v.longValue()))
            doc.add(new Packages.org.apache.lucene.document.NumericDocValuesField(fieldName, v.longValue()))
            break
        }
    },
    __documentFrom: function(channel, keyValue, value) {
        var extracted = this.__extractValue(channel, value)
        var doc = new Packages.org.apache.lucene.document.Document()
        doc.add(new Packages.org.apache.lucene.document.StringField(channel.options.idField, keyValue, Packages.org.apache.lucene.document.Field.Store.YES))
        doc.add(new Packages.org.apache.lucene.document.TextField(channel.options.contentField, extracted.content, Packages.org.apache.lucene.document.Field.Store.YES))
        if (channel.lexical.phrases.enabled) doc.add(new Packages.org.apache.lucene.document.TextField(channel.options.contentField + "__phrase", extracted.content, Packages.org.apache.lucene.document.Field.Store.NO))
        if (channel.lexical.shingles.enabled) doc.add(new Packages.org.apache.lucene.document.TextField(channel.options.contentField + "__shingle", extracted.content, Packages.org.apache.lucene.document.Field.Store.NO))
        if (channel.lexical.characterNGrams.enabled) doc.add(new Packages.org.apache.lucene.document.TextField(channel.options.contentField + "__ngram", extracted.content, Packages.org.apache.lucene.document.Field.Store.NO))
        doc.add(new Packages.org.apache.lucene.document.StoredField(channel.options.payloadField, stringify(extracted.payload, void 0, "")))
        if (isDef(extracted.vector)) {
            var vector = this.__validateVector(channel, extracted.vector, "document vector")
            doc.add(new Packages.org.apache.lucene.document.KnnFloatVectorField(channel.options.vectorField, vector, channel.vectorSimilarity))
        }

        var fieldKeys = Object.keys(extracted.fields)
        for (var i = 0; i < fieldKeys.length; i++) {
            var fieldName = fieldKeys[i]
            var fieldType = channel.options.schema[fieldName]
            if (isUnDef(fieldType)) {
                var val = extracted.fields[fieldName]
                if (isNumber(val)) fieldType = "double"
                else if (isBoolean(val)) fieldType = "keyword"
                else fieldType = "keyword"
            }
            this.__addTypedField(doc, fieldName, fieldType, extracted.fields[fieldName])
        }

        if (channel.hasFacets) {
            var facetKeys = Object.keys(extracted.facets)
            for (var j = 0; j < facetKeys.length; j++) {
                var facetName = facetKeys[j]
                var facetVals = this.__asArray(extracted.facets[facetName])
                for (var k = 0; k < facetVals.length; k++) {
                    if (isUnDef(facetVals[k])) continue
                    doc.add(new Packages.org.apache.lucene.facet.FacetField(facetName, String(facetVals[k])))
                }
            }
        }

        return doc
    },
    __docWithFacets: function(channel, doc) {
        if (!channel.hasFacets) return doc
        return channel.facetsConfig.build(channel.taxoWriter, doc)
    },
    __getDocument: function(searcher, docId) {
        try {
            if (searcher.storedFields && typeof searcher.storedFields === "function") {
                var storedFields = searcher.storedFields()
                if (storedFields && typeof storedFields.document === "function") {
                    var doc = storedFields.document(docId)
                    if (doc) return doc
                }
            }
        } catch(e) {}

        try {
            if (typeof searcher.doc === "function") {
                var doc = searcher.doc(docId)
                if (doc) return doc
            }
        } catch(e) {}

        try {
            if (typeof searcher.document === "function") {
                var doc = searcher.document(docId)
                if (doc) return doc
            }
        } catch(e) {}

        try {
            var reader = null
            try { reader = searcher.getIndexReader() } catch(e) { try { reader = searcher.getReader() } catch(er) { reader = null } }
            if (reader) {
                if (typeof reader.document === "function") {
                    var doc = reader.document(docId)
                    if (doc) return doc
                }
                if (typeof reader.doc === "function") {
                    var doc = reader.doc(docId)
                    if (doc) return doc
                }
            }
        } catch(e) {}

        return __
    },
    __fieldValue: function(doc, fieldName, fieldType) {
        var f = doc.getField(fieldName)
        if (isUnDef(f)) return __
        var t = String(fieldType).toLowerCase()
        if (t == "keyword" || t == "string" || t == "text") return doc.get(fieldName)
        var nv = f.numericValue()
        if (isUnDef(nv)) return doc.get(fieldName)
        if (t == "int") return Number(nv.intValue())
        if (t == "float") return Number(nv.floatValue())
        if (t == "double") return Number(nv.doubleValue())
        return Number(nv.longValue())
    },
    __toObj: function(channel, doc, score, explanation) {
        if (isUnDef(doc)) return __
        var o = {}
        o[channel.options.idField] = doc.get(channel.options.idField)
        o[channel.options.contentField] = doc.get(channel.options.contentField)
        var payload = doc.get(channel.options.payloadField)
        if (isDef(payload)) {
            try { o.payload = jsonParse(payload) } catch(e) { o.payload = payload }
        }
        if (Object.keys(channel.options.schema).length > 0) {
            o.fields = {}
            var schemaKeys = Object.keys(channel.options.schema)
            for (var si = 0; si < schemaKeys.length; si++) {
                var sf = schemaKeys[si]
                var sv = this.__fieldValue(doc, sf, channel.options.schema[sf])
                if (isDef(sv)) o.fields[sf] = sv
            }
        }
        if (isDef(score)) o.score = score
        if (isDef(explanation)) o.explanation = explanation
        return o
    },
    __toOccurrence: function(kind) {
        switch(String(kind || "should").toLowerCase()) {
        case "must":
            return Packages.org.apache.lucene.search.BooleanClause.Occur.MUST
        case "mustnot":
        case "must_not":
        case "not":
            return Packages.org.apache.lucene.search.BooleanClause.Occur.MUST_NOT
        case "filter":
            return Packages.org.apache.lucene.search.BooleanClause.Occur.FILTER
        case "should":
        default:
            return Packages.org.apache.lucene.search.BooleanClause.Occur.SHOULD
        }
    },
    __toRangeQuery: function(channel, r) {
        var field = String(r.field)
        var type = String(_$(r.type, "range.type").default(channel.options.schema[field] || "long")).toLowerCase()
        var gte = isDef(r.gte) ? r.gte : r.gt
        var lte = isDef(r.lte) ? r.lte : r.lt
        var includeMin = isDef(r.gte)
        var includeMax = isDef(r.lte)
        if (type == "int") {
            var minI = isDef(gte) ? Number(gte) : java.lang.Integer.MIN_VALUE
            var maxI = isDef(lte) ? Number(lte) : java.lang.Integer.MAX_VALUE
            if (!includeMin) minI++
            if (!includeMax) maxI--
            return Packages.org.apache.lucene.document.IntPoint.newRangeQuery(field, minI, maxI)
        }
        if (type == "float") {
            var minF = isDef(gte) ? Number(gte) : -3.4028234663852886E38
            var maxF = isDef(lte) ? Number(lte) : 3.4028234663852886E38
            return Packages.org.apache.lucene.document.FloatPoint.newRangeQuery(field, minF, maxF)
        }
        if (type == "double") {
            var minD = isDef(gte) ? Number(gte) : -1.7976931348623157E308
            var maxD = isDef(lte) ? Number(lte) : 1.7976931348623157E308
            return Packages.org.apache.lucene.document.DoublePoint.newRangeQuery(field, minD, maxD)
        }
        if (type == "keyword" || type == "string" || type == "text") {
            var minB = isDef(gte) ? new Packages.org.apache.lucene.util.BytesRef(String(gte)) : null
            var maxB = isDef(lte) ? new Packages.org.apache.lucene.util.BytesRef(String(lte)) : null
            return Packages.org.apache.lucene.search.TermRangeQuery.newStringRange(field, (minB ? String(gte) : null), (maxB ? String(lte) : null), includeMin, includeMax)
        }
        var minL = isDef(gte) ? Number(gte) : java.lang.Long.MIN_VALUE
        var maxL = isDef(lte) ? Number(lte) : java.lang.Long.MAX_VALUE
        if (!includeMin) minL++
        if (!includeMax) maxL--
        return Packages.org.apache.lucene.document.LongPoint.newRangeQuery(field, minL, maxL)
    },
    __applyBoost: function(q, c) {
        if (this.__isObj(c) && isDef(c.boost) && Number(c.boost) != 1) {
            return new Packages.org.apache.lucene.search.BoostQuery(q, Number(c.boost))
        }
        return q
    },
    __clauseQuery: function(channel, c) {
        var parserField = channel.options.contentField
        if (isString(c)) {
            var p1 = new Packages.org.apache.lucene.queryparser.classic.QueryParser(parserField, channel.analyzer)
            return p1.parse(String(c))
        }
        if (!this.__isObj(c)) return new Packages.org.apache.lucene.search.MatchAllDocsQuery()

        var q = __
        if (this.__isObj(c.term)) {
            q = new Packages.org.apache.lucene.search.TermQuery(new Packages.org.apache.lucene.index.Term(String(c.term.field), String(c.term.value)))
        } else if (this.__isObj(c.range)) {
            q = this.__toRangeQuery(channel, c.range)
        } else if (this.__isObj(c.phrase)) {
            var phrase = c.phrase
            var pf = String(_$(phrase.field, "phrase.field").default(parserField))
            var parts = String(phrase.q).split(/\s+/)
            var builder = new Packages.org.apache.lucene.search.PhraseQuery.Builder()
            if (isDef(phrase.slop)) builder.setSlop(Number(phrase.slop))
            for (var i = 0; i < parts.length; i++) {
                if (parts[i].length > 0) builder.add(new Packages.org.apache.lucene.index.Term(pf, parts[i]))
            }
            q = builder.build()
        } else if (this.__isObj(c.wildcard)) {
            q = new Packages.org.apache.lucene.search.WildcardQuery(new Packages.org.apache.lucene.index.Term(String(c.wildcard.field), String(c.wildcard.q)))
        } else if (this.__isObj(c.fuzzy)) {
            var fz = c.fuzzy
            q = new Packages.org.apache.lucene.search.FuzzyQuery(
                new Packages.org.apache.lucene.index.Term(String(fz.field), String(fz.q)),
                Number(_$(fz.maxEdits, "fuzzy.maxEdits").default(2))
            )
        } else if (this.__isObj(c.regexp)) {
            q = new Packages.org.apache.lucene.search.RegexpQuery(new Packages.org.apache.lucene.index.Term(String(c.regexp.field), String(c.regexp.q)))
        } else if (isDef(c.q) && isDef(c.field)) {
            var p2 = new Packages.org.apache.lucene.queryparser.classic.QueryParser(String(c.field), channel.analyzer)
            q = p2.parse(String(c.q))
        } else if (isDef(c.q)) {
            var p3 = new Packages.org.apache.lucene.queryparser.classic.QueryParser(parserField, channel.analyzer)
            q = p3.parse(String(c.q))
        } else {
            q = new Packages.org.apache.lucene.search.MatchAllDocsQuery()
        }

        return this.__applyBoost(q, c)
    },
    __toQuery: function(channel, querySpec) {
        if (isUnDef(querySpec)) return new Packages.org.apache.lucene.search.MatchAllDocsQuery()
        if (isString(querySpec)) {
            var parser = new Packages.org.apache.lucene.queryparser.classic.QueryParser(channel.options.contentField, channel.analyzer)
            return parser.parse(String(querySpec))
        }
        if (!this.__isObj(querySpec)) return new Packages.org.apache.lucene.search.MatchAllDocsQuery()

        if (isDef(querySpec.raw) && isString(querySpec.raw)) {
            var parserRaw = new Packages.org.apache.lucene.queryparser.classic.QueryParser(channel.options.contentField, channel.analyzer)
            return parserRaw.parse(String(querySpec.raw))
        }

        if (isDef(querySpec.moreLikeThis)) return this.__toMoreLikeThisQuery(channel, querySpec.moreLikeThis)

        var builder = new Packages.org.apache.lucene.search.BooleanQuery.Builder()
        var i
        var clauses = this.__asArray(querySpec.must)
        for (i = 0; i < clauses.length; i++) builder.add(this.__clauseQuery(channel, clauses[i]), this.__toOccurrence("must"))
        clauses = this.__asArray(querySpec.should)
        for (i = 0; i < clauses.length; i++) builder.add(this.__clauseQuery(channel, clauses[i]), this.__toOccurrence("should"))
        clauses = this.__asArray(querySpec.mustNot)
        for (i = 0; i < clauses.length; i++) builder.add(this.__clauseQuery(channel, clauses[i]), this.__toOccurrence("must_not"))
        clauses = this.__asArray(querySpec.filter)
        for (i = 0; i < clauses.length; i++) builder.add(this.__clauseQuery(channel, clauses[i]), this.__toOccurrence("filter"))
        clauses = this.__asArray(querySpec.range)
        for (i = 0; i < clauses.length; i++) builder.add(this.__toRangeQuery(channel, clauses[i]), this.__toOccurrence("filter"))
        clauses = this.__asArray(querySpec.phrase)
        for (i = 0; i < clauses.length; i++) builder.add(this.__clauseQuery(channel, { phrase: clauses[i], boost: clauses[i].boost }), this.__toOccurrence("should"))
        clauses = this.__asArray(querySpec.wildcard)
        for (i = 0; i < clauses.length; i++) builder.add(this.__clauseQuery(channel, { wildcard: clauses[i], boost: clauses[i].boost }), this.__toOccurrence("should"))
        clauses = this.__asArray(querySpec.fuzzy)
        for (i = 0; i < clauses.length; i++) builder.add(this.__clauseQuery(channel, { fuzzy: clauses[i], boost: clauses[i].boost }), this.__toOccurrence("should"))
        clauses = this.__asArray(querySpec.regexp)
        for (i = 0; i < clauses.length; i++) builder.add(this.__clauseQuery(channel, { regexp: clauses[i], boost: clauses[i].boost }), this.__toOccurrence("should"))

        if (isDef(querySpec.q) && !isDef(querySpec.must) && !isDef(querySpec.should) && !isDef(querySpec.filter)) {
            builder.add(this.__clauseQuery(channel, { q: querySpec.q, field: querySpec.field, boost: querySpec.boost }), this.__toOccurrence("must"))
        }

        var bq = builder.build()
        if (bq.clauses().size() == 0) return new Packages.org.apache.lucene.search.MatchAllDocsQuery()
        return bq
    },
    __sortType: function(t) {
        switch(String(t || "").toLowerCase()) {
        case "score":
            return Packages.org.apache.lucene.search.SortField.Type.SCORE
        case "doc":
            return Packages.org.apache.lucene.search.SortField.Type.DOC
        case "int":
            return Packages.org.apache.lucene.search.SortField.Type.INT
        case "float":
            return Packages.org.apache.lucene.search.SortField.Type.FLOAT
        case "double":
            return Packages.org.apache.lucene.search.SortField.Type.DOUBLE
        case "long":
        case "date":
            return Packages.org.apache.lucene.search.SortField.Type.LONG
        case "keyword":
        case "string":
        case "text":
        default:
            return Packages.org.apache.lucene.search.SortField.Type.STRING
        }
    },
    __toSort: function(channel, sortSpec) {
        if (isUnDef(sortSpec)) return __
        var specs = this.__asArray(sortSpec)
        if (specs.length == 0) return __
        var jSortFields = java.lang.reflect.Array.newInstance(Packages.org.apache.lucene.search.SortField, specs.length)
        for (var i = 0; i < specs.length; i++) {
            var s = specs[i]
            if (isString(s)) s = { field: s }
            var field = String(_$(s.field, "sort.field").default(channel.options.defaultSortField || "_score"))
            var type = String(_$(s.type, "sort.type").default(channel.options.schema[field] || "string"))
            var dir = String(_$(s.dir, "sort.dir").default("asc")).toLowerCase()
            var reverse = (dir == "desc")
            jSortFields[i] = new Packages.org.apache.lucene.search.SortField(field, this.__sortType(type), reverse)
        }
        return new Packages.org.apache.lucene.search.Sort(jSortFields)
    },
    __decodeSearchAfter: function(searchAfter) {
        if (isUnDef(searchAfter)) return __
        if (this.__isObj(searchAfter)) return searchAfter
        try { return jsonParse(String(searchAfter)) } catch(e) {}
        return __
    },
    __toScoreDoc: function(token) {
        if (!this.__isObj(token) || isUnDef(token.doc)) return __
        var docId = Number(token.doc)
        var score = Number(_$(token.score, "searchAfter.score").default(0))
        if (isArray(token.fields)) {
            var jFields = java.lang.reflect.Array.newInstance(java.lang.Object, token.fields.length)
            for (var i = 0; i < token.fields.length; i++) jFields[i] = token.fields[i]
            return new Packages.org.apache.lucene.search.FieldDoc(docId, score, jFields)
        }
        return new Packages.org.apache.lucene.search.ScoreDoc(docId, score)
    },
    __scoreDocToken: function(sd) {
        if (isUnDef(sd)) return __
        var token = { doc: Number(sd.doc), score: Number(sd.score) }
        if (sd.fields && isDef(sd.fields.length)) {
            token.fields = []
            for (var i = 0; i < sd.fields.length; i++) token.fields.push(sd.fields[i])
        }
        return stringify(token, void 0, "")
    },
    __drillDown: function(channel, baseQuery, facetsOpts) {
        if (!channel.hasFacets || !this.__isObj(facetsOpts) || !this.__isObj(facetsOpts.drillDown)) return baseQuery
        var dd = new Packages.org.apache.lucene.facet.DrillDownQuery(channel.facetsConfig, baseQuery)
        var keys = Object.keys(facetsOpts.drillDown)
        for (var i = 0; i < keys.length; i++) {
            var f = keys[i]
            var vals = this.__asArray(facetsOpts.drillDown[f])
            for (var j = 0; j < vals.length; j++) dd.add(String(f), String(vals[j]))
        }
        return dd
    },
    __facetCounts: function(channel, facetsCollector, facetsOpts) {
        if (!channel.hasFacets || isUnDef(facetsCollector)) return __
        var taxoReader = __
        try {
            taxoReader = new Packages.org.apache.lucene.facet.taxonomy.directory.DirectoryTaxonomyReader(channel.taxoDirectory)
            var facets = new Packages.org.apache.lucene.facet.taxonomy.FastTaxonomyFacetCounts(taxoReader, channel.facetsConfig, facetsCollector)
            var res = {}
            var fields = this.__asArray(facetsOpts.fields || channel.options.facetFields)
            var topN = Number(_$(facetsOpts.topN, "facets.topN").default(10))
            var emptyPath = java.lang.reflect.Array.newInstance(java.lang.String, 0)
            for (var i = 0; i < fields.length; i++) {
                var fr = facets.getTopChildren(topN, String(fields[i]), emptyPath)
                var vals = []
                if (isDef(fr) && isDef(fr.labelValues)) {
                    for (var li = 0; li < fr.labelValues.length; li++) {
                        vals.push({ value: String(fr.labelValues[li].label), count: Number(fr.labelValues[li].value.intValue ? fr.labelValues[li].value.intValue() : fr.labelValues[li].value) })
                    }
                }
                res[String(fields[i])] = vals
            }
            return res
        } finally {
            if (isDef(taxoReader)) taxoReader.close()
        }
    },
    __toMoreLikeThisQuery: function(channel, moreLikeThisSpec) {
        var reader = Packages.org.apache.lucene.index.DirectoryReader.open(channel.writer)
        try {
            var mlt = new Packages.org.apache.lucene.queries.mlt.MoreLikeThis(reader)
            mlt.setAnalyzer(channel.analyzer)
            var fields = java.lang.reflect.Array.newInstance(java.lang.String, 1)
            fields[0] = channel.options.contentField
            mlt.setFieldNames(fields)
            if (isDef(moreLikeThisSpec.minTermFreq)) mlt.setMinTermFreq(Number(moreLikeThisSpec.minTermFreq))
            if (isDef(moreLikeThisSpec.minDocFreq)) mlt.setMinDocFreq(Number(moreLikeThisSpec.minDocFreq))
            if (isDef(moreLikeThisSpec.maxQueryTerms)) mlt.setMaxQueryTerms(Number(moreLikeThisSpec.maxQueryTerms))
            if (isDef(moreLikeThisSpec.id)) {
                var key = this.__keyValue(channel, moreLikeThisSpec.id)
                var q = new Packages.org.apache.lucene.search.TermQuery(new Packages.org.apache.lucene.index.Term(channel.options.idField, key))
                var searcher = new Packages.org.apache.lucene.search.IndexSearcher(reader)
                var td = searcher.search(q, 1)
                if (td.scoreDocs.length > 0) {
                    return mlt.like(td.scoreDocs[0].doc)
                }
            }
            var sr = new java.io.StringReader(String(_$(moreLikeThisSpec.text, "moreLikeThis.text").default("")))
            return mlt.like(channel.options.contentField, sr)
        } finally {
            reader.close()
        }
    },
    __searchCore: function(channel, searcher, full) {
        if (!this.__isObj(full)) full = {}
        var limit = Number(_$(full.limit, "limit").default(20))
        var offset = Number(_$(full.offset, "offset").default(0))
        if (limit < 0) limit = 0
        if (offset < 0) offset = 0

        var baseQuerySpec = isDef(full.query) ? full.query : full
        if (isDef(full.moreLikeThis) && !isDef(baseQuerySpec.moreLikeThis)) baseQuerySpec = { moreLikeThis: full.moreLikeThis }
        var query = this.__toQuery(channel, baseQuerySpec)
        query = this.__drillDown(channel, query, full.facets)
        var sort = this.__toSort(channel, full.sort)
        var totalWanted = offset + limit
        if (totalWanted < 1) totalWanted = 1

        var topDocs
        var facetsCollector = __
        var searchAfterToken = this.__decodeSearchAfter(full.searchAfter)
        var scoreAfter = this.__toScoreDoc(searchAfterToken)

        if (isDef(full.facets) && channel.hasFacets) {
            facetsCollector = new Packages.org.apache.lucene.facet.FacetsCollector()
            searcher.search(query, facetsCollector)
            if (isDef(scoreAfter)) {
                if (isDef(sort)) topDocs = searcher.searchAfter(scoreAfter, query, totalWanted, sort)
                else topDocs = searcher.searchAfter(scoreAfter, query, totalWanted)
            } else {
                if (isDef(sort)) topDocs = searcher.search(query, totalWanted, sort)
                else topDocs = searcher.search(query, totalWanted)
            }
        } else if (isDef(scoreAfter)) {
            if (isDef(sort)) topDocs = searcher.searchAfter(scoreAfter, query, totalWanted, sort)
            else topDocs = searcher.searchAfter(scoreAfter, query, totalWanted)
        } else {
            if (isDef(sort)) topDocs = searcher.search(query, totalWanted, sort)
            else topDocs = searcher.search(query, totalWanted)
        }

        var hits = topDocs.scoreDocs
        var results = []
        var explain = (full.explain == true)
        for (var i = offset; i < hits.length; i++) {
            var doc = this.__getDocument(searcher, hits[i].doc)
            if (isUnDef(doc)) continue
            var explainObj = __
            if (explain) {
                try {
                    var ex = searcher.explain(query, hits[i].doc)
                    explainObj = { value: Number(ex.getValue ? ex.getValue().doubleValue() : ex.getValue()), description: String(ex.getDescription ? ex.getDescription() : ex.toString()) }
                } catch(e) {}
            }
            results.push(this.__toObj(channel, doc, hits[i].score, explainObj))
            if (results.length >= limit) break
        }

        var total = Number(topDocs.totalHits && isDef(topDocs.totalHits.value) ? (topDocs.totalHits.value.intValue ? topDocs.totalHits.value.intValue() : topDocs.totalHits.value) : hits.length)
        var nextAfter = __
        if (hits.length > 0 && (offset + limit) < hits.length) nextAfter = this.__scoreDocToken(hits[Math.min(offset + limit - 1, hits.length - 1)])

        return {
            hits: results,
            total: total,
            nextSearchAfter: nextAfter,
            facetCounts: this.__facetCounts(channel, facetsCollector, full.facets || {})
        }
    },
    __normalizeScores: function(rows, fieldName) {
        var max = 0
        for (var i = 0; i < rows.length; i++) {
            var v = Number(_$(rows[i][fieldName], fieldName).default(0))
            if (v > max) max = v
        }
        if (max <= 0) max = 1
        for (var j = 0; j < rows.length; j++) rows[j][fieldName + "Norm"] = Number(rows[j][fieldName] || 0) / max
    },
    __withMeta: function(r) {
        var out = [{ _meta: { total: r.total, nextSearchAfter: r.nextSearchAfter, facetCounts: r.facetCounts } }]
        for (var i = 0; i < r.hits.length; i++) out.push(r.hits[i])
        return out
    },
    __runHybrid: function(aName, full) {
        if (!this.__isObj(full.hybrid)) throw new Error("hybrid options are required")
        var hybrid = full.hybrid
        var channel = this.__ensureChannel(aName)
        var textQuery = isDef(hybrid.textQuery) ? hybrid.textQuery : full.query
        var searcher = channel.searcherManager.acquire()
        var textRes
        try {
            textRes = this.__searchCore(channel, searcher, { query: textQuery, limit: Number(_$(hybrid.kText, "hybrid.kText").default(50)) })
        } finally {
            channel.searcherManager.release(searcher)
        }
        var byId = {}
        var i

        for (i = 0; i < textRes.hits.length; i++) {
            var hid = String(textRes.hits[i][channel.options.idField])
            byId[hid] = {
                id: hid,
                textScore: Number(_$(textRes.hits[i].score, "score").default(0)),
                vectorScore: 0,
                payload: textRes.hits[i].payload,
                content: textRes.hits[i][channel.options.contentField]
            }
        }

        var vectorHits = []
        if (isDef(hybrid.vectorResults) && isArray(hybrid.vectorResults)) vectorHits = hybrid.vectorResults
        else if (isDef(hybrid.vectorChannel) && isDef(hybrid.vector) && isArray(hybrid.vector)) {
            vectorHits = $ch(String(hybrid.vectorChannel)).getAll({ vector: hybrid.vector, k: Number(_$(hybrid.kVector, "hybrid.kVector").default(50)) })
        } else if (isDef(hybrid.vector) && isArray(hybrid.vector) && this.__vectorEnabled(channel)) {
            vectorHits = this.vectorSearch(aName, hybrid.vector, Number(_$(hybrid.kVector, "hybrid.kVector").default(hybrid.k || 50)))
        }

        for (i = 0; i < vectorHits.length; i++) {
            var vid = String(vectorHits[i].id)
            if (isUnDef(byId[vid])) byId[vid] = { id: vid, textScore: 0, vectorScore: 0 }
            byId[vid].vectorScore = Number(_$(vectorHits[i].score, "vector score").default(0))
        }

        var all = Object.keys(byId).map(function(k){ return byId[k] })
        this.__normalizeScores(all, "textScore")
        this.__normalizeScores(all, "vectorScore")

        var wText = Number(_$(hybrid.weights && hybrid.weights.text, "hybrid.weights.text").default(0.5))
        var wVector = Number(_$(hybrid.weights && hybrid.weights.vector, "hybrid.weights.vector").default(0.5))
        for (i = 0; i < all.length; i++) all[i].hybridScore = wText * all[i].textScoreNorm + wVector * all[i].vectorScoreNorm
        all.sort(function(a, b){ return Number(b.hybridScore) - Number(a.hybridScore) })

        var limit = Number(_$(full.limit, "limit").default(20))
        var out = []
        for (i = 0; i < all.length && i < limit; i++) {
            var doc = this.get(aName, { id: all[i].id })
            if (isDef(doc)) {
                doc.textScore = all[i].textScore
                doc.vectorScore = all[i].vectorScore
                doc.hybridScore = all[i].hybridScore
                out.push(doc)
            }
        }
        return { hits: out, total: all.length, nextSearchAfter: __, facetCounts: __ }
    },
    __enhancedComponent: function(channel, searcher, query, count) {
        var td = searcher.search(query, count), out = []
        for (var i = 0; i < td.scoreDocs.length; i++) {
            var d = this.__getDocument(searcher, td.scoreDocs[i].doc)
            if (isDef(d)) out.push({ docId: Number(td.scoreDocs[i].doc), id: String(d.get(channel.options.idField)), rawScore: Number(td.scoreDocs[i].score), doc: d })
        }
        return out
    },
    __synonymQuery: function(channel, text, o) {
        var rules = this.__synonymRules(o.synonyms), b = new Packages.org.apache.lucene.search.BooleanQuery.Builder(), found = false
        var lower = String(text).toLowerCase()
        for (var i = 0; i < rules.length; i++) {
            for (var j = 0; j < rules[i].length; j++) if (lower.indexOf(String(rules[i][j]).toLowerCase()) >= 0) {
                for (var k = 0; k < rules[i].length; k++) if (k != j || o.synonyms.expand) {
                    var p = new Packages.org.apache.lucene.queryparser.classic.QueryParser(channel.options.contentField, channel.primaryAnalyzer)
                    b.add(p.parse(Packages.org.apache.lucene.queryparser.classic.QueryParser.escape(String(rules[i][k]))), Packages.org.apache.lucene.search.BooleanClause.Occur.SHOULD); found = true
                }
            }
        }
        return found ? b.build() : __
    },
    __fuseLexical: function(channel, sets, o, limit, debug, explain) {
        var weights = { baseLexical: Number(o.fusion.lexicalWeight), phrase: Number(o.fusion.phraseWeight) * Number(o.phrases.boost), shingle: Number(o.fusion.shingleWeight) * Number(o.shingles.boost), ngram: Number(o.fusion.ngramWeight) * Number(o.characterNGrams.boost), expansion: Number(o.fusion.expansionWeight) * Number(o.queryExpansion.enabled ? o.queryExpansion.boost : o.pseudoRelevanceFeedback.boost) }
        var byId = {}, names = Object.keys(sets), i, j, row, name
        for (i = 0; i < names.length; i++) {
            name = names[i]; var max = sets[name].length ? sets[name][0].rawScore : 1
            if (max <= 0) max = 1
            for (j = 0; j < sets[name].length; j++) {
                row = sets[name][j]
                if (isUnDef(byId[row.id])) byId[row.id] = { id: row.id, doc: row.doc, score: 0, details: {}, components: {} }
                var part = o.fusion.method == "rrf" ? weights[name] / (Number(o.fusion.rrfK) + j + 1) : weights[name] * row.rawScore / max
                byId[row.id].score += part; byId[row.id].details[name] = part
                byId[row.id].components[name] = { rank: j + 1, rawScore: row.rawScore }
            }
        }
        var all = Object.keys(byId).map(function(k){ return byId[k] })
        all.sort(function(a,b){ var d = b.score-a.score; return d != 0 ? d : (a.id < b.id ? -1 : 1) })
        var out = []
        for (i = 0; i < all.length && i < limit; i++) {
            var ex = explain ? { mode: "lexicalEnhanced", fusion: o.fusion.method, components: all[i].components } : __
            var obj = this.__toObj(channel, all[i].doc, all[i].score, ex)
            if (debug) {
                obj.scoreDetails = { baseLexical: Number(all[i].details.baseLexical || 0), phrase: Number(all[i].details.phrase || 0), shingle: Number(all[i].details.shingle || 0), ngram: Number(all[i].details.ngram || 0), expansion: Number(all[i].details.expansion || 0), fused: all[i].score }
            }
            out.push(obj)
        }
        return out
    },
    __enhancedLexicalSearch: function(aName, full) {
        var channel = this.__ensureChannel(aName)
        if (isUnDef(full.query) || !isString(full.query) || String(full.query).trim().length == 0) throw new Error("A non-empty query is required for lexicalEnhanced search.")
        var o = this.__lexicalOptions(this.__mergeMap(channel.lexical, full.lexical)), text = String(full.query), limit = Number(isDef(full.k) ? full.k : (isDef(full.limit) ? full.limit : 20))
        this.__refresh(channel)
        var searcher = channel.searcherManager.acquire()
        try {
            searcher.setSimilarity(new Packages.org.apache.lucene.search.similarities.BM25Similarity(Number(o.bm25.k1), Number(o.bm25.b)))
            if ((o.queryExpansion.enabled || o.pseudoRelevanceFeedback.enabled) && searcher.getIndexReader().numDocs() == 0) throw new Error("Cannot run lexical feedback against an empty index.")
            var candidateCount = Math.max(limit, Number(o.pseudoRelevanceFeedback.topDocuments), 20), sets = {}
            var parser = new Packages.org.apache.lucene.queryparser.classic.QueryParser(channel.options.contentField, channel.primaryAnalyzer)
            var base = parser.parse(Packages.org.apache.lucene.queryparser.classic.QueryParser.escape(text))
            var sq = o.synonyms.enabled ? this.__synonymQuery(channel, text, o) : __
            if (isDef(sq)) { var bb = new Packages.org.apache.lucene.search.BooleanQuery.Builder(); bb.add(base, Packages.org.apache.lucene.search.BooleanClause.Occur.SHOULD); bb.add(sq, Packages.org.apache.lucene.search.BooleanClause.Occur.SHOULD); base = bb.build() }
            sets.baseLexical = this.__enhancedComponent(channel, searcher, base, candidateCount)
            if (o.phrases.enabled) {
                var pp = new Packages.org.apache.lucene.queryparser.classic.QueryParser(channel.options.contentField + "__phrase", channel.primaryAnalyzer)
                pp.setPhraseSlop(Number(o.phrases.slop)); sets.phrase = this.__enhancedComponent(channel, searcher, pp.parse("\"" + Packages.org.apache.lucene.queryparser.classic.QueryParser.escape(text) + "\""), candidateCount)
            }
            if (o.shingles.enabled) { var sp = new Packages.org.apache.lucene.queryparser.classic.QueryParser(channel.options.contentField + "__shingle", channel.shingleAnalyzer); sets.shingle = this.__enhancedComponent(channel, searcher, sp.parse(Packages.org.apache.lucene.queryparser.classic.QueryParser.escape(text)), candidateCount) }
            if (o.characterNGrams.enabled) { var np = new Packages.org.apache.lucene.queryparser.classic.QueryParser(channel.options.contentField + "__ngram", channel.ngramAnalyzer); sets.ngram = this.__enhancedComponent(channel, searcher, np.parse(Packages.org.apache.lucene.queryparser.classic.QueryParser.escape(text)), candidateCount) }
            if (o.queryExpansion.enabled || o.pseudoRelevanceFeedback.enabled) {
                try {
                    var mlt = new Packages.org.apache.lucene.queries.mlt.MoreLikeThis(searcher.getIndexReader()), fields = java.lang.reflect.Array.newInstance(java.lang.String, 1); fields[0] = channel.options.contentField
                    mlt.setAnalyzer(channel.primaryAnalyzer); mlt.setFieldNames(fields); mlt.setMinTermFreq(Number(o.pseudoRelevanceFeedback.minTermFreq)); mlt.setMinDocFreq(Number(o.queryExpansion.minDocFreq)); mlt.setMaxQueryTerms(Number(o.queryExpansion.maxTerms))
                    var eq
                    if (o.pseudoRelevanceFeedback.enabled && sets.baseLexical.length > 0) {
                        var eb = new Packages.org.apache.lucene.search.BooleanQuery.Builder(), topN = Math.min(Number(o.pseudoRelevanceFeedback.topDocuments), sets.baseLexical.length)
                        mlt.setMinDocFreq(Number(o.pseudoRelevanceFeedback.minDocFreq)); mlt.setMaxQueryTerms(Number(o.pseudoRelevanceFeedback.maxTerms))
                        for (var mi = 0; mi < topN; mi++) eb.add(mlt.like(sets.baseLexical[mi].docId), Packages.org.apache.lucene.search.BooleanClause.Occur.SHOULD)
                        eq = eb.build()
                    } else eq = mlt.like(channel.options.contentField, new java.io.StringReader(text))
                    sets.expansion = this.__enhancedComponent(channel, searcher, eq, candidateCount)
                } catch(e) { throw new Error("Lexical query expansion requires the Lucene lucene-queries module: " + e) }
            }
            return this.__fuseLexical(channel, sets, o, limit, full.debug == true, full.explain == true)
        } finally { channel.searcherManager.release(searcher) }
    },
    __refresh: function(channel, force) {
        if (channel.options.autoRefresh || force === true) channel.searcherManager.maybeRefreshBlocking()
    },
    __commit: function(channel, force) {
        if (channel.options.autoCommit || force === true) {
            channel.writer.commit()
            if (channel.hasFacets) channel.taxoWriter.commit()
        }
    },
    /**
     * <odoc>
     * <key>ow.ch.types.searchDB</key>
     * Creates a new search database or opens an existing one. The search database is stored in the file system and uses Apache Lucene under the hood.\
     * \ 
     * The returned object has the following methods:\
     * \
     *   - `size()`: returns the number of documents in the search database.\
     *   - `forEach(fn)`: iterates over all documents in the search database, calling `fn(id, doc)` for each document, where `id` is the document ID and `doc` is the document object.\
     *   - `getAll([full])`: returns an array of all documents in the search database. If `full` is provided with certain options, it can return additional metadata and support more complex queries.\
     * \
     * The `create` method takes three parameters:\
     * \
     *   - `aName`: a string representing the name of the search database.\
     *   - `shouldCompress`: a boolean indicating whether to compress the stored data (not currently used).\
     *   - `options`: an object with the following optional properties:\
     *   - `path`: a string specifying the file system path where the search database will be stored. Defaults to `./lucene/aName`.\
     *   `idField`, `contentField`, `payloadField`: strings specifying the field names for document ID, content, and payload. Defaults to "id", "content", and "payload" respectively.\
     *   `autoCommit`: a boolean indicating whether to automatically commit changes to the index. Defaults to true.\
     *   `autoRefresh`: a boolean indicating whether to automatically refresh the searcher after commits. Defaults to true.\
     *   `schema`: an object defining the schema for additional fields in the documents.\
     *   `facetFields`: an array of strings specifying which fields should be treated as facets for faceted search.\
     *   `defaultSortField`: a string specifying the default field to sort search results by.\
     *   `analyzer`: a string specifying the Lucene analyzer to use (e.g., "standard", "whitespace"). Defaults to "standard".\
     *   `taxonomyPath`: a string specifying the file system path for storing facet taxonomy data. Defaults to `options.path/_taxonomy`.\
     * \
     * Example usage:\
     * \
     * var db = ow.ch.types.searchDB.create("mySearchDB", false, { autoCommit: true, facetFields: ["category"] });\
     * db.forEach(function(id, doc) {\
     *   console.log("Document ID:", id);\
     *   console.log("Content:", doc.content);\
     * });\
     * var allDocs = db.getAll();\
     * console.log("Total documents:", allDocs.length);\
     * </odoc>
     */
    create: function(aName, shouldCompress, options) {
        if (!this.__isObj(options)) options = {}
        options.path = _$(options.path, "options.path").isString().default("./lucene/" + aName)
        options.idField = _$(options.idField, "options.idField").isString().default("id")
        options.contentField = _$(options.contentField, "options.contentField").isString().default("content")
        options.payloadField = _$(options.payloadField, "options.payloadField").isString().default("payload")
        options.autoCommit = _$(options.autoCommit, "options.autoCommit").default(true)
        options.autoRefresh = _$(options.autoRefresh, "options.autoRefresh").default(true)
        if (!this.__isObj(options.schema)) options.schema = {}
        options.facetFields = _$(options.facetFields, "options.facetFields").isArray().default([])
        options.defaultSortField = _$(options.defaultSortField, "options.defaultSortField").default(__)
        options.analyzer = _$(options.analyzer, "options.analyzer").default("standard")
        options.lexical = this.__lexicalOptions(options.lexical)
        if (isDef(options.lexical.language)) options.analyzer = options.lexical.language
        options.taxonomyPath = _$(options.taxonomyPath, "options.taxonomyPath").isString().default(options.path + "/_taxonomy")
        if (isDef(options.dimension) && isUnDef(options.vectorDimension)) options.vectorDimension = options.dimension
        if (isDef(options.vectorDimension)) {
            options.vectorDimension = Number(options.vectorDimension)
            if (!isFinite(options.vectorDimension) || options.vectorDimension <= 0 || Math.floor(options.vectorDimension) != options.vectorDimension) throw new Error("options.vectorDimension must be a positive integer.")
            options.vectorField = _$(options.vectorField, "options.vectorField").isString().default("vector")
            options.vectorSimilarity = _$(options.vectorSimilarity, "options.vectorSimilarity").default("cosine")
            if (isDef(options.embeddingProvider) && !isFunction(options.embeddingProvider) && !(this.__isObj(options.embeddingProvider) && isFunction(options.embeddingProvider.embed))) throw new Error("options.embeddingProvider must be a function or an object with an embed(text) function.")
        }

        if (!io.fileExists(options.path)) io.mkdir(options.path)
        if (options.facetFields.length > 0 && !io.fileExists(options.taxonomyPath)) io.mkdir(options.taxonomyPath)

        var primaryAnalyzer = this.__toAnalyzer({ analyzer: options.lexical.stemming.enabled ? options.lexical.language : "standard" })
        var analyzer = primaryAnalyzer
        var shingleAnalyzer = __, ngramAnalyzer = __
        var perField = new java.util.HashMap()
        if (options.lexical.shingles.enabled) { shingleAnalyzer = this.__customAnalyzer("shingle", options.lexical); perField.put(options.contentField + "__shingle", shingleAnalyzer) }
        if (options.lexical.characterNGrams.enabled) { ngramAnalyzer = this.__customAnalyzer("ngram", options.lexical); perField.put(options.contentField + "__ngram", ngramAnalyzer) }
        if (perField.size() > 0) analyzer = new Packages.org.apache.lucene.analysis.miscellaneous.PerFieldAnalyzerWrapper(primaryAnalyzer, perField)
        var directory = Packages.org.apache.lucene.store.FSDirectory.open(java.nio.file.Paths.get(options.path))
        var iwc = new Packages.org.apache.lucene.index.IndexWriterConfig(analyzer)
        iwc.setSimilarity(new Packages.org.apache.lucene.search.similarities.BM25Similarity(Number(options.lexical.bm25.k1), Number(options.lexical.bm25.b)))
        iwc.setOpenMode(Packages.org.apache.lucene.index.IndexWriterConfig.OpenMode.CREATE_OR_APPEND)
        var writer = new Packages.org.apache.lucene.index.IndexWriter(directory, iwc)
        var searcherManager = new Packages.org.apache.lucene.search.SearcherManager(writer, true, true, null)
        var hasFacets = options.facetFields.length > 0
        var facetsConfig = __, taxoDirectory = __, taxoWriter = __
        if (hasFacets) {
            facetsConfig = new Packages.org.apache.lucene.facet.FacetsConfig()
            for (var fi = 0; fi < options.facetFields.length; fi++) facetsConfig.setMultiValued(String(options.facetFields[fi]), true)
            taxoDirectory = Packages.org.apache.lucene.store.FSDirectory.open(java.nio.file.Paths.get(options.taxonomyPath))
            taxoWriter = new Packages.org.apache.lucene.facet.taxonomy.directory.DirectoryTaxonomyWriter(taxoDirectory)
        }

        this.__channels[aName] = {
            analyzer: analyzer,
            primaryAnalyzer: primaryAnalyzer,
            shingleAnalyzer: shingleAnalyzer,
            ngramAnalyzer: ngramAnalyzer,
            lexical: options.lexical,
            directory: directory,
            writer: writer,
            searcherManager: searcherManager,
            hasFacets: hasFacets,
            facetsConfig: facetsConfig,
            taxoDirectory: taxoDirectory,
            taxoWriter: taxoWriter,
            options: options,
            vectorSimilarity: isDef(options.vectorDimension) ? this.__vectorSimilarity(options.vectorSimilarity) : __
        }
    },
    destroy: function(aName) {
        var channel = this.__channels[aName]
        if (isDef(channel)) {
            this.__commit(channel, true)
            channel.searcherManager.close()
            channel.writer.close()
            channel.directory.close()
            channel.analyzer.close()
            if (channel.hasFacets) {
                channel.taxoWriter.close()
                channel.taxoDirectory.close()
            }
            delete this.__channels[aName]
        }
    },
    size: function(aName) {
        var channel = this.__ensureChannel(aName)
        return Number(channel.writer.getDocStats().numDocs)
    },
    forEach: function(aName, fn) {
        var all = this.getAll(aName)
        if (isUnDef(all)) return
        var channel = this.__ensureChannel(aName)
        for (var i = 0; i < all.length; i++) fn(all[i][channel.options.idField], all[i])
    },
    getAll: function(aName, full) {
        var channel = this.__ensureChannel(aName)
        if (this.__isObj(full) && this.__isObj(full.hybrid)) return this.__withMeta(this.__runHybrid(aName, full))
        if (this.__isObj(full) && isDef(full.vector) && isUnDef(full.query)) return this.vectorSearch(aName, full.vector, full.k)
        this.__refresh(channel)
        var searcher = channel.searcherManager.acquire()
        try {
            if (!this.__isObj(full)) {
                var count = channel.writer.getDocStats().numDocs
                if (count <= 0) return []
                var topDocs = searcher.search(new Packages.org.apache.lucene.search.MatchAllDocsQuery(), Number(count))
                var rs = []
                for (var i = 0; i < topDocs.scoreDocs.length; i++) {
                    var d = this.__getDocument(searcher, topDocs.scoreDocs[i].doc)
                    if (isDef(d)) rs.push(this.__toObj(channel, d))
                }
                return rs
            }
            if (isDef(full.query) || isDef(full.moreLikeThis) || isDef(full.facets) || isDef(full.sort) || isDef(full.searchAfter) || isDef(full.offset) || isDef(full.explain) || full.returnMeta == true) {
                var r = this.__searchCore(channel, searcher, full)
                var hasMeta = isDef(full.facets) || isDef(full.sort) || isDef(full.searchAfter) || isDef(full.offset) || isDef(full.explain) || full.returnMeta == true || isDef(full.moreLikeThis)
                return hasMeta ? this.__withMeta(r) : r.hits
            }
            return []
        } finally {
            channel.searcherManager.release(searcher)
        }
    },
    getKeys: function(aName, full) {
        var channel = this.__ensureChannel(aName)
        var all = this.getAll(aName, full)
        var src = (this.__isObj(all) && isArray(all.hits)) ? all.hits : all
        var keys = []
        for (var i = 0; i < src.length; i++) keys.push(src[i][channel.options.idField])
        return keys
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
            var totalHits = (typeof topDocs.totalHits.value === "function") ? topDocs.totalHits.value() : topDocs.totalHits.value
            if (totalHits <= 0) return __
            var doc = this.__getDocument(searcher, topDocs.scoreDocs[0].doc)
            return this.__toObj(channel, doc)
        } finally {
            channel.searcherManager.release(searcher)
        }
    },
    getSet: function(aName, aMatch, aK, aV, aTimestamp) {
        var res = this.get(aName, aK)
        if ($stream([res]).anyMatch(aMatch)) return this.set(aName, aK, aV, aTimestamp)
        return __
    },
    set: function(aName, aK, aV, aTimestamp) {
        var channel = this.__ensureChannel(aName)
        var keyValue = this.__keyValue(channel, aK)
        var doc = this.__docWithFacets(channel, this.__documentFrom(channel, keyValue, aV))
        var term = new Packages.org.apache.lucene.index.Term(channel.options.idField, keyValue)
        channel.writer.updateDocument(term, doc)
        this.__commit(channel)
        this.__refresh(channel)
        return aK
    },
    setAll: function(aName, aKs, aVs, aTimestamp) {
        if (isUnDef(aVs) || !isArray(aVs)) return
        var channel = this.__ensureChannel(aName)
        for (var i = 0; i < aVs.length; i++) {
            var keys = isArray(aKs) ? aKs[i] : aKs
            var keyValue = this.__keyValue(channel, keys)
            var doc = this.__docWithFacets(channel, this.__documentFrom(channel, keyValue, aVs[i]))
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
        var terms = java.lang.reflect.Array.newInstance(Packages.org.apache.lucene.index.Term, 1)
        terms[0] = term
        channel.writer.deleteDocuments(terms)
        this.__commit(channel)
        this.__refresh(channel)
    },
    unsetAll: function(aName, aKs, aVs, aTimestamp) {
        if (isUnDef(aKs) || !isArray(aKs)) return
        var channel = this.__ensureChannel(aName)
        for (var i = 0; i < aKs.length; i++) {
            var keyValue = this.__keyValue(channel, aKs[i])
            var term = new Packages.org.apache.lucene.index.Term(channel.options.idField, keyValue)
            var terms = java.lang.reflect.Array.newInstance(Packages.org.apache.lucene.index.Term, 1)
            terms[0] = term
            channel.writer.deleteDocuments(terms)
        }
        this.__commit(channel)
        this.__refresh(channel)
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
    search: function(aName, queryText, limit) {
        if (this.__isObj(queryText) && String(queryText.mode).toLowerCase() == "lexicalenhanced") return this.__enhancedLexicalSearch(aName, queryText)
        var q = _$(queryText, "queryText").default("*:*")
        var full = { query: (isString(q) ? String(q) : q), limit: Number(isDef(limit) ? limit : 20) }
        var r = this.getAll(aName, full)
        return this.__isObj(r) ? r.hits : r
    },
    vectorSearch: function(aName, vector, k) {
        var channel = this.__ensureChannel(aName)
        var queryVector = this.__validateVector(channel, vector, "query vector")
        k = Number(isDef(k) ? k : 10)
        if (!isFinite(k) || k <= 0 || Math.floor(k) != k) throw new Error("k must be a positive integer.")
        this.__refresh(channel)
        var searcher = channel.searcherManager.acquire()
        try {
            var query = new Packages.org.apache.lucene.search.KnnFloatVectorQuery(channel.options.vectorField, queryVector, k)
            var topDocs
            try {
                topDocs = searcher.search(query, k)
            } catch(e) {
                throw new Error("Unable to search vector field '" + channel.options.vectorField + "'. The existing index may be incompatible with the configured vector dimension or similarity: " + e)
            }
            var out = []
            for (var i = 0; i < topDocs.scoreDocs.length; i++) {
                var doc = this.__getDocument(searcher, topDocs.scoreDocs[i].doc)
                if (isDef(doc)) out.push(this.__toObj(channel, doc, topDocs.scoreDocs[i].score))
            }
            return out
        } finally {
            channel.searcherManager.release(searcher)
        }
    },
    hybridSearch: function(aName, options) {
        options = _$(options, "options").isMap().$_()
        if (isUnDef(options.vector)) throw new Error("options.vector is required for hybrid search.")
        var full = { query: options.query, hybrid: { textQuery: options.query, vector: options.vector, kText: options.kText || options.k, kVector: options.kVector || options.k, weights: options.weights }, limit: options.limit || options.k || 20 }
        return this.__runHybrid(aName, full).hits
    }
}

// Backward-compatible helper for line-by-line file indexing/search.
// Kept as a global to preserve existing scripts that use `searchDB.*`.
var searchDB = {
    __docFrom: function(searcher, docId) {
        try {
            if (searcher.storedFields && typeof searcher.storedFields === "function") {
                var storedFields = searcher.storedFields()
                if (storedFields && typeof storedFields.document === "function") {
                    return storedFields.document(docId)
                }
            }
        } catch(e) {}

        try {
            if (typeof searcher.doc === "function") return searcher.doc(docId)
        } catch(e) {}

        try {
            if (typeof searcher.document === "function") return searcher.document(docId)
        } catch(e) {}

        try {
            var reader = null
            try { reader = searcher.getIndexReader() } catch(e) { try { reader = searcher.getReader() } catch(er) { reader = null } }
            if (reader) {
                if (typeof reader.document === "function") return reader.document(docId)
                if (typeof reader.doc === "function") return reader.doc(docId)
            }
        } catch(e) {}

        return __
    },
    __indexContent: function(writer, filePath, content) {
        var lines = String(content).split(/\r?\n/)
        for (var li = 0; li < lines.length; li++) {
            var lineText = lines[li]
            var doc = new Packages.org.apache.lucene.document.Document()
            doc.add(new Packages.org.apache.lucene.document.StringField("path", String(filePath), Packages.org.apache.lucene.document.Field.Store.YES))
            doc.add(new Packages.org.apache.lucene.document.StoredField("line", java.lang.Integer.valueOf(li + 1)))
            doc.add(new Packages.org.apache.lucene.document.TextField("content", String(lineText), Packages.org.apache.lucene.document.Field.Store.YES))
            writer.addDocument(doc)
        }
    },
    __collectLocalFiles: function(options) {
        var files = []

        if (isArray(options.files)) {
            for (var i = 0; i < options.files.length; i++) {
                if (isDef(options.files[i])) files.push(String(options.files[i]))
            }
        }

        if (isDef(options.path)) {
            if (toBoolean(options.recursive)) {
                var recFiles = listFilesRecursive(options.path)
                for (var ri = 0; ri < recFiles.length; ri++) {
                    if (recFiles[ri].isFile) files.push(String(recFiles[ri].filepath))
                }
            } else {
                var lst = io.listFiles(options.path).files
                for (var li = 0; li < lst.length; li++) {
                    if (lst[li].isFile) files.push(String(lst[li].filepath))
                }
            }
        }

        return files
    },
    __collectS3Files: function(options) {
        if (isUnDef(options.s3)) return []

        var cfg = options.s3
        if (isMap(cfg)) {
            _$(cfg.bucket, "options.s3.bucket").isString().$_()
            cfg.prefix = _$(cfg.prefix, "options.s3.prefix").isString().default("")

            if (isUnDef(cfg.client)) {
                loadLib("s3.js")
                cfg.client = new S3(cfg.url, cfg.accessKey, cfg.secret, cfg.region, cfg.useVersion1, cfg.ignoreCertCheck)
                cfg.__ownedClient = true
            }
        }

        _$(cfg.client, "options.s3.client").$_("Please provide options.s3.client or S3 configuration parameters.")

        var files = []
        try {
            var lst = cfg.client.listObjects(cfg.bucket, cfg.prefix, false, true)
            for (var i = 0; i < lst.length; i++) {
                if (lst[i].isFile) {
                    files.push({
                        id: "s3://" + cfg.bucket + "/" + String(lst[i].filename).replace(/^\/+/, ""),
                        bucket: cfg.bucket,
                        object: lst[i].filename
                    })
                }
            }
        } finally {
            if (cfg.__ownedClient) cfg.client.close()
        }

        return files
    },
    __withWriter: function(options, fn) {
        var analyzer = new Packages.org.apache.lucene.analysis.standard.StandardAnalyzer()
        var dir = Packages.org.apache.lucene.store.FSDirectory.open(java.nio.file.Paths.get(options.indexPath))
        var config = new Packages.org.apache.lucene.index.IndexWriterConfig(analyzer)
        if (options.reset) {
            config.setOpenMode(Packages.org.apache.lucene.index.IndexWriterConfig.OpenMode.CREATE)
        } else {
            config.setOpenMode(Packages.org.apache.lucene.index.IndexWriterConfig.OpenMode.CREATE_OR_APPEND)
        }

        var writer = new Packages.org.apache.lucene.index.IndexWriter(dir, config)
        try {
            fn.call(this, writer)
            writer.commit()
        } finally {
            writer.close()
            dir.close()
        }
    },
    /**
     * <odoc>
     * <key>searchDB.addFile(options)</key>
     * Indexes a file line by line. Each line is indexed as a separate document with fields: `path` (file path), `line` (line number) and `content` (line text).\
     * \
     * `options` is an object that can have the following properties:\
     * - `indexPath` (string, default `"./lucene/search"`): path to the Lucene index directory.\
     * - `file` (string, required): path to the file to be indexed.\
     * - `encoding` (string, default `"UTF-8"`): file encoding.\
     * - `reset` (boolean, default `false`): if true, the existing index will be cleared before indexing the file.\
     * \
     * Example:\
     * \
     * searchDB.addFile({ file: "./logs/app.log", reset: true })
     * </odoc>
     */
    addFile: function(options) {
        options = _$(options, "options").isMap().default({})
        options.indexPath = _$(options.indexPath, "options.indexPath").isString().default("./lucene/search")
        options.file = _$(options.file, "options.file").isString().$_()
        options.encoding = _$(options.encoding, "options.encoding").isString().default("UTF-8")
        options.reset = _$(options.reset, "options.reset").isBoolean().default(false)

        this.__withWriter(options, function(writer) {
            var content = io.readFileString(options.file, options.encoding)
            this.__indexContent(writer, options.file, content)
        })
    },
    /**
     * <odoc>
     * <key>searchDB.removeFile(options)</key>
     * Removes all documents from the index that have the `path` field equal to the specified file path.\
     * \
     * `options` is an object that can have the following properties:\
     * - `indexPath` (string, default `"./lucene/search"`): path to the Lucene index directory.\
     * - `file` (string, required): path to the file whose indexed documents should be removed.\
     * \
     * Example:\
     * \
     * searchDB.removeFile({ file: "./logs/app.log" })
     * </odoc>
     */
    removeFile: function(options) {
        options = _$(options, "options").isMap().default({})
        options.indexPath = _$(options.indexPath, "options.indexPath").isString().default("./lucene/search")
        options.file = _$(options.file, "options.file").isString().$_()

        var analyzer = new Packages.org.apache.lucene.analysis.standard.StandardAnalyzer()
        var dir = Packages.org.apache.lucene.store.FSDirectory.open(java.nio.file.Paths.get(options.indexPath))
        var config = new Packages.org.apache.lucene.index.IndexWriterConfig(analyzer)
        config.setOpenMode(Packages.org.apache.lucene.index.IndexWriterConfig.OpenMode.CREATE_OR_APPEND)

        var writer = new Packages.org.apache.lucene.index.IndexWriter(dir, config)
        try {
            var term = new Packages.org.apache.lucene.index.Term("path", String(options.file))
            var terms = java.lang.reflect.Array.newInstance(Packages.org.apache.lucene.index.Term, 1)
            terms[0] = term
            writer.deleteDocuments(terms)
            writer.commit()
        } finally {
            writer.close()
            dir.close()
        }
    },
    /**
     * <odoc>
     * <key>searchDB.indexFiles(options)</key>
     * Indexes multiple files line by line. Each line is indexed as a separate document with fields: `path` (file path), `line` (line number) and `content` (line text).\
     * \
     * `options` is an object that can have the following properties:\
     *   - `indexPath` (string, default `"./lucene/search"`): path to the Lucene index directory.\
     *   - `files` (array of strings, optional): list of file paths to be indexed.\
     *   - `path` (string, optional): if specified, all files in this directory will be indexed. If `recursive` is true, files in subdirectories will also be indexed.\
     *   - `recursive` (boolean, default `false`): if true, files in subdirectories of `path` will also be indexed.\
     *   - `s3` (object, optional): if specified, files from an S3 bucket will be indexed. The object should have the following properties:\
     *   - `client` (S3 client instance, optional): if not provided, a new S3 client will be created using the other configuration parameters.\
     *   - `url` (string, required if `client` is not provided): S3 service URL.\
     *   - `accessKey` (string, required if `client` is not provided): S3 access key.\
     *   - `secret` (string, required if `client` is not provided): S3 secret key.\
     *   - `region` (string, optional): S3 region.\
     *   `useVersion1` (boolean, default `false`): if true, S3 client will use version 1 of the API.\
     *   `ignoreCertCheck` (boolean, default `false`): if true, SSL certificate checks will be ignored when connecting to S3.
     *   - `encoding` (string, default `"UTF-8"`): file encoding.\
     *   - `reset` (boolean, default `false`): if true, the existing index will be cleared before indexing the files.\
     * \
     * Example:\
     * \
     * searchDB.indexFiles({ path: "./logs", recursive: true, reset: true })
     * </odoc>
     */
    indexFiles: function(options) {
        options = _$(options, "options").isMap().default({})
        options.indexPath = _$(options.indexPath, "options.indexPath").isString().default("./lucene/search")
        options.files = _$(options.files, "options.files").isArray().default([])
        options.path = _$(options.path, "options.path").isString().default(__)
        options.recursive = _$(options.recursive, "options.recursive").isBoolean().default(false)
        options.s3 = _$(options.s3, "options.s3").isMap().default(__)
        options.encoding = _$(options.encoding, "options.encoding").isString().default("UTF-8")
        options.reset = _$(options.reset, "options.reset").isBoolean().default(true)

        var localFiles = this.__collectLocalFiles(options)
        var s3Files = this.__collectS3Files(options)

        this.__withWriter(options, function(writer) {
            for (var fi = 0; fi < localFiles.length; fi++) {
                var filePath = localFiles[fi]
                if (isUnDef(filePath)) continue
                var content = io.readFileString(filePath, options.encoding)
                this.__indexContent(writer, filePath, content)
            }

            if (isDef(options.s3) && s3Files.length > 0) {
                var cfg = options.s3
                var client = cfg.client
                var ownClient = false
                if (isUnDef(client)) {
                    loadLib("s3.js")
                    client = new S3(cfg.url, cfg.accessKey, cfg.secret, cfg.region, cfg.useVersion1, cfg.ignoreCertCheck)
                    ownClient = true
                }

                try {
                    for (var si = 0; si < s3Files.length; si++) {
                        var sf = s3Files[si]
                        var stream = client.getObjectStream(sf.bucket, sf.object)
                        var txt = af.fromInputStream2String(stream, options.encoding)
                        this.__indexContent(writer, sf.id, txt)
                    }
                } finally {
                    if (ownClient) client.close()
                }
            }
        })
    },
    /**
     * <odoc>
     * <key>searchDB.search(options)</key>
     * Searches the indexed documents for lines matching the specified query.\
     * \
     * `options` is an object that can have the following properties:\
     * - `indexPath` (string, default `"./lucene/search"`): path to the Lucene index directory.\
     * - `query` (string, required): Lucene query string to search for in the `content` field of the indexed documents.\
     * - `limit` (number, default `20`): maximum number of search results to return.\
     * \
     * The method returns an array of search results, where each result is an object with the following properties:\
     * - `file`: the value of the `path` field of the indexed document (i.e., the file path).\
     * - `line`: the value of the `line` field of the indexed document (i.e., the line number).\
     * - `text`: the value of the `content` field of the indexed document (i.e., the line text).\
     * - `score`: the relevance score of the search result.\
     * \
     * Example:\
     * \
     * var results = searchDB.search({ query: "error", limit: 10 })\
     * results.forEach(function(r) {\
     *   console.log(r.file + ":" + r.line + " - " + r.text)\
     * })
     * </odoc>
     */
    search: function(options) {
        options = _$(options, "options").isMap().default({})
        options.indexPath = _$(options.indexPath, "options.indexPath").isString().default("./lucene/search")
        options.query = _$(options.query, "options.query").isString().$_()
        options.limit = _$(options.limit, "options.limit").isNumber().default(20)

        var analyzer = new Packages.org.apache.lucene.analysis.standard.StandardAnalyzer()
        var dir = Packages.org.apache.lucene.store.FSDirectory.open(java.nio.file.Paths.get(options.indexPath))
        var reader = Packages.org.apache.lucene.index.DirectoryReader.open(dir)
        var searcher = new Packages.org.apache.lucene.search.IndexSearcher(reader)
        var parser = new Packages.org.apache.lucene.queryparser.classic.QueryParser("content", analyzer)
        var query = parser.parse(options.query)

        var results = []
        try {
            var hits = searcher.search(query, options.limit)
            var scoreDocs = hits.scoreDocs
            for (var i = 0; i < scoreDocs.length; i++) {
                var scoreDoc = scoreDocs[i]
                var doc = this.__docFrom(searcher, scoreDoc.doc)
                if (isUnDef(doc)) continue
                results.push({
                    file: doc.get("path"),
                    line: Number(doc.get("line")),
                    text: doc.get("content"),
                    score: scoreDoc.score
                })
            }
        } finally {
            reader.close()
            dir.close()
        }

        return results
    }
}
