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
        self.collection.create_index(
            "username",
            unique=True,
            partialFilterExpression={"username": {"$type": "string"}},
        )
        self.collection.create_index("reset_password_token_hash", sparse=True)

    def create_user(
        self,
        email: str,
        username: str,
        password_hash: str,
        role: str = "user",
    ) -> dict:
        """Insert a new user document."""
        user = {
            "email": email,
            "username": username,
            "password_hash": password_hash,
            "role": role,
            "created_at": datetime.utcnow().isoformat(),
        }
        self.collection.insert_one(user)
        return user

    def create_oauth_user(
        self,
        email: str,
        provider: str,
        provider_user_id: str,
        name: str | None = None,
        picture: str | None = None,
        role: str = "user",
    ) -> dict:
        """Insert a user authenticated by an external OAuth provider."""
        user = {
            "email": email,
            "password_hash": None,
            "role": role,
            "auth_provider": provider,
            "providers": {
                provider: provider_user_id,
            },
            "name": name,
            "picture": picture,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }
        self.collection.insert_one(user)
        return user

    def link_oauth_provider(
        self,
        email: str,
        provider: str,
        provider_user_id: str,
        name: str | None = None,
        picture: str | None = None,
    ) -> None:
        """Attach or refresh an OAuth provider profile for an existing user."""
        self.collection.update_one(
            {"email": email},
            {
                "$set": {
                    f"providers.{provider}": provider_user_id,
                    "auth_provider": provider,
                    "name": name,
                    "picture": picture,
                    "updated_at": datetime.utcnow().isoformat(),
                }
            },
        )

    def get_user_by_email(self, email: str) -> Optional[dict]:
        """Retrieve a user document by email."""
        return self.collection.find_one({"email": email})

    def get_user_by_username(self, username: str) -> Optional[dict]:
        """Retrieve a user document by username."""
        return self.collection.find_one({"username": username})

    def update_user_profile(self, current_email: str, new_email: str) -> None:
        """Update editable user profile fields."""
        self.collection.update_one(
            {"email": current_email},
            {
                "$set": {
                    "email": new_email,
                    "updated_at": datetime.utcnow().isoformat(),
                }
            },
        )

    def update_password(self, email: str, password_hash: str) -> None:
        """Update a local user's password."""
        self.collection.update_one(
            {"email": email},
            {
                "$set": {
                    "password_hash": password_hash,
                    "auth_provider": "local",
                    "updated_at": datetime.utcnow().isoformat(),
                }
            },
        )

    def save_password_reset_token(
        self,
        email: str,
        token_hash: str,
        expires_at: datetime,
    ) -> None:
        """Store a password reset token hash for a user."""
        self.collection.update_one(
            {"email": email},
            {
                "$set": {
                    "reset_password_token_hash": token_hash,
                    "reset_password_expires_at": expires_at,
                    "updated_at": datetime.utcnow().isoformat(),
                }
            },
        )

    def get_user_by_password_reset_token(
        self,
        email: str,
        token_hash: str,
    ) -> Optional[dict]:
        """Retrieve a user by email and password reset token hash."""
        return self.collection.find_one(
            {
                "email": email,
                "reset_password_token_hash": token_hash,
            }
        )

    def update_password_and_clear_reset(self, email: str, password_hash: str) -> None:
        """Update a user's password and remove reset token fields."""
        self.collection.update_one(
            {"email": email},
            {
                "$set": {
                    "password_hash": password_hash,
                    "auth_provider": "local",
                    "updated_at": datetime.utcnow().isoformat(),
                },
                "$unset": {
                    "reset_password_token_hash": "",
                    "reset_password_expires_at": "",
                },
            },
        )
