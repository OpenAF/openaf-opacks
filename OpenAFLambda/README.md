# OpenAFLambda

Build standalone AWS Lambda function ZIPs or Lambda MicroVM image source ZIPs containing Java 25, OpenAF, the AWS opack and oJob-common. They run JavaScript or YAML/JSON oJobs from an embedded workload, a local file/ZIP, HTTP/S or AWS S3. The default target supplies a custom function runtime; the optional MicroVM target supplies a snapshot-ready HTTP application.

The workload is prepared once per cold start. Each event then runs in the same Java/OpenAF process, using the input/output convention from OpenAFLambdaLayers. No Java or opack installation happens during invocation.

## Build

Requirements: OpenAF, Java 25+, Docker with Buildx, and internet access to the selected Java distribution, OpenAF and opack repositories. Build commands run natively through OpenAF or the oJob entrypoint.

```sh
# Separate x86_64 and arm64 ZIPs, with an embedded example oJob.
ojob build.yaml

# One architecture and your own embedded workload directory.
oaf -f scripts/build.js -e 'arch=arm64 workload=examples/script'

# Use unpublished sibling artifacts without changing those checkouts.
oaf -f scripts/build.js -e 'arch=arm64 jar=../../openaf/openaf.jar localOpacks=["../AWS"]'

# AWS remains installed when adding/replacing the default published opack list.
oaf -f scripts/build.js -e 'opacks=AWS,oJob-common,Kube'

# Select a newer JRE or build a Corretto runtime using its matching jlink.
oaf -f scripts/build.js -e 'arch=arm64 java=25 jreProvider=corretto'

# Generate and validate OpenAF's .shared.oaf for this exact JVM and architecture.
oaf -f scripts/build.js -e 'arch=arm64 cds=auto'

# Equivalent wrapper; localOpacks is a JSON array.
ojob build.yaml arch=arm64 dist=stable java=25 output=output \
  jar=../../openaf/openaf.jar 'localOpacks=["../AWS"]'
```

OpenAF scripts accept `key=value` arguments in the single `-e` expression. The oJob entrypoint accepts the same keys directly. Paths containing spaces can be JSON strings inside the expression. Live AWS scripts still require the AWS CLI and an explicitly selected bucket.

Options:

| Option | Default | Purpose |
|---|---|---|
| `arch` | `both` | `both`, `x86_64` or `arm64`; builds Linux binaries using Docker's selected platform. |
| `java` | `25` | Java major version, at least 25. |
| `jreProvider` | `temurin` | `temurin` JRE, or a runtime linked from the `corretto` JDK. |
| `dist` | `stable` | OpenAF distribution, such as `stable`, `nightly` or `edge`. |
| `cds` | `auto` | `auto` generates and validates OpenAF's archive; `off` omits it. |
| `opacks` | `AWS,oJob-common` | Published opacks to install. AWS is always included. |
| `jar` | published JAR | Local repacked OpenAF JAR. |
| `localOpacks` | none | JSON array of local opack directories or `.opack` files. Overrides its published counterpart. |
| `workload` | `examples/ojob` | Workload directory copied into `function/`. |
| `output` | `output` | Artifact destination. |

Each build produces `openaf-lambda-ARCH.zip` and `openaf-lambda-ARCH.manifest.json`. The manifest records resolved versions, input hashes, runtime/workload hashes, architecture, sizes and ZIP SHA-256. The ZIP includes `build-manifest.json` with its build inputs. Downloads follow the selected distribution's latest release; retain the generated artifacts/manifests when pinning a deployment.

The builder rejects deployment packages larger than 250 MiB uncompressed and preserves Java/bootstrap executable permissions. ZIPs larger than 50 MiB compressed should be deployed through S3. The generated JRE retains its legal notices; unused JVM archives are removed. Local workload symlinks are rejected.

## Configure a workload

| Environment variable | Default | Purpose |
|---|---|---|
| `OJOB_METHOD` | `none` | Case-insensitive `none`, `local`, `http`, `s3`. |
| `OJOB_CONFIG` | selected embedded handler | File path, HTTP/S URL, `s3://bucket/key`, or S3 key. |
| `OJOB_ENTRYPOINT` | Lambda handler / `main.yaml` | Relative entrypoint in a ZIP or the embedded workload; overrides `_HANDLER`. |
| `OJOB_S3_BUCKET` | none | Bucket when `OJOB_CONFIG` is an object key. |
| `OJOB_S3_REGION` | `AWS_REGION`, then `AWS_DEFAULT_REGION` | S3 bucket region. |
| `OJOB_HASH` | none | Optional SHA-1 check for compatibility with ojobrt. |
| `OJOB_SHA256` | none | Optional SHA-256 check. Every configured hash must match. |
| `OJOB_JSONLOG` | `false` | JSON runtime logs; workload logging is independent. |
| `login`, `pass` | none | Optional HTTP basic authentication. |
| `OJOB_MAX_BYTES` | `268435456` | Maximum downloaded, copied or expanded workload bytes (256 MiB). |
| `OAF_JAVA_XSHARE` | build's `cds` value | Override class sharing with `auto` or `off`. |

