FROM python:3.11-slim

RUN useradd -m runner && \
    mkdir /sandbox && \
    chown runner:runner /sandbox

RUN pip install --no-cache-dir numpy

USER runner
WORKDIR /sandbox
