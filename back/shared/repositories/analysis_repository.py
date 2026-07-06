"""Repository for the 'analyses' MongoDB collection."""

from shared.db.mongo_client import get_mongo_db


class AnalysisRepository:
    """Handles database operations for analysis records."""

    def __init__(self):
        self.db = get_mongo_db()
        self.collection = self.db.analyses

    def insert_analysis(self, analysis_data: dict) -> str:
        """
        Insert a new analysis record into the database.

        Args:
            analysis_data: Dictionary containing analysis details (analysis_id, components, etc.)

        Returns:
            The inserted document's ID as a string.
        """
        result = self.collection.insert_one(analysis_data)
        return str(result.inserted_id)

    def get_analysis_by_id(self, analysis_id: str) -> dict | None:
        """
        Retrieve an analysis record by its analysis_id.

        Args:
            analysis_id: The unique identifier for the analysis.

        Returns:
            The analysis document if found, otherwise None.
        """
        return self.collection.find_one({"analysis_id": analysis_id})

    def get_all_analyses(
        self,
        limit: int = 50,
        user_email: str | None = None,
        active_only: bool = True,
    ) -> list[dict]:
        """
        Retrieve recent analysis records, optionally scoped to a user.
        """
        query = {}
        if active_only:
            query["status"] = {"$ne": False}
        if user_email:
            query["user_email"] = user_email

        return list(self.collection.find(query).sort("analysis_date", -1).limit(limit))
