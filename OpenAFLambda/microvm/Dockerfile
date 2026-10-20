FROM public.ecr.aws/lambda/microvms:al2023-minimal
COPY payload/ /var/task/
RUN chmod 755 /var/task/bootstrap /var/task/jre/bin/java
ENV OAF_LAMBDA_ROOT=/var/task OAF_LAMBDA_TRANSPORT=microvm
EXPOSE 8080 8081
ENTRYPOINT ["/bin/sh", "/var/task/bootstrap"]
