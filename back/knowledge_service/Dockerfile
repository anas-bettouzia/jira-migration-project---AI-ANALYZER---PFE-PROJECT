FROM python:3.11-slim

# Create a non-root user to reduce container privilege.
RUN groupadd --gid 1000 appuser \
    && useradd --uid 1000 --gid appuser --shell /bin/sh --create-home appuser

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY shared/ ./shared/
COPY knowledge_service/ ./knowledge_service/
RUN mkdir -p /app/knowledge_service/chroma_db && chown -R appuser:appuser /app/knowledge_service

# Use the unprivileged user for runtime.
USER appuser

ENV PYTHONPATH=/app
ENV PORT=5003
ENV ANONYMIZED_TELEMETRY=False
ENV PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION=python

EXPOSE 5003

CMD ["python", "knowledge_service/app.py"]