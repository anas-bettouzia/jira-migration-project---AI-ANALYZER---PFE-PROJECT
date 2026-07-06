"""Repository implementation for report documents."""

from datetime import datetime

from shared.db.mongo_client import get_mongo_db


class ReportRepository:
    """Repository for the 'reports' collection."""

    def __init__(self, db=None):
        self.db = db or get_mongo_db()
        self.collection = self.db.reports
        self.archived_collection = self.db.reports_archived

    def insert_report(self, report_data: dict) -> str:
        """Insert a new report record into the database."""
        result = self.collection.insert_one(report_data)
        return str(result.inserted_id)

    def get_report_by_id(self, report_id: str, user_email: str | None = None) -> dict | None:
        """Retrieve an active report by report_id, optionally scoped to a user."""
        query = {
            "report_id": report_id,
            "status": {"$ne": False},
        }
        if user_email:
            query["user_email"] = user_email
        return self.collection.find_one(query)

    def list_reports(self, limit: int = 50, user_email: str | None = None) -> list[dict]:
        """Retrieve active report summaries, optionally scoped to a user."""
        projection = {
            "_id": 0,
            "report_id": 1,
            "matrix_id": 1,
            "analysis_id": 1,
            "generated_at": 1,
            "title": 1,
            "summary": 1,
            "status": 1,
            "source_filename": 1,
            "user_email": 1,
            "user_id": 1,
        }
        query = {"status": {"$ne": False}}
        if user_email:
            query["user_email"] = user_email

        return list(
            self.collection.find(query, projection)
            .sort("generated_at", -1)
            .limit(limit)
        )

    def soft_delete_report(self, report_id: str, user_email: str | None = None) -> bool:
        """Soft-delete a report by setting status to False."""
        query = {"report_id": report_id}
        if user_email:
            query["user_email"] = user_email

        result = self.collection.update_one(query, {"$set": {"status": False}})
        return result.modified_count > 0

    def archive_report(self, report_id: str, user_email: str | None = None) -> bool:
        """Move a report from active reports to reports_archived."""
        query = {"report_id": report_id}
        if user_email:
            query["user_email"] = user_email

        report = self.collection.find_one(query)
        if not report:
            return False

        report.pop("_id", None)
        report["archived_at"] = report.get("archived_at") or datetime.utcnow()

        self.archived_collection.insert_one(report)
        self.collection.delete_one(query)
        return True

    def list_archived_reports(
        self,
        limit: int = 50,
        user_email: str | None = None,
    ) -> list[dict]:
        """Retrieve archived report summaries, optionally scoped to a user."""
        projection = {
            "_id": 0,
            "report_id": 1,
            "matrix_id": 1,
            "analysis_id": 1,
            "generated_at": 1,
            "title": 1,
            "summary": 1,
            "status": 1,
            "source_filename": 1,
            "user_email": 1,
            "user_id": 1,
            "archived_at": 1,
        }
        query = {}
        if user_email:
            query["user_email"] = user_email

        return list(
            self.archived_collection.find(query, projection)
            .sort("archived_at", -1)
            .limit(limit)
        )

    def update_report(self, report_id: str, updates: dict) -> bool:
        """Update a report document with the provided fields."""
        if not updates:
            return False

        result = self.collection.update_one({"report_id": report_id}, {"$set": updates})
        return result.modified_count > 0