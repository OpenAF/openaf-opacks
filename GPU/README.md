# GPU

Optional GPU acceleration for a deliberately restricted subset of ordinary Rhino JavaScript functions. Uses OpenAF's existing JNA and Rhino dependencies, an approximately 23 KiB Java helper, and an installed OpenCL runtime. An optional Metal backend uses a bundled macOS native bridge. Core delegation is available in a compatible OpenAF build; older builds can use the explicit `ow.gpu` adapters.

Requires OpenAF **20261009+** and Java **21+**. Java 27 on macOS arm64 was tested; Java 21 is the compilation target but has not been executed locally. GPU execution was verified on Apple M2 Pro through OpenCL 1.2 and Metal. Linux, Windows, other GPU vendors, and other Apple systems need hardware validation. Apple deprecated OpenCL in macOS 10.14; availability on future macOS versions is not assured.

This is an experimental MVP. Some local launches, including the isolated installation test, failed Apple OpenCL discovery with `CL_INVALID_VALUE`; the cause remains unresolved. CPU execution passed in those runs. Successful GPU tests and benchmarks do not establish reliable deployment support yet.

## Install and load

```sh
opack install /path/to/GPU-20261011.opack
```

```javascript
loadLib("gpu.js")
ow.loadGPU()
```

The bootstrap registers the external `ow.loadGPU()` loader. Installation does not install drivers, modify launch scripts, or download dependencies. No JDK/compiler, Python, Node.js, or second JavaScript engine is needed by users. Native backend initialization is lazy; explicit CPU execution does not initialize OpenCL.

This package has not been published to the central oPack repository. After publication, `opack install GPU` can resolve it by name.

## Automatic acceleration

To learn the fastest available route for repeated calls, select `backend:"adaptive"`:

```javascript
var calculate = ow.gpu.auto(function(a,b,c) {
  for(var i=0;i<a.length;i++) { c[i]=a[i]*2.5+b[i] }
}, {backend:"adaptive",mode:"fast"})
var a=new Float32Array(262144),b=new Float32Array(262144),c=new Float32Array(262144)
for(var step=0;step<32;step++){a[0]=step;calculate(a,b,c)} // Useful calls teach the selector.
print(ow.gpu.explain(calculate).selection)
```

The first two qualifying calls run the original function on CPU. Subsequent useful calls trial the default device of each available OpenCL/Metal backend three times, then run fourteen useful CPU calibration calls (sixteen CPU samples including the initial two) and choose the lowest observed warm complete-call cost, requiring at least a 10% benefit over CPU. The first trial initializes/compiles; its measurement is replaced by the second, and compilation/discovery time is excluded from warm estimates. A rolling median of the last three post-trial CPU calls replaces cold Rhino startup costs. These useful calls also let Rhino/JVM warm up before settling on a route. Actual call timings still include those startup costs. Every 32 qualifying calls, an actual CPU call refreshes the baseline and the next call refreshes one GPU candidate, rotating across devices. No call is duplicated for calibration. Failed candidates are suppressed independently until `clearCache()`; a failed precommit attempt invokes the original once, and a postcommit failure still surfaces without rerunning it.

Learning is per wrapper, homogeneous array type and **exact length**, with at most 64 workload histories. `explain(wrapper).selection` reports CPU sample counts/cost and per-device warm cost, sample count and failure status. `minElements` defaults to 0 for adaptive mode; an explicit minimum skips GPU discovery/trials below that size. `device` can restrict candidates to one ID. Without it, only the first compatible OpenCL GPU and the default Metal GPU compete; this avoids repeatedly destroying the single OpenCL context/cache when switching devices. `clearCache()` resets learning lazily on the next call.

This optimizes repeated warm execution, not guaranteed lowest total time for short runs. Discovery, compilation and trial calls can cost more than they save, calibration occasionally uses a slower route, and noisy timings or changing load can affect choices. Small inputs normally settle on CPU; large inputs may favor either GPU backend. Floating-point arithmetic still requires explicit `mode:"fast"` and its documented FP32 differences. Strict integer mode preserves the supported bitwise semantics.

