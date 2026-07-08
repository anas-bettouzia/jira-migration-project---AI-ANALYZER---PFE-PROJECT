"""
Backfill user ownership on historical Jira Migration documents.

This script is safe by default: it runs in dry-run mode unless --apply is passed.
It attaches user_email/user_id to legacy jobs, analyses, compatibility matrices,
reports, and archived reports so frontend lists can be scoped per consultant.

Typical usage inside the deployed backend container:

  python scripts/migrate_user_ownership.py --dry-run
  python scripts/migrate_user_ownership.py --default-user-email consultant@example.com --dry-run
  python scripts/migrate_user_ownership.py --default-user-email consultant@example.com --apply

Optional mapping file format:
{
  "reports": {"report-id-1": {"user_email": "a@company.com", "user_id": "..."}},
  "analyses": {"analysis-id-1": {"user_email": "a@company.com"}},
  "jobs": {"job-id-1": {"user_email": "a@company.com"}}
}
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# pylint: disable=wrong-import-position, import-error
from shared.db.mongo_client import get_mongo_db
from shared.repositories.user_repository import UserRepository

OWNER_FIELDS = ("user_email", "user_id")
COLLECTIONS = (
    "jobs",
    "analyses",
    "compatibility_matrices",
    "reports",
    "reports_archived",
)


def parse_args() -> argparse.Namespace:
    """Create command-line argument parser and return parsed args."""
    parser = argparse.ArgumentParser(description="Backfill user ownership fields in MongoDB.")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Write updates to MongoDB.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview updates without writing. Default behavior.",
    )
    parser.add_argument(
        "--default-user-email",
        help="Fallback owner email for orphan documents.",
    )
    parser.add_argument(
        "--default-user-id",
        help="Fallback owner id for orphan documents.",
    )
    parser.add_argument(
        "--mapping-file",
        help="JSON mapping file for explicit ownership by id.",
    )
    parser.add_argument(
        "--fill-user-ids",
        action="store_true",
        help=(
            "Populate missing user_id values for documents that already have "
            "user_email using existing users from the users collection.",
        ),
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Overwrite existing owner fields.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Limit documents scanned per collection, for testing.",
    )
    return parser.parse_args()


def load_mapping(path: str | None) -> dict[str, Any]:
    """Load explicit ownership mapping from JSON file, or return empty map."""
    if not path:
        return {}
    with open(path, "r", encoding="utf-8") as file:
        return json.load(file)


def clean_owner(owner: dict[str, Any] | None) -> dict[str, str]:
    """Normalize owner values to strings and remove empty fields."""
    if not owner:
        return {}
    cleaned = {}
    for field in OWNER_FIELDS:
        value = owner.get(field)
        if value:
            cleaned[field] = str(value)
    return cleaned


def missing_owner(document: dict[str, Any], overwrite: bool, fill_user_ids: bool = False) -> bool:
    """Return True when the document needs ownership migration or user_id filling."""
    if overwrite:
        return True
    if not document.get("user_email"):
        return True
    if fill_user_ids and not document.get("user_id"):
        return True
    return False


def resolve_user_id_from_email(user_repo: UserRepository, owner: dict[str, str]) -> dict[str, str]:
    """Try to resolve the missing user_id from a user email address."""
    if owner.get("user_email") and not owner.get("user_id"):
        user = user_repo.get_user_by_email(owner["user_email"])
        if user and user.get("_id") is not None:
            owner["user_id"] = str(user["_id"])
    return owner


def merge_owner(*owners: dict[str, Any] | None) -> dict[str, str]:
    """Merge ownership fields from multiple sources, keeping the first non-empty value."""
    merged: dict[str, str] = {}
    for owner in owners:
        cleaned = clean_owner(owner)
        for field, value in cleaned.items():
            if field not in merged and value:
                merged[field] = value
    return merged


def id_value(document: dict[str, Any], *fields: str) -> str | None:
    """Return the first non-empty field value from a document."""
    for field in fields:
        value = document.get(field)
        if value:
            return str(value)
    return None


def build_indexes(
    db,
    limit: int,
    explicit: dict[str, Any],
    fallback_owner: dict[str, str],
) -> dict[str, dict[str, str]]:
    """Build ownership lookup indexes from legacy documents and explicit mappings."""
    indexes = {
        "by_job_id": {},
        "by_analysis_id": {},
        "by_matrix_id": {},
        "by_report_id": {},
    }

    def remember(bucket: str, key: str | None, owner: dict[str, Any] | None) -> None:
        cleaned = clean_owner(owner)
        if key and cleaned and key not in indexes[bucket]:
            indexes[bucket][key] = cleaned

    for job_id, owner in explicit.get("jobs", {}).items():
        remember("by_job_id", job_id, owner)
    for analysis_id, owner in explicit.get("analyses", {}).items():
        remember("by_analysis_id", analysis_id, owner)
    for matrix_id, owner in explicit.get("matrices", {}).items():
        remember("by_matrix_id", matrix_id, owner)
    for report_id, owner in explicit.get("reports", {}).items():
        remember("by_report_id", report_id, owner)

    cursor = db.jobs.find({})
    if limit:
        cursor = cursor.limit(limit)
    for job in cursor:
        owner = merge_owner(job, indexes["by_job_id"].get(str(job.get("job_id"))), fallback_owner)
        remember("by_job_id", id_value(job, "job_id"), owner)
        result = job.get("result", {}) if isinstance(job.get("result"), dict) else {}
        remember("by_analysis_id", id_value(result, "analysis_id"), owner)
        remember("by_matrix_id", id_value(result, "matrix_id"), owner)
        remember("by_report_id", id_value(result, "report_id"), owner)

    cursor = db.analyses.find({})
    if limit:
        cursor = cursor.limit(limit)
    for analysis in cursor:
        owner = merge_owner(
            analysis,
            indexes["by_analysis_id"].get(str(analysis.get("analysis_id"))),
            fallback_owner,
        )
        remember("by_analysis_id", id_value(analysis, "analysis_id"), owner)

    cursor = db.compatibility_matrices.find({})
    if limit:
        cursor = cursor.limit(limit)
    for matrix in cursor:
        owner = merge_owner(
            matrix,
            indexes["by_matrix_id"].get(str(matrix.get("matrix_id"))),
            indexes["by_analysis_id"].get(str(matrix.get("analysis_id"))),
            fallback_owner,
        )
        remember("by_matrix_id", id_value(matrix, "matrix_id"), owner)
        remember("by_analysis_id", id_value(matrix, "analysis_id"), owner)

    for collection_name in ("reports", "reports_archived"):
        cursor = db[collection_name].find({})
        if limit:
            cursor = cursor.limit(limit)
        for report in cursor:
            owner = merge_owner(
                report,
                indexes["by_report_id"].get(str(report.get("report_id"))),
                indexes["by_matrix_id"].get(str(report.get("matrix_id"))),
                indexes["by_analysis_id"].get(str(report.get("analysis_id"))),
                fallback_owner,
            )
            remember("by_report_id", id_value(report, "report_id"), owner)
            remember("by_matrix_id", id_value(report, "matrix_id"), owner)
            remember("by_analysis_id", id_value(report, "analysis_id"), owner)

    return indexes


def owner_for_document(
    document: dict[str, Any],
    collection_name: str,
    indexes: dict[str, dict[str, str]],
    fallback_owner: dict[str, str],
) -> dict[str, str]:
    """Resolve ownership for a single document by collection type."""
    if collection_name == "jobs":
        result = document.get("result", {}) if isinstance(document.get("result"), dict) else {}
        return merge_owner(
            document,
            indexes["by_job_id"].get(str(document.get("job_id"))),
            indexes["by_report_id"].get(str(result.get("report_id"))),
            indexes["by_matrix_id"].get(str(result.get("matrix_id"))),
            indexes["by_analysis_id"].get(str(result.get("analysis_id"))),
            fallback_owner,
        )

    if collection_name == "analyses":
        return merge_owner(
            document,
            indexes["by_analysis_id"].get(str(document.get("analysis_id"))),
            fallback_owner,
        )

    if collection_name == "compatibility_matrices":
        return merge_owner(
            document,
            indexes["by_matrix_id"].get(str(document.get("matrix_id"))),
            indexes["by_analysis_id"].get(str(document.get("analysis_id"))),
            fallback_owner,
        )

    return merge_owner(
        document,
        indexes["by_report_id"].get(str(document.get("report_id"))),
        indexes["by_matrix_id"].get(str(document.get("matrix_id"))),
        indexes["by_analysis_id"].get(str(document.get("analysis_id"))),
        fallback_owner,
    )


def migrate_collection(
    db,
    collection_name: str,
    indexes: dict[str, dict[str, str]],
    args: argparse.Namespace,
    fallback_owner: dict[str, str],
    user_repo: UserRepository | None = None,
) -> dict[str, int]:
    """Migrate ownership fields for a full collection of legacy documents."""
    stats = {"scanned": 0, "updated": 0, "skipped": 0, "unresolved": 0}
    cursor = db[collection_name].find({})
    if args.limit:
        cursor = cursor.limit(args.limit)

    for document in cursor:
        stats["scanned"] += 1
        if not missing_owner(document, args.overwrite, args.fill_user_ids):
            stats["skipped"] += 1
            continue

        owner = owner_for_document(document, collection_name, indexes, fallback_owner)
        if not owner.get("user_email"):
            stats["unresolved"] += 1
            continue

        if args.fill_user_ids and user_repo is not None:
            owner = resolve_user_id_from_email(user_repo, owner)

        updates = {
            **owner,
            "ownership_migrated_at": datetime.utcnow().isoformat(),
        }

        display_id = (
            id_value(document, "report_id", "analysis_id", "matrix_id", "job_id")
            or str(document.get("_id"))
        )
        print(f"[{collection_name}] {display_id} -> {owner.get('user_email')}")

        if args.apply:
            db[collection_name].update_one({"_id": document["_id"]}, {"$set": updates})
        stats["updated"] += 1

    return stats


def main() -> int:
    """Run ownership migration script end to end."""
    load_dotenv()
    args = parse_args()
    fallback_owner = clean_owner({
        "user_email": args.default_user_email,
        "user_id": args.default_user_id,
    })
    explicit = load_mapping(args.mapping_file)

    if not args.apply:
        print("DRY RUN: no document will be modified. Pass --apply to write changes.")

    db = get_mongo_db()
    print(f"Using MongoDB database: {db.name}")
    print(f"MONGO_URI configured: {'yes' if os.getenv('MONGO_URI') else 'no'}")

    indexes = build_indexes(db, args.limit, explicit, fallback_owner)
    total = {"scanned": 0, "updated": 0, "skipped": 0, "unresolved": 0}

    user_repo = None
    if args.fill_user_ids:
        user_repo = UserRepository()

    for collection_name in COLLECTIONS:
        stats = migrate_collection(
            db,
            collection_name,
            indexes,
            args,
            fallback_owner,
            user_repo=user_repo,
        )
        for key, value in stats.items():
            total[key] += value
        print(f"Summary {collection_name}: {stats}")

    print(f"Total: {total}")

    if total["unresolved"] and not fallback_owner.get("user_email"):
        print(
            "Some documents could not be resolved. Provide --default-user-email "
            "or a --mapping-file if these legacy documents must remain visible."
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
