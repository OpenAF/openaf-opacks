#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
export OAF_JARGS="${OAF_JARGS:-} -Xmx768m -Djava.util.logging.config.file=tests/logging.properties"
exec sh ./ignite.sh -f tests/regression.js
