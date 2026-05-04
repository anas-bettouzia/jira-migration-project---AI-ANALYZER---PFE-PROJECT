"""
Job manager for Worker service.

Stores and updates asynchronous analysis job status in MongoDB.
"""

import uuid
from datetime import datetime

from shared.db.mongo_client import get_mongo_db

STATUS_QUEUED = "QUEUED"
STATUS_RUNNING = "RUNNING"
STATUS_COMPLETED = "COMPLETED"
STATUS_FAILED = "FAILED"


def create_job(job_type: str = "FULL_ANALYSIS", payload: dict | None = None) -> dict:
    """Create a new job record."""
    job_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    job = {
        "job_id": job_id,
        "job_type": job_type,
        "status": STATUS_QUEUED,
        "payload": payload or {},
        "created_at": now,
        "updated_at": now,
        "started_at": None,
        "completed_at": None,
        "error": None,
        "result": {},
    }

    db = get_mongo_db()
    db.jobs.insert_one(job)

    job.pop("_id", None)
    return job


def mark_running(job_id: str) -> None:
    """Mark a job as running."""
    now = datetime.utcnow().isoformat()
    db = get_mongo_db()

    db.jobs.update_one(
        {"job_id": job_id},
        {
            "$set": {
                "status": STATUS_RUNNING,
                "started_at": now,
                "updated_at": now,
                "error": None,
            }
        },
    )


def mark_completed(job_id: str, result: dict) -> None:
    """Mark a job as completed."""
    now = datetime.utcnow().isoformat()
    db = get_mongo_db()

    db.jobs.update_one(
        {"job_id": job_id},
        {
            "$set": {
                "status": STATUS_COMPLETED,
                "completed_at": now,
                "updated_at": now,
                "result": result,
                "error": None,
            }
        },
    )


def mark_failed(job_id: str, error: str) -> None:
    """Mark a job as failed."""
    now = datetime.utcnow().isoformat()
    db = get_mongo_db()

    db.jobs.update_one(
        {"job_id": job_id},
        {
            "$set": {
                "status": STATUS_FAILED,
                "completed_at": now,
                "updated_at": now,
                "error": error,
            }
        },
    )


def get_job(job_id: str) -> dict | None:
    """Retrieve a job by ID."""
    db = get_mongo_db()
    job = db.jobs.find_one({"job_id": job_id})

    if job:
        job.pop("_id", None)

    return job


def list_jobs(limit: int = 50) -> list[dict]:
    """List recent jobs."""
    db = get_mongo_db()

    jobs = list(
        db.jobs.find({}, {"_id": 0})
        .sort("created_at", -1)
        .limit(limit)
    )

    return jobs
