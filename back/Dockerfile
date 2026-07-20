FROM python:3.12-slim AS base
WORKDIR /app

# Création d'un utilisateur non-root dédié pour la sécurité (S6471)
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY shared/ ./shared/

# Donner les permissions à l'utilisateur appuser
RUN chown -R appuser:appgroup /app

ENV PYTHONPATH=/app

# --- GATEWAY ---
FROM base AS gateway
COPY gateway/ ./gateway/
RUN chown -R appuser:appgroup /app/gateway
USER appuser
CMD ["python", "-m", "gateway.app"]

# --- PARSING SERVICE ---
FROM base AS parsing_service
COPY parsing_service/ ./parsing_service/
RUN chown -R appuser:appgroup /app/parsing_service
USER appuser
CMD ["python", "parsing_service/app.py"]

# --- COMPATIBILITY SERVICE ---
FROM base AS compatibility_service
COPY compatibility_service/ ./compatibility_service/
RUN chown -R appuser:appgroup /app/compatibility_service
USER appuser
CMD ["python", "compatibility_service/app.py"]

# --- KNOWLEDGE SERVICE ---
FROM base AS knowledge_service
COPY knowledge_service/ ./knowledge_service/
RUN chown -R appuser:appgroup /app/knowledge_service
USER appuser
CMD ["python", "knowledge_service/app.py"]

# --- REPORT SERVICE ---
FROM base AS report_service
COPY report_service/ ./report_service/
RUN chown -R appuser:appgroup /app/report_service
USER appuser
CMD ["python", "report_service/app.py"]

# --- WORKER ---
FROM base AS worker
COPY worker/ ./worker/
RUN chown -R appuser:appgroup /app/worker
USER appuser
CMD ["python", "worker/app.py"]