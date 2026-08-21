;(function() {
    exports.oafplib = function(params, _$o, $o, oafp) {
        loadLib("s3.js")
        params.s3url       = _$(params.s3url).isString().default(__)
        params.s3accesskey = _$(params.s3accesskey).isString().default(__)
        params.s3secretkey = _$(params.s3secretkey).isString().default(__)
        params.s3region    = _$(params.s3region).isString().default(__)

        var _r = {
            //fileExtensions: [ { ext: ".test", type: "test" } ],
            input         : [ {
                type: "s3select",
                fn  : (r, options) => {
                    _$(params.s3bucket, "s3bucket").isString().$_()
                    _$(params.s3object, "s3object").isString().$_()

                    var inputSerialization = { type: String(_$(params.s3inputtype).default("CSV")).toUpperCase() }
                    if (inputSerialization.type == "CSV") inputSerialization.fileHeaderInfo = _$(params.s3fileheaderinfo).default("USE")
                    if (inputSerialization.type == "JSON") inputSerialization.jsonType = _$(params.s3jsontype).default("LINES")

                    var outputSerialization = { type: String(_$(params.s3outputtype).default("CSV")).toUpperCase() }

                    var s3 = new S3(params.s3url, params.s3accesskey, params.s3secretkey, params.s3region)
                    try {
                        var result = s3.selectObjectContent(params.s3bucket, params.s3object, String(r), inputSerialization, outputSerialization)
                        try {
                            _$o(af.fromBytes2String(af.fromInputStream2Bytes(result)), options)
                        } finally {
                            result.close()
                        }
                    } finally {
                        s3.close()
                    }
                }
            } ],

            output        : [ /*{
                type: "test",
                fn: (r, options) => {
                    $o({ test: 'test output' }, options)
                }
            }*/ ],
            transform     : [ /*{
                type: "test",
                fn: (r) => {
                    return { test: 'test transform' }
                }
            }*/ ],
            help          :
`# S3 oafp lib

## ⬇️  S3 input types:

Extra input types added by the S3 lib:

| Input type | Description |
|------------|-------------|
| s3select   | Input data from running an S3 Select SQL expression against an object. |

All S3 inputs have the following common options:

| Option | Type | Description |
|--------|------|-------------|
| s3url | String | The S3 endpoint URL to use (optional, defaults to AWS S3) |
| s3accesskey | String | The S3 access key to use (optional) |
| s3secretkey | String | The S3 secret key to use (optional) |
| s3region | String | The S3 region to use (optional) |

---

## 🧾 S3Select input options

List of options to use when _in=s3select_:

| Option | Type | Description |
|--------|------|-------------|
| s3bucket | String | The bucket holding the object to query. |
| s3object | String | The object key to query. |
| s3inputtype | String | The object's format: CSV, JSON or PARQUET (optional, default CSV). |
| s3outputtype | String | The result's format: CSV or JSON (optional, default CSV). |
| s3fileheaderinfo | String | For CSV input: USE, IGNORE or NONE (optional, default USE). |
| s3jsontype | String | For JSON input: LINES or DOCUMENT (optional, default LINES). |

The input data will be taken as the S3 Select SQL expression to execute (e.g. \`SELECT s.name FROM S3Object s WHERE CAST(s.age AS INT) >= 18\`).

Note: Parquet input is supported on AWS S3 but not on MinIO servers by default.

`
        }

        return _r
    }
})()
