#!/bin/sh
set -e

# Ensure mounted ChromaDB storage is writable by the runtime user.
chown -R appuser:appuser /app/knowledge_service/chroma_db

exec su appuser -c "$@"
