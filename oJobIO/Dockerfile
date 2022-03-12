FROM openaf/openaf-ojobc:nightly

EXPOSE 8088

COPY rebuild.yaml /openaf/rebuild.yaml
COPY rebuild.hbs /openaf/rebuild.hbs
COPY server.yaml /openaf/main.yaml
#COPY setupOJobIO.yaml /openaf/setupOJobIO.yaml

COPY imgs  /openaf/imgs
COPY ojobs /openaf/ojobs

ARG NAME
ARG URL
ARG PROTO

USER root
RUN chown -R openaf: /openaf

USER openaf

#RUN /openaf/ojob /openaf/setupOJobIO.yaml
RUN /openaf/ojob /openaf/rebuild.yaml NAME=${NAME} URL=${URL} PROTO=${PROTO}