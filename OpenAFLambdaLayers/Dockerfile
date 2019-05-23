FROM adoptopenjdk/openjdk11-openj9:alpine

RUN apk update\
 && apk add zip\
 && mkdir /openaf\
 && cd /openaf\
 && wget https://openaf.io/nightly/openaf.jar -q\
 && java -Xshareclasses:persistent -Xshareclasses:name=openaf -Xshareclasses:cacheDir=/openaf -jar openaf.jar --repack\
 && java -Xshareclasses:persistent -Xshareclasses:name=openaf -Xshareclasses:cacheDir=/openaf -jar openaf.jar --install

RUN mkdir /opt/build\
 && mkdir /output

COPY bootstrap /opt/build/bootstrap
COPY build.yaml /opt/build/build.yaml
COPY lambda.js /opt/build/lambda.js

WORKDIR /opt/build
ENTRYPOINT [ "/openaf/ojob", "build.yaml" ]