See [adaptive validation](tests/ADAPTIVE-RESULTS.md) for reproducible policy tests and live CPU/OpenCL/Metal selection evidence.

The existing default `backend:"auto"` retains its OpenCL-only threshold policy, shown below. Explicit `cpu`, `opencl` and `metal` remain available.

```javascript
var calculate = ow.gpu.auto(function(a,b,c) {
  for (var i=0;i<a.length;i++) {
    c[i]=a[i]*2.5+b[i]
  }
}, {mode:"fast"})

var a=new Float32Array(262144),b=new Float32Array(262144),c=new Float32Array(262144)
calculate(a,b,c) // Rhino: first qualifying call
calculate(a,b,c) // Rhino: second qualifying call
calculate(a,b,c) // May compile and execute on GPU
print(ow.gpu.explain(calculate))
```

Functions keep ordinary positional arguments and synchronous calling behavior. CPU execution uses the original function object, receiver, return value and exception. Eligible GPU functions return `undefined`, as does the accepted source pattern. Wrappers are for ordinary calls, not construction with `new`; identity, name, length, prototype and stack frames are not preserved.

## Supported subset

One ordinary function, plain positional parameters, one `for (var i=0;i<a.length;i++)` loop, and exactly one `output[i]=expression` statement. Each input access must be at exactly `[i]`. Parameters can be homogeneous native typed arrays or numeric scalar values. Constants are supported. All parameters must be used. Output cannot be the loop-bound parameter or be read in the expression.

**Strict mode (default):** homogeneous `Int32Array` or `Uint32Array`, copy, `&`, `|`, `^`, `~`, and 32-bit integer scalar/literal bit patterns. Integer literals/scalars must be integers between -2147483648 and 4294967295. C unsigned operations preserve the result bits; no C signed overflow is used.

**Fast mode (opt-in):** homogeneous `Float32Array`, copy, `+`, `-`, `*`, finite numeric scalars/literals, and negative literals. Intermediates and scalar arguments use FP32. JavaScript normally evaluates arithmetic with double intermediates, even for Float32Array values. Rounding, overflow, underflow, subnormals, NaN representation and signed zero may differ. For example, `(16777216 + 1) - 16777216` is 1 in Rhino and 0 in FP32. Fused contraction and blanket relaxed-math flags are disabled.

Strict floating-point arithmetic, Float64Array, mixed types, ordinary arrays, objects, closures, calls (including Math), recursion, shifts, division, reductions, nested loops, shifted indices, output reads, additional statements, default/rest/destructured parameters, arrows and bound functions fall back to Rhino. Source unavailable from a precompiled function also causes fallback. The compiler does not parallelize arbitrary JavaScript.

Every call revalidates native classes, storage, lengths, scalar types, `.length` property behavior and overlapping output/input ranges. Custom getters are not executed during analysis/guards. Disjoint views of the same ArrayBuffer are allowed; overlapping output/input ranges fall back. Input/input aliasing is allowed. Short input/output arrays fall back so Rhino retains its own bounds behavior.

Typed-array storage is converted in bulk between Rhino and native byte orders while preserving bits. A device with a different native byte order from the host currently falls back. Participating buffers must remain exclusively owned by the caller until the synchronous call returns; external concurrent mutation/detachment is unsupported. GPU calls through one service are serialized, and disjoint concurrent calls are supported.

## API

| Method | Meaning |
|---|---|
| `available()` | A usable OpenCL or Metal GPU device was discovered; says nothing about function eligibility |
| `devices()` | OpenCL and Metal GPU device IDs, names, driver, version, endian and FP64 capabilities |
| `backends()` | CPU/OpenCL/Metal availability and discovery reason |
| `auto(fn, options)` | Create a guarded callable wrapper |
| `explain(fnOrWrapper)` | Static result, last specialization/compilation attempt, and last execution decision |
| `stats()` | CPU/GPU calls and wall times, failures, compilation, transfer bytes, cache entries and pooled bytes |
| `clearCache()` | Wait for active GPU work, release programs/buffers, clear analysis cache, reset selection history lazily |
| `close()` | Idempotent cleanup; existing wrappers subsequently use the original function |

