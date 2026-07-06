"""
Job manager for Worker service.

Stores and updates asynchronous analysis job status in MongoDB.
"""

import uuid
from datetime import datetime

from shared.repositories.job_repository import JobRepository

STATUS_QUEUED = "QUEUED"
STATUS_RUNNING = "RUNNING"
STATUS_COMPLETED = "COMPLETED"
STATUS_FAILED = "FAILED"


def _repo() -> JobRepository:
    """Create a fresh JobRepository instance."""
    return JobRepository()


def create_job(
    job_type: str = "FULL_ANALYSIS",
    payload: dict | None = None,
    user_email: str | None = None,
    user_id: str | None = None,
    language: str | None = None,
) -> dict:
    """Create a new job record."""
    job_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    job = {
        "job_id": job_id,
        "job_type": job_type,
        "status": STATUS_QUEUED,
        "progress": 0,
        "stage": "queued",
        "message": "Job created and waiting to start.",
        "payload": payload or {},
        "created_at": now,
        "updated_at": now,
        "started_at": None,
        "completed_at": None,
        "error": None,
        "result": {},
        "user_email": user_email,
        "user_id": user_id,
        "language": language,
    }

    _repo().insert_job(job)

    job.pop("_id", None)
    return job


def update_job_progress(job_id: str, progress: int, stage: str, message: str) -> None:
    """Update a job's progress, stage, and message."""
    now = datetime.utcnow().isoformat()

    _repo().update_job_status(
        job_id,
        {
            "progress": progress,
            "stage": stage,
            "message": message,
            "updated_at": now,
        },
    )


def mark_running(job_id: str) -> None:
    """Mark a job as running."""
    now = datetime.utcnow().isoformat()

    _repo().update_job_status(
        job_id,
        {
            "status": STATUS_RUNNING,
            "progress": 5,
            "stage": "started",
            "message": "Job started.",
            "started_at": now,
            "updated_at": now,
            "error": None,
        },
    )


def mark_completed(job_id: str, result: dict) -> None:
    """Mark a job as completed."""
    now = datetime.utcnow().isoformat()

    _repo().update_job_status(
        job_id,
        {
            "status": STATUS_COMPLETED,
            "progress": 100,
            "stage": "completed",
            "message": "Job completed successfully.",
            "completed_at": now,
            "updated_at": now,
            "result": result,
            "error": None,
        },
    )


def mark_failed(job_id: str, error: str) -> None:
    """Mark a job as failed."""
    now = datetime.utcnow().isoformat()

    _repo().update_job_status(
        job_id,
        {
            "status": STATUS_FAILED,
            "progress": 100,
            "stage": "failed",
            "message": error,
            "completed_at": now,
            "updated_at": now,
            "error": error,
        },
    )


def get_job(job_id: str, user_email: str | None = None) -> dict | None:
    """Retrieve a job by ID."""
    job = _repo().get_job_by_id(job_id, user_email=user_email)

    if job:
        job.pop("_id", None)

    return job


def list_jobs(limit: int = 50, user_email: str | None = None) -> list[dict]:
    """List recent jobs."""
    return _repo().list_jobs(limit, user_email=user_email)
