FROM public.ecr.aws/lambda/provided:al2023 AS builder
ARG TARGETARCH
ARG JAVA_VERSION=25
ARG JRE_PROVIDER=temurin
ARG OPENAF_DIST=stable
ARG OPACKS=AWS,oJob-common
ARG CDS_MODE=auto
RUN dnf install -y tar gzip binutils && dnf clean all
COPY scripts/ /builder/scripts/
COPY inputs/ /inputs/
RUN /bin/sh /builder/scripts/bootstrap-builder.sh
ENV OAF_HOME=/var/task/openaf
RUN /var/task/jre/bin/java -Xshare:off --enable-native-access=ALL-UNNAMED --add-opens=java.base/java.util=ALL-UNNAMED -XX:+UseCompactObjectHeaders -jar /var/task/openaf/openaf.jar -f /builder/scripts/assemble.js -e phase=install
COPY runtime/ /builder/runtime/
RUN /var/task/jre/bin/java -Xshare:off --enable-native-access=ALL-UNNAMED --add-opens=java.base/java.util=ALL-UNNAMED -XX:+UseCompactObjectHeaders -jar /var/task/openaf/openaf.jar -f /builder/scripts/assemble.js -e phase=package
FROM scratch AS artifacts
COPY --from=builder /output/ /
