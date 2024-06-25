;(function() {
    exports.oafplib = function(params, _$o, $o, oafp) {
        var _r = {
            fileExtensions: [ { ext: ".avro", type: "avro" },
                              { ext: ".avroSnappy", type: "avro" } ],
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
                        oafp._exit(-1, "Avro is only support with 'file' or 'cmd' defined. Please provide a file=... or a cmd=...")
                    }
                }
            } ],
            output        : [ { 
                type: "avro", 
                fn: (r, options) => {
                    if (isUnDef(params.avrofile)) oafp._exit(-1, "Please provide an 'avrofile' parameter.")

                    loadLib("avro.js")
                    var avro = new Avro()
                    avro.fromArray(params.avrofile, r, params.avrocodec, isDef(params.avroschema) ? oafp._fromJSSLON(params.avroschema) : __)
                    avro.close()
                }
            } ]/*,
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

---

## ⬆️  Avro output types

Extra output formats added by the test lib:

| Output format | Description |
|---------------|-------------|
| avro          | Writes an Avro file |

---

### 🧾 Avro output options

List of options to use when _out=avro_:

| Option | Type | Description |
|--------|------|-------------|
| avrofile | String | The Avro filename to create | 
| avrocodec  | String | One of the following options: snappy, bzip2, deflate, xz or zstandard |
| avroschema | Map | A JSON/SLON string to force the schema to use. |

> Example of a schema: avroschema="(type: record, name: my-record, fields: [(name: id, type: int) | (name: value, type: string)])"
`
        }

        return _r
    }
})()