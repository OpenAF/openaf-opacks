# Metal validation — 2026-10-11

Experimental opt-in backend, tested on Apple M2 Pro, macOS 27, aarch64, Java 27, OpenAF 20261011. Java classes target Java 21; execution on Java 21 remains unverified. The native bridge was built with Apple's Command Line Tools/SDK 27 and a macOS 11 deployment minimum. This does not establish older macOS or Intel compatibility.

## Reproduce

From `GPU/`:

```sh
ojob build.yaml
oaf -f tests/testGPU.js
oaf -f tests/testMetal.js
oaf -c 'java.lang.System.setProperty("openaf.gpu.testMetal","true");load("tests/testMetal.js")'
oaf -c 'java.lang.System.setProperty("openaf.gpu.testHardware","true");load("tests/testGPU.js")'
oaf -c 'java.lang.System.setProperty("openaf.gpu.benchmarkBackend","metal");load("tests/benchmarkGPU.js")'
```

Deterministic OpenCL/service regression suite: 71 checks, hardware skipped explicitly. OpenCL hardware regression: 107 total checks, 21 marked hardware, no skips. Metal deterministic suite: 7 checks, hardware skipped. Metal hardware suite: 160 checks, 46 calls explicitly verified on the GPU, no skips (plus 8 concurrent calls checked for correct output). Metal deterministic checks verify emitter syntax, explicit selection, missing bridge containment and original-function fallback. The hardware suite additionally verifies signed/unsigned boundaries, scalar bits, random bitwise differential results, exact Float32 arithmetic, special-value copy, FP32 cancellation, contraction disabled, offsets, alias fallback, invalid device selection, compilation failure preserving output, input refresh, pipeline eviction, concurrent calls, cache clearing and closed-service fallback. Hardware-requested absence exits nonzero.

## Complete-call benchmark

[Raw evidence](evidence/20261011-apple-m2-pro-metal.json): 30 warmups and 30 alternating CPU/Metal samples per size. Every measured accelerated call was checked for actual GPU execution; zero mismatches on exactly representable fixtures.

| Elements | Rhino median ms | Metal median ms | Cold wrapper + call ms |
|---:|---:|---:|---:|
| 4096 | 0.197 | 1.088 | 25.270 |
| 65536 | 3.757 | 1.422 | 2.592 |
| 262144 | 14.672 | 1.941 | 3.458 |
| 1048576 | 58.870 | 5.210 | 7.190 |

Times include validation, byte conversion, per-call allocation, copies, GPU submission/wait, private readback, commit and diagnostics. Pipelines are cached; Metal buffers and command queues are allocated per call. Driver compilation caches were uncontrolled. These numbers do not establish a performance advantage over OpenCL, and small workloads are slower than Rhino. `transferBytes` counts logical bridge copies, not measured PCIe/DMA traffic on shared-memory hardware.

## Scope and remaining gates

Explicit `backend:"metal"` selects Metal directly; opt-in `backend:"adaptive"` can now learn CPU/OpenCL/Metal costs and choose it. The default `backend:"auto"` OpenCL selection and its thresholds are unchanged. Only the default Metal GPU is exposed. The shipped bridge is aarch64; other architectures require rebuilding. Pipeline cache: 32 entries per Metal service; array storage: at most 64 MiB per call; signature: at most 31 buffer argument slots. No persistent cache, resident arrays, pooled Metal buffers, or CUDA support.

Still unverified: Java 21 runtime, older macOS, Intel/discrete Mac GPUs, additional Apple GPU families, actual allocation/command failures and driver hangs. No live-driver failure recovery guarantee is claimed. No external dependencies were downloaded and no OpenAF core files were changed.

## Package and installed execution

Generated `GPU-20261011.opack`, retaining the current-date version `20261011`. Use `opack genpack . --exclude build,GPU-20261011.opack` and `opack pack . --exclude build,GPU-20261011.opack`: the bundle must be explicitly excluded when it already exists. ZIP inspection checked every member against current payload bytes, with no build directory or nested `.opack`. The clean OpenAF installer verified all 34 payload hashes plus package metadata, with zero failed installs.

Installed into `/private/tmp/openaf-metal-clean-oai8u75q/GPU` using a copied OpenAF JAR and temporary home/registration. Running the installed suite through the normal `/Applications/OpenAF/oaf` launcher passed all 160 Metal checks and 46 explicitly verified GPU calls, without building. A separate probe confirmed that `MetalBackend` was loaded from the installed helper JAR, rather than the source checkout or previously installed oPack.

The fully isolated minimal Java launch with `OAF_HOME`/`user.home` pointed at the temporary home could not discover Metal (`No Metal device`) or OpenCL (`clGetDeviceIDs: -30`). Similar direct-Java and temporary-launcher probes also failed; normal-launcher probes without the isolation environment discovered both. This is a launch-dependent observation, not a diagnosed cause. Clean isolated-launcher GPU execution remains unverified. CPU fallback preserved the correct result in that environment. Do not infer reliable deployment across launch configurations from the normal-launcher success.
