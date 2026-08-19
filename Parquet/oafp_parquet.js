;(function() {
    exports.oafplib = function(params, _$o, $o, oafp) {
        var _r = {
            fileExtensions: [ { ext: ".parquet", type: "parquet" } ],
            input         : [ {
                type: "parquet",
                fn: (r, options) => {
                    oafp._showTmpMsg()
                    loadLib("parquet.js")
                    var parquet = new Parquet()
                    if (isDef(params.file)) {
                        parquet.loadFile(params.file)

                        var _r
                        if (toBoolean(params.inparquetstats)) {
                            _r = parquet.getStats()
                        } else if (toBoolean(params.inparquetmeta)) {
                            _r = parquet.getMeta()
                        } else if (toBoolean(params.inparquetschema)) {
                            _r = parquet.getSchema()
                        } else {
                            _r = parquet.toArray()
                        }
                        parquet.close()

                        _$o(_r, options)
                    } else {
                        oafp._exit(-1, "Parquet is only supported with 'file' defined. Please provide a file=...")
                    }
                }
            } ],
            output        : [ {
                type: "parquet",
                fn: (r, options) => {
                    if (isUnDef(params.parquetfile)) oafp._exit(-1, "Please provide a 'parquetfile' parameter.")

                    loadLib("parquet.js")
                    var parquet = new Parquet()
                    parquet.fromArray(params.parquetfile, r, isDef(params.parquetschema) ? oafp._fromJSSLON(params.parquetschema) : __)
                    parquet.close()
                }
            } ]/*,
            transform     : [ {
                type: "test",
                fn: (r) => {
                    return { test: 'test transform' }
                }
            } ]*/,
            help          :
`# Parquet oafp lib

## ⬇️  Parquet input types:

Extra input types added by the Parquet lib:

| Input type | Description |
|------------|-------------|
| parquet    | Reads a Parquet file |

---

### 🧾 Parquet input options

List of options to use when _in=parquet_:

| Option | Type | Description |
|--------|------|-------------|
| inparquetstats  | Boolean | Returns the row group (block) count, row count, compressed/uncompressed sizes, codec and file size |
| inparquetmeta   | Boolean | Returns the Parquet key/value metadata as a map |
| inparquetschema | Boolean | Returns the Parquet schema |

---

## ⬆️  Parquet output types

Extra output formats added by the Parquet lib:

| Output format | Description |
|---------------|-------------|
| parquet        | Writes a Parquet file |

---

### 🧾 Parquet output options

List of options to use when _out=parquet_:

| Option | Type | Description |
|--------|------|-------------|
| parquetfile   | String | The Parquet filename to create |
| parquetschema | Map | A JSON/SLON string to force the schema to use: an array of { name, type } where type is one of DOUBLE, BOOLEAN or STRING. |

> Example of a schema: parquetschema="[(name: id, type: DOUBLE) | (name: value, type: STRING)]"
`
        }

        return _r
    }
})()
