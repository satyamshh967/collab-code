FROM eclipse-temurin:17-jdk-jammy

RUN useradd -m runner && \
    mkdir /sandbox && \
    chown runner:runner /sandbox

USER runner
WORKDIR /sandbox

# Network isolation, memory/CPU/pid caps are applied by DockerManager at run time
