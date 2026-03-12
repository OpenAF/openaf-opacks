;(function() {
    loadLib("falkordb.js")

    exports.oafplib = function(params, _$o, $o, oafp) {
        var _r = {
            input         : [ {
                type: "falkordb",
                fn  : (r, options) => {
                    oafp._showTmpMsg()

                    var query = r
                    var queryParams = __
                    var readOnly = toBoolean(params.infalkordbreadonly)
                    var port = isDef(params.infalkordbport) ? Number(params.infalkordbport) : 6379

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

                    var fdb = new FalkorDB(
                        _$(params.infalkordbhost).isString().default("127.0.0.1"),
                        _$(port).isNumber().default(6379),
                        _$(params.infalkordbgraph).isString().default("graph"),
                        _$(params.infalkordbuser).isString().default(__),
                        _$(params.infalkordbpass).isString().default(__)
                    )

                    try {
                        _$o(readOnly ? fdb.readOnlyQuery(query, queryParams) : fdb.query(query, queryParams), options)
                    } finally {
                        fdb.close()
                    }
                }
            } ],
            output        : [ ],
            transform     : [ ],
            help          :
`# FalkorDB oafp lib

## ⬇️ FalkorDB input types:

Extra input types added by the FalkorDB lib:

| Input type | Description |
|------------|-------------|
| falkordb   | Executes a FalkorDB GQL/Cypher query |

---

### 🧾 FalkorDB input options

Use with _in=falkordb_:

| Option | Type | Description |
|--------|------|-------------|
| infalkordbhost | String | FalkorDB server host. Defaults to 127.0.0.1 |
| infalkordbport | Number | FalkorDB server port. Defaults to 6379 |
| infalkordbgraph | String | Graph name to use. Defaults to graph |
| infalkordbuser | String | FalkorDB username (optional) |
| infalkordbpass | String | FalkorDB password (optional) |
| infalkordbparams | Map/String | Query parameters as a map or JSON/SLON string (optional) |
| infalkordbreadonly | Boolean | If true uses readOnlyQuery instead of query |

The input data should be either:

* A query string
* A map like \`{ gql: "...", params: { ... }, readOnly: true }\`

Examples:

\`\`\`bash
echo "MATCH (n) RETURN n LIMIT 5" | oafp libs=falkordb in=falkordb infalkordbgraph=demo
oafp libs=falkordb in=falkordb data="(gql: 'MATCH (n:Person) WHERE n.age > $age RETURN n.name AS name', params: (age: 30), readOnly: true)" infalkordbgraph=demo
\`\`\`
`
        }

        return _r
    }
})()
