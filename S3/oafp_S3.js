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
            }, {
                type: "s3listbuckets",
                fn  : (r, options) => {
                    var s3 = new S3(params.s3url, params.s3accesskey, params.s3secretkey, params.s3region)
                    try {
                        _$o(s3.listBuckets(), options)
                    } finally {
                        s3.close()
                    }
                }
            }, {
                type: "s3listobjects",
                fn  : (r, options) => {
                    _$(params.s3bucket, "s3bucket").isString().$_()

                    var s3 = new S3(params.s3url, params.s3accesskey, params.s3secretkey, params.s3region)
                    try {
                        _$o(s3.listObjects(params.s3bucket, params.s3prefix, toBoolean(params.s3full), toBoolean(params.s3recursive)), options)
                    } finally {
                        s3.close()
                    }
                }
            }, {
                type: "s3getobject",
                fn  : (r, options) => {
                    _$(params.s3bucket, "s3bucket").isString().$_()
                    _$(params.s3object, "s3object").isString().$_()

                    var s3offset = _$(params.s3offset).toNumber().isNumber().default(__)
                    var s3length = _$(params.s3length).toNumber().isNumber().default(__)

                    var s3 = new S3(params.s3url, params.s3accesskey, params.s3secretkey, params.s3region)
                    try {
                        var result = s3.getObjectStream(params.s3bucket, params.s3object, s3offset, s3length)
                        try {
                            _$o(af.fromBytes2String(af.fromInputStream2Bytes(result)), options)
                        } finally {
                            result.close()
                        }
                    } finally {
                        s3.close()
                    }
                }
            }, {
                type: "s3statobject",
                fn  : (r, options) => {
                    _$(params.s3bucket, "s3bucket").isString().$_()
                    _$(params.s3object, "s3object").isString().$_()

                    var s3 = new S3(params.s3url, params.s3accesskey, params.s3secretkey, params.s3region)
                    try {
                        _$o(s3.statObject(params.s3bucket, params.s3object), options)
                    } finally {
                        s3.close()
                    }
                }
            } ],

            output        : [ {
                type: "s3putobject",
                fn  : (r, options) => {
                    _$(params.s3bucket, "s3bucket").isString().$_()
                    _$(params.s3object, "s3object").isString().$_()

                    var content = isString(r) ? r : stringify(r, __, "")
                    var s3 = new S3(params.s3url, params.s3accesskey, params.s3secretkey, params.s3region)
                    try {
                        var is = af.fromString2InputStream(content)
                        try {
                            s3.putObjectStream(params.s3bucket, params.s3object, is, __, params.s3contenttype)
                        } finally {
                            is.close()
                        }
                    } finally {
                        s3.close()
                    }
                }
            }, {
                type: "s3removeobject",
                fn  : (r, options) => {
                    _$(params.s3bucket, "s3bucket").isString().$_()
                    var aObject = isDef(params.s3object) ? params.s3object : String(r)

                    var s3 = new S3(params.s3url, params.s3accesskey, params.s3secretkey, params.s3region)
                    try {
                        s3.removeObject(params.s3bucket, aObject)
                    } finally {
                        s3.close()
                    }
                }
            }, {
                type: "s3copyobject",
                fn  : (r, options) => {
                    _$(params.s3bucket, "s3bucket").isString().$_()
                    _$(params.s3object, "s3object").isString().$_()
                    _$(params.s3targetbucket, "s3targetbucket").isString().$_()
                    _$(params.s3targetobject, "s3targetobject").isString().$_()

                    var s3 = new S3(params.s3url, params.s3accesskey, params.s3secretkey, params.s3region)
                    try {
                        s3.copyObject(params.s3bucket, params.s3object, params.s3targetbucket, params.s3targetobject)
                    } finally {
                        s3.close()
                    }
                }
            } ],
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
| s3listbuckets | Input data listing all the existing buckets. |
| s3listobjects | Input data listing the objects in a bucket. |
| s3getobject | Input data from retrieving the content of an object. |
| s3statobject | Input data with the metadata of an object. |

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

---

## 🧾 S3ListBuckets input options

List of options to use when _in=s3listbuckets_:

No extra options besides the common S3 input options above.

---

## 🧾 S3ListObjects input options

List of options to use when _in=s3listobjects_:

| Option | Type | Description |
|--------|------|-------------|
| s3bucket | String | The bucket to list objects from. |
| s3prefix | String | An optional prefix to simulate listing a folder (optional). |
| s3full | Boolean | If true the contentType will also be retrieved for each object (optional, slower, default false). |
| s3recursive | Boolean | If true all "object paths" will be traversed recursively (optional, default false). |

---

## 🧾 S3GetObject input options

List of options to use when _in=s3getobject_:

| Option | Type | Description |
|--------|------|-------------|
| s3bucket | String | The bucket holding the object to retrieve. |
| s3object | String | The object key to retrieve. |
| s3offset | Number | An optional starting offset (in bytes) to read from. |
| s3length | Number | An optional number of bytes to read (requires s3offset). |

---

## 🧾 S3StatObject input options

List of options to use when _in=s3statobject_:

| Option | Type | Description |
|--------|------|-------------|
| s3bucket | String | The bucket holding the object. |
| s3object | String | The object key to stat. |

---

## ⬆️  S3 output types:

Extra output types added by the S3 lib:

| Output type | Description |
|--------------|-------------|
| s3putobject | Writes the output data as the content of an object. |
| s3removeobject | Removes an object. |
| s3copyobject | Copies an object to another bucket/object. |

---

## 🧾 S3PutObject output options

List of options to use when _out=s3putobject_:

| Option | Type | Description |
|--------|------|-------------|
| s3bucket | String | The bucket to put the object into. |
| s3object | String | The object key to put. |
| s3contenttype | String | An optional content type for the object. |

The output data (converted to a string if needed) will be used as the object's content.

---

## 🧾 S3RemoveObject output options

List of options to use when _out=s3removeobject_:

| Option | Type | Description |
|--------|------|-------------|
| s3bucket | String | The bucket holding the object to remove. |
| s3object | String | The object key to remove (optional; if not provided the output data is used as the object key). |

---

## 🧾 S3CopyObject output options

List of options to use when _out=s3copyobject_:

| Option | Type | Description |
|--------|------|-------------|
| s3bucket | String | The source bucket. |
| s3object | String | The source object key. |
| s3targetbucket | String | The target bucket. |
| s3targetobject | String | The target object key. |

`
        }

        return _r
    }
})()
