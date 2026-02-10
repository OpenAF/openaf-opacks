# lucene OpenAF OPack

This OPack provides Apache Lucene-backed OpenAF channels for:

- vector similarity search (`vectordb`, HNSW / k-NN)
- full-text search (`searchdb`)
- file/line indexing helper (`searchDB`, implemented in `lucene.js`)

## Installation

```bash
opack install lucene
```

## Vector Search (`vectordb`)

```javascript
loadLib("lucene.js")

$ch("embeddings").create("vectordb", {
  path: "./data/embeddings",   // required
  dimension: 384,
  similarity: "cosine"
})

var embedText = function(text) {
  var llm
  try {
    // Example: OAF_MODEL="(type: ollama, model: 'embeddinggemma:latest', url: 'http://ollama.local:11434', timeout: 900000)"
    llm = $llm(af.fromJSSLON(getEnv("OAF_MODEL")))
    var r = llm.getEmbeddings(text, 384)
    if (isDef(r) && isDef(r.data) && isDef(r.data[0].embedding)) return r.data[0].embedding
    if (isDef(r) && isDef(r.embeddings)) return r.embeddings[0]
    return r
  } finally {
    if (isDef(llm)) llm.close()
  }
}

$ch("embeddings").set({ id: "doc-1" }, {
  vector: embedText("The quick brown fox"),
  payload: { title: "Document 1", tags: ["fox", "quick"] }
})

var results = $ch("embeddings").getAll({
  vector: embedText("fox jumps"),
  k: 5
})
cprint(results)
```

### `vectordb` options

- `path` *(String, required)*: Filesystem location for the Lucene index.
- `dimension` *(Number, optional; default `384`)*: Vector dimensionality.
- `idField` *(String, optional; default `id`)*: Primary key field name.
- `vectorField` *(String, optional; default `vector`)*: Lucene vector field name.
- `vectorStoreField` *(String, optional; default `<vectorField>_stored`)*: Stored JSON vector field.
- `payloadField` *(String, optional; default `payload`)*: Stored payload JSON field.
- `metaPrefix` *(String, optional; default `meta_`)*: Prefix for indexed primitive payload fields.
- `autoCommit` *(Boolean, optional; default `true`)*: Commit on writes.
- `autoRefresh` *(Boolean, optional; default `true`)*: Refresh searcher on writes.
- `similarity` *(String, optional; default `cosine`)*: `cosine`, `dot` (`dot_product`) or `euclidean` (`l2`).

### `vectordb` value format

Values for `set` / `setAll` must include `vector` with the configured `dimension`.
All extra fields (except `vector`) become payload metadata unless `payload` is explicitly provided.

### `vectordb` query format

`getAll({ vector, k, filterFn })` performs k-NN search:

- `vector` *(Array, required)*: Query vector.
- `k` *(Number, optional; default `10`)*: Maximum results.
- `filterFn` *(Function, optional)*: Post-filter predicate.

Each result includes id, payload, stored vector, and `score`.

## Text Search Channel (`searchdb`)

```javascript
loadLib("lucene.js")

$ch("docs").create("searchdb", {
  path: "./data/docs-index",
  idField: "id",
  contentField: "content"
})

$ch("docs").set({ id: "doc-1" }, {
  content: "Apache Lucene provides full-text indexing.",
  payload: { source: "guide.md" }
})

$ch("docs").set({ id: "doc-2" }, "Vector search and keyword search can coexist.")

var hits = $ch("docs").getAll({ query: "lucene OR keyword", limit: 10 })
cprint(hits)
```

### `searchdb` options

