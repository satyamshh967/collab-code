FROM openjdk:17-slim

RUN useradd -m runner && \
    mkdir /sandbox && \
    chown runner:runner /sandbox

USER runner
WORKDIR /sandbox

# Disabling network is handled in DockerManager config via network: none
