"""
Discover orphan documents (missing user ownership) in MongoDB and generate mapping template.

This script scans all collections and outputs a JSON template showing which documents
need ownership assignment. You can then manually fill in the user_email values.

Usage:
  python scripts/discover_orphan_documents.py > orphan_docs.json
  # Edit orphan_docs.json to add user_email values
  python scripts/migrate_user_ownership.py --mapping-file orphan_docs.json --apply
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# pylint: disable=wrong-import-position, import-error
from shared.db.mongo_client import get_mongo_db

COLLECTIONS_TO_SCAN = (
    "jobs",
    "analyses",
    "compatibility_matrices",
    "reports",
    "reports_archived",
)


def discover_orphans() -> dict[str, dict[str, dict[str, str]]]:
    """Scan collections and find documents with missing user_email."""
    load_dotenv()
    db = get_mongo_db()
    mapping: dict[str, dict[str, dict[str, str]]] = {}

    for collection_name in COLLECTIONS_TO_SCAN:
        mapping[collection_name] = {}
        collection = db[collection_name]

        # Find documents without user_email
        query = {"user_email": {"$exists": False}}
        cursor = collection.find(query)

        for doc in cursor:
            # Extract the document's ID (report_id, analysis_id, job_id, matrix_id)
            id_field = None
            id_value = None

            if collection_name == "reports" or collection_name == "reports_archived":
                id_field = "report_id"
                id_value = doc.get(id_field)
            elif collection_name == "analyses":
                id_field = "analysis_id"
                id_value = doc.get(id_field)
            elif collection_name == "compatibility_matrices":
                id_field = "matrix_id"
                id_value = doc.get(id_field)
            elif collection_name == "jobs":
                id_field = "job_id"
                id_value = doc.get(id_field)

            if id_value:
                mapping[collection_name][str(id_value)] = {
                    "user_email": "TODO: add consultant email here"
                }

    return mapping


def main() -> int:
    """Output discovered orphan documents as JSON template."""
    orphans = discover_orphans()

    # Pretty-print the mapping
    output = json.dumps(orphans, indent=2)
    print(output)

    # Count totals
    total = sum(len(v) for v in orphans.values())
    if total > 0:
        print(
            f"\n# Found {total} documents without user_email",
            file=sys.stderr,
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
