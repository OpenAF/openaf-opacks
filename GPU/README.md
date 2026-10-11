# GPU

Optional GPU acceleration for a deliberately restricted subset of ordinary Rhino JavaScript functions. Uses OpenAF's existing JNA and Rhino dependencies, an approximately 19 KiB Java helper, and an installed OpenCL runtime. OpenAF core and its normal installation remain unchanged.

Requires OpenAF **20261009+** and Java **21+**. Java 27 on macOS arm64 was tested; Java 21 is the compilation target but has not been executed locally. GPU execution was verified on Apple M2 Pro/OpenCL 1.2. Linux, Windows, other GPU vendors, and other Apple systems need hardware validation. Apple deprecated OpenCL in macOS 10.14; availability on future macOS versions is not assured.

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
| `available()` | A usable GPU device was discovered; says nothing about function eligibility |
| `devices()` | GPU device IDs, names, driver, version, endian and FP64 capabilities |
| `backends()` | CPU/OpenCL availability and discovery reason |
| `auto(fn, options)` | Create a guarded callable wrapper |
| `explain(fnOrWrapper)` | Static result, last specialization/compilation attempt, and last execution decision |
| `stats()` | CPU/GPU calls and wall times, failures, compilation, transfer bytes, cache entries and pooled bytes |
| `clearCache()` | Wait for active GPU work, release programs/buffers, clear analysis cache, reset selection history lazily |
| `close()` | Idempotent cleanup; existing wrappers subsequently use the original function |

`explain(rawFunction)` analyzes strict mode without executing or compiling. `explain(wrapper)` describes its configured mode. Compilation and last-call fields are historical; clearing the cache does not rewrite past-call diagnostics. A closed singleton stays closed; `new OpenWrap.GPU()` creates an independent service when needed.

| Option | Default | Behavior |
|---|---|---|
| `mode` | `"strict"` | `"strict"` integer subset or explicit `"fast"` Float32 subset |
| `backend` | `"auto"` | `"cpu"`, `"auto"`, `"opencl"` |
| `device` | `""` | ID from `devices()`; empty selects first compatible GPU |
| `minElements` | `131072` | Initial automatic threshold; nonnegative integer |

Explicit OpenCL selection bypasses workload/reuse selection, never safety guards or fallback. Unknown/invalid options throw. `backend:"cpu"` executes the original directly. Empty workloads use Rhino. The first two qualifying automatic calls per type/size bucket use Rhino. Later calls trial GPU, use observed complete warm costs with a 10% benefit margin, and periodically recalibrate using actual CPU calls. A failed automatic GPU attempt is suppressed until `clearCache()`; explicit OpenCL may retry. First-use compilation can be much slower than Rhino. There is no guaranteed speedup.

Programs are cached in memory (32 entries) and array buffers reused with a 64 MiB device pool and corresponding host staging pool per service. Array contents are always refreshed: object identity does not imply unchanged input. Analysis cache has 64 entries. Cache keys contain emitted code, compiler version, semantic mode, type and device; changing selected device destroys the previous context/cache. Discovery and driver information are process-local. No application-managed persistent binary cache is written.

## Failures and cleanup

GPU output stays private until compilation, transfers, execution and readback succeed. Before commit, an expected failure discards private results and invokes the original once. After commit begins, failure is surfaced without rerunning the original. Native library loading errors are contained in Java and reported through `backends()`.

Native driver crashes, VM-fatal errors and unbounded driver hangs cannot be recovered safely in-process. Always call `close()` when the service is no longer needed; OpenAF process exit also releases native process resources. JNA's shared native library is not unloaded by this oPack.

## Build, test and package

Maintainers need a JDK and existing OpenAF installation:

```sh
cd GPU
ojob build.yaml
oaf -f tests/testGPU.js
# Explicit hardware test, with no skip counted as a pass:
oaf -c 'java.lang.System.setProperty("openaf.gpu.testHardware","true");load("tests/testGPU.js")'
oaf -c 'load("tests/benchmarkGPU.js")'
opack genpack . --exclude build
opack pack . --exclude build
```

The tests also recognize `OPENAF_GPU_TEST_HARDWARE=1`. On the local machine, some environment-prefixed/file invocations returned `CL_INVALID_VALUE` during discovery, whereas the property-based command passed. The cause is unresolved; a failed probe is reported and uses CPU fallback. Do not infer cross-platform support from this result.

Hardware tests require a driver exposing an available GPU with an OpenCL C 1.2 compiler. Linux requires an installed vendor ICD/runtime; Windows requires the vendor OpenCL DLL/runtime. An OpenCL CPU device is never reported as GPU execution. Without hardware enabled, deterministic tests explicitly report skipped hardware cases. Benchmarking reports complete call cost and actual GPU execution, with 30 warmups and 30 alternating CPU/GPU samples.

See `examples/` and the repository-root GPU architecture, implementation-plan, POC-results and API-examples documents. Reductions, matrices, strict floating-point acceleration, extra backends and transparent optimization are deferred.
