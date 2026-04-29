"""Shared application configuration values loaded from environment variables."""

import os

from dotenv import load_dotenv

load_dotenv()


class Config:
    """Central configuration for shared services."""

    MONGO_URI = os.getenv(
        "MONGO_URI",
        "mongodb://docker.itspectrum.fr:27017/jira_migration",
    )
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "super-secret-key")
