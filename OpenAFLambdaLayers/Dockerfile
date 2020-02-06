FROM adoptopenjdk/openjdk11:alpine

RUN apk update\
 && apk add zip\
 && mkdir /openaf\
 && cd /openaf\
 && wget -O openaf.jar.orig https://openaf.io/nightly/openaf.jar -q\
 && wget -O openaf.jar https://openaf.io/nightly/openaf.jar.repacked -q\
 && java -jar openaf.jar --install

# Update SSL certificates
RUN apk update\
 && apk add ca-certificates wget\
 && update-ca-certificates\
 && apk --no-cache add openssl wget

RUN mkdir /opt/build\
 && mkdir /output

COPY bootstrap /opt/bootstrap
COPY build.yaml /opt/build.yaml
COPY lambda.js /opt/lambda.js

WORKDIR /opt
ENTRYPOINT [ "/openaf/ojob", "/opt/build.yaml" ]
