#!/bin/sh
# Run OpenAF with Ignite 3 on the JVM application classpath (required by native callbacks).
set -eu
ignite_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
if [ -z "${OPENAF_JAR:-}" ]; then
  oaf_command=$(command -v oaf || true)
  if [ -z "$oaf_command" ]; then
    echo "Set OPENAF_JAR to the full path of openaf.jar." >&2
    exit 1
  fi
  OPENAF_JAR="$(dirname "$oaf_command")/openaf.jar"
fi
if [ ! -f "$OPENAF_JAR" ]; then
  echo "Cannot find openaf.jar; set OPENAF_JAR to its full path." >&2
  exit 1
fi
ignite_java=java
if [ -n "${JAVA_HOME:-}" ]; then ignite_java="$JAVA_HOME/bin/java"; fi
exec "$ignite_java" ${OAF_JARGS:-} \
  --add-opens=java.base/java.lang=ALL-UNNAMED \
  --add-opens=java.base/java.lang.invoke=ALL-UNNAMED \
  --add-opens=java.base/java.lang.reflect=ALL-UNNAMED \
  --add-opens=java.base/java.io=ALL-UNNAMED \
  --add-opens=java.base/java.nio=ALL-UNNAMED \
  --add-opens=java.base/java.math=ALL-UNNAMED \
  --add-opens=java.base/java.util=ALL-UNNAMED \
  --add-opens=java.base/java.time=ALL-UNNAMED \
  --add-opens=java.base/jdk.internal.misc=ALL-UNNAMED \
  --add-opens=java.base/jdk.internal.access=ALL-UNNAMED \
  --add-opens=java.base/sun.nio.ch=ALL-UNNAMED \
  -Dio.netty.tryReflectionSetAccessible=true \
  -cp "$ignite_dir/plugin-ignite.jar:$OPENAF_JAR:$ignite_dir/*" openaf.AFCmdOS "$@"
