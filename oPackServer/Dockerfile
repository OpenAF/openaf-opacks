FROM openaf/openaf-ojobc:nightly

LABEL maintainer="Nuno Aguiar"
COPY main.yaml /openaf/main.yaml

EXPOSE 8090/tcp

# Where the opack.db and opacks folder is located in the container
#ENV OPACKSERVER_PATH /data
# The external endpoint on which the opack content will be available
#ENV OPACKSERVER_URL http://127.0.0.1:8090
# Don't reload opack.db on startup
#ENV OPACKSERVER_INITRELOAD false