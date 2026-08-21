;(function() {
    exports.oafplib = function(params, _$o, $o, oafp) {
        loadLib("aws.js")
        params.awsregion = _$(params.awsregion).isString().default("us-east-1")
        params.awsaccesskey = _$(params.awsaccesskey).isString().default(__)
        params.awssecretkey = _$(params.awssecretkey).isString().default(__)
        params.awssessiontoken = _$(params.awssessiontoken).isString().default(__)
        var aws = new AWS(params.awsaccesskey, params.awssecretkey, params.awssessiontoken, params.awsregion)
        var fromJSSLONMap = aValue => isString(aValue) ? af.fromJSSLON(aValue) : aValue
        var _r = {
            //fileExtensions: [ { ext: ".test", type: "test" } ],
            input         : [ {
                type: "awsrdsdata",
                fn  : (r, options) => {
                    _$(params.awssecret, "awssecret").isString().$_()
                    _$(params.awsdb, "awsdb").isString().$_()
                    _$o(aws.RDSDATA_ExecuteSQL(params.awsregion, params.awssecret, params.awsdb, String(r), __, params.awsdatabase, params.awsschema), options)
                }
            }, {
                type: "awslambda",
                fn  : (r, options) => {
                    _$o(aws.LAMBDA_Invoke(params.awsregion, params.awslambda, oafp._fromJSSLON(r), params.awslambdaversion), options)
                }
            }, {
                type: "awsathena",
                fn  : (r, options) => {
                    var athenaOptions = {
                        database               : params.awsathenadatabase,
                        catalog                : params.awsathenacatalog,
                        workGroup              : params.awsathenaworkgroup,
                        outputLocation         : params.awsathenaoutputlocation,
                        encryptionConfiguration: fromJSSLONMap(params.awsathenaencryptionconfiguration),
                        clientRequestToken     : params.awsathenaclientrequesttoken,
                        executionParameters    : params.awsathenaexecutionparameters,
                        pollIntervalMs         : _$(params.awsathenapollintervalms).toNumber().isNumber().default(__),
                        timeoutMs              : _$(params.awsathenatimeoutms).toNumber().isNumber().default(__),
                        fetchResults           : _$(params.awsathenafetchresults).isBoolean().default(__),
                        skipHeaderRow          : _$(params.awsathenaskipheaderrow).isBoolean().default(__),
                        maxResultPages         : _$(params.awsathenamaxresultpages).toNumber().isNumber().default(__),
                        deleteResults          : _$(params.awsathenadeleteresults).isBoolean().default(__)
                    }
                    _$o(aws.ATHENA_Query(params.awsregion, String(r), athenaOptions), options)
                }
            }, {
                type: "awss3listbuckets",
                fn  : (r, options) => {
                    var buckets = aws.S3_ListBuckets(params.awsregion)
                    if (isDef(buckets.error)) return _$o(buckets, options)

                    var result = buckets.ListAllMyBucketsResult || buckets
                    var entries = isDef(result.Buckets) ? result.Buckets.Bucket : []
                    if (!isArray(entries)) entries = isDef(entries) ? [ entries ] : []
                    if (_$(toBoolean(params.awss3listbucketsasarray)).isBoolean().default(false)) {
                        _$o(entries, options)
                    } else {
                        entries.forEach(entry => _$o(entry, options))
                    }
                }
            }, {
                type: "awss3listobjects",
                fn  : (r, options) => {
                    var bucket = _$(params.awss3bucket, "awss3bucket").isString().$_()
                    var token = _$(params.awss3continuationtoken).isString().default(__)
                    var maxPages = _$(params.awss3maxpages).toNumber().isNumber().default(-1)
                    var page = 0, entries = []
                    var asArray = _$(toBoolean(params.awss3listobjectsasarray)).isBoolean().default(false)

                    do {
                        var response = aws.S3_ListObjectsV2(params.awsregion, bucket, params.awss3prefix, _$(params.awss3maxkeys).toNumber().isNumber().default(__), token)
                        if (isDef(response.error)) return _$o(response, options)

                        var result = response.ListBucketResult || response
                        var pageEntries = result.Contents
                        if (!isArray(pageEntries)) pageEntries = isDef(pageEntries) ? [ pageEntries ] : []
                        if (asArray) {
                            entries = entries.concat(pageEntries)
                        } else {
                            pageEntries.forEach(entry => _$o(entry, options))
                        }

                        token = result.NextContinuationToken
                        page++
                    } while (String(result.IsTruncated).toLowerCase() == "true" && isDef(token) && (maxPages < 0 || page < maxPages))

                    if (asArray) _$o(entries, options)
                }
            }, {
                type: "awss3getobject",
                fn  : (r, options) => {
                    _$o(aws.S3_GetObject(params.awsregion, _$(params.awss3bucket, "awss3bucket").isString().$_(), _$(params.awss3object, "awss3object").isString().$_()), options)
                }
            }, {
                type: "awss3headobject",
                fn  : (r, options) => {
                    _$o(aws.S3_HeadObject(params.awsregion, _$(params.awss3bucket, "awss3bucket").isString().$_(), _$(params.awss3object, "awss3object").isString().$_()), options)
                }
            }, {
                type: "awss3select",
                fn  : (r, options) => {
                    var inputSerialization = fromJSSLONMap(params.awss3inputserialization)
                    var outputSerialization = fromJSSLONMap(params.awss3outputserialization)
                    var result = aws.S3_SelectObjectContent(params.awsregion, _$(params.awss3bucket, "awss3bucket").isString().$_(), _$(params.awss3object, "awss3object").isString().$_(), String(r), inputSerialization, outputSerialization, {
                        requestProgress: _$(params.awss3requestprogress).isBoolean().default(false),
                        scanStartRange : _$(params.awss3scanstartrange).toNumber().isNumber().default(__),
                        scanEndRange   : _$(params.awss3scanendrange).toNumber().isNumber().default(__)
                    })
                    if (isMap(outputSerialization) && String(outputSerialization.type).toUpperCase() == "JSON" && isString(result.Records)) {
                        var records = [], recordsStream
                        try {
                            recordsStream = af.fromString2InputStream(result.Records)
                            io.readLinesNDJSON(recordsStream, record => { records.push(record) }, e => {})
                            result.Records = records
                        } catch(e) {} finally {
                            if (isDef(recordsStream)) try { recordsStream.close() } catch(e) {}
                        }
                    }
                    _$o(result, options)
                }
            } ],

            output        : [ {
                type: "awss3putobject",
                fn  : (r, options) => {
                    var content = isString(r) ? r : stringify(r, __, "")
                    aws.S3_PutObject(params.awsregion, _$(params.awss3bucket, "awss3bucket").isString().$_(), _$(params.awss3object, "awss3object").isString().$_(), content, params.awss3contenttype)
                }
            }, {
                type: "awss3deleteobject",
                fn  : (r, options) => {
                    var key = isDef(params.awss3object) ? params.awss3object : String(r)
                    aws.S3_DeleteObject(params.awsregion, _$(params.awss3bucket, "awss3bucket").isString().$_(), key)
                }
            }, {
                type: "awss3copyobject",
                fn  : (r, options) => {
                    aws.S3_CopyObject(params.awsregion, _$(params.awss3targetbucket, "awss3targetbucket").isString().$_(), _$(params.awss3targetobject, "awss3targetobject").isString().$_(), _$(params.awss3bucket, "awss3bucket").isString().$_(), _$(params.awss3object, "awss3object").isString().$_())
                }
            } /*{
                type: "test", 
                fn: (r, options) => {
                    $o({ test: 'test output' }, options)
                }
            }*/ ],
            transform     : [ /*{ 
                type: "test", 
                fn: (r) => {
                    return { test: 'test transform' }
                }
            }*/ ],
            help          : 
`# AWS oafp lib

## ⬇️  AWS input types:

Extra input types added by the aws lib:

| Input type | Description |
|------------|-------------|
| awsrdsdata | Input data from executing a SQL statement for an AWS RDS Data compatible database. |
| awslambda  | Input data from executing a Lambda function. |
| awsathena | Input data from executing an Athena SQL statement. |
| awss3listbuckets | Input data listing S3 buckets, one bucket map at a time by default. |
| awss3listobjects | Input data listing S3 objects in an S3 bucket, one object map at a time and across pages by default. |
| awss3getobject | Input data from retrieving an S3 object. |
| awss3headobject | Input data with an S3 object's metadata. |
| awss3select | Input data from running an S3 Select SQL expression against an S3 object. |

All AWS inputs have the following common options:

| Option | Type | Description |
|--------|------|-------------|
| awsregion | String | The AWS region to use (optional) |
| awsaccesskey | String | The AWS access key to use (optional) |
| awssecretkey | String | The AWS secret key to use (optional) |
| awssessiontoken | String | The AWS session token to use (optional) |

---

## 🧾 AWSRDSData input options

List of options to use when _in=awsrdsdata_:

| Option | Type | Description |
|--------|------|-------------|
| awssecret | String | The AWS secret to use. |
| awsdb | String | The AWS DB ARN to use. |
| awsdatabase | String | The AWS database to use (optional) |
| awsschema | String | The AWS schema to use (optional) |

The input data will be taken as the SQL statement string to execute.

Example, using the AWS credentials available to the OpenAF runtime:

\`\`\`bash
echo 'SELECT id, status FROM orders LIMIT 10' | oafp libs=aws in=awsrdsdata \
  awsregion=eu-west-1 \
  awssecret=arn:aws:secretsmanager:eu-west-1:123456789012:secret:database-secret \
  awsdb=arn:aws:rds:eu-west-1:123456789012:cluster:orders
\`\`\`

---

## 🧾 AWSLambda input options

List of options to use when _in=awslambda_:

| Option | Type | Description |
|--------|------|-------------|
| awslambda | String | The AWS Lambda name to invoke. |
| awslambdaversion | Number | The version of the AWS Lambda function to invoke. |

The input data will be taken as the payload to send to the Lambda function.

Example, invoking a function with a JSON payload:

\`\`\`bash
oafp libs=aws in=awslambda awsregion=eu-west-1 awslambda=process-order \
  data='{ orderId: "12345", dryRun: true }'
\`\`\`

---

## 🧾 AWSAthena input options

List of options to use when _in=awsathena_:

| Option | Type | Description |
|--------|------|-------------|
| awsathenadatabase | String | The database to run the statement against (optional). |
| awsathenacatalog | String | The data catalog to use (optional). |
| awsathenaworkgroup | String | The Athena work group to use (optional). |
| awsathenaoutputlocation | String | The s3:// output location (optional when the work group defines one). |
| awsathenaencryptionconfiguration | Map | Result encryption configuration in JSON or SLON (optional). |
| awsathenapollintervalms | Number | Milliseconds between status checks (optional, default 1000). |
| awsathenatimeoutms | Number | Maximum time to wait for completion (optional, default 300000). |
| awsathenafetchresults | Boolean | Fetch successful query rows (optional, default true). |
| awsathenadeleteresults | Boolean | Delete the Athena S3 result objects after fetching (optional, default false). |

The input data is the SQL statement. The output includes the execution details and, by default, Results as an array of maps.

Example, querying Athena and returning the result rows:

\`\`\`bash
echo 'SELECT account_id, count(*) AS total FROM cloudtrail_logs GROUP BY account_id' | \
  oafp libs=aws in=awsathena awsregion=eu-west-1 \
  awsathenadatabase=logs awsathenaoutputlocation=s3://my-query-results/athena/
\`\`\`

---

## 🧾 AWSS3 input options

List of options to use with the AWS S3 input and output types:

| Option | Type | Description |
|--------|------|-------------|
| awss3bucket | String | The S3 bucket. Required except for awss3listbuckets. |
| awss3object | String | The S3 object key. Required for get, head, put and copy source operations. |
| awss3prefix | String | An optional object-key prefix for awss3listobjects. |
| awss3maxkeys | Number | Maximum objects to return from awss3listobjects (optional). |
| awss3continuationtoken | String | Continuation token for awss3listobjects (optional). |
| awss3maxpages | Number | Maximum S3 object-list pages to fetch (optional; default -1 fetches all pages). |
| awss3listbucketsasarray | Boolean | Return the bucket-list result as one array of maps (optional; default false). |
| awss3listobjectsasarray | Boolean | Return the object-list result as one array of maps across all fetched pages (optional; default false). |
| awss3inputserialization | Map | S3 Select input serialization. Accepts JSON or SLON; CSV is the default. |
| awss3outputserialization | Map | S3 Select output serialization. Accepts JSON or SLON; CSV is the default. |
| awss3requestprogress | Boolean | Include S3 Select progress events (optional, default false). |
| awss3scanstartrange | Number | Byte offset where an S3 Select scan range starts (optional). |
| awss3scanendrange | Number | Byte offset where an S3 Select scan range ends (optional). |
| awss3contenttype | String | Content type for awss3putobject (optional). |
| awss3targetbucket | String | Destination bucket for awss3copyobject. |
| awss3targetobject | String | Destination object key for awss3copyobject. |

For _in=awss3select_, the input data is the SQL expression (for example, SELECT * FROM S3Object s LIMIT 10). The output map includes Records, plus S3 Select Stats, optional Progress, and Events.

awss3inputserialization supports { type: "CSV" } (default), { type: "JSON" }, or { type: "PARQUET" }. For CSV and JSON input, compression can be NONE (default), GZIP, or BZIP2; Parquet supports only NONE. CSV additionally accepts fileHeaderInfo (USE, IGNORE, or NONE), fieldDelimiter, quoteCharacter, quoteEscapeCharacter, recordDelimiter (LF by default), comments, and allowQuotedRecordDelimiter. JSON accepts jsonType (LINES or DOCUMENT).

awss3outputserialization supports { type: "CSV" } (default) or { type: "JSON" }. CSV output accepts fieldDelimiter, quoteCharacter, quoteEscapeCharacter, quoteFields (ALWAYS or ASNEEDED), and recordDelimiter (LF by default); JSON output accepts recordDelimiter (LF by default). The output serialization is not compressed by S3 Select. For JSON output, awss3select uses io.readLinesNDJSON to parse Records into an array.

The S3 list inputs emit each successful bucket or object as a top-level map by default. Set awss3listbucketsasarray=true or awss3listobjectsasarray=true to return a single array of result maps instead. Object-list pagination follows NextContinuationToken automatically; a failed AWS request is emitted as its error map.

Examples:

\`\`\`bash
# List all buckets, one map per bucket
oafp libs=aws in=awss3listbuckets awsregion=eu-west-1

# Return all buckets as one array
oafp libs=aws in=awss3listbuckets awsregion=eu-west-1 awss3listbucketsasarray=true

# List up to two pages of CSV objects below a prefix
oafp libs=aws in=awss3listobjects awsregion=eu-west-1 \
  awss3bucket=my-data awss3prefix=exports/ awss3maxpages=2

# Return objects from every fetched page as one array
oafp libs=aws in=awss3listobjects awsregion=eu-west-1 \
  awss3bucket=my-data awss3prefix=exports/ awss3listobjectsasarray=true

# Fetch an object or just its metadata
oafp libs=aws in=awss3getobject awsregion=eu-west-1 awss3bucket=my-data awss3object=exports/report.json
oafp libs=aws in=awss3headobject awsregion=eu-west-1 awss3bucket=my-data awss3object=exports/report.json

# Select JSON Lines records from a GZIP-compressed CSV object
echo "SELECT s.id, s.status FROM S3Object s WHERE s.status = 'active'" | \
  oafp libs=aws in=awss3select out=json awsregion=eu-west-1 \
  awss3bucket=my-data awss3object=exports/orders.csv \
  awss3inputserialization='{ type: "CSV", compression: "GZIP", fileHeaderInfo: "USE" }' \
  awss3outputserialization='{ type: "JSON" }'
\`\`\`

---

## ⬆️ AWS output types

| Output type | Description |
|-------------|-------------|
| awss3putobject | Writes the output data as an S3 object. |
| awss3deleteobject | Deletes an S3 object. Uses awss3object or the output data as its key. |
| awss3copyobject | Copies an S3 object to awss3targetbucket and awss3targetobject. |

Examples:

\`\`\`bash
# Store SLON supplied on stdin
echo '{ id: "12345", status: "active" }' | oafp libs=aws in=raw out=awss3putobject \
  awsregion=eu-west-1 awss3bucket=my-data awss3object=exports/order-12345.json \
  awss3contenttype=text/plain

# Copy, then delete an object
oafp libs=aws out=awss3copyobject awsregion=eu-west-1 awss3bucket=my-data \
  awss3object=exports/order-12345.json awss3targetbucket=my-archive \
  awss3targetobject=2026/order-12345.json
oafp libs=aws out=awss3deleteobject awsregion=eu-west-1 awss3bucket=my-data \
  awss3object=exports/order-12345.json
\`\`\`

`
        }

        return _r
    }
})()
