#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

: "${SONAR_HOST_URL:?Environment variable SONAR_HOST_URL is required.}"
: "${SONAR_TOKEN:?Environment variable SONAR_TOKEN is required.}"

PYTHON_BIN="${PYTHON_BIN:-python}"
if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  if command -v python3 >/dev/null 2>&1; then
    PYTHON_BIN="python3"
  else
    echo "Required command 'python' or 'python3' was not found in PATH." >&2
    exit 1
  fi
fi

for required_command in node npm sonar-scanner; do
  if ! command -v "$required_command" >/dev/null 2>&1; then
    echo "Required command '$required_command' was not found in PATH." >&2
    exit 1
  fi
done

echo "Running frontend validation..."
cd "${REPO_ROOT}/front"
npm ci
npm run lint
npm run build

echo "Running backend syntax validation..."
cd "${REPO_ROOT}"
"$PYTHON_BIN" -m py_compile \
  back/gateway/app.py \
  back/parsing_service/app.py \
  back/compatibility_service/app.py \
  back/knowledge_service/app.py \
  back/report_service/app.py \
  back/worker/tasks/analysis_task.py \
  back/worker/tasks/job_manager.py

echo "Running SonarQube analysis..."
sonar-scanner \
  -Dsonar.host.url="${SONAR_HOST_URL}" \
  -Dsonar.token="${SONAR_TOKEN}"

echo "CI analysis completed."