Examples of environment settings:

```text
# Embedded oJob, with Lambda Handler = main.yaml:
OJOB_METHOD=none

# Local ZIP, embedded in function/ or available at an absolute path:
OJOB_METHOD=local
OJOB_CONFIG=package.zip
OJOB_ENTRYPOINT=jobs/main.yaml

# HTTP ZIP:
OJOB_METHOD=http
OJOB_CONFIG=https://example.org/workload.zip
OJOB_ENTRYPOINT=main.js
OJOB_SHA256=YOUR_64_HEX_DIGIT_SHA256

# AWS S3 ZIP, authenticated with the Lambda execution role:
OJOB_METHOD=s3
OJOB_CONFIG=s3://my-bucket/jobs/workload.zip
OJOB_ENTRYPOINT=main.yaml
```

`none` and `local` both support local files and ZIPs. Relative local paths resolve beneath `/var/task/function`; absolute paths can reference mounted storage such as EFS. A configured standalone `.js`, `.yaml`, `.yml` or `.json` file is executed directly, regardless of the Lambda handler setting. ZIPs use the selected entrypoint and default to `main.yaml`.

The runtime copies local files with their sibling resources into a writable `/tmp` workload directory. It downloads remote standalone files individually; use a ZIP when the workload has dependencies or other resources. The invocation process runs from the entrypoint's directory so relative file reads and `load()` work. ZIPs must contain the entrypoint at the configured relative path, without an extra enclosing directory unless included in `OJOB_ENTRYPOINT`.

Preparation verifies hashes before extraction, rejects duplicate or escaping ZIP paths, limits entries to 10,000, and retains 16 MiB of free temporary storage. It reports retrieval/extraction/entrypoint failures through Lambda's initialization error API. Remote updates become visible when a new execution environment starts; warm invocations keep the prepared workload.

AWS S3 uses the AWS opack's SigV4 presigning and a binary download stream, including the execution role's temporary session token. It does not require the separate S3 opack or the AWS CLI. Custom S3 endpoints and automatic event-selected code are outside this runtime's configuration contract. HTTP credentials and signed URLs are not included in runtime download logs.

## Events and results

JavaScript receives the event through `__pmIn` and `__pm`. Initially `__pmOut` references the same event, so modifying its fields returns those changes. Assign `__pmOut` to replace the response:

```javascript
__pmOut = {
  message: "Hello " + _$(__pmIn.name).default("Lambda"),
  requestId: __lambdaContext.awsRequestId,
  remainingTimeMs: __lambdaContext.getRemainingTimeInMillis()
};
```

An oJob receives map events through `args`, `__pmIn` and `__pm`, and returns `__pmOut`:

```yaml
ojob:
  sequential: true
  conAnsi: false
  logToConsole: false
todo:
- Hello
jobs:
- name: Hello
  exec: |
    __pmOut = { message: "Hello " + _$(args.name).default("Lambda") };
```

`__lambdaContext` includes `awsRequestId`, `invokedFunctionArn`, `deadlineMs`, `traceId` and `getRemainingTimeInMillis()`. `_X_AMZN_TRACE_ID` is updated for every invocation. Return ordinary JSON; for API Gateway/Function URLs, return the appropriate HTTP response object yourself.

Inputs, outputs and oJob execution state are reset between events. Application globals, `require()` caches and other application-managed state may persist. Scripts must complete and return control: do not call `exit()` or run perpetual jobs. A failed script/job produces a Lambda invocation error; the process can handle the next event. An unhandled oJob job-log failure also produces an error. Runtime API delivery failures terminate the process rather than replaying the workload.

OpenAF's mutable home and temporary files live under `/tmp`; the deployed code remains read-only. Install additional opacks at build time. Initialize application secrets explicitly in workload code; `secrets.yaml` is not loaded automatically. ojobrt's temporary startup HTTP listener is not included.

