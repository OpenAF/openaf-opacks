#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
for tool in docker k3d kubectl oaf; do
  command -v "$tool" >/dev/null || { echo "Missing prerequisite: $tool" >&2; exit 1; }
done
docker info >/dev/null
umask 077
work=$(mktemp -d "${TMPDIR:-/tmp}/kube-k3d.XXXXXXXX")
cluster="kube-test-$(date +%s)-$$"
created=0
cleanup() {
  result=$?
  trap - EXIT
  if [ "$created" = 1 ]; then
    if [ "$result" != 0 ]; then
      kubectl --request-timeout=10s get pods -A -o wide >&2 || true
      kubectl --request-timeout=10s get deployments,configmaps -n kube-integration >&2 || true
      kubectl --request-timeout=10s get events -n kube-integration >&2 || true
    fi
    k3d cluster delete "$cluster" || result=1
  fi
  rm -rf "$work"
  exit "$result"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
export KUBECONFIG="$work/config"
export KUBE_TEST_CONFIG="$KUBECONFIG"
export KUBE_TEST_CONTEXT="k3d-$cluster"
export KUBE_TEST_IMAGE="${KUBE_TEST_IMAGE:-busybox:1.37.0}"
# Run fixture-only regression before allocating a cluster.
oaf -f tests/regression.js
created=1
k3d cluster create "$cluster" --image "${K3D_IMAGE:-rancher/k3s:v1.35.5-k3s1}" \
  --servers 1 --agents 0 --api-port 127.0.0.1:0 \
  --kubeconfig-update-default=false --kubeconfig-switch-context=false \
  --k3s-arg '--disable=traefik@server:0' --wait --timeout 180s
k3d kubeconfig get "$cluster" > "$KUBECONFIG"
# k3d can retain port 0 in kubeconfig; use Docker's actual allocated host port.
api_port=$(docker inspect --format '{{(index (index .NetworkSettings.Ports "6443/tcp") 0).HostPort}}' "k3d-$cluster-serverlb")
kubectl config set-cluster "k3d-$cluster" --server="https://127.0.0.1:$api_port" >/dev/null
kubectl --request-timeout=15s wait --for=condition=Ready nodes --all --timeout=120s
oaf -f tests/k3d.js
