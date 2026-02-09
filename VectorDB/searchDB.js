// VectorDB SearchDB helper using Apache Lucene
//
// Author: Nuno Aguiar

ow.loadObj()

// Load external jars
var __path = getOPackPath("VectorDB") || "."
loadExternalJars(__path)

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
  indexFiles: function(options) {
    options = _$(options, "options").isMap().default({})
    options.indexPath = _$(options.indexPath, "options.indexPath").isString().default("./vectordb/search")
    options.files = _$(options.files, "options.files").isArray().default([])
    options.encoding = _$(options.encoding, "options.encoding").isString().default("UTF-8")
    options.reset = _$(options.reset, "options.reset").isBoolean().default(true)

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
      for (var fi = 0; fi < options.files.length; fi++) {
        var filePath = options.files[fi]
        if (isUnDef(filePath)) continue
        var content = io.readFileString(filePath, options.encoding)
        var lines = String(content).split(/\r?\n/)
        for (var li = 0; li < lines.length; li++) {
          var lineText = lines[li]
          var doc = new Packages.org.apache.lucene.document.Document()
          doc.add(new Packages.org.apache.lucene.document.StringField("path", String(filePath), Packages.org.apache.lucene.document.Field.Store.YES))
          doc.add(new Packages.org.apache.lucene.document.StoredField("line", java.lang.Integer.valueOf(li + 1)))
          doc.add(new Packages.org.apache.lucene.document.TextField("content", String(lineText), Packages.org.apache.lucene.document.Field.Store.YES))
          writer.addDocument(doc)
        }
      }
      writer.commit()
    } finally {
      writer.close()
      dir.close()
    }
  },
  search: function(options) {
    options = _$(options, "options").isMap().default({})
    options.indexPath = _$(options.indexPath, "options.indexPath").isString().default("./vectordb/search")
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