## Deploy manually

Create an execution role trusted by `lambda.amazonaws.com` with CloudWatch Logs permissions (for example `AWSLambdaBasicExecutionRole`). For S3 workloads add `s3:GetObject` restricted to the workload prefix, plus `kms:Decrypt` if the objects require a customer-managed KMS key. Ensure network access to S3/HTTP endpoints, including VPC endpoints or NAT when using a private VPC.

The following uses an existing deployment bucket in the function's region and an existing execution role. It creates a new function; it does not publish or modify infrastructure during the build.

```sh
aws s3 cp output/openaf-lambda-arm64.zip \
  s3://DEPLOYMENT_BUCKET/runtimes/openaf-lambda-arm64.zip

aws lambda create-function --function-name openaf-job \
  --runtime provided.al2023 --architectures arm64 \
  --handler main.yaml --memory-size 512 --timeout 30 \
  --role arn:aws:iam::ACCOUNT:role/LambdaExecutionRole \
  --code S3Bucket=DEPLOYMENT_BUCKET,S3Key=runtimes/openaf-lambda-arm64.zip

aws lambda invoke --function-name openaf-job \
  --cli-binary-format raw-in-base64-out \
  --payload '{"name":"Lambda"}' response.json
cat response.json
```

For a remote workload, supply an environment file when creating the function:

```json
{
  "Variables": {
    "OJOB_METHOD": "s3",
    "OJOB_CONFIG": "s3://WORKLOAD_BUCKET/jobs/package.zip",
    "OJOB_ENTRYPOINT": "main.yaml",
    "OJOB_JSONLOG": "true"
  }
}
```

Pass it as `--environment file://environment.json`. For JavaScript embedded builds, use `--handler main.js`. Match `--architectures x86_64` to the x86_64 ZIP. Workload expansion uses Lambda's ephemeral storage; increase `--ephemeral-storage '{"Size":1024}'` and `OJOB_MAX_BYTES` together when needed.

## Validation

```sh
# Local OpenAF/JRE, with a fixture Runtime API and HTTP download service:
oaf -f tests/test_runtime.js -e 'openaf=/path/to/openaf java=/path/to/java'

# Actual deployment ZIP on read-only AL2023, as an unprivileged user:
oaf -f tests/test_runtime.js -e 'zip=output/openaf-lambda-arm64.zip arch=arm64'
oaf -f tests/test_runtime.js -e 'zip=output/openaf-lambda-x86_64.zip arch=x86_64'
```

The S3 integration test uses the real AWS signer with dummy temporary credentials and redirects its generated download URL to the local fixture. It verifies binary transport and signing parameters; it does not prove live AWS access. For live verification, upload a workload ZIP, configure the S3 environment above, invoke twice, and check that CloudWatch shows one preparation followed by two successful invocations. No AWS deployment is performed by these tests.

An opt-in live AWS harness creates temporary `nma-temp-test-*` roles/functions and uploads fixtures beneath a unique run directory in the selected S3 prefix:

```sh
oaf -f tests/live_aws.js -e 'profile=default region=eu-west-1  bucket=YOUR_TEST_BUCKET prefix=mvms memory=1024 runs=3'
```

The profile needs Lambda create/configure/invoke/read/delete permissions, IAM create/read/delete role and inline-policy permissions plus `iam:PassRole`, S3 upload/read/delete and object/version listing permissions, and CloudWatch Logs read/delete permissions. The generated execution role can read only that run's `workloads/` objects and write its test-function logs. The bucket must already exist in the selected region.

The harness exercises embedded scripts/oJobs, S3 files/ZIPs, nested resources, warm-state recovery, denied/missing objects, integrity failures and HTTP retrieval through a temporary presigned S3 URL. It compares fresh-environment `auto`/`off` invocations on both architectures using an embedded oJob, with configurable memory (1024 MiB by default) and a 60-second function timeout, and checks CloudWatch CDS mapping separately. Select `benchmarkWorkload=s3` to include retrieval in the measurements. Initialization retries are recorded separately from successful initialization metrics.

Live testing observed S3 preparation exceeding Lambda's initial 10-second initialization window at both 512 and 1024 MiB. Lambda retried initialization during the first invocation and returned successfully, but cold-start latency increased. Increasing memory to 1024 MiB alone did not eliminate this behavior. Embedded workloads initialized within the window in the initial checks. See [AWS's execution lifecycle](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html) for the initialization/retry behavior.

