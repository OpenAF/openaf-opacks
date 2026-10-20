# Repository Guidelines

## Project Structure & Module Organization

OpenAFLambda is an independent opack within the `openaf-opacks` monorepo. It builds standalone AWS Lambda ZIPs containing Java 25+, OpenAF, AWS, and oJob-common.

- `runtime/bootstrap` starts workload preparation and the reusable invocation JVM; `runtime/lambda.js` handles workload retrieval and Lambda events.
- `scripts/build.py` orchestrates Docker Buildx; `scripts/assemble.py` installs dependencies and assembles artifacts inside AL2023.
- `examples/ojob/` and `examples/script/` contain embedded workloads.
- `tests/test_runtime.py` provides integration tests; `tests/benchmark.py` measures startup and class sharing.
- `build.yaml` exposes an oJob build wrapper; `.package.yaml` defines opack metadata. Generated ZIPs, manifests, and measurements belong in ignored `output/`.

## Build, Test, and Development Commands

Builds require Python 3.9+, Docker with Buildx, and internet access. Run commands from this directory:

```sh
python3 scripts/build.py --arch arm64 --workload examples/script
python3 tests/test_runtime.py --zip output/openaf-lambda-arm64.zip --arch arm64
python3 tests/test_runtime.py --openaf /path/to/openaf --java /path/to/java
```

The first command builds one architecture; omit options to build both architectures with the example oJob. The test commands exercise a deployment ZIP in Docker or a local OpenAF/JRE installation, respectively. See `README.md` for build options and `BENCHMARKS.md` for performance methodology.

## Coding Style & Naming Conventions

Match existing files: Python uses four-space indentation and `snake_case`; JavaScript uses two spaces, `var`, and camelCase. Preserve uppercase environment-variable names such as `OJOB_ENTRYPOINT`. No formatter or linter configuration is provided. Keep changes confined to this opack and preserve unrelated work.

## Testing Guidelines

Tests use Python's `unittest`, with `test_*` methods in `RuntimeTests`. Add regression cases for changed behavior, particularly preparation failures, archive validation, and warm invocation state. No numeric coverage target is defined. Validate each affected architecture and report prerequisites and untested paths. Fixture S3 tests verify signing and transport; live AWS access requires separate deployment evidence.

## Commit & Pull Request Guidelines

Monorepo history includes scoped messages such as `feat(oJobIO): ...` and `chore(ghcopilot): ...`; use concise messages with `OpenAFLambda` as the scope. PR descriptions should explain behavior changes, commands run, architecture/JRE coverage, and limitations. Update documentation for configuration changes. For opack updates, set the package version to the current `yyyyMMdd` date and run `opack genpack .` to regenerate metadata. Keep credentials and signed URLs out of commits and logs.
