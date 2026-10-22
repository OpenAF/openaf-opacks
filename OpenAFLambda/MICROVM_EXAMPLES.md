# OpenAF MicroVM data integration examples

This walkthrough builds one OpenAF workload and calls it in three ways:

| Request | Input | Output | Runtime S3 permissions |
|---|---|---|---|
| Inline JSON | `numbers` in `POST /invoke` | JSON response | None |
| Read S3 | `inputKey` in the request | JSON response | `s3:GetObject` on `input/*` |
| Write S3 | `numbers` or `inputKey`, plus `outputKey` | JSON object in S3 and a response with its location | `s3:PutObject` on `output/*`, plus read permission if using `inputKey` |

The [sample workload](examples/microvm-s3/main.js) calculates the count, sum and average of a nonempty array of numbers. It uses the AWS opack already included in the runtime. The AWS CLI runs on your workstation; it is not needed inside the MicroVM.

These are explicit HTTP requests to a MicroVM. Uploading an S3 object alone does not invoke the workload. An application or separately configured event consumer must send `/invoke` with the object's key. OpenAFLambda does not translate S3 notification envelopes or execute workload code from `runHookPayload`.

## 1. Prerequisites and names

Use a current AWS CLI with `lambda-microvms`, OpenAF, Java 25+, Docker Buildx, and a region/account where MicroVMs are available. Follow the [build requirements](README.md#build). The commands below assume the standard AWS partition, two existing private general-purpose S3 buckets in the selected region, and a configured CLI profile. Buckets can be the same if their prefixes remain distinct.

Run from the OpenAFLambda directory in the same shell. Replace these example values before proceeding:

```sh
export AWS_PROFILE=default
export AWS_DEFAULT_REGION=eu-west-1
ACCOUNT_ID=123456789012
DEPLOYMENT_BUCKET=my-openaf-deployment-bucket
DATA_BUCKET=my-openaf-data-bucket
IMAGE_NAME=openaf-data-demo
BUILD_ROLE=OpenAFMicrovmDemoBuild
RUNTIME_ROLE=OpenAFMicrovmDemoRuntime
LOG_GROUP=/aws/lambda-microvms/openaf-data-demo
SOURCE_KEY=microvm/openaf-data-demo/image.zip
BUILD_ROLE_ARN="arn:aws:iam::$ACCOUNT_ID:role/$BUILD_ROLE"
RUNTIME_ROLE_ARN="arn:aws:iam::$ACCOUNT_ID:role/$RUNTIME_ROLE"
IMAGE_ARN="arn:aws:lambda:$AWS_DEFAULT_REGION:$ACCOUNT_ID:microvm-image:$IMAGE_NAME"
INTERNET_EGRESS="arn:aws:lambda:$AWS_DEFAULT_REGION:aws:network-connector:aws-network-connector:INTERNET_EGRESS"
ALL_INGRESS="arn:aws:lambda:$AWS_DEFAULT_REGION:aws:network-connector:aws-network-connector:ALL_INGRESS"
mkdir -p output/microvm-demo

aws sts get-caller-identity
aws lambda-microvms help
```

Check that the returned account matches `ACCOUNT_ID`. Use new role/image names and an unused source key for this tutorial. Generated policies and local results stay in ignored `output/microvm-demo/`.

## 2. Give the operator deployment permissions

There are three separate identities. Giving the runtime role S3 access does not allow your CLI user to upload the image, and giving the build role S3 access does not give the running workload that permission.

| Identity | Used when | Required scope in this walkthrough |
|---|---|---|
| Operator: your CLI profile or deployment automation | Creating resources, launching, minting tokens, checking results and cleaning up | MicroVM control-plane actions, pass the two roles/connectors, upload/read/delete tutorial objects, create/read/delete tutorial logs; IAM role setup if not done by an administrator |
| Build role | Creating the image and preparing its snapshot | Read the image source ZIP; write build logs; optionally read remote workload code |
| Runtime role | Each running MicroVM accesses AWS | Read `input/*`, write `output/*`, write application logs |

Have an administrator grant the operator the following control-plane policy, replacing `REGION` and `ACCOUNT_ID`. Save it as `output/microvm-demo/operator-control-plane.json` if applying it through your normal IAM provisioning process. Do not attach it to the build or runtime role.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "lambda:CreateMicrovmImage",
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "lambda:GetMicrovmImage", "lambda:GetMicrovmImageVersion",
        "lambda:RunMicrovm", "lambda:GetMicrovm",
        "lambda:CreateMicrovmAuthToken", "lambda:TerminateMicrovm",
        "lambda:DeleteMicrovmImage"
      ],
      "Resource": "arn:aws:lambda:REGION:ACCOUNT_ID:microvm-image:openaf-data-demo"
    },
    {
      "Effect": "Allow",
      "Action": "lambda:PassNetworkConnector",
      "Resource": [
        "arn:aws:lambda:REGION:aws:network-connector:aws-network-connector:INTERNET_EGRESS",
        "arn:aws:lambda:REGION:aws:network-connector:aws-network-connector:ALL_INGRESS"
      ]
    },
    {
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": [
        "arn:aws:iam::ACCOUNT_ID:role/OpenAFMicrovmDemoBuild",
        "arn:aws:iam::ACCOUNT_ID:role/OpenAFMicrovmDemoRuntime"
      ],
      "Condition": { "StringEquals": { "iam:PassedToService": "lambda.amazonaws.com" } }
    }
  ]
}
```

If you changed the names in step 1, change their literal occurrences in this policy too. The CLI service name is `lambda-microvms`, but IAM actions use **`lambda:`**. Image creation requires `Resource: "*"`; the listed instance operations authorize against the **image ARN**, not an invented instance ARN. See the [Lambda service authorization reference](https://docs.aws.amazon.com/service-authorization/latest/reference/list_lambda.html).

The operator also needs these permissions, scoped to the tutorial resources:

- IAM setup/cleanup: `iam:CreateRole`, `iam:GetRole`, `iam:PutRolePolicy`, `iam:DeleteRolePolicy`, `iam:DeleteRole` on the two role ARNs. An administrator can perform steps 3–4 instead of granting these to the operator.
- S3: `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` on the exact source object and the demo input/output objects. Large CLI uploads can also need `s3:AbortMultipartUpload`. Version cleanup needs `s3:ListBucketVersions` on the bucket (restricted by `s3:prefix`) and `s3:DeleteObjectVersion` on the objects.
- Logs: `logs:CreateLogGroup`, `logs:DeleteLogGroup`, `logs:FilterLogEvents` on the named log group. For inspecting streams in the console, add `logs:DescribeLogStreams` and `logs:GetLogEvents` on that group/its streams.

These grants are separate from the role policies below. Organization policies, permission boundaries, bucket policies and endpoint policies can still deny access. This walkthrough assumes same-account buckets; cross-account access also requires a bucket policy allowing the appropriate role. Keep buckets private and do not add public ACLs. See [S3 API permission mappings](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-with-s3-policy-actions.html).

## 3. Create the roles and their trust policy

Both roles trust Lambda with `sts:AssumeRole` and `sts:TagSession`, following [AWS's MicroVM setup](https://docs.aws.amazon.com/lambda/latest/dg/microvms-getting-started.html). A trust policy says who may assume a role; the next step supplies what that role may do.

```sh
cat > output/microvm-demo/trust.json <<'JSON'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "lambda.amazonaws.com" },
    "Action": ["sts:AssumeRole", "sts:TagSession"]
  }]
}
JSON