The harness deletes its functions, log groups, uploaded object versions and role on completion or failure, then verifies absence and retries any late-created test log groups; `keep=true` explicitly retains resources. Evidence and a resource/cleanup journal are saved under `output/live-aws/`. Resume a retained or interrupted run with `resume=output/live-aws/RUN_ID/journal.json`; `benchmarkOnly=true` skips functional checks already captured in that run. Presigned URLs are excluded from recorded configuration and logs. See [the live AWS results](LIVE_AWS.md) for the completed run and its startup findings.

The shell bootstrap uses a short preparation JVM, then starts the reusable invocation JVM in the workload directory. Cold-start measurements must include both processes. CDS archives are architecture/JRE/flag-specific and are generated inside the target Linux builder using the same `repackCDS` helper used by OpenAF install/repack. The builder calls that helper directly to preserve the selected JAR, including unpublished local builds. `auto` may fall back; build-time validation uses `-Xshare:on` to reject unusable OpenAF archives.

Compare sharing modes on the same archive-enabled ZIP:

```sh
oaf -f tests/benchmark.js -e 'zip=output/openaf-lambda-arm64.zip  arch=arm64 runs=7 kind=ojob output=output/benchmark-ojob.json'
oaf -f tests/benchmark.js -e 'zip=output/openaf-lambda-arm64.zip  arch=arm64 runs=7 kind=js output=output/benchmark-js.json'
```

The benchmark alternates `auto`/`off`, measures both cold-start JVMs and warm events, and separately checks CDS logs to confirm that both JVMs map `.shared.oaf`. It uses AL2023 with 512 MiB and one CPU. Container wall time includes Docker startup; JVM time excludes that overhead. These are local process-start measurements with a warm host filesystem, not AWS Lambda cold-start measurements. Raw samples and CDS diagnostics accompany each summary. See [the validation and startup comparison](BENCHMARKS.md) for the measured Java 25/27 and Corretto results.

## Lambda MicroVM images

The optional MicroVM target produces an **image source ZIP** containing a Dockerfile and the complete Java/OpenAF payload. AWS builds this source into a MicroVM image and snapshots the initialized runtime. This is separate from the standard Lambda function ZIP and Runtime API deployment above. The current MicroVM API supports `ARM_64` only.

```sh
# Build Java/OpenAF and package the MicroVM image source (arm64).
oaf -f scripts/build.js -e 'target=microvm workload=examples/ojob'

# Or reuse an already built arm64 runtime without downloading Java/opacks again.
oaf -f scripts/microvm.js -e 'runtimeZip=output/openaf-lambda-arm64.zip'
```

Outputs: `output/openaf-microvm-arm64.zip` and its `.manifest.json`, including source/runtime hashes. Existing Java 25+, provider, opack, workload and CDS build options still apply. Packaging reuses the function ZIP builder, including its 250 MiB uncompressed size guard. `ojob build.yaml target=microvm` exposes the same target. An x86_64 MicroVM build fails explicitly.

The `workload` build option controls files embedded in the image source ZIP. For an S3-hosted workload, it is fine to leave the default example in that ZIP: set `OJOB_METHOD=s3`, `OJOB_CONFIG`, and `OJOB_ENTRYPOINT` when creating the MicroVM image, and the image builder retrieves the configured ZIP and prepares that workload instead. For example, first build and upload the generic runtime source:

```sh
oaf -f scripts/build.js -e 'target=microvm arch=arm64'
aws s3 cp output/openaf-microvm-arm64.zip \
  s3://DEPLOYMENT_BUCKET/microvm/openaf-microvm-arm64.zip
```

Then configure the S3 workload as image environment variables:

```sh
aws lambda-microvms create-microvm-image --region eu-west-1 \
  --name openaf-my-ojob \
  --code-artifact uri=s3://DEPLOYMENT_BUCKET/microvm/openaf-microvm-arm64.zip \
  --base-image-arn arn:aws:lambda:eu-west-1:aws:microvm-image:al2023-1 \
  --build-role-arn arn:aws:iam::ACCOUNT:role/MicrovmBuildRole \
  --cpu-configurations '[{"architecture":"ARM_64"}]' \
  --resources '[{"minimumMemoryInMiB":1024}]' \
  --environment-variables '{"OJOB_METHOD":"s3","OJOB_CONFIG":"s3://WORKLOAD_BUCKET/path/workload.zip","OJOB_ENTRYPOINT":"jobs/main.yaml","OJOB_S3_REGION":"eu-west-1"}' \
  --egress-network-connectors arn:aws:lambda:eu-west-1:aws:network-connector:aws-network-connector:INTERNET_EGRESS \
  --hooks '{"port":8081,"microvmImageHooks":{"ready":"ENABLED","readyTimeoutInSeconds":300,"validate":"ENABLED","validateTimeoutInSeconds":60},"microvmHooks":{"run":"ENABLED","runTimeoutInSeconds":60,"resume":"ENABLED","resumeTimeoutInSeconds":60}}'
```

