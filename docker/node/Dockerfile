FROM node:20-alpine

RUN addgroup -S runner && adduser -S runner -G runner && \
    mkdir /sandbox && \
    chown runner:runner /sandbox

USER runner
WORKDIR /sandbox
