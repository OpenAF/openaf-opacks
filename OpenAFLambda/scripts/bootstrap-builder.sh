#!/bin/sh
# Bootstrap the JVM/OpenAF needed to execute the native builder.
set -eu
mkdir -p /var/task/jre /var/task/openaf /output
case "$TARGETARCH" in amd64) arch=x64 ;; arm64) arch=aarch64 ;; *) exit 1 ;; esac
url="https://api.adoptium.net/v3/binary/latest/$JAVA_VERSION/ga/linux/$arch/jre/hotspot/normal/eclipse"
if [ "$JRE_PROVIDER" = corretto ]; then
  url="https://corretto.aws/downloads/latest/amazon-corretto-$JAVA_VERSION-$arch-linux-jdk.tar.gz"
fi
curl --fail --location --retry 3 --output /tmp/jre.tgz "$url"
printf '%s' "$url" > /tmp/jre-source
# Reject absolute and parent-traversing members before extracting.
tar tzf /tmp/jre.tgz > /tmp/jre-entries
if grep -E '(^/|(^|/)\.\.(/|$))' /tmp/jre-entries; then exit 1; fi
tar xzf /tmp/jre.tgz --strip-components=1 -C /var/task/jre
if [ "$JRE_PROVIDER" = corretto ]; then
  /var/task/jre/bin/jlink --module-path /var/task/jre/jmods --add-modules ALL-MODULE-PATH \
    --strip-debug --no-man-pages --no-header-files --compress=zip-6 --output /var/task/linked-jre
  rm -rf /var/task/jre
  mv /var/task/linked-jre /var/task/jre
fi
url="https://openaf.io/"
if [ "$OPENAF_DIST" != stable ]; then url="$url$OPENAF_DIST/"; fi
url="${url}openaf.jar.repacked"
if [ -f /inputs/openaf.jar ]; then
  cp /inputs/openaf.jar /var/task/openaf/openaf.jar
  printf local > /tmp/openaf-source
else
  curl --fail --location --retry 3 --output /var/task/openaf/openaf.jar "$url"
  printf '%s' "$url" > /tmp/openaf-source
fi
