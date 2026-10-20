# Live AWS Lambda function verification

This report covers standard Lambda function ZIPs using `provided.al2023`. It does not measure Lambda MicroVM images or snapshot launches. See the separate [native MicroVM report](LIVE_MICROVM.md) and [build instructions](README.md#lambda-microvm-images).

Verified on 2026-10-20 in `eu-west-1`, using a test AWS environment and a private S3 bucket with a run-specific prefix.

**Functional verification passed on arm64 and x86_64. S3 cold-start initialization remains a performance limitation:** some starts exceeded Lambda's initial 10-second initialization window, then succeeded after Lambda retried initialization during the invocation. This occurred at both 512 and 1024 MiB.

## What ran

- Four temporary Lambda functions: both architectures with `auto` and `off`, using `provided.al2023`, Temurin Java `25.0.4.1`, stable OpenAF `20261015`, AWS `20260923`, and oJob-common `20261004`.
- One temporary execution role trusted by Lambda, with read access restricted to this run's `workloads/` objects and write access to its function logs.
- Existing deployment ZIPs with two fixture additions: `function/probe.js` and `function/resource.txt`. Runtime, Java and OpenAF payloads were retained from the built ZIPs; base manifests and deployment hashes are recorded in the raw report.
- Seventeen invocations in the initial 512 MiB checkpoint, then a complete 28-invocation functional sweep at 1024 MiB. The embedded-workload benchmark and CDS diagnostics added 26 invocations at 1024 MiB.
- **71 invocations and 132 passing assertions**, including expected failure responses. Maximum memory reported across the run was **232 MiB**. No VPC attachment or public function URL was used.

| Scenario | Architecture coverage | Result |
|---|---|---|
| Embedded oJob, auto/off | arm64 and x86_64 | Passed |
| Embedded script, deliberate error and warm recovery | arm64 and x86_64 | Passed; same instance retained the expected invocation count |
| S3 ZIP, script and sibling resource, SHA-256 validation | arm64 and x86_64 | Passed with execution-role credentials |
| Standalone S3 script using bucket/key configuration | arm64 and x86_64 | Passed |
| Nested S3 oJob, relative resource, shutdown cleanup and recovery | arm64 and x86_64 | Passed |
| Missing/denied S3 object | arm64 | Expected initialization errors; both returned HTTP 403 with this role configuration |
| Incorrect SHA-256 | arm64 | Expected `OJOB_SHA256 mismatch.` initialization error |
| HTTP retrieval through a private S3 presigned URL | arm64 | Passed |
| Both JVMs mapping OpenAF's `.shared.oaf` | arm64 and x86_64 | Confirmed in CloudWatch logs |

The complete cross-architecture functional sweep used 1024 MiB. The 512 MiB run was checkpointed after its partial sweep to investigate initialization behavior. Corretto, Java 27, EFS, custom S3 endpoints and HTTP basic authentication were not deployed in this AWS run; their applicable local/container evidence remains separate.

## Native Lambda sharing measurements

Three fresh configurations per mode and architecture, alternating mode order, at **1024 MiB** with a 60-second function timeout. The benchmark used the bundled `examples/ojob/main.yaml` without S3 retrieval. Each cold invocation was followed by one warm invocation. These are small samples with visible variability, rather than steady-state throughput measurements.

`Init` is Lambda's successful `REPORT` initialization duration. Cold total is the median of each sample's `Init Duration + Duration`; it excludes AWS CLI/control-plane overhead. Warm is Lambda's reported first warm invocation duration. The local benchmark fixtures and resource limits differ, so compare their results separately.

| Architecture | Sharing | Median Init | Median cold total | Median first warm |
|---|---|---:|---:|---:|
| arm64 | auto | 5.516 s | 12.366 s | 542.09 ms |
| arm64 | off | 5.611 s | 12.123 s | 708.56 ms |
| x86_64 | auto | 6.830 s | 13.285 s | 611.14 ms |
| x86_64 | off | 7.050 s | 13.776 s | 533.95 ms |

No embedded benchmark trial hit the initial-init timeout. `auto` reduced median initialization time in both architecture samples, while total cold and warm timings were mixed. The run does not establish a clear overall latency advantage for either sharing mode. Mapping diagnostics ran separately from timed trials and confirmed that both preparation and invocation JVMs mapped OpenAF's archive on each architecture.

## S3 initialization finding

Three successful invocations at 512 MiB and three at 1024 MiB logged `INIT_REPORT ... Phase: init ... Status: timeout` before returning their expected results. The log sequence showed workload preparation, a timed-out initialization attempt, then repeated preparation and a ready invocation runtime.

For example, the 1024 MiB arm64 S3-script start logged a **9999.44 ms failed initialization** followed by an **11203.40 ms invocation duration**. The failed `INIT_REPORT` is not a successful initialization metric. The live parser now records these failures separately, with three focused regression tests.

AWS [documents the 10-second initialization limit and retry during the first invocation](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html). The current startup path prepares the workload and starts both JVMs before requesting the first invocation. This path needs optimization for predictable S3 cold-start latency. Increasing memory to 1024 MiB alone did not eliminate the observed retries. Startup-stage profiling or revisiting the preparation/first-invocation boundary is the next implementation task; no production runtime change was made during this verification.

## Cleanup and evidence

All four functions, four log groups, five uploaded S3 objects/versions, the inline role policy and the temporary role were deleted. An independent readback found one late-created CloudWatch log group, removed it, and repeated verification. Final checks confirmed no functions, role, log groups, active objects, object versions or delete markers remained for this run. The existing bucket and other prefixes were retained.

Evidence is in ignored `output/live-aws/<run-id>/`:

- `report.json`: all assertions, invocation responses/log tails, memory settings and benchmark samples.
- `report-512.json` and `report-1024-functional.json`: functional checkpoints.
- `arm64-cloudwatch.log` and `x86_64-cloudwatch.log`: archive-mapping diagnostics.
- `journal.json`: resource identities, uploaded object versions and cleanup actions.
- `cleanup-verification-initial.json` and `cleanup-verification.json`: the initial late-log finding and final successful absence checks.

Presigned URLs and credentials are excluded from recorded configuration/logs. Reproduce using `tests/live_aws.py`; see the opt-in live-verification commands in [README.md](README.md). Generated evidence and deployment fixtures are excluded from opack metadata.
