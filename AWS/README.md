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
