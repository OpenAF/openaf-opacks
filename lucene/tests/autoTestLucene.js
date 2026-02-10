(function() {
  loadLib("lucene.js")

  var basePath = ".tmp-lucene-tests"

  var cleanPath = function(path) {
    try {
      if (io.fileExists(path)) io.rm(path)
    } catch(e) {}
  }

  exports.testVectorDB = function() {
    var chName = "luceneVectordbTest"
    var dbPath = basePath + "/vectordb"

    cleanPath(basePath)
    io.mkdir(basePath)

    $ch(chName).create("vectordb", {
      path: dbPath,
      dimension: 3,
      similarity: "cosine",
      autoCommit: true,
      autoRefresh: true
    })

    try {
      $ch(chName).set({ id: "doc-a" }, {
        vector: [1.0, 0.0, 0.0],
        payload: { tag: "exact" }
      })
      $ch(chName).set({ id: "doc-b" }, {
        vector: [0.0, 1.0, 0.0],
        payload: { tag: "orthogonal" }
      })
      $ch(chName).set({ id: "doc-c" }, {
        vector: [0.9, 0.1, 0.0],
        payload: { tag: "near" }
      })

      ow.test.assert($ch(chName).size(), 3, "vectordb size should be 3 after inserts")

      var docA = $ch(chName).get({ id: "doc-a" })
      ow.test.assert(docA.payload.tag, "exact", "vectordb should return payload for exact key")

      var hits = $ch(chName).getAll({ vector: [1.0, 0.0, 0.0], k: 2 })
      ow.test.assert(hits.length >= 1, true, "vectordb search should return at least one hit")
      ow.test.assert(String(hits[0].id), "doc-a", "vectordb top hit should be doc-a for matching vector")

      var filtered = $ch(chName).getAll({
        vector: [1.0, 0.0, 0.0],
        k: 3,
        filterFn: function(r) { return isDef(r.payload) && r.payload.tag == "near" }
      })
      ow.test.assert(filtered.length, 1, "vectordb filterFn should keep only one result")
      ow.test.assert(String(filtered[0].id), "doc-c", "vectordb filterFn should keep doc-c")

      $ch(chName).unset({ id: "doc-b" })
      ow.test.assert($ch(chName).size(), 2, "vectordb size should be 2 after delete")
    } finally {
      $ch(chName).destroy()
      cleanPath(basePath)
    }
  }

  exports.testSearchDBChannel = function() {
    var chName = "luceneSearchdbTest"
    var dbPath = basePath + "/searchdb"

    cleanPath(basePath)
    io.mkdir(basePath)

    $ch(chName).create("searchdb", {
      path: dbPath,
      idField: "id",
      contentField: "content"
    })

    try {
      $ch(chName).set({ id: "doc-1" }, {
        content: "Apache Lucene is used for full text search.",
        payload: { source: "guide" }
      })
      $ch(chName).set({ id: "doc-2" }, "Vector search can coexist with keyword search.")

      ow.test.assert($ch(chName).size(), 2, "searchdb size should be 2 after inserts")

      var one = $ch(chName).get({ id: "doc-1" })
      ow.test.assert(one.payload.source, "guide", "searchdb should preserve payload metadata")

      var hits = $ch(chName).getAll({ query: "vector OR keyword", limit: 10 })
      ow.test.assert(hits.length >= 1, true, "searchdb should return at least one match")

      var keys = $ch(chName).getKeys()
      ow.test.assert(keys.length, 2, "searchdb keys length should be 2")
    } finally {
      $ch(chName).destroy()
      cleanPath(basePath)
    }
  }

  exports.testSearchDBAdvanced = function() {
    var chName = "luceneSearchdbAdvancedTest"
    var dbPath = basePath + "/searchdb-advanced"

    cleanPath(basePath)
    io.mkdir(basePath)

    $ch(chName).create("searchdb", {
      path: dbPath,
      idField: "id",
      contentField: "content",
      schema: {
        year: "long",
        views: "int",
        status: "keyword"
      },
      facetFields: ["category", "status"]
    })

    try {
      $ch(chName).set({ id: "doc-1" }, {
        content: "Lucene faceting for product search",
        payload: { source: "guide", category: "docs", status: "published" },
        fields: { year: 2024, views: 100, status: "published" },
        facets: { category: "docs", status: "published" }
      })
      $ch(chName).set({ id: "doc-2" }, {
        content: "Vector and keyword retrieval can be fused",
        payload: { source: "blog", category: "blog", status: "draft" },
        fields: { year: 2025, views: 300, status: "draft" },
        facets: { category: "blog", status: "draft" }
      })
      $ch(chName).set({ id: "doc-3" }, {
        content: "Lucene query parser and range filters",
        payload: { source: "guide", category: "docs", status: "published" },
        fields: { year: 2026, views: 450, status: "published" },
        facets: { category: "docs", status: "published" }
      })

      var structured = $ch(chName).getAll({
        query: {
          must: [{ field: "content", q: "lucene" }],
          filter: [{ term: { field: "status", value: "published" } }],
          range: [{ field: "year", gte: 2024, lte: 2026, type: "long" }]
        },
        sort: [{ field: "year", dir: "desc", type: "long" }],
        limit: 10,
        returnMeta: true
      })
      var structuredHits = structured.slice(1)
      ow.test.assert(structuredHits.length >= 1, true, "advanced search should return at least one hit")
      ow.test.assert(structuredHits[0].fields.year >= structuredHits[structuredHits.length - 1].fields.year, true, "advanced search should be sorted by year desc")
      ow.test.assert(isDef(structured[0]._meta), true, "advanced search should include metadata in first row")

      var faceted = $ch(chName).getAll({
        query: "lucene",
        facets: {
          fields: ["category", "status"],
          topN: 10
        },
        limit: 10
      })
      ow.test.assert(isDef(faceted[0]._meta.facetCounts.category), true, "faceted search should provide category facet counts")
      ow.test.assert(isDef(faceted[0]._meta.facetCounts.status), true, "faceted search should provide status facet counts")

      var explained = $ch(chName).getAll({
        query: "lucene",
        explain: true,
        limit: 1,
        returnMeta: true
      })
      ow.test.assert(isDef(explained[1].explanation), true, "explain mode should include explanation")

      var mlt = $ch(chName).getAll({
        moreLikeThis: {
          text: "lucene query and search",
          minTermFreq: 1,
          minDocFreq: 1,
          maxQueryTerms: 10
        },
        limit: 5,
        returnMeta: true
      })
      ow.test.assert(mlt.slice(1).length >= 1, true, "moreLikeThis should return at least one hit")
    } finally {
      $ch(chName).destroy()
      cleanPath(basePath)
    }
  }

  exports.testSearchDBHelper = function() {
    var indexPath = basePath + "/helper-index"
    var docsPath = basePath + "/docs"

    cleanPath(basePath)
    io.mkdir(basePath)
    io.mkdir(docsPath)

    var f1 = docsPath + "/a.txt"
    var f2 = docsPath + "/b.txt"

    io.writeFileString(f1, "hello lucene\nvector search rocks\n")
    io.writeFileString(f2, "keyword lookup\nfull text index\n")

    // `searchDB` is defined by lucene.js.
    ow.test.assert(isDef(searchDB) && isDef(searchDB.indexFiles) && isDef(searchDB.search), true, "searchDB helper API should be available from lucene.js")

    searchDB.indexFiles({
      indexPath: indexPath,
      files: [f1, f2],
      reset: true
    })

    var res1 = searchDB.search({
      indexPath: indexPath,
      query: "vector",
      limit: 10
    })
    ow.test.assert(res1.length >= 1, true, "searchDB helper should find matches for 'vector'")

    var res2 = searchDB.search({
      indexPath: indexPath,
      query: "\"full text\"",
      limit: 10
    })
    ow.test.assert(res2.length >= 1, true, "searchDB helper should support phrase queries")

    cleanPath(basePath)
  }
})()
