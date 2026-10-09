#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

containers=()
cleanup() {
  for container in ${containers[@]+"${containers[@]}"}; do
    docker rm -f "$container" >/dev/null 2>&1 || true
  done
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

oaf -f tests/regression.js
for spec in 'redis:8.10.2 true' 'redis:7-alpine false'; do
  read -r image has_json <<< "$spec"
  container=$(docker run -d --rm -p 127.0.0.1::6379 "$image" redis-server --save '' --appendonly no)
  containers+=("$container")
  ready=false
  for ((attempt=0; attempt<60; attempt++)); do
    if [[ "$(docker exec "$container" redis-cli ping 2>/dev/null || true)" == PONG ]]; then
      ready=true
      break
    fi
    sleep 1
  done
  if [[ "$ready" != true ]]; then
    docker logs "$container"
    exit 1
  fi
  address=$(docker port "$container" 6379/tcp)
  port=${address##*:}
  docker exec "$container" redis-server --version
  REDIS_TEST_HOST=127.0.0.1 REDIS_TEST_PORT="$port" REDIS_TEST_DB=15 REDIS_TEST_JSON="$has_json" ojob tests/tests.yaml
  docker rm -f "$container" >/dev/null
done
