# Jira Migration Platform – Project Context

## Overview

This project is a microservices-based platform designed to analyze Jira Data Center instances and assess their migration compatibility to Jira Cloud.

It provides:
- Parsing of Jira exports
- Compatibility analysis (rules + AI + RAG)
- Knowledge-based enrichment
- AI-generated migration reports (JSON + PDF)
- Full pipeline orchestration via worker
- Secure API exposure via Gateway

---

## Architecture

### Services

- gateway (port 5000): Entry point (JWT + routing)
- parsing_service (5001): Extract components from Jira export
- compatibility_service (5002): Analyze compatibility (rules + AI + RAG)
- knowledge_service (5003): RAG (ChromaDB + embeddings)
- report_service (5004): Generate reports (JSON + PDF + AI summary)
- worker (5005): Orchestrates full pipeline
- mongodb (27017): Data persistence
- redis (6379): Future async queue
- mongo_express (8081): Database UI

---

## Full Pipeline Flow

Client → Gateway (/api/analyze)
→ Worker (/worker/jobs/run)
→ Parsing Service (/parse)
→ MongoDB (analyses)
→ Compatibility Service (/compatibility/analyze)
→ Knowledge Service (RAG enrichment)
→ MongoDB (compatibility_matrices)
→ Report Service (/reports/generate)
→ MongoDB (reports)
→ JSON + PDF generated

---

## Authentication

JWT-based authentication via:

POST /api/login

Default credentials:
email: admin@test.com
password: 1234

---

## Gateway Endpoints

### Auth
POST /api/login

### Pipeline
POST /api/analyze → triggers full pipeline via worker

### Jobs
GET /api/jobs  
GET /api/jobs/<job_id>

### Reports
GET /api/reports/<report_id>

---

## Environment Configuration

### Docker (internal communication)

PARSING_SERVICE_URL=http://parsing_service:5001  
COMPATIBILITY_SERVICE_URL=http://compatibility_service:5002  
KNOWLEDGE_SERVICE_URL=http://knowledge_service:5003  
REPORT_SERVICE_URL=http://report_service:5004  
WORKER_URL=http://worker:5005  

---

### External (local / Portainer)

PARSING_SERVICE_URL=http://docker.itspectrum.fr:5001  
COMPATIBILITY_SERVICE_URL=http://docker.itspectrum.fr:5002  
KNOWLEDGE_SERVICE_URL=http://docker.itspectrum.fr:5003  
REPORT_SERVICE_URL=http://docker.itspectrum.fr:5004  
WORKER_URL=http://docker.itspectrum.fr:5005  

---

## Data Persistence

MongoDB collections:

- analyses
- compatibility_matrices
- reports
- jobs

Docker volumes:

- mongo_data → Mongo persistence
- knowledge_chroma_data → ChromaDB persistence
- report_generated_files → JSON/PDF persistence

---

## AI & RAG

### AI Model
- Google Gemini (2.5 Flash)

### RAG
- ChromaDB vector store
- Documents indexed at startup
- Used in compatibility analysis

### Hybrid Analysis

Rule Engine (deterministic)  
+ RAG Evidence  
+ AI Reasoning  
→ Final merged result  

---

## Report Generation

Outputs:

- JSON report
- PDF report (ReportLab)

Sections:

- Executive Summary (AI-generated)
- Risk Overview
- Blockers
- Recommendations
- Migration Score

---

## Known Issues (Solved)

- Host "not trusted" → fixed using external URLs
- Mongo data loss → fixed using Docker volumes
- RAG not used → fixed integration
- AI quota errors → fallback implemented
- PDF formatting issues → fixed
- File overwrite error (curl) → handled

---

## Security Notes

- MongoDB was exposed publicly → unsafe
- Should remove:
  ports: "27017:27017"

- mongo_express should be protected (authentication)

---

## Current Status

Parsing Service → OK  
Compatibility Service → OK  
Knowledge Service (RAG) → OK  
AI Reasoning → OK  
Report Service → OK  
Worker Pipeline → OK  
Gateway → OK  

Full pipeline works end-to-end.

---

## Testing Flow

1. Login via gateway
2. Upload file via /api/analyze
3. Worker processes job
4. Check job status
5. Retrieve report

---

## Next Steps

Short term:
- Add async queue (Redis + RQ or Celery)
- Improve error handling
- Add retry for AI calls

Mid term:
- Frontend (React)
- Monitoring (Prometheus / Grafana)
- Centralized logging

Advanced:
- Multi-tenant support
- SaaS deployment
- Real authentication system

---

## How to Use with Codex / Copilot

Always instruct:

"Read PROJECT_CONTEXT.md before making changes."

---

## Key Design Principle

Gateway = API entry  
Worker = Orchestrator  
Services = Specialized processors  

---

## Final State

This project is a production-ready microservices architecture capable of:

- analyzing Jira instances
- evaluating cloud migration readiness
- generating AI-powered migration reports
