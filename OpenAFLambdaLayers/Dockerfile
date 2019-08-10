FROM adoptopenjdk/openjdk11-openj9:alpine

RUN apk update\
 && apk add zip\
 && mkdir /openaf\
 && cd /openaf\
 && wget https://openaf.io/nightly/openaf.jar -q\
 && java -Xshareclasses:persistent -Xshareclasses:name=openaf -Xshareclasses:cacheDir=/openaf -jar openaf.jar --repack\
 && sleep 2\
 && java -Xshareclasses:persistent -Xshareclasses:name=openaf -Xshareclasses:cacheDir=/openaf -jar openaf.jar --install

RUN mkdir /opt/build\
 && mkdir /output

COPY bootstrap /opt/bootstrap
COPY build.yaml /opt/build.yaml
COPY lambda.js /opt/lambda.js

WORKDIR /opt
ENTRYPOINT [ "/openaf/ojob", "/opt/build.yaml" ]
