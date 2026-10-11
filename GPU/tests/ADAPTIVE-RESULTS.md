# Adaptive selection validation — 2026-10-11

`backend:"adaptive"` learns CPU/OpenCL/Metal costs for supported functions without changing the existing default OpenCL-only `backend:"auto"` policy. Each call executes useful work once; only a failed precommit GPU attempt invokes CPU fallback. Existing safety guards and postcommit failure rules remain in force.

## Deterministic validation

`oaf -f tests/testAdaptive.js`: 22 checks with an internal injected clock and backends. Covers fastest GPU choice, CPU preference and benefit margin, replacing cold CPU startup, excluding GPU compilation from warm estimates, changing CPU/GPU costs and switching routes, exact-length learning, independent backend failures, postcommit no-rerun, missing GPUs, device restrictions, explicit CPU/minimum without discovery, cache reset and bounded histories. Fake timing is policy evidence, not hardware performance evidence.

## Live evidence

Apple M2 Pro, macOS 27, Java 27, OpenAF 20261011. Run:

```sh
oaf -c 'java.lang.System.setProperty("openaf.gpu.adaptiveEvidence","tests/evidence/20261011-apple-m2-pro-adaptive.json");load("tests/benchmarkAdaptive.js")'
```

[Raw results](evidence/20261011-apple-m2-pro-adaptive.json): 96 useful calls for each size, homogeneous Float32 arithmetic with exactly representable input/output fixtures and explicit fast mode. Zero mismatches. The final 32 calls include one CPU calibration and one rotating GPU calibration:

| Elements | CPU calls | OpenCL calls | Metal calls | Usual selected route |
|---:|---:|---:|---:|---|
| 4096 | 31 | 0 | 1 | CPU |
| 65536 | 1 | 30 | 1 | OpenCL |
| 262144 | 1 | 0 | 31 | Metal |

This demonstrates all three routes being selected by observed costs, rather than a fixed size-to-backend lookup. Choices can differ across runs and hardware. Timing includes validation, conversion, allocation/transfers, synchronization and commit. Compilation/discovery remain real startup costs, but are excluded from warm estimates; the first GPU sample is replaced by the second. The initial two CPU calls plus fourteen post-trial CPU calls allow useful Rhino/JVM warmup. The last three post-trial CPU costs form the initial warm median. Thereafter CPU and GPU estimates update as calls complete; calibration periodically retests alternatives.

A short-lived wrapper may lose time to discovery, compilation and trials. The policy optimizes repeated warm work, cannot guarantee the fastest individual call or predict future system load, and occasionally uses a slower route to recalibrate. Only the default device of each backend competes unless a device ID is explicitly selected, preserving the single OpenCL context/cache. At most 64 exact type/length histories are retained per wrapper. Native backend deployment limitations, including launch-dependent discovery, remain as documented in METAL-RESULTS.md.
