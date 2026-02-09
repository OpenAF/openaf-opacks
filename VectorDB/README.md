# VectorDB OpenAF OPack

This oPack provides an OpenAF channel implementation backed by Apache Lucene's
approximate nearest neighbour (ANN) support using Hierarchical Navigable Small
World (HNSW) graphs. It enables storing dense vector embeddings with optional
payload metadata and performing fast similarity searches directly from OpenAF.

## Installation

Install the oPack via the OpenAF package manager:

```bash
opack install VectorDB
```

## Usage

```javascript
// Example usage of VectorDB opack
load("vectordb.js")

// Create or open a collection
var ch = $ch("embeddings").create("vectordb", {
    path: "./data/embeddings",
    dimension: 384,
    similarity: "cosine"
})

// Use an embedding model
// OAF_MODEL="(type: ollama, model: 'embeddinggemma:latest', url: 'http://ollama.local:11434', timeout: 900000)"
var embedText = function(text) {
    var llm
    try {
        var llm = $llm(af.fromJSSLON(getEnv("OAF_MODEL")))  // e.g. "openai/text-embedding-3-small"
        var _r = llm.getEmbeddings(text, 384)

        if (isDef(_r) && isDef(_r.data) && isDef(_r.data[0].embedding)) return _r.data[0].embedding
        if (isDef(_r) && isDef(_r.embeddings)) return _r.embeddings[0]
        return _r
    } finally {
        if (isDef(llm)) llm.close()
    }
}

// Insert vectors
log(`Inserting vector...`)
$ch("embeddings").set({ id: "doc-1" }, {
    vector: embedText("The quick brown fox"),
    payload: { title: "Document 1", tags: ["fox", "quick"] }
})

// Query vectors
log(`Querying vector...`)
// k-NN search (top 5 nearest neighbours to the query vector)
var results = $ch("embeddings").getAll({ vector: embedText("fox jumps"), k: 5 })
cprint(results)
```

## Text search with searchDB.js

The `searchDB.js` helper wraps Apache Lucene to index text files on disk and
search for matching lines later. It is independent of `vectordb.js` and stores
the index at the configured filesystem path.

```javascript
load("searchDB.js")

// Index a set of text files (one document per line)
searchDB.indexFiles({
  indexPath: "./data/text-index",
  files: [
    "./docs/guide.txt",
    "./docs/notes.txt"
  ],
  reset: true
})

// Search and list which files/lines matched
var matches = searchDB.search({
  indexPath: "./data/text-index",
  query: "vector search",
  limit: 25
})

cprint(matches)
```

### searchDB.js API

- `indexFiles({ indexPath, files, encoding, reset })`
  - `indexPath` *(String)*: Directory where the Lucene index will be stored.
  - `files` *(Array)*: List of text file paths to index.
  - `encoding` *(String, optional)*: File encoding (default `UTF-8`).
  - `reset` *(Boolean, optional)*: Recreate the index before indexing (default `true`).
- `search({ indexPath, query, limit })`
  - `indexPath` *(String)*: Directory where the Lucene index resides.
  - `query` *(String)*: Lucene query string to run against indexed lines.
  - `limit` *(Number, optional)*: Maximum hits to return (default `20`).

### Channel options

- `path` *(String, optional)*: Filesystem path for the Lucene index. Defaults
  to `./vectordb/<channel name>`.
- `dimension` *(Number, required)*: Vector dimensionality for all entries.
- `idField` *(String, optional)*: Name of the primary key field (default `id`).
- `vectorField` *(String, optional)*: Lucene vector field name (default
  `vector`).
- `vectorStoreField` *(String, optional)*: Stored field name for persisting the
  vector as JSON (default `<vectorField>_stored`).
- `payloadField` *(String, optional)*: Stored field name for the payload map
  (default `payload`).
- `metaPrefix` *(String, optional)*: Prefix for indexed metadata fields used to
  enable basic filtering (default `meta_`).
- `autoCommit` *(Boolean, optional)*: Commit after each mutation (default
  `true`).
- `autoRefresh` *(Boolean, optional)*: Refresh the searcher after each mutation
  (default `true`).
- `similarity` *(String, optional)*: Similarity metric (`cosine`, `dot`, or
  `euclidean`). Defaults to `cosine`.

### Value structure

Values provided to `set` and `setAll` must include a `vector` array of floats.
Additional properties are treated as payload metadata (or you can explicitly
pass a `payload` object). Payload values are stored as JSON and basic string,
number, or boolean metadata fields are indexed using the `metaPrefix` to allow
simple exact filtering from OpenAF.

### Search API

The channel exposes a `getAll({ vector, k, filterFn })` method that performs a k-NN
lookup using Lucene's `KnnFloatVectorQuery`:

- `vector` *(Array)*: Query vector with the configured dimensionality.
- `k` *(Number, optional)*: Maximum number of nearest neighbours to return
  (default `10`).
- `filterFn` *(Function, optional)*: Predicate invoked for each result; return
  `true` to keep the entry.

Each result contains the document id, payload, stored vector, and the Lucene
similarity `score`.

## Dependencies

This OPack bundles Apache Lucene jars for core and common analyzers to
power the HNSW vector index.