The workload ZIP must contain `jobs/main.yaml` at the selected path. The build role needs `s3:GetObject` for both the image source ZIP and workload ZIP, plus the documented CloudWatch Logs permissions; image-build egress must reach S3. Image environment variables are fixed at build time, and the workload is downloaded before the image snapshot. Rebuild the image to pick up a changed workload. For an embedded JavaScript workload, set `OJOB_ENTRYPOINT=main.js`; the default entrypoint is `main.yaml`.

The Dockerfile uses AWS's snapshot-compatible `public.ecr.aws/lambda/microvms:al2023-minimal` container base and copies the prebuilt Java/OpenAF payload. It installs no additional language runtime; Host build/test tools also use OpenAF; the builder bootstraps Java/OpenAF with a shell script. OpenAF's `ow.server.httpd` serves HTTP directly, and its `Threads` plugin runs workloads with a deadline. The existing bootstrap prepares the workload and starts the reusable JVM in MicroVM mode; there is no local proxy or interprocess invocation connection. When reusing an older function ZIP, the packager overlays this package's current runtime JavaScript/bootstrap and updates its runtime hash. No function resource is created by the MicroVM path.

- Application port **8080**: `POST /invoke` with a JSON event returns the workload's JSON result. `GET /health` reports JVM health. A workload error returns HTTP 500; malformed input returns 400; an overlapping invocation returns 409.
- Hook port **8081**: implements `/aws/lambda-microvms/runtime/v1/ready`, `/validate`, `/run` and `/resume`. Readiness requires the JVM's HTTP services to be configured. Hooks check runtime availability without executing user code. Restrict caller authentication tokens to port 8080.
- The same JVM handles requests serially. `OAF_MICROVM_TIMEOUT` defaults to 60 seconds; a timed-out workload returns 408, interrupts its worker and marks the instance unhealthy to prevent reuse of uncertain state. Terminate and replace that MicroVM; interruption cannot forcibly stop every possible user script. Maximum JSON request size is 6 MiB.
- The Lambda-shaped `__lambdaContext` contains a fresh request ID and request deadline; `invokedFunctionArn` and `traceId` are empty because this is a MicroVM, not a function invocation.

Workload preparation occurs **during image creation, before the snapshot**. Embedded and local workloads are copied then; HTTP/S3 workloads are fetched once by the image builder. Set the existing `OJOB_*` options as image environment variables (including `OJOB_S3_REGION` for S3), give the build role access to the source workload, and configure image-build egress. Rebuild the image to pick up remote workload changes. Workload code itself executes only on `/invoke`; do not store credentials or tenant-specific secrets in image environment variables or embedded files. The runtime does not interpret `runHookPayload` or change workloads per instance. User-created connections and globals persist across requests and suspension; workload code must refresh external connections/credentials when needed.

### Create and run an image manually

Use a current AWS CLI exposing `lambda-microvms`. Supply a build role trusted by `lambda.amazonaws.com` for both `sts:AssumeRole` and `sts:TagSession`, with `s3:GetObject` for the source ZIP (and any remote workload) and CloudWatch Logs write permissions. An optional runtime execution role uses the same trust actions and provides permissions needed by workload code.

