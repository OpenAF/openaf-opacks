# ElasticSearch

OpenAF oPack that provides a small wrapper around the ElasticSearch/OpenSearch REST API, plus helpers for:

- index and template management
- search, scroll and reindex operations
- cluster, node and shard inspection
- bulk NDJSON import/export
- forwarding OpenAF logs into ElasticSearch
- AWS IAM SigV4 authentication for Amazon OpenSearch

## Install

```bash
opack install ElasticSearch
```

To use AWS IAM authentication you also need the `AWS` oPack installed:

```bash
opack install AWS
```

## Load The Opack

```javascript
load("elasticsearch.js");
```

## Create A Client

Basic authentication:

```javascript
load("elasticsearch.js");

var es = new ElasticSearch(
  "http://127.0.0.1:9200",
  "elastic",
  "elasticpass"
);
```

Without authentication:

```javascript
load("elasticsearch.js");

var es = new ElasticSearch("http://127.0.0.1:9200");
```

With AWS IAM authentication:

```javascript
load("elasticsearch.js");

var es = new ElasticSearch("https://search-example.eu-west-1.es.amazonaws.com", __, __, {
  aws: {
    region: "eu-west-1",
    service: "es"
  }
});
```

For Amazon OpenSearch Serverless use `service: "aoss"`.

## Common Usage

Create an index:

```javascript
es.createIndex("logs-2026.03.11", 1, 1);
```

Search documents:

```javascript
var res = es.search("logs-*", {
  size: 5,
  query: {
    match: {
      level: "ERROR"
    }
  },
  sort: [
    { "@timestamp": "desc" }
  ]
});

sprint(res.hits.hits);
```

Inspect cluster health and indices:

```javascript
sprint(es.getClusterHealth(true));
sprint(es.getIndices(true));
sprint(es.getNodes(true));
```

Manage templates:

```javascript
es.setTemplatePriRep("logs-template", ["logs-*"], 1, 1);
sprint(es.listTemplates());
```

Work with aliases:

```javascript
es.alias()
  .add("logs-current", "logs-2026.03.11")
  .exec();
```

Reindex:

```javascript
es.reIndex("logs-old", "logs-new", "60m", {
  conflicts: "proceed"
});
```

Scroll through large result sets:

```javascript
var scroll = es.createScroll("logs-*", {
  query: { match_all: {} }
}, 100, "1m");

while (scroll.hits.hits.length > 0) {
  scroll.hits.hits.forEach(r => sprint(r._source));
  scroll = es.nextScroll(scroll, "1m");
}

try { es.deleteScroll(scroll); } catch(e) {}
```

## Bulk Import And Export

Import NDJSON into a fixed index:

```javascript
es.importFile2Index("logs-import", "/path/to/logs.ndjson", {
  noType: true
});
```

Import NDJSON.gz and compute a target index dynamically:

```javascript
es.importFileGzip2Index((doc) => {
  return "logs-" + doc.date.substr(0, 10);
}, "/path/to/logs.ndjson.gz", {
  noType: true,
  transformFn: (doc) => {
    doc.ingestedAt = new Date().toISOString();
    return doc;
  }
});
```

Export an index to NDJSON:

```javascript
es.exportIndex2File("logs-*", "/tmp/logs.ndjson", {
  batchSize: 500,
  numThreads: 4
});
```

Export to compressed NDJSON:

```javascript
es.exportIndex2FileGzip("logs-*", "/tmp/logs.ndjson.gz");
```

## OpenAF Channel Integration

Create an OpenAF channel backed by an index:

```javascript
var ch = es.createCh("logs-app", "id", "esLogs");

$ch("esLogs").set({ id: "1" }, {
  id: "1",
  message: "hello",
  level: "INFO"
});
```

## Forward OpenAF Logs

From JavaScript:

```javascript
es.startLog("openaf-logs", "my-host");

log("hello from OpenAF");
logErr("something failed");

es.stopLog();
```

From OJob using the packaged jobs in `ElasticSearch.yaml`:

```yaml
jobs:
- from: ElasticSearch.yaml

todo:
- name: Log to ElasticSearch
  args:
    url   : http://127.0.0.1:9200
    user  : elastic
    pass  : elasticpass
    index : openaf-logs
    hostid: my-host
```

Using an index prefix instead of a fixed index:

```yaml
jobs:
- from: ElasticSearch.yaml

todo:
- name: Log to ElasticSearch
  args:
    url   : http://127.0.0.1:9200
    user  : elastic
    pass  : elasticpass
    prefix: openaf
    hostid: my-host
```

AWS IAM OJob example:

```yaml
jobs:
- from: ElasticSearch.yaml

todo:
- name: Log to ElasticSearch
  args:
    url       : https://search-example.eu-west-1.es.amazonaws.com
    awsRegion : eu-west-1
    awsService: es
    index     : openaf-logs
    hostid    : my-host
```

## Useful Methods

Main methods exposed by `elasticsearch.js`:

- `createIndex`, `deleteIndex`, `openIndex`, `closeIndex`
- `getIndexMapping`, `getIndexSettings`, `getIndices`, `getIndice`
- `listTemplates`, `setTemplate`, `setTemplatePriRep`, `deleteTemplate`
- `search`, `createScroll`, `nextScroll`, `deleteScroll`, `deleteAllScrolls`
- `reIndex`, `forceMerge`
- `getClusterHealth`, `getClusterStats`, `getPendingTasks`, `getSettings`
- `getNodes`, `getNodeStats`, `getNodesStats`, `getShards`, `getAllocation`, `getBreakerStats`
- `getTasks`, `getTask`, `cancelTask`
- `exportIndex`, `exportIndex2File`, `exportIndex2FileGzip`
- `importFile2Index`, `importFileGzip2Index`, `importStream2Index`
- `createCh`, `startLog`, `stopLog`

## Notes

- Base URLs should be provided without the index name.
- If the URL ends with `/` it is normalized automatically.
- For AWS IAM authentication the `AWS` oPack must expose `restPreActionOpenSearch`.
- `import*2Index` expects NDJSON input.
- For recent ElasticSearch versions that do not support `_type`, use `noType: true` on import operations.
