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

USER 1001
