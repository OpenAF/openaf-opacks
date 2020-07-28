FROM openaf/openaf-ojobc:nightly

COPY rebuild.yaml /openaf/rebuild.yaml
COPY rebuild.hbs /openaf/rebuild.hbs
COPY server.yaml /openaf/main.yaml

COPY ojobs /openaf/ojobs

ARG NAME
ARG URL
ARG PROTO

RUN /openaf/ojob /openaf/rebuild.yaml NAME=${NAME} URL=${URL} PROTO=${PROTO}
