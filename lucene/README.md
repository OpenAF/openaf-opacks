# Lucene OpenAF OPack

This OPack bundles Apache Lucene core and the common analyzers to expose a
lightweight OpenAF wrapper around Lucene primitives. It also ships a minimal
vector memory server that accepts simple JSON endpoints for adding, searching,
and deleting dense vectors.

## Installation

Install via the OpenAF package manager:

```bash
opack install Lucene
```

## Usage

Load the library and work with a Lucene index directly:

```javascript
load("lucene.js")

var idx = new LuceneIndex({
  path: "./data/lucene-index",
  dimension: 3
})

idx.addVector({
  id: "demo-1",
  text: "hello world",
  vector: [0.1, 0.2, 0.3],
  meta: { source: "sample" }
})

var results = idx.search([0.1, 0.25, 0.3], 5)
cprint(results)

idx.delete("demo-1")
idx.close()
```

## Vector memory server

Start the embedded vector memory server to expose HTTP endpoints similar to the
Java example:

```javascript
load("lucene.js")

var service = startVectorMemoryServer({
  indexPath: "./data/vector-index",
  port: 8123,
  dimension: 3
})
```

Endpoints (all expect JSON via POST):

- `POST /add` – `{ "id": "unique", "text": "...", "vector": [0.1, ...], "meta": { ... } }`
- `POST /search` – `{ "vector": [0.1, 0.2, ...], "k": 5 }` ⇒ `{ "results": [ { "id": "...", "score": 0.9, "text": "...", "meta": { ... } } ] }`
- `POST /delete` – `{ "id": "unique" }`

Stop the server when finished:

```javascript
service.stop()
```

## Files

- `lucene.js` – Lucene wrapper and vector memory server.
- `lucene-core-10.3.0.jar` and `lucene-analysis-common-10.3.0.jar` – bundled
  Lucene dependencies.
