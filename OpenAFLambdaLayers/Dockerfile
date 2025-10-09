FROM amazonlinux

RUN yum update\
 && yum -y install java-25 zip tar gzip wget openssl\
 && mkdir /openaf\
 && cd /openaf\
 && wget -O openaf.jar.orig https://openaf.io/openaf.jar -q\
 && wget -O openaf.jar https://openaf.io/openaf.jar.repacked -q\
 && java -jar openaf.jar --install

RUN mkdir /opt/build\
 && mkdir /output

COPY bootstrap /opt/bootstrap
COPY build.yaml /opt/build.yaml
COPY lambda.js /opt/lambda.js
COPY Dockerfile.lambda /opt/Dockerfile.lambda

WORKDIR /opt
ENTRYPOINT [ "/openaf/ojob", "/opt/build.yaml" ]