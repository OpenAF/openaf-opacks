#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
: "${GRPC_PEER_PYTHON:?Set GRPC_PEER_PYTHON to a Python interpreter with grpcio-tools installed}"
peer_tmp=$(mktemp -d)
cleanup() {
  kill "$peer_pid" 2>/dev/null || true
  wait "$peer_pid" 2>/dev/null || true
  rm -rf "$peer_tmp"
}
trap cleanup EXIT
"$GRPC_PEER_PYTHON" -m grpc_tools.protoc -I tests --python_out="$peer_tmp" --grpc_python_out="$peer_tmp" tests/hello.proto
export PYTHONPATH="$peer_tmp${PYTHONPATH:+:$PYTHONPATH}"
"$GRPC_PEER_PYTHON" tests/peer.py server "$peer_tmp/port" &
peer_pid=$!
count=0
while [ ! -s "$peer_tmp/port" ]; do
  count=$((count + 1))
  if [ "$count" -ge 100 ]; then exit 1; fi
  sleep .1
done
GRPC_PEER_PORT=$(cat "$peer_tmp/port")
export GRPC_PEER_PORT GRPC_PEER_PYTHON
if [ -n "${GRPC_OPENAF_JAR:-}" ]; then
  if ! java -jar "$GRPC_OPENAF_JAR" -f tests/interop.js > "$peer_tmp/output" 2>&1; then cat "$peer_tmp/output"; exit 1; fi
else
  if ! openaf -f tests/interop.js > "$peer_tmp/output" 2>&1; then cat "$peer_tmp/output"; exit 1; fi
fi
cat "$peer_tmp/output"
rg -q '^PASS: generated Python client -> OpenAF server' "$peer_tmp/output"
