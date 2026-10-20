# Live AWS Lambda MicroVM verification

Verified on 2026-10-20 in `eu-west-1`, using a test AWS environment and private S3 deployment storage. Resource identities and account details are omitted from this report.

**Native OpenAF MicroVM image creation and lifecycle checks passed.** AWS built two images, activated successful versions, and launched six MicroVMs from their snapshots. These checks use the separate `lambda-microvms` APIs, rather than Lambda function resources.

## Runtime and coverage

- arm64, AL2023 managed MicroVM base, 1024 MiB baseline memory, Temurin Java `25.0.4.1`, OpenAF `20261015`, AWS `20260923`, and oJob-common `20261004`.
- The deployment image contains Java/OpenAF and uses `ow.server.httpd` and `Threads`. It installs no Python runtime. A local container probe confirmed neither `python` nor `python3` was available; the source ZIP contains no Python files.
- Workload preparation finishes before snapshot readiness. OpenAF serves HTTP directly in the reusable JVM, with separate application and lifecycle-hook ports. No interprocess invocation connection is captured in the snapshot.
- Two image versions reached `SUCCESSFUL` and were activated. Three fresh MicroVMs per sharing mode reached `RUNNING`, with a 600-second maximum lifespan each.
- **18 successful HTTPS oJob requests:** first and warm requests, followed by an explicit API suspend/resume and another request, on each of six MicroVMs. Each instance returned distinct request IDs across its three requests.
- Local native-container checks additionally passed for scripts, oJobs, warm globals, error recovery, concurrent-request rejection, hook isolation, HTTP methods and timeout poisoning, with both sharing modes. Four packaging/lifecycle regression tests passed. The existing function integration suites passed 13 tests per architecture during this work.

The live workload was the embedded example oJob. MicroVM image builds fetching remote S3/HTTP workloads, direct-script images, Corretto and Java 27 were not deployed in this run. Their shared loader or previous function/container evidence is separate. Workload retrieval in this MicroVM target occurs during image creation, using the build role and image-build network access.

## Class-sharing comparison

The same archive-enabled source ZIP was used for separate `auto` and `off` images. OpenAF's archive was generated with its own sharing helper and validated by the runtime builder. Three complete launch/request/suspend/resume trials ran for `auto`, followed by three for `off`. The image-build calls took approximately 121.3 seconds and 121.0 seconds respectively, including AWS build/snapshot/validation and CLI polling.

| Sharing | Launch control-plane wall time | First request | Warm request | Request after resume |
|---|---:|---:|---:|---:|
| auto | 4.855 s | 3.968 s | 384.25 ms | 413.42 ms |
| off | 4.811 s | 4.458 s | 336.92 ms | 388.95 ms |

Launch wall time runs from the `run-microvm` CLI call until a status read reports `RUNNING`. It includes CLI/control-plane overhead and three-second polling intervals; it is not an isolated snapshot-restore measurement. Authentication-token creation and a health-only endpoint probe follow that measurement, before the first workload request.

Request timings include client networking, TLS, the MicroVM proxy and OpenAF execution. The after-resume column measures the request after an explicit resume has reached `RUNNING`; it excludes the resume API and transition itself. First requests include lazy oJob engine initialization; readiness and validation hooks do not execute user workloads.

`auto` had a lower median first-request time in this sample, while `off` had lower warm and after-resume request times. Launch measurements were similar at this polling resolution. Three trials per mode, grouped mode order and one image build per mode do not establish a consistent overall winner. These results are distinct from function `REPORT` timings in [LIVE_AWS.md](LIVE_AWS.md). Preloading the oJob engine before readiness is a possible future first-request optimization.

## Cleanup and evidence

All six MicroVMs were terminated. Both MicroVM images, the uploaded S3 source object and its versions, both CloudWatch log groups, the inline policy and the temporary role were deleted. Independent readback confirmed deleted images, terminated instances and absence of the scoped S3 versions, role and log groups. All development/cancelled-attempt cleanup journals also report success. The existing bucket and unrelated resources were retained.

Private evidence is in ignored `output/live-microvm/<run-id>/`:

- `report.json`: artifact hash, runtime versions, build checks, individual samples and medians.
- `journal.json`: resource identities, cleanup results and any failure diagnostics.
- `cloudwatch-0.json` and `cloudwatch-1.json`: image-build and application logs captured before log deletion.

Authentication tokens are not recorded. Development prototypes and cancelled attempts are excluded from these measurements; their separate private journals track cleanup. Generated evidence is excluded from opack metadata.

Reproduce with the MicroVM build and opt-in live-test commands in [README.md](README.md#lambda-microvm-images). See AWS's [MicroVM image workflow](https://docs.aws.amazon.com/lambda/latest/dg/microvms-images.html) and [runtime lifecycle](https://docs.aws.amazon.com/lambda/latest/dg/microvms-launching.html).
