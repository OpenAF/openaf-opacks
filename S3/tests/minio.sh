#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source_dir=$PWD
for tool in docker curl oaf ojob; do
  command -v "$tool" >/dev/null || { echo "Missing prerequisite: $tool" >&2; exit 1; }
done
docker info >/dev/null
umask 077
work=$(mktemp -d "${TMPDIR:-/tmp}/s3-minio.XXXXXXXX")
container="s3-test-$(date +%s)-$$"
created=0
cleanup() {
  result=$?
  trap - EXIT
  if [ "$created" = 1 ]; then
    if [ "$result" != 0 ]; then docker logs "$container" >&2 || true; fi
    docker rm -fv "$container" >/dev/null || result=1
  fi
  if [ "$result" = 0 ]; then
    rm -rf "$work"
  else
    echo "Test workspace and reports retained at: $work" >&2
  fi
  exit "$result"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# Isolate reports/downloads and exercise this checkout rather than installed code.
cp README.md s3.js s3.yaml s3-test.yaml s3-ojob-test.yaml "$work/"
cp -R tests "$work/tests"
for jar in "$source_dir"/*.jar; do ln -s "$jar" "$work/"; done
cd "$work"
oaf -f tests/regression.js
oaf -f tests/legacy.js

# Override inherited endpoint/credentials so the runner always owns its server.
export S3_TEST_ACCESS_KEY=openaf-test
export S3_TEST_SECRET_KEY=openaf-test-secret
export S3_TEST_REGION=us-east-1
image="${S3_TEST_IMAGE:-quay.io/minio/minio@sha256:14cea493d9a34af32f524e538b8346cf79f3321eff8e708c1e2960462bd8936e}"
# Pull before marking the container as created to keep failure cleanup precise.
if ! docker image inspect "$image" >/dev/null 2>&1; then docker pull "$image"; fi
docker create --name "$container" -p 127.0.0.1::9000 \
  -e MINIO_ROOT_USER="$S3_TEST_ACCESS_KEY" \
  -e MINIO_ROOT_PASSWORD="$S3_TEST_SECRET_KEY" \
  "$image" server /data >/dev/null
created=1
docker start "$container" >/dev/null
port=$(docker inspect --format '{{(index (index .NetworkSettings.Ports "9000/tcp") 0).HostPort}}' "$container")
export S3_TEST_URL="http://127.0.0.1:$port"
ready=0
for attempt in {1..60}; do
  if curl --noproxy '*' -fsS --max-time 2 "$S3_TEST_URL/minio/health/ready" >/dev/null 2>&1; then
    ready=1
    break
  fi
  if [ "$(docker inspect --format '{{.State.Running}}' "$container")" != true ]; then break; fi
  sleep 1
done
[ "$ready" = 1 ] || { echo "MinIO did not become ready" >&2; exit 1; }
echo "Testing against $S3_TEST_URL ($image)"
ojob s3-test.yaml
ojob s3-ojob-test.yaml
echo "PASS S3 local container suites"
