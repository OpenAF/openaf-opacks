;(function() {
    exports.oafplib = function(params, _$o, $o, oafp) {
        loadLib("aws.js")
        params.awsregion = _$(params.awsregion).isString().default("us-east-1")
        params.awsaccesskey = _$(params.awsaccesskey).isString().default(__)
        params.awssecretkey = _$(params.awssecretkey).isString().default(__)
        params.awssessiontoken = _$(params.awssessiontoken).isString().default(__)
        var aws = new AWS(params.awsaccesskey, params.awssecretkey, params.awssessiontoken, params.awsregion)
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
                        encryptionConfiguration: params.awsathenaencryptionconfiguration,
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
                    _$o(aws.S3_ListBuckets(params.awsregion), options)
                }
            }, {
                type: "awss3listobjects",
                fn  : (r, options) => {
                    _$o(aws.S3_ListObjectsV2(params.awsregion, _$(params.awss3bucket, "awss3bucket").isString().$_(), params.awss3prefix, _$(params.awss3maxkeys).toNumber().isNumber().default(__), params.awss3continuationtoken), options)
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
| awss3listbuckets | Input data listing S3 buckets. |
| awss3listobjects | Input data listing objects in an S3 bucket. |
| awss3getobject | Input data from retrieving an S3 object. |
| awss3headobject | Input data with an S3 object's metadata. |

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

---

## 🧾 AWSLambda input options

List of options to use when _in=awslambda_:

| Option | Type | Description |
|--------|------|-------------|
| awslambda | String | The AWS Lambda name to invoke. |
| awslambdaversion | Number | The version of the AWS Lambda function to invoke. |

The input data will be taken as the payload to send to the Lambda function.

---

## 🧾 AWSAthena input options

List of options to use when _in=awsathena_:

| Option | Type | Description |
|--------|------|-------------|
| awsathenadatabase | String | The database to run the statement against (optional). |
| awsathenacatalog | String | The data catalog to use (optional). |
| awsathenaworkgroup | String | The Athena work group to use (optional). |
| awsathenaoutputlocation | String | The s3:// output location (optional when the work group defines one). |
| awsathenapollintervalms | Number | Milliseconds between status checks (optional, default 1000). |
| awsathenatimeoutms | Number | Maximum time to wait for completion (optional, default 300000). |
| awsathenafetchresults | Boolean | Fetch successful query rows (optional, default true). |
| awsathenadeleteresults | Boolean | Delete the Athena S3 result objects after fetching (optional, default false). |

The input data is the SQL statement. The output includes the execution details and, by default, Results as an array of maps.

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
| awss3contenttype | String | Content type for awss3putobject (optional). |
| awss3targetbucket | String | Destination bucket for awss3copyobject. |
| awss3targetobject | String | Destination object key for awss3copyobject. |

---

## ⬆️ AWS output types

| Output type | Description |
|-------------|-------------|
| awss3putobject | Writes the output data as an S3 object. |
| awss3deleteobject | Deletes an S3 object. Uses awss3object or the output data as its key. |
| awss3copyobject | Copies an S3 object to awss3targetbucket and awss3targetobject. |

`
        }

        return _r
    }
})()
