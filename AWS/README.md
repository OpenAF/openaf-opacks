# AWS oPack

Load the required service library, for example `loadLib("aws_sqs.js")`.

SQS receive calls accept the requested maximum message count, and FIFO sends accept group IDs in either positional arguments or a message map. Performance Insights uses the client instance region. Each Bedrock provider keeps its own options.

Route 53 listings retrieve every page, including record name/type/identifier cursors and hosted-zone markers. See the [record listing API](https://docs.aws.amazon.com/Route53/latest/APIReference/API_ListResourceRecordSets.html) and [hosted-zone listing API](https://docs.aws.amazon.com/Route53/latest/APIReference/API_ListHostedZones.html).

Run the service-independent regression checks from this directory:

```sh
oaf -f tests/regression.js
```

These checks use local fixtures and test doubles; they do not verify a live external service.

`EKS_GetToken` signs an STS `GetCallerIdentity` URL locally without calling STS. Tokens use unpadded Base64URL encoding and report expiration in UTC (14 minutes by default). STS presigning hashes the empty request body; S3 presigning retains `UNSIGNED-PAYLOAD`.

Run the focused offline EKS token and STS/S3 signing checks with `oaf -f tests/eks.js`. These use dummy credentials and do not verify live EKS authentication.

## Lambda Web Functions, MicroVMs, and network connectors

Load `aws_lambda.js` and construct an AWS client with credentials using the existing AWS setup. The management wrappers accept `(aRegion, aParams)`; use `undefined` for the instance region. Omit `aParams` for operations with no required fields. Each call makes one request and returns the existing REST transport's response, including pagination tokens and errors. Empty responses follow the transport's usual behavior.

The wrappers cover all 20 [Web Functions operations](https://docs.aws.amazon.com/lambda/latest/lambda-web/API_Operations.html), all 24 [MicroVM operations](https://docs.aws.amazon.com/lambda/latest/microvm-api/API_Operations.html), and the five Core connector operations: `CreateNetworkConnector`, `DeleteNetworkConnector`, `GetNetworkConnector`, `ListNetworkConnectors`, and `UpdateNetworkConnector`. Prefix operation names with `LAMBDA_WEB_`, `LAMBDA_MICROVM_`, or `LAMBDA_CORE_`, preserving AWS spelling (`Microvm`, for example).

Parameter maps use AWS SDK input field names, including their casing. In particular, Web tagging uses `{ resource, tags }` and `{ resource, tagKeys }`, while MicroVM tagging uses `{ Resource, Tags }` and `{ Resource, TagKeys }`. Web `PutResourcePolicy` accepts `{ resourceArn, policy, revisionId }`. The wrappers translate the Web body fields to the wire keys `Tags`, `Policy`, and `RevisionId`. Nested configuration is passed unchanged. Required identifiers and parameter-map types are checked locally; AWS validates configuration and service limits. Caller maps are not modified.

Web creation, revisions, and endpoints (configuration maps below are caller supplied):

```javascript
loadLib("aws_lambda.js");
var aws = new AWS(accessKey, secretKey, sessionToken, "eu-west-1");

var created = aws.LAMBDA_WEB_CreateWebFunction(undefined, {
   functionName: "my-app",
   revisionConfig: revisionConfig,
   endpointConfig: endpointConfig
});
var revision = aws.LAMBDA_WEB_CreateWebFunctionRevision(undefined, {
   functionName: "my-app",
   buildConfig: buildConfig,
   serviceConfig: serviceConfig
});
var endpoint = aws.LAMBDA_WEB_CreateWebFunctionEndpoint(undefined, {
   functionName: "my-app",
   endpointName: "main",
   endpointType: endpointType,
   authType: authType
});
aws.LAMBDA_WEB_UpdateWebFunctionEndpoint(undefined, {
   functionName: "my-app", endpointName: "main", description: "Production"
});
var page = aws.LAMBDA_WEB_ListWebFunctions(undefined, { maxResults: 10 });
// Request another page explicitly with { maxResults: 10, nextToken: page.nextToken }.
```

MicroVM images, lifecycle, and authentication tokens:

```javascript
var image = aws.LAMBDA_MICROVM_CreateMicrovmImage(undefined, {
   name: "my-image",
   baseImageArn: baseImageArn,
   buildRoleArn: buildRoleArn,
   codeArtifact: { uri: "s3://my-bucket/code.zip" }
});
var imageState = aws.LAMBDA_MICROVM_GetMicrovmImage(undefined, {
   imageIdentifier: imageArn
});
// Once the selected image/version is ready, start it explicitly.
var vm = aws.LAMBDA_MICROVM_RunMicrovm(undefined, { imageIdentifier: imageArn });
var token = aws.LAMBDA_MICROVM_CreateMicrovmAuthToken(undefined, {
   microvmIdentifier: microvmId,
   expirationInMinutes: 10,
   allowedPorts: [{ port: 8080 }]
});
var shellToken = aws.LAMBDA_MICROVM_CreateMicrovmShellAuthToken(undefined, {
   microvmIdentifier: microvmId, expirationInMinutes: 10
});
aws.LAMBDA_MICROVM_SuspendMicrovm(undefined, { microvmIdentifier: microvmId });
aws.LAMBDA_MICROVM_ResumeMicrovm(undefined, { microvmIdentifier: microvmId });
aws.LAMBDA_MICROVM_TerminateMicrovm(undefined, { microvmIdentifier: microvmId });
```

Core network connectors retain uppercase field names:

```javascript
var connector = aws.LAMBDA_CORE_CreateNetworkConnector(undefined, {
   Name: "private-egress",
   Configuration: {
      VpcEgressConfiguration: {
         SubnetIds: ["subnet-example"],
         SecurityGroupIds: ["sg-example"],
         NetworkProtocol: "IPv4",
         AssociatedComputeResourceTypes: ["MicroVm"]
      }
   },
   OperatorRole: operatorRoleArn
});
var state = aws.LAMBDA_CORE_GetNetworkConnector(undefined, { Identifier: connector.Arn });
var connectors = aws.LAMBDA_CORE_ListNetworkConnectors(undefined, { MaxItems: 10 });
```

These are individual management calls. Callers manage pagination, readiness polling, deployment order, application HTTP requests, and shell connections. No SDK dependency or runtime model download is required. The regional endpoint and signing service are both Lambda; access remains subject to AWS service availability and IAM permissions.

Run `oaf -f tests/lambda.js` for offline request/signing and compatibility checks with dummy credentials and intercepted HTTP. Its static fixtures come from AWS's published operation request syntax, cross-checked against the botocore [Web](https://raw.githubusercontent.com/boto/botocore/develop/botocore/data/lambda-web/2025-03-07/service-2.json), [MicroVM](https://raw.githubusercontent.com/boto/botocore/develop/botocore/data/lambda-microvms/2025-09-09/service-2.json), and [Core](https://raw.githubusercontent.com/boto/botocore/develop/botocore/data/lambda-core/2026-04-30/service-2.json) models on 2026-10-20. These checks do not deploy resources or validate live AWS access.
