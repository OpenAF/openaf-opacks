# Performance and large inputs

Build from `src` before measuring. Startup results depend on the JVM, OpenAF runtime, terminal, configured oPacks and their automatically loaded libraries. The CLI remains a standalone process.

## Reproduce measurements

```sh
cd src
ojob build.yaml op=build
cd ..
python3 src/tests/benchmark.py --latency-only --repeat 7
python3 src/tests/benchmark.py --rows 10000 100000 --repeat 3
python3 src/tests/benchmark.py --rows 1200 --fields 1024 --case sortkeys --repeat 3
python3 src/tests/terminal_test.py
```

The benchmark emits JSON lines with process duration, first-output latency, throughput, sampled peak RSS and an output hash. It drains output without retaining the dataset. RSS includes the launcher and its Java process, and requires permission to run `ps`; unavailable samples are reported as null. Add `--baseline /path/to/baseline.js` to compare a previously generated source or compiled entrypoint under the same runtime. New JSON streaming semantics are excluded from old-entrypoint comparisons. Different modes can legitimately have different output shapes, and legacy explicit parallel output may have different ordering.

For a constrained-heap stream test:

```sh
OAF_JARGS=-Xmx128m python3 src/tests/benchmark.py --rows 20000 200000 --case json-stream --repeat 1
```

Use `--slow-consumer-ms 2` to add a delay after each output chunk and exercise backpressure. Fixtures are temporary and removed after each run. Benchmarks have a 180-second limit per invocation.

## Sample comparison

The following local comparison used the same installed runtime and retained automatically loaded libraries. Startup is the median of seven invocations; bulk results are single runs and should be reproduced for a target environment.

| Workload | Baseline | Updated |
| --- | ---: | ---: |
| Tiny JSON command | 1.82 s | 1.36 s |
| 100,000 NDJSON records, sequential | 19.48 s | 10.25 s |
| 100,000 NDJSON records, explicit parallel | 24.40 s | 8.47 s |
| Explicit parallel sampled peak RSS | 3,051 MiB | 757 MiB |
| 1,200 records with 1,024 nested keys, automatic sorting | 3.46 s | 3.08 s |

Sequential peak RSS was not universally lower (611 versus 656 MiB in the NDJSON comparison). The main memory improvements are bounded retained work and incremental reading, rather than a guarantee that the JVM will reserve or commit less memory in every invocation.

With a fixed 128 MiB Java heap, JSON array streaming completed at both 20,000 and 200,000 records in all three parallel modes. Automatic-mode sampled total RSS was 638 and 602 MiB respectively, demonstrating approximately flat process memory across a tenfold increase in input. The heap limit does not limit native, class, compiler, library or thread memory.

Sequential and automatic-mode output hashes matched the baseline. Explicit parallel NDJSON became ordered; the legacy baseline permitted unordered output. New JSON streaming output matched record-oriented NDJSON output for equivalent records.

## Processing model

File extensions are resolved before reading. Record-oriented inputs consume files, stdin and command stdout incrementally. Command stderr is drained concurrently. CSV and explicit join modes still aggregate their records.

JSON array streaming retains one parsed element at a time plus bounded batches. Ordinary JSON documents retain the complete parsed document, but release the input buffer before filtering and rendering. `jsonprefix` avoids a redundant serialize/parse cycle. Queries that return additional copies and outputs that render a complete dataset still need proportional memory.

Automatic workers first warm up for 128 records, then measure 128 more. They activate only when that sample takes at least 32 ms of eligible computation. Queues hold at most two batches per worker, with at most four workers. Batches contain at most 128 records or approximately 1 MiB of JSON text; an oversized text record runs alone. Automatic parsing and independent map-key sorting preserve input order. Arbitrary scripts, libraries, framing, inferred headers, other transforms and output do not run concurrently through this path. Specialized LLM execution still requires explicit parallel opt-in.

The activity indicator uses OpenAF's `progressReport` with a 250 ms display delay and a 150 ms refresh. Noninteractive runs avoid console initialization and loading JLine's native terminal library just to detect redirected stderr. Use `progress=off` to suppress it.

The additive OpenAF API `io.readJSONArray(source, callback, encoding, raw)` accepts a filename or input stream and reads a top-level JSON array. The callback receives `(element, index)` and can return true to stop. `raw=true` supplies JSON text. Only filename-owned streams are closed by the reader. oafp includes a matching compatibility implementation for older runtimes.