`explain(rawFunction)` analyzes strict mode without executing or compiling. `explain(wrapper)` describes its configured mode. Compilation and last-call fields are historical; clearing the cache does not rewrite past-call diagnostics. A closed singleton stays closed; `new OpenWrap.GPU()` creates an independent service when needed.

| Option | Default | Behavior |
|---|---|---|
| `mode` | `"strict"` | `"strict"` integer subset or explicit `"fast"` Float32 subset |
| `backend` | `"auto"` | `"cpu"`, `"auto"`, `"adaptive"`, `"opencl"`, `"metal"`; adaptive learns CPU/OpenCL/Metal, auto retains OpenCL |
| `device` | `""` | ID from `devices()`; empty selects first compatible GPU |
| `minElements` | `131072` (`0` for adaptive) | Minimum qualifying workload; nonnegative integer |

Explicit OpenCL or Metal selection bypasses workload/reuse selection, never safety guards or fallback. Unknown/invalid options throw. `backend:"cpu"` executes the original directly. Empty workloads use Rhino. The first two qualifying automatic calls per type/size bucket use Rhino. Later calls trial GPU, use observed complete warm costs with a 10% benefit margin, and periodically recalibrate using actual CPU calls. A failed automatic GPU attempt is suppressed until `clearCache()`; explicit OpenCL may retry. First-use compilation can be much slower than Rhino. There is no guaranteed speedup.

OpenCL programs are cached in memory (32 entries) and array buffers reused with a 64 MiB device pool and corresponding host staging pool per service. Metal independently caches up to 32 pipelines, allocates shared device buffers and host staging per call, and limits aggregate array bytes to 64 MiB per call. `stats().cache.backends` separates backend occupancy; Metal pooled buffer bytes are zero. Array contents are always refreshed: object identity does not imply unchanged input. Analysis cache has 64 entries. Cache keys contain emitted code, compiler version, semantic mode, type and device; changing selected device destroys the previous context/cache. Discovery and driver information are process-local. No application-managed persistent binary cache is written.

## Optional Metal backend

```javascript
loadLib("gpu.js")
ow.loadGPU()
var xor = ow.gpu.auto(function(a,b,c) {
  for (var i=0;i<a.length;i++) { c[i]=a[i]^b[i] }
}, {backend:"metal"})
var out = new Int32Array(3)
xor(new Int32Array([1,2,3]), new Int32Array([4,5,6]), out)
print(ow.gpu.explain(xor)) // selectedBackend:"metal", executedOn:"GPU" on success
```

Metal is opt-in through `backend:"metal"` or `backend:"adaptive"`. `backend:"auto"` continues to select OpenCL or original Rhino; it does not switch to Metal. Adaptive mode can choose either GPU backend or CPU. `available()` reports either backend and `devices()`/`backends()` inspect both, so inspect the backend-specific entry when selecting explicitly. CPU-only wrappers initialize neither native backend.

The shipped `lib/libgpu-metal-aarch64.dylib` targets Apple Silicon, with a macOS 11 deployment minimum. Actual execution was tested only on the Apple M2 Pro with macOS 27/Java 27. Older macOS and Intel Macs are unverified; an Intel build requires rebuilding on that architecture. The filename follows Java's `os.arch` (`aarch64` or `x86_64`). Unsupported hosts or a missing bridge safely fall back to Rhino. The bundled installation passed Metal hardware checks through the normal OpenAF launcher; isolated `java -jar`/temporary-home launches reported `No Metal device` (and OpenCL discovery failed as well). The launch-dependent discovery issue remains unresolved. The bridge dynamically compiles MSL through the system Metal API; users need no development tools, extra JVM flags, or additional third-party Java dependencies.

Only the system default Metal device (`metal:0`) is exposed. The same restricted integer/fast Float32 subset and per-call guards apply. Metal accepts at most 31 parameters (buffer argument slots); larger signatures fall back. Fast math optimizations and fused contraction are disabled, but fast mode still uses FP32 intermediates and retains its documented numerical differences. Private output is committed only after successful command completion. Shared GPU buffers still require conversion and copying from Rhino storage. Pipeline caching does not imply buffer reuse or zero-copy execution.

