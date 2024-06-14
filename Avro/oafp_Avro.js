;(function() {
    exports.oafplib = function(params, _$o, $o, oafp) {
        var _r = {
            fileExtensions: [ { ext: ".avro", type: "avro" } ],
            input         : [ { 
                type: "avro", 
                fn: (r, options) => {
                    oafp._showTmpMsg()
                    loadLib("avro.js")
                    var avro = new Avro()
                    if (isDef(params.file) || isDef(params.cmd)) {
                        if (isDef(params.file)) {
                            avro.loadFile(params.file)
                        } else {
                            avro.loadStream(_runCmd2Stream(params.cmd))
                        }
                        var _r
                        if (toBoolean(params.inavrostats)) {
                            _r = avro.getStats()
                        } else if (toBoolean(params.inavrometa)) {
                            _r = avro.getMeta()
                        } else if (toBoolean(params.inavroschema)) {
                            _r = avro.getSchema()
                        } else {
                            _r = avro.toArray()
                        }
                        avro.close() 
            
                        _$o(_r, options)
                    } else {
                        _exit(-1, "Avro is only support with 'file' or 'cmd' defined. Please provide a file=... or a cmd=...")
                    }
                }
            } ]/*,
            output        : [ { 
                type: "test", 
                fn: (r, options) => {
                    $o({ test: 'test output' }, options)
                }
            } ],
            transform     : [ { 
                type: "test", 
                fn: (r) => {
                    return { test: 'test transform' }
                }
            } ]*/,
            help          : 
`# Avro oafp lib

## ⬇️  Avro input types:

Extra input types added by the Avro lib:

| Input type | Description |
|------------|-------------|
| avro       | Reads an Avro file (optionally with snappy compression) |

---

### 🧾 Avro input options

List of options to use when _in=avro_:

| Option | Type | Description |
|--------|------|-------------|
| inavrostats | Boolean | Returns the number of records/blocks, avg & total blocks size, codec and file size if available | 
| inavrometa  | Boolean | Returns the Avro metadata as a map |
| inavroschema | Boolean | Returns the Avro schema |

`
        }

        return _r
    }
})()