- `path` *(String, optional; default `./lucene/<channelName>`)*: Filesystem index path.
- `idField` *(String, optional; default `id`)*: Primary key field name.
- `contentField` *(String, optional; default `content`)*: Indexed text field name.
- `payloadField` *(String, optional; default `payload`)*: Stored payload JSON field.
- `schema` *(Map, optional)*: Typed fields map (`keyword|string|text|int|long|float|double|date`).
- `facetFields` *(Array, optional)*: Fields to facet on (taxonomy index is created automatically).
- `taxonomyPath` *(String, optional; default `<path>/_taxonomy`)*: Facet taxonomy storage path.
- `defaultSortField` *(String, optional)*: Default sort field.
- `analyzer` *(String|Map, optional; default `standard`)*: Analyzer preset (`standard`, `keyword`, `whitespace`, `english`).
- `autoCommit` *(Boolean, optional; default `true`)*: Commit on writes.
- `autoRefresh` *(Boolean, optional; default `true`)*: Refresh searcher on writes.

### `searchdb` advanced write format

```javascript
$ch("docs").set({ id: "doc-1" }, {
  content: "Lucene faceting and ranking",
  payload: { source: "guide", category: "docs", status: "published" },
  fields: { year: 2025, views: 1200, status: "published" },
  facets: { category: "docs", status: "published" }
})
```

### `searchdb` advanced query format

For advanced calls (`facets`, `sort`, `searchAfter`, `moreLikeThis`, `explain`, `hybrid` or `returnMeta: true`), results come as an array where the first entry is `{ _meta: ... }` and the remaining entries are hits.

```javascript
var res = $ch("docs").getAll({
  query: {
    must:   [{ field: "content", q: "lucene" }],
    filter: [{ term: { field: "status", value: "published" } }],
    range:  [{ field: "year", gte: 2024, lte: 2026, type: "long" }]
  },
  sort: [{ field: "year", dir: "desc", type: "long" }],
  offset: 0,
  limit: 10,
  explain: true,
  returnMeta: true
})
var meta = res[0]._meta
var hits = res.slice(1)
cprint(meta)
cprint(hits)
```

### `searchdb` facets

```javascript
var faceted = $ch("docs").getAll({
  query: "lucene",
  facets: {
    fields: ["category", "status"],
    topN: 10,
    drillDown: { category: ["docs"] }
  },
  limit: 10
})
cprint(faceted[0]._meta.facetCounts)
```

### `searchdb` more-like-this

```javascript
var similar = $ch("docs").getAll({
  moreLikeThis: {
    text: "query parser and faceting",
    minTermFreq: 1,
    minDocFreq: 1,
    maxQueryTerms: 25
  },
  limit: 5,
  returnMeta: true
})
cprint(similar.slice(1))
```

### `searchdb` hybrid retrieval

```javascript
var hybrid = $ch("docs").getAll({
  hybrid: {
    textQuery: "vector database tuning",
    vectorChannel: "embeddings",
    vector: embedText("vector database tuning"),
    kText: 50,
    kVector: 50,
    weights: { text: 0.4, vector: 0.6 }
  },
  limit: 20
})
cprint(hybrid.slice(1))
```

## `searchDB` Helper

`searchDB` is a simple helper for indexing text files (line by line) and searching with Lucene queries.

```javascript
loadLib("lucene.js")

searchDB.indexFiles({
  indexPath: "./data/text-index",
  files: ["./docs/guide.txt", "./docs/notes.txt"],
  reset: true
})

var matches = searchDB.search({
  indexPath: "./data/text-index",
  query: "vector search",
  limit: 25
})
cprint(matches)
```

### `searchDB` API

- `indexFiles({ indexPath, files, encoding, reset })`
- `search({ indexPath, query, limit })`

Defaults:

- `indexPath`: `./lucene/search`
- `encoding`: `UTF-8`
- `reset`: `true`
- `limit`: `20`

Search results include `file`, `line`, `text`, and `score`.

## Testing

Run the local oJob test suite:

```bash
ojob tests/autoTestLucene.yaml
```

It covers:

- `vectordb` create/set/get/search/filter/unset flow
- `searchdb` create/set/get/query/getKeys flow
- `searchDB` file indexing and query flow

## Bundled dependencies

This OPack bundles Lucene 10.3.2 jars:

- `lucene-core`
- `lucene-analysis-common`
- `lucene-queryparser`
- `lucene-queries`
- `lucene-facet`
- `lucene-sandbox`
