"""Repository implementation for user documents."""

from datetime import datetime
from typing import Optional

from shared.db.mongo_client import get_mongo_db


class UserRepository:
    """Repository for the 'users' collection."""

    def __init__(self, db=None):
        self.db = db or get_mongo_db()
        self.collection = self.db.users
        self.collection.create_index("email", unique=True)

    def create_user(self, email: str, password_hash: str, role: str = "user") -> dict:
        """Insert a new user document."""
        user = {
            "email": email,
            "password_hash": password_hash,
            "role": role,
            "created_at": datetime.utcnow().isoformat(),
        }
        self.collection.insert_one(user)
        return user

    def get_user_by_email(self, email: str) -> Optional[dict]:
        """Retrieve a user document by email."""
        return self.collection.find_one({"email": email})
