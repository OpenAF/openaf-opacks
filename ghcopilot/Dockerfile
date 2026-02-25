FROM openaf/oaf:edge-t8

RUN sudo apk add --no-cache nodejs npm \
  && sudo npm install -g @github/copilot \
  && sudo npm cache clean --force

ENV GITHUB_TOKEN=""
ENV GH_TOKEN=""

WORKDIR /work

ENTRYPOINT ["copilot"]
CMD ["--help"]
