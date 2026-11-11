# Presidio analyzer for Opas: adds Finnish and Swedish language models to Microsoft's
# image, so names in Finnish and Swedish letters are found, and loads Opas' config
# (nlp.yaml, analyzer.yaml, recognizers.yaml in this folder).
#
# Tested with the redaction check in test/ against Presidio 2.2.362 and these models.
# Run the check against a built image with the command in test/check_redaction.py.
FROM mcr.microsoft.com/presidio-analyzer:2.2.362

USER root
# en_core_web_lg is already in the base image.
RUN python -m spacy download fi_core_news_md \
    && python -m spacy download sv_core_news_md

COPY nlp.yaml analyzer.yaml recognizers.yaml /app/opas-conf/
ENV NLP_CONF_FILE=/app/opas-conf/nlp.yaml \
    ANALYZER_CONF_FILE=/app/opas-conf/analyzer.yaml \
    RECOGNIZER_REGISTRY_CONF_FILE=/app/opas-conf/recognizers.yaml

# - --timeout 180: three language models (~1 GB) load when a worker boots, which can pass
#   gunicorn's default 30 s worker timeout on a cold or busy host.
# - --no-control-socket: gunicorn 25 runs its control socket in a thread that is still
#   starting (and logging) while the master forks the worker. In CI the worker then never
#   reported in. Opas doesn't use the control socket (gunicornc).
ENV GUNICORN_CMD_ARGS="--timeout 180 --no-control-socket"
HEALTHCHECK --interval=30s --timeout=5s --start-period=180s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

USER 1001
