#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
protoc -I tests --include_imports --descriptor_set_out=tests/hello.protoset tests/hello.proto
run_test() {
  test_output=$(mktemp)
  if [ -n "${GRPC_OPENAF_JAR:-}" ]; then
    if ! java -jar "$GRPC_OPENAF_JAR" -f "$1" > "$test_output" 2>&1; then cat "$test_output"; rm -f "$test_output"; exit 1; fi
  else
    if ! openaf -f "$1" > "$test_output" 2>&1; then cat "$test_output"; rm -f "$test_output"; exit 1; fi
  fi
  cat "$test_output"
  if ! rg -q "$2" "$test_output"; then rm -f "$test_output"; exit 1; fi
  rm -f "$test_output"
}
run_test tests/conversion.js '^PASS: schema and binary conversion'
run_test tests/oafp.js '^PASS: oafp conversion and all client RPC patterns'
run_test tests/schema.js '^PASS: proto loading/imports/spaces'
run_test tests/test.js '^PASS: bounded queue overload'
run_test tests/stream.js '^PASS: streaming overload' 
if [ -n "${GRPC_TEST_CERTS:-}" ]; then run_test tests/tls.js '^PASS: TLS, mTLS'; fi
if [ -n "${GRPC_PEER_PYTHON:-}" ]; then sh tests/interop.sh; "$GRPC_PEER_PYTHON" tests/oafp-cli.py; fi
