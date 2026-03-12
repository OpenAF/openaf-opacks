;(function() {
    loadLib("falkordb.js")

    exports.oafplib = function(params, _$o, $o, oafp) {
        var _newFdb = () => {
            var port = isDef(params.infalkordbport) ? Number(params.infalkordbport) : (isDef(params.falkordbport) ? Number(params.falkordbport) : 6379)
            return new FalkorDB(
                _$(params.infalkordbhost).isString().default(_$(params.falkordbhost).isString().default("127.0.0.1")),
                _$(port).isNumber().default(6379),
                _$(params.infalkordbgraph).isString().default(_$(params.falkordbgraph).isString().default("graph")),
                _$(params.infalkordbuser).isString().default(_$(params.falkordbuser).isString().default(__)),
                _$(params.infalkordbpass).isString().default(_$(params.falkordbpass).isString().default(__))
            )
        }

        var _r = {
            input         : [ {
                type: "falkordb",
                fn  : (r, options) => {
                    oafp._showTmpMsg()

                    var query = r
                    var queryParams = __
                    var readOnly = toBoolean(params.infalkordbreadonly)

                    if (isString(query)) {
                        query = String(query)
                        var tquery = query.trim()
                        if ((tquery.startsWith("(") && tquery.endsWith(")")) || (tquery.startsWith("{") && tquery.endsWith("}"))) {
                            query = oafp._fromJSSLON(query, true)
                        }
                    }

                    if (isMap(query)) {
                        queryParams = _$(query.params).isMap().default(__)
                        readOnly = isDef(query.readOnly) ? toBoolean(query.readOnly) : readOnly
                        query = _$(query.gql, "gql").isString().default(query.query)
                    }

                    _$(query, "falkordb query").isString().$_()

                    if (isString(params.infalkordbparams) || isMap(params.infalkordbparams)) {
                        queryParams = oafp._fromJSSLON(params.infalkordbparams, true)
                    }

                    var fdb = _newFdb()
                    try {
                        _$o(readOnly ? fdb.readOnlyQuery(query, queryParams) : fdb.query(query, queryParams), options)
                    } finally {
                        fdb.close()
                    }
                }
            }, {
                type: "falkordbexport",
                fn  : (r, options) => {
                    oafp._showTmpMsg()

                    var fdb = _newFdb()
                    var out = []
                    var label = _$(params.infalkordblabel).isString().default("type")
                    var keyFields = _$(params.infalkordbkeyfields).isString().default(__)
                    if (isDef(keyFields)) keyFields = String(keyFields).split(",").map(v => String(v).trim()).filter(v => v.length > 0)

                    try {
                        fdb.exportChStream(label, batch => {
                            out = out.concat(batch)
                        }, {
                            batchSize: isDef(params.infalkordbbatchsize) ? Number(params.infalkordbbatchsize) : __,
                            typeField: _$(params.infalkordbtypefield).isString().default("_TYPE"),
                            edgesField: _$(params.infalkordbedgesfield).isString().default("_EDGES"),
                            withEdges: isDef(params.infalkordbwithedges) ? toBoolean(params.infalkordbwithedges) : true,
                            keyFields: _$(keyFields).isArray().default([])
                        })
                        _$o(out, options)
                    } finally {
                        fdb.close()
                    }
                }
            } ],
            output        : [ {
                type: "falkordb",
                fn  : (r, options) => {
                    oafp._showTmpMsg()

                    var fdb = _newFdb()
                    var label = _$(params.falkordblabel).isString().default(_$(params.infalkordblabel).isString().default("type"))
                    var data = isString(r) ? oafp._fromJSSLON(r, true) : r
                    var idx = 0

                    try {
                        fdb.importChStream(label, () => {
                            if (idx > 0) return __
                            idx++
                            return data
                        }, {
                            typeField: _$(params.falkordbtypefield).isString().default("_TYPE"),
                            edgesField: _$(params.falkordbedgesfield).isString().default("_EDGES"),
                            timestamps: toBoolean(params.falkordbtimestamps)
                        })
                    } finally {
                        fdb.close()
                    }
                }
            } ],
            transform     : [ ],
            help          :
`# FalkorDB oafp lib

## ⬇️ FalkorDB input types:

Extra input types added by the FalkorDB lib:

| Input type | Description |
|------------|-------------|
| falkordb   | Executes a FalkorDB GQL/Cypher query |
| falkordbexport | Exports graph nodes as \`[{ key, value }]\` records |

---

### 🧾 FalkorDB input options

Use with _in=falkordb_ or _in=falkordbexport_:

| Option | Type | Description |
|--------|------|-------------|
| infalkordbhost | String | FalkorDB server host. Defaults to 127.0.0.1 |
| infalkordbport | Number | FalkorDB server port. Defaults to 6379 |
| infalkordbgraph | String | Graph name to use. Defaults to graph |
| infalkordbuser | String | FalkorDB username (optional) |
| infalkordbpass | String | FalkorDB password (optional) |
| infalkordbparams | Map/String | Query parameters as a map or JSON/SLON string (optional; query mode) |
| infalkordbreadonly | Boolean | If true uses readOnlyQuery instead of query (query mode) |
| infalkordblabel | String | Channel label field name (export mode). Defaults to type |
| infalkordbkeyfields | String | Comma separated key field names for export keys |
| infalkordbbatchsize | Number | Export batch size passed to exportChStream |
| infalkordbtypefield | String | Field name used for node type/label. Defaults to _TYPE |
| infalkordbedgesfield | String | Field name used for edges. Defaults to _EDGES |
| infalkordbwithedges | Boolean | If false exports without edges |

When _in=falkordb_, the input data should be either:

* A query string
* A map like \`{ gql: "...", params: { ... }, readOnly: true }\`

When _in=falkordbexport_, input data is ignored and the output will be an array of records in this format:

\`[{ key: { _TYPE: ..., ... }, value: { ..., _EDGES: [...] } }]\`

---

## ⬆️ FalkorDB output formats

Extra output formats added by the FalkorDB lib:

| Output format | Description |
|---------------|-------------|
| falkordb      | Imports \`[{ key, value }]\` records into FalkorDB |

### 🧾 FalkorDB output options

Use with _out=falkordb_:

| Option | Type | Description |
|--------|------|-------------|
| falkordbhost | String | FalkorDB server host. Defaults to 127.0.0.1 |
| falkordbport | Number | FalkorDB server port. Defaults to 6379 |
| falkordbgraph | String | Graph name to use. Defaults to graph |
| falkordbuser | String | FalkorDB username (optional) |
| falkordbpass | String | FalkorDB password (optional) |
| falkordblabel | String | Channel label field name used during import |
| falkordbtypefield | String | Field name used for node type/label. Defaults to _TYPE |
| falkordbedgesfield | String | Field name used for edges. Defaults to _EDGES |
| falkordbtimestamps | Boolean | If true stores createdAt/updatedAt on imported nodes |

Examples:

\`\`\`bash
echo "MATCH (n) RETURN n LIMIT 5" | oafp libs=falkordb in=falkordb infalkordbgraph=demo
oafp libs=falkordb in=falkordbexport infalkordbgraph=demo infalkordblabel=type | oafp out=ndjson
cat export.ndjson | oafp in=ndjson out=falkordb libs=falkordb falkordbgraph=demo2 falkordblabel=type
\`\`\`
`
        }

        return _r
    }
})()