aws iam create-role --role-name "$BUILD_ROLE" \
  --assume-role-policy-document file://output/microvm-demo/trust.json
aws iam create-role --role-name "$RUNTIME_ROLE" \
  --assume-role-policy-document file://output/microvm-demo/trust.json
aws logs create-log-group --log-group-name "$LOG_GROUP"
```

## 4. Attach S3 and logging permissions

Precreating the log group lets both roles write streams without permission to create arbitrary groups. The embedded workload needs only the source ZIP during image creation:

```sh
cat > output/microvm-demo/build-policy.json <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$DEPLOYMENT_BUCKET/$SOURCE_KEY"
    },
    {
      "Effect": "Allow",
      "Action": ["logs:CreateLogStream", "logs:PutLogEvents"],
      "Resource": "arn:aws:logs:$AWS_DEFAULT_REGION:$ACCOUNT_ID:log-group:$LOG_GROUP:*"
    }
  ]
}
JSON

cat > output/microvm-demo/runtime-policy.json <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$DATA_BUCKET/input/*"
    },
    {
      "Effect": "Allow",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::$DATA_BUCKET/output/*"
    },
    {
      "Effect": "Allow",
      "Action": ["logs:CreateLogStream", "logs:PutLogEvents"],
      "Resource": "arn:aws:logs:$AWS_DEFAULT_REGION:$ACCOUNT_ID:log-group:$LOG_GROUP:*"
    }
  ]
}
JSON

aws iam put-role-policy --role-name "$BUILD_ROLE" --policy-name OpenAFMicrovmDemo \
  --policy-document file://output/microvm-demo/build-policy.json
aws iam put-role-policy --role-name "$RUNTIME_ROLE" --policy-name OpenAFMicrovmDemo \
  --policy-document file://output/microvm-demo/runtime-policy.json
```

Exact-key reads and writes do not require `s3:ListBucket`. The runtime cannot read its own output with this policy; verification is performed with the operator's identity. For inline-only workloads, remove both S3 statements from the runtime policy. Allow time for IAM changes to propagate before creating the image.

### If a bucket uses SSE-KMS

For a customer-managed KMS key, add a separate statement to each identity that needs it, scoped to the key ARN:

```json
{
  "Effect": "Allow",
  "Action": "kms:Decrypt",
  "Resource": "arn:aws:kms:REGION:ACCOUNT_ID:key/KEY_ID"
}
```

The build role needs decrypt access to encrypted source/workload ZIPs. The runtime role needs `kms:Decrypt` for input reads and `kms:GenerateDataKey` for output writes. The operator needs corresponding permissions for uploads and downloads; multipart SSE-KMS uploads need both actions. The KMS key policy must also permit the intended use. See [S3 SSE-KMS permissions](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html#using-kms-encryption-permissions).

The sample uses bucket default encryption. If your bucket policy requires explicit encryption headers, adapt the upload code to send those signed headers; `S3_PutObject` in this sample only supplies the content type. Do not weaken an existing encryption policy just to run the example.

## 5. Build and create the image

The sample accepts small JSON documents. `DATA_BUCKET` and `DATA_REGION` fix the data destination at image creation; callers choose only a validated `input/NAME.json` or `output/NAME.json` key. No credentials are embedded in the image or request.

```sh
oaf -f scripts/build.js -e 'target=microvm arch=arm64 workload=examples/microvm-s3'

aws s3 cp output/openaf-microvm-arm64.zip "s3://$DEPLOYMENT_BUCKET/$SOURCE_KEY"

cat > output/microvm-demo/environment.json <<JSON
{
  "OJOB_METHOD": "none",
  "OJOB_ENTRYPOINT": "main.js",
  "DATA_BUCKET": "$DATA_BUCKET",
  "DATA_REGION": "$AWS_DEFAULT_REGION"
}
JSON

aws lambda-microvms create-microvm-image \
  --name "$IMAGE_NAME" \
  --code-artifact "uri=s3://$DEPLOYMENT_BUCKET/$SOURCE_KEY" \
  --base-image-arn "arn:aws:lambda:$AWS_DEFAULT_REGION:aws:microvm-image:al2023-1" \
  --build-role-arn "$BUILD_ROLE_ARN" \
  --cpu-configurations '[{"architecture":"ARM_64"}]' \
  --resources '[{"minimumMemoryInMiB":1024}]' \
  --environment-variables file://output/microvm-demo/environment.json \
  --egress-network-connectors "$INTERNET_EGRESS" \
  --logging "{\"cloudWatch\":{\"logGroup\":\"$LOG_GROUP\"}}" \
  --hooks '{"port":8081,"microvmImageHooks":{"ready":"ENABLED","readyTimeoutInSeconds":300,"validate":"ENABLED","validateTimeoutInSeconds":60},"microvmHooks":{"run":"ENABLED","runTimeoutInSeconds":60,"resume":"ENABLED","resumeTimeoutInSeconds":60}}'

aws lambda-microvms get-microvm-image --image-identifier "$IMAGE_ARN" \
  --query '{state:state,version:latestActiveImageVersion}'
```

Repeat the last read until the state is `CREATED`; stop and inspect build logs if creation fails. Then capture and verify the active version:

```sh
IMAGE_VERSION=$(aws lambda-microvms get-microvm-image \
  --image-identifier "$IMAGE_ARN" --query latestActiveImageVersion --output text)
aws lambda-microvms get-microvm-image-version \
  --image-identifier "$IMAGE_ARN" --image-version "$IMAGE_VERSION" --query state
```

Continue only when that version is `SUCCESSFUL`. Build egress allows base-image retrieval and any remote code preparation; runtime egress is configured separately in the next step. Private networking requires a suitable connector and routes/endpoints for the services you use.

**Code in S3 is different from data in S3.** To retrieve workload code during image creation, use the [remote workload configuration](README.md#lambda-microvm-images): `OJOB_METHOD=s3`, `OJOB_CONFIG=s3://.../workload.zip`, `OJOB_ENTRYPOINT=main.js`, and `OJOB_S3_REGION`. Add that ZIP's `s3:GetObject` permission to the **build role**. Keep `DATA_BUCKET`/`DATA_REGION` for invocation data. Code is prepared before the snapshot, so changing the code object requires a new image version; input objects are read on every request. See [AWS's image workflow](https://docs.aws.amazon.com/lambda/latest/dg/microvms-images.html).

## 6. Launch with the runtime role and authenticate

```sh
MICROVM_ID=$(aws lambda-microvms run-microvm \
  --image-identifier "$IMAGE_ARN" --image-version "$IMAGE_VERSION" \
  --execution-role-arn "$RUNTIME_ROLE_ARN" \
  --ingress-network-connectors "$ALL_INGRESS" \
  --egress-network-connectors "$INTERNET_EGRESS" \
  --logging "{\"cloudWatch\":{\"logGroup\":\"$LOG_GROUP\"}}" \
  --maximum-duration-in-seconds 600 \
  --query microvmId --output text)

aws lambda-microvms get-microvm --microvm-identifier "$MICROVM_ID" --query state
```

Repeat the state read until `RUNNING`. This instance lives at most ten minutes; launch another if it expires while you work through the examples. Then obtain its endpoint and a token limited to application port 8080:

```sh
ENDPOINT=$(aws lambda-microvms get-microvm --microvm-identifier "$MICROVM_ID" \
  --query endpoint --output text)
BASE_URL="https://${ENDPOINT#https://}"
TOKEN=$(aws lambda-microvms create-microvm-auth-token \
  --microvm-identifier "$MICROVM_ID" --expiration-in-minutes 10 \
  --allowed-ports '[{"port":8080}]' \
  --query 'authToken."X-aws-proxy-auth"' --output text)

curl --fail-with-body --silent --show-error "$BASE_URL/health" \
  -H "X-aws-proxy-auth: $TOKEN" -H 'X-aws-proxy-port: 8080'
```

Keep the token out of logs and shared files, and do not run these commands with shell tracing enabled. It authorizes requests to this instance; S3 access still comes from the runtime role. A client holding the token can perform all operations the sample exposes, including overwriting allowed output keys. Use separate roles/prefixes or application authorization if serving different tenants. Port 8081 is reserved for lifecycle hooks. See [MicroVM roles, endpoints and authentication](https://docs.aws.amazon.com/lambda/latest/dg/microvms-launching.html).

## 7. Send and receive data

### A. Inline JSON in, JSON out

```sh
curl --fail-with-body --silent --show-error "$BASE_URL/invoke" \
  -H "X-aws-proxy-auth: $TOKEN" -H 'X-aws-proxy-port: 8080' \
  -H 'Content-Type: application/json' \
  --data '{"numbers":[10,20,30]}'
```

Expected response:

```json
{"count":3,"sum":60,"average":20}
```

The request body becomes `__pmIn`; assigning `__pmOut` returns the JSON response. No S3 call or credential lookup is made for this request.

### B. Read a JSON input object from S3

Upload with the operator identity, then send its key to the workload:

```sh
cat > output/microvm-demo/numbers.json <<'JSON'
{"numbers":[10,20,30]}
JSON
aws s3api put-object --bucket "$DATA_BUCKET" --key input/numbers.json \
  --body output/microvm-demo/numbers.json --content-type application/json

curl --fail-with-body --silent --show-error "$BASE_URL/invoke" \
  -H "X-aws-proxy-auth: $TOKEN" -H 'X-aws-proxy-port: 8080' \
  -H 'Content-Type: application/json' \
  --data '{"inputKey":"input/numbers.json"}'
```

The expected response is again `{"count":3,"sum":60,"average":20}`. The workload calls `AWS.S3_GetObject(DATA_REGION, DATA_BUCKET, inputKey)` using a newly created AWS client during the invocation. It accepts either text JSON or an already decoded JSON object from the HTTP client. The sample never accepts a caller-supplied bucket, region or URL.

### C. Write the result to S3

For data supplied directly in the request:

```sh
curl --fail-with-body --silent --show-error "$BASE_URL/invoke" \
  -H "X-aws-proxy-auth: $TOKEN" -H 'X-aws-proxy-port: 8080' \
  -H 'Content-Type: application/json' \
  --data '{"numbers":[10,20,30],"outputKey":"output/inline-summary.json"}'
```

For S3 input and S3 output in the same invocation:

```sh
curl --fail-with-body --silent --show-error "$BASE_URL/invoke" \
  -H "X-aws-proxy-auth: $TOKEN" -H 'X-aws-proxy-port: 8080' \
  -H 'Content-Type: application/json' \
  --data '{"inputKey":"input/numbers.json","outputKey":"output/s3-summary.json"}'

aws s3api get-object --bucket "$DATA_BUCKET" --key output/s3-summary.json \
  output/microvm-demo/result.json
cat output/microvm-demo/result.json
```

The HTTP response contains `bucket`, `key` and `result`. The stored object contains only `{"count":3,"sum":60,"average":20}` with content type `application/json`. `S3_PutObject` can return an error map as well as throwing, so the sample checks that before reporting success.

Each PUT replaces the current value of that key; versioned buckets retain older versions. Use a unique key per independent job. A lost HTTP response does not prove a PUT failed: check the object before retrying, and design an idempotency strategy for workloads with additional side effects.

### Using an oJob entrypoint

To run the same example through oJob, copy the sample directory into your own workload directory and add this `main.yaml` next to `main.js`:

```yaml
ojob:
  sequential: true
  conAnsi: false
  logToConsole: false
todo:
- Process data
jobs:
- name: Process data
  exec: |
    load("main.js");
```

Build with `workload=PATH_TO_YOUR_DIRECTORY` and set `OJOB_ENTRYPOINT=main.yaml` when creating a new image. The same requests and IAM policies apply. oJobs also receive map events through `args`; the shared script uses `__pmIn` and returns `__pmOut`.

## 8. Limits and troubleshooting

The sample is for small JSON objects loaded into memory, not binary files or large data pipelines. The runtime caps incoming JSON at 6 MiB and executes one request at a time. `OJOB_MAX_BYTES` bounds workload preparation, not application S3 reads. For large objects, add application-specific size limits and use streaming binary I/O; `S3_GetObject`/`S3_PutObject` here are text helpers. Configure bounded I/O timeouts for production workloads.

AWS credentials must be resolved at invocation time and refreshed after suspension or expiry. The sample creates `new AWS()` for each request that uses S3 instead of retaining an initialized client in the snapshot. Use a bundled AWS opack compatible with the credential provider exposed by your environment; never put access keys in image variables or payloads. The supplied `/run` and `/resume` hooks check health; they do not refresh application-managed clients for you.

| Symptom | Check |
|---|---|
| `create-microvm-image` or `run-microvm` denied | Operator IAM actions, `iam:PassRole` for the correct role, `lambda:PassNetworkConnector` for each connector, and role trust including `sts:TagSession`. |
| Image build fails to retrieve code | Build-role `s3:GetObject`, source key/region, optional KMS grants, build egress and logs. Runtime-role permissions cannot fix build access. |
| `/health` succeeds, S3 request fails | `--execution-role-arn`, runtime S3/KMS grants, `DATA_BUCKET`/`DATA_REGION`, object existence, credential provider and runtime egress. A healthy server does not prove S3 access. |
| S3 returns 403 for a missing key | Without `s3:ListBucket`, a nonexistent key can appear as AccessDenied; confirm the exact key with the operator identity. |
| Endpoint rejects the request | Token expiry, matching MicroVM ID, port 8080 and instance state. Generate a fresh token after expiry. |
| HTTP 500 | Invalid sample input or workload/S3 failure. Supply exactly one of `numbers`/`inputKey`, finite numbers, and permitted key names. |
| HTTP 409 / 408 | Another invocation is active / the workload timed out. After 408, terminate and replace the unhealthy MicroVM. |
| S3 data changed but response seems old | Confirm the input key. Data is read per request, but changing S3-hosted workload code requires rebuilding the image. |

Read logs with the operator identity:

```sh
aws logs filter-log-events --log-group-name "$LOG_GROUP" --limit 50
```

## 9. Cleanup

Terminate the instance, then repeat the state read until `TERMINATED` before deleting its image:

```sh
aws lambda-microvms terminate-microvm --microvm-identifier "$MICROVM_ID"
aws lambda-microvms get-microvm --microvm-identifier "$MICROVM_ID" --query state
```

Delete only the tutorial resources you created:

```sh
aws lambda-microvms delete-microvm-image --image-identifier "$IMAGE_ARN"
aws s3api delete-object --bucket "$DEPLOYMENT_BUCKET" --key "$SOURCE_KEY"
aws s3api delete-object --bucket "$DATA_BUCKET" --key input/numbers.json
aws s3api delete-object --bucket "$DATA_BUCKET" --key output/inline-summary.json
aws s3api delete-object --bucket "$DATA_BUCKET" --key output/s3-summary.json
aws logs delete-log-group --log-group-name "$LOG_GROUP"
aws iam delete-role-policy --role-name "$BUILD_ROLE" --policy-name OpenAFMicrovmDemo
aws iam delete-role-policy --role-name "$RUNTIME_ROLE" --policy-name OpenAFMicrovmDemo
aws iam delete-role --role-name "$BUILD_ROLE"
aws iam delete-role --role-name "$RUNTIME_ROLE"
unset TOKEN
```

With versioning enabled, `delete-object` creates a delete marker and leaves prior versions. List versions using `aws s3api list-object-versions --bucket BUCKET --prefix EXACT_KEY`, select only entries whose `Key` exactly matches the tutorial object, and delete each version and delete marker with `aws s3api delete-object --bucket BUCKET --key EXACT_KEY --version-id VERSION_ID`. Retain the existing buckets and unrelated objects. Remove any operator policy created solely for this exercise through your IAM administrator.

## Validation scope

The examples follow the checked-in OpenAF runtime and AWS opack APIs. Local sample checks can establish input validation, calculations and S3 call/error handling with fixtures; they cannot establish AWS authorization, networking, KMS configuration or credentials after snapshot restore. Run all three requests in your own test environment and verify the stored object before using this in production. The earlier [live MicroVM report](LIVE_MICROVM.md) covers the embedded greeting workload, not these S3 data examples.