`lib/gpu-runtime.jar` remains platform independent. On macOS the build additionally requires Apple's Command Line Tools and macOS SDK 15+; `ojob build.yaml` compiles the Objective-C bridge with ARC, Foundation and Metal. On other platforms it builds only the Java helper. Native driver crashes/hangs retain the same in-process limitations as OpenCL.

See [Metal validation](tests/METAL-RESULTS.md) for hardware checks, benchmark evidence and remaining platform gates.

## Failures and cleanup

GPU output stays private until compilation, transfers, execution and readback succeed. Before commit, an expected failure discards private results and invokes the original once. After commit begins, failure is surfaced without rerunning the original. Native library loading errors are contained in Java and reported through `backends()`.

Native driver crashes, VM-fatal errors and unbounded driver hangs cannot be recovered safely in-process. Always call `close()` when the service is no longer needed; OpenAF process exit also releases native process resources. JNA's shared native library is not unloaded by this oPack.

## Build, test and package

Maintainers need a JDK and existing OpenAF installation:

```sh
cd GPU
ojob build.yaml
oaf -f tests/testGPU.js
oaf -f tests/testMetal.js
oaf -f tests/testAdaptive.js
# Metal hardware test (failure to discover hardware is a failure):
oaf -c 'java.lang.System.setProperty("openaf.gpu.testMetal","true");load("tests/testMetal.js")'
# Complete-call Metal benchmark:
oaf -c 'java.lang.System.setProperty("openaf.gpu.benchmarkBackend","metal");load("tests/benchmarkGPU.js")'
# Explicit OpenCL hardware test, with no skip counted as a pass:
oaf -c 'java.lang.System.setProperty("openaf.gpu.testHardware","true");load("tests/testGPU.js")'
oaf -c 'load("tests/benchmarkGPU.js")'
opack genpack . --exclude build,GPU-20261011.opack
opack pack . --exclude build,GPU-20261011.opack
```

The tests also recognize `OPENAF_GPU_TEST_HARDWARE=1`. On the local machine, some environment-prefixed/file invocations returned `CL_INVALID_VALUE` during discovery, whereas the property-based command passed. The cause is unresolved; a failed probe is reported and uses CPU fallback. Do not infer cross-platform support from this result.

Hardware tests require a driver exposing an available GPU with an OpenCL C 1.2 compiler. Linux requires an installed vendor ICD/runtime; Windows requires the vendor OpenCL DLL/runtime. An OpenCL CPU device is never reported as GPU execution. Without hardware enabled, deterministic tests explicitly report skipped hardware cases. Benchmarking reports complete call cost and actual GPU execution, with 30 warmups and 30 alternating CPU/GPU samples.

See `examples/` and the repository-root GPU architecture, implementation-plan, POC-results and API-examples documents. Reductions, matrices, strict floating-point acceleration, CUDA and other extra backends, and transparent optimization are deferred.

## Collection adapters and optional core delegation

With the corresponding OpenAF core changes, installing this opack enables delegation for `pForEach` and `parallel4Array` by default. Loading `gpu.js` manually also makes the adapters available in that process. The core has no mandatory GPU dependency: missing/broken packages retain CPU behavior. A compatible **rebuilt** OpenAF JAR is required for automatic delegation; the date alone does not establish compatibility.

```javascript
var metrics = {};
var result = pForEach(values, function(value) { return value ^ 255 }, undefined,
                      false, undefined, {metrics: metrics});
// Environment: OAF_PFOREACH_GPU=false
// Process: __flags.PFOREACH.useGPU = false
// Call: pForEach(values, fn, err, false, undefined, {useGPU:false})
// Call: parallel4Array(values, fn, undefined, undefined, {useGPU:false})
```