```sh
aws s3 cp output/openaf-microvm-arm64.zip s3://DEPLOYMENT_BUCKET/microvm/image.zip

aws lambda-microvms create-microvm-image --region eu-west-1 \
  --name openaf-microvm \
  --code-artifact uri=s3://DEPLOYMENT_BUCKET/microvm/image.zip \
  --base-image-arn arn:aws:lambda:eu-west-1:aws:microvm-image:al2023-1 \
  --build-role-arn arn:aws:iam::ACCOUNT:role/MicrovmBuildRole \
  --cpu-configurations '[{"architecture":"ARM_64"}]' \
  --resources '[{"minimumMemoryInMiB":1024}]' \
  --hooks '{"port":8081,"microvmImageHooks":{"ready":"ENABLED","readyTimeoutInSeconds":300,"validate":"ENABLED","validateTimeoutInSeconds":60},"microvmHooks":{"run":"ENABLED","runTimeoutInSeconds":60,"resume":"ENABLED","resumeTimeoutInSeconds":60}}'

aws lambda-microvms get-microvm-image --region eu-west-1 \
  --image-identifier IMAGE_ARN
# Wait for CREATED, then check latestActiveImageVersion is SUCCESSFUL with:
aws lambda-microvms get-microvm-image-version --region eu-west-1 \
  --image-identifier IMAGE_ARN --image-version IMAGE_VERSION

aws lambda-microvms run-microvm --region eu-west-1 \
  --image-identifier IMAGE_ARN --image-version IMAGE_VERSION \
  --ingress-network-connectors arn:aws:lambda:eu-west-1:aws:network-connector:aws-network-connector:ALL_INGRESS \
  --maximum-duration-in-seconds 600
# Wait for RUNNING using get-microvm, then generate a token:
aws lambda-microvms create-microvm-auth-token --region eu-west-1 \
  --microvm-identifier MICROVM_ID --expiration-in-minutes 10 \
  --allowed-ports '[{"port":8080}]'

curl https://MICROVM_ENDPOINT/invoke \
  -H 'X-aws-proxy-auth: TOKEN_FROM_RESPONSE' \
  -H 'Content-Type: application/json' -d '{"name":"MicroVM"}'

aws lambda-microvms terminate-microvm --region eu-west-1 --microvm-identifier MICROVM_ID
aws lambda-microvms delete-microvm-image --region eu-west-1 --image-identifier IMAGE_ARN
# Also remove the uploaded source ZIP and any logs/roles created for this deployment.
```

Image environment variables are fixed at build time. To compare sharing, create separate images with `--environment-variables '{"OAF_JAVA_XSHARE":"auto"}'` and `off` using the same archive-enabled source ZIP. Image-build time, snapshot launch, first HTTP request, warm HTTP request and request latency after resume are separate measurements; function cold-start numbers in [LIVE_AWS.md](LIVE_AWS.md) do not measure this service.

### MicroVM validation

```sh
oaf -f tests/test_build.js
oaf -f tests/test_microvm.js
oaf -f tests/test_live_metrics.js
oaf -f tests/test_live_harness.js

# Extract the image source ZIP into a build directory, then:
docker build --platform linux/arm64 -t openaf-microvm-test:local BUILD_DIRECTORY
oaf -f tests/test_microvm_container.js -e 'image=openaf-microvm-test:local'

# Opt-in AWS test: creates temporary images, MicroVMs, role, logs and S3 source.
# Use the default example oJob bundle; responses are checked against that fixture.
oaf -f tests/live_microvm.js -e 'profile=default region=eu-west-1  bucket=YOUR_TEST_BUCKET prefix=mvms runs=3'

# Retry interrupted/failed cleanup using the private resource journal:
oaf -f tests/live_microvm.js -e 'cleanup=output/live-microvm/RUN_ID/journal.json'
```

The live test builds separate `auto`/`off` images, checks active version build success, launches fresh MicroVMs, verifies first/warm requests with unique request IDs, suspends/resumes each instance and invokes again, then requests resource cleanup. It uses 1024 MiB and a 600-second maximum instance lifespan. The profile needs MicroVM image/lifecycle/auth APIs, `iam:PassRole`, temporary IAM role/policy management, S3 object/version management, and CloudWatch Logs management. Private journals contain resource identifiers; the measurement report omits account/resource identifiers and never records authentication tokens. Evidence belongs in ignored `output/live-microvm/`. Container tests establish application behavior, not AWS snapshot correctness; only completed live image/lifecycle checks establish that.

AWS references: [image creation and hooks](https://docs.aws.amazon.com/lambda/latest/dg/microvms-images.html), [running and authenticating MicroVMs](https://docs.aws.amazon.com/lambda/latest/dg/microvms-launching.html), [snapshot compatibility](https://docs.aws.amazon.com/lambda/latest/dg/microvms-images-snapshots.html).

See [the native MicroVM verification report](LIVE_MICROVM.md) for image-build, lifecycle and `auto`/`off` measurements.

## Package maintenance

The build, fixture, benchmark and live verification tools run through OpenAF; Python is no longer required. The shell builder bootstrap downloads the selected Java/OpenAF before native assembly begins. Live verification still uses the AWS CLI.

Regenerate opack metadata with `opack genpack . --exclude output,__pycache__` and retain the date-based package version. The exclusions keep deployment ZIPs, measurements and private AWS journals out of the distributed package.
