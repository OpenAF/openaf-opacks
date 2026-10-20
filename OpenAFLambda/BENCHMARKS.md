# Runtime validation and startup comparison

Validated on 2026-10-20. The default is Temurin Java 25 with `-Xshare:auto` and OpenAF's generated `.shared.oaf`. Corretto and newer Java releases remain explicit build options.

These process-start comparisons concern the function runtime. Native Lambda MicroVM images snapshot an initialized OpenAF HTTP service; their launch and request measurements are in [LIVE_MICROVM.md](LIVE_MICROVM.md).

## Functional evidence

- Java 25 Temurin: all 13 integration tests passed for arm64 and x86_64, using the actual deployment ZIPs on AL2023 with a read-only filesystem, an unprivileged user, 512 MiB and one CPU. The x86_64 runs used Docker Desktop emulation on an arm64 host.
- Java 25 Corretto: all 13 integration tests passed under the same arm64 container constraints.
- Java 27 Temurin: all 12 tests present at that point passed under the same arm64 constraints; the later malformed/duplicate-archive test also passed on Java 25.
- Coverage includes local files/ZIPs, nested resources, HTTP authentication, binary data, SHA-1/SHA-256 checks, malformed/escaping/duplicate archives, initialization errors, repeated script/oJob invocations, error recovery, runtime context, installed opack discovery, and response-delivery failure.
- The local S3 test uses the real AWS signer and dummy temporary credentials, then redirects the resulting download to a local fixture. Live AWS S3 access, IAM permissions and deployed Lambda invocations were subsequently checked in `eu-west-1`; see [the live AWS verification](LIVE_AWS.md) for the results and the S3 cold-start limitation found there.

The final runtime additionally runs oJob shutdown/cleanup before responding. This path is covered by focused final-artifact checks for script recovery, oJob recovery, S3 transport and package discovery; the broader suite above was run on the comparison artifacts.

## Measurements

The fixture uses AL2023, 512 MiB and one CPU. Each comparison alternates sharing modes across seven fresh containers per mode and sends twenty warm events after the first event. The host filesystem is warm; these are local process starts, not AWS Lambda cold starts. No build or other integration suite ran during the comparison.

Cold JVM time is the sum of preparation-JVM uptime and invocation-JVM uptime at the first response. It excludes Docker startup and shell/process handoff overhead. The raw reports also include container wall time and every warm sample. TCP_NODELAY is enabled on the fixture to avoid artificial delayed-ACK stalls.

| Runtime / workload | `off` cold JVM median | `auto` cold JVM median | Reduction | Warm median, off / auto |
|---|---:|---:|---:|---:|
| Temurin 25 / oJob | 3.243 s | 3.135 s | 3.3% | 73.46 / 70.97 ms |
| Corretto 25 / oJob | 3.279 s | 3.053 s | 6.9% | 70.22 / 71.23 ms |
| Temurin 27 / oJob | 3.254 s | 3.130 s | 3.8% | 73.89 / 69.33 ms |
| Temurin 25 / JavaScript | 2.306 s | 2.159 s | 6.4% | 3.76 / 3.90 ms |

The warm figures show no consistent sharing-mode advantage. These small samples support a modest cold-start benefit from sharing; they do not establish statistically significant provider differences. Java 27 did not provide a material additional benefit in this workload, so Java 25 remains the default.

Every comparison separately logged CDS mapping and confirmed that **both** JVMs mapped `.shared.oaf`. The archives were generated with OpenAF's own install/repack helper and validated with `-Xshare:on`; these results do not rely on `auto` silently falling back. The selected OpenAF JAR was preserved byte-for-byte in all three comparison builds.

The newer AOT work described by [OpenJDK Project Leyden](https://openjdk.org/projects/leyden/) is separate from an application-specific cache trained for an arbitrary downloaded workload. This runtime uses OpenAF's validated CDS generation; it does not automatically train or enable an application AOT cache for user bundles.

## Size tradeoffs

Arm64 comparison ZIPs use stable OpenAF `20261015`, AWS `20260923`, and oJob-common `20261004`. Java 25 reported `25.0.4.1`; Java 27 reported `27`.

| Runtime | ZIP size | Expanded size | OpenAF archive |
|---|---:|---:|---:|
| Temurin 25 | 97.18 MiB | 205.57 MiB | 18.00 MiB |
| Corretto 25, linked runtime | 126.96 MiB | 178.43 MiB | 18.19 MiB |
| Temurin 27 | 97.33 MiB | 204.65 MiB | 17.25 MiB |

Corretto's linked/compressed modules save expanded space but compress less inside the deployment ZIP. Both providers passed the AL2023 checks. Temurin 25 remains the default because its ZIP is smaller and the measured provider latency difference is modest.

For Temurin 25, `.shared.oaf` adds 18 MiB expanded and approximately 4.49 MiB compressed. Use `--cds off` to omit it, or set `OAF_JAVA_XSHARE=off` to compare modes on an archive-enabled build. Retaining `auto` by default favors the observed cold-start improvement.

## Reproduce

```sh
python3 scripts/build.py --arch arm64 --java 25 --cds auto --output output/temurin25
python3 scripts/build.py --arch arm64 --java 25 --jre-provider corretto --cds auto --output output/corretto25
python3 scripts/build.py --arch arm64 --java 27 --cds auto --output output/temurin27

python3 tests/benchmark.py --zip output/temurin25/openaf-lambda-arm64.zip \
  --kind ojob --runs 7 --output output/benchmarks/temurin25-ojob.json
```

Repeat the benchmark with each candidate and `--kind js` for the JavaScript case. Raw JSON reports and `.cds.log` diagnostics from this run are in `output/benchmarks/`; they are generated artifacts excluded from the opack package. Each report embeds build versions and content hashes. Final deployable ZIPs and manifests are in `output/`.
