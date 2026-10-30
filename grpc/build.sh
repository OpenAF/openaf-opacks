#!/bin/sh
set -eu
cd "$(dirname "$0")"
exec ojob build.yaml "$@"
