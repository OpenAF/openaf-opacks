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

`
        }

        return _r
    }
})()