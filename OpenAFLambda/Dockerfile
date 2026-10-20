FROM public.ecr.aws/lambda/provided:al2023 AS builder
ARG TARGETARCH
ARG JAVA_VERSION=25
ARG JRE_PROVIDER=temurin
ARG OPENAF_DIST=stable
ARG OPACKS=AWS,oJob-common
ARG CDS_MODE=auto
RUN dnf install -y tar gzip python3 binutils && dnf clean all
COPY scripts/assemble.py /builder/assemble.py
COPY inputs/ /inputs/
RUN python3 /builder/assemble.py --install
COPY runtime/ /builder/runtime/
RUN python3 /builder/assemble.py --package
FROM scratch AS artifacts
COPY --from=builder /output/ /