The sixth `pForEach` argument and fifth `parallel4Array` argument accept `useGPU`, `execution`, `mode`, `minElements`, `maxWorkers` and `metrics`. `execution` requests `auto` (default), `sequential`, `parallel`, `opencl` or `metal`; unavailable GPU requests fall back to CPU. Core CPU parallel requests still respect pool pressure and global forced-sequential settings. `maxWorkers` caps CPU partitions. `metrics.execution` reports the actual route, `totalMs` includes adapter validation/conversion/materialization, `fallback` identifies failed native attempts, and `calls` counts useful calls for that specialization. Legacy CPU fallback paths provide core route/timeout metrics where supported.

Only dense ordinary arrays of primitive signed-int32 numbers and statically pure callbacks consisting of one returned value/constant/bitwise expression qualify by default. Callbacks may declare a second index parameter, but using it, closures, calls, property accesses, mutations and other statements keep the original CPU implementation. No callback is replayed for timing. Native attempts write private result arrays; a failure runs the original callback on CPU once. `mode:"fast"` additionally allows finite numeric inputs and `+`, `-`, `*` expressions with explicit FP32 differences. Results are ordinary arrays. Typed-array inputs and arbitrary callback compilation are not supported by these collection adapters.

Eligible workloads trial sequential and parallel CPU calls twice, then three useful calls on each available default OpenCL/Metal device when length is at least `minElements` (default 131072). CPU candidates receive eight useful samples each; the latest three warm observations form a median. GPU estimates discard the first compilation call. The selector requires a 10% improvement before switching from its current comparison baseline, and periodically refreshes one candidate every 32 calls. Histories are bounded to 64 exact-size specializations per callback/mode configuration. Failed candidates are suppressed until `clearCache()`; closing the service restores CPU execution. This learns warm repeated execution, not guaranteed minimum latency for the first call or every changing workload.

Forced sequential calls and positive explicit/default timeouts retain core CPU semantics and cancellation. The native drivers do not provide the same bounded timeout contract. Unsupported callbacks retain the existing core heuristics.

`parallel4Array` preserves its legacy reversed results **within each partition**; order between completed partitions remains unspecified. Callbacks that use partition-relative indexes retain the original implementation. Explicit thread counts or thread-control maps also bypass delegation, preserving `__threads` synchronization and UUID metadata. `parallelArray` itself is unchanged.

Explicit adapters are `ow.gpu.pForEach(values, fn, err, useSeq, timeout, options)` and `ow.gpu.parallel4Array(values, fn, options)`. The parallel CPU collection route requires the compatible core options; older cores keep their original CPU heuristics.

## OpenAF nLinq numeric aggregates

The maintained `../nLinq` OpenAF extension adds `$from(values).gpu(options).sum()` and corresponding `average()`, `min()` and `max()` methods. This is **explicit per-query opt-in**; browser nLinq is unchanged. Filters execute once before the numeric reducer. Keyed reductions, sparse/noninteger/nonfinite inputs and empty arrays retain their original implementation. Signed-int32 sum/average require `length * max(abs(value)) <= 2147483647` to preserve exact partial sums. Floating-point reductions remain on CPU.

The shared `ow.gpu.aggregate(values, operation, fallback, options)` engine compares CPU and GPU execution using useful calls. Native kernels calculate 256-element partial reductions, then JavaScript combines the partials. It currently transfers full-size private output buffers, so conversion and transfers can outweigh any kernel speedup. No aggregate speedup is claimed without workload-specific measurements. `metrics` costs exclude nLinq's preceding query/filter work, which is common to both routes.

`$path` assessment: its existing custom-function API can expose the same reducer for numeric `sum`, `avg`, `min` and `max` after CPU projections. General traversal, filters, strings, custom functions and keyed `min_by`/`max_by` should remain on their existing engine. An adapter can preserve JMESPath type/empty-result rules without rewriting expressions or adding a GPU dependency to the query parser.

Validation: `tests/testCollectionPolicy.js` provides injected-runtime selection/failure tests; `tests/testCollections.js` checks integration against the rebuilt core and sibling nLinq; `tests/benchmarkCollections.js` records actual useful-call routes. Run collection integration from the repository root, and policy/benchmark scripts from `GPU/`. `tests/testCollectionHardware.js` verifies both native backends and treats fallback as a failure. See [collection validation](tests/COLLECTION-RESULTS.md).
