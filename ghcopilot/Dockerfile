FROM openaf/oaf:alpine

RUN apk add --no-cache nodejs npm \
  && npm install -g @github/copilot \
  && npm cache clean --force

ENV GITHUB_TOKEN=""
ENV GH_TOKEN=""

WORKDIR /work

ENTRYPOINT ["copilot"]
CMD ["--help"]
