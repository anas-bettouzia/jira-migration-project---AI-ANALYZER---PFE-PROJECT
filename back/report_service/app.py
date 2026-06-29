"""
Report Service for Jira DC → Cloud migration analysis.

Generates structured migration reports from compatibility matrices.
"""

import logging
import os
import sys

from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS

load_dotenv()

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# pylint: disable=wrong-import-position
from report_service.generators.json_export import export_report_to_json
from report_service.generators.pdf_export import export_report_to_pdf
from report_service.generators.report_builder import build_report
from report_service.llm.gemini_client import generate_report_json
from shared.repositories.compatibility_repository import CompatibilityRepository
from shared.repositories.report_repository import ReportRepository

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({"status": "healthy", "service": "report_service"}), 200


@app.route("/reports/generate", methods=["POST"])
def generate_report():
    """
    Generate a report from a compatibility matrix.

    Body:
      { "matrix_id": "xxx" }
    or
      { "analysis_id": "xxx" }
    """
    data = request.get_json()

    if not data:
        return jsonify({"error": "Request body is required"}), 400

    matrix = _load_matrix(data)

    if not matrix:
        return jsonify({
            "error": "No compatibility matrix found for provided identifier."
        }), 404

    # Optional language parameter (default: 'en') to request report language
    language = data.get("language", "en")

    try:
        report = build_report(matrix, language=language)
    except Exception as error:  # pylint: disable=broad-exception-caught
        logger.error("Report generation failed: %s", error)
        return jsonify({"error": f"Report generation failed: {error}"}), 500

    try:
        report_repo = ReportRepository()
        report_repo.insert_report({**report})
        logger.info("Report %s saved to MongoDB.", report["report_id"])
    except Exception as error:  # pylint: disable=broad-exception-caught
        logger.warning("Could not save report to MongoDB: %s", error)

    report.pop("_id", None)
    return jsonify(report), 200


@app.route("/reports/<report_id>", methods=["GET"])
def get_report(report_id):
    """Retrieve a generated report by report_id only if active."""
    try:
        report_repo = ReportRepository()
        report = report_repo.get_report_by_id(report_id)

        # Si le rapport n'existe pas OU si son statut est False, get_report_by_id renverra None
        if not report:
            return jsonify({"error": f"Report '{report_id}' not found."}), 404

        report.pop("_id", None)
        return jsonify(report), 200

    except Exception as error:  # pylint: disable=broad-exception-caught
        logger.error("Error retrieving report: %s", error)
        return jsonify({"error": str(error)}), 500


@app.route("/reports", methods=["GET"])
def list_reports():
    """List generated reports with summary only (filtered by status=True)."""
    try:
        report_repo = ReportRepository()
        # list_reports() applique automatiquement le filtre {"status": {"$ne": False}}
        reports = report_repo.list_reports()

        return jsonify({"reports": reports, "count": len(reports)}), 200

    except Exception as error:  # pylint: disable=broad-exception-caught
        logger.error("Error listing reports: %s", error)
        return jsonify({"error": str(error)}), 500


@app.route("/reports/archived", methods=["GET"])
def list_archived_reports():
    """List archived reports from the archived collection."""
    try:
        report_repo = ReportRepository()
        archived_reports = report_repo.list_archived_reports()
        return jsonify({"reports": archived_reports, "count": len(archived_reports)}), 200
    except Exception as error:  # pylint: disable=broad-exception-caught
        logger.error("Error listing archived reports: %s", error)
        return jsonify({"error": str(error)}), 500


@app.route("/reports/<report_id>/archive", methods=["POST"])
def archive_report(report_id):
    """Archive a report by moving it from reports to reports_archived."""
    try:
        report_repo = ReportRepository()
        success = report_repo.archive_report(report_id)

        if not success:
            return jsonify({"error": f"Report '{report_id}' not found."}), 404

        return jsonify({
            "message": f"Report '{report_id}' archived successfully.",
            "report_id": report_id,
        }), 200
    except Exception as error:  # pylint: disable=broad-exception-caught
        logger.error("Error archiving report: %s", error)
        return jsonify({"error": str(error)}), 500


@app.route("/reports/<report_id>/json", methods=["GET"])
def export_json(report_id):
    """Export an active report as JSON file."""
    report_repo = ReportRepository()
    report = report_repo.get_report_by_id(report_id)

    # Bloque l'export si le rapport est en status=False (renvoie None)
    if not report:
        return jsonify({"error": f"Report '{report_id}' not found."}), 404

    report.pop("_id", None)
    file_path = export_report_to_json(report)
    return send_file(file_path, as_attachment=True)


@app.route("/reports/<report_id>/pdf", methods=["GET"])
def export_pdf(report_id):
    """Export an active report as PDF file."""
    report_repo = ReportRepository()
    report = report_repo.get_report_by_id(report_id)

    # Bloque l'export si le rapport est en status=False (renvoie None)
    if not report:
        return jsonify({"error": f"Report '{report_id}' not found."}), 404

    report.pop("_id", None)
    file_path = export_report_to_pdf(report)
    return send_file(file_path, as_attachment=True)


@app.route("/reports/<report_id>/translate", methods=["POST"])
def translate_report(report_id):
    """Translate the AI-generated summary of a report into a target language and cache it.

    Request body: { "target_language": "fr" }
    """
    data = request.get_json(silent=True) or {}
    target = data.get("target_language", "fr")

    if target not in ("fr", "en"):
        return jsonify({"error": "Unsupported target_language. Use 'fr' or 'en'."}), 400

    try:
        report_repo = ReportRepository()
        report = report_repo.get_report_by_id(report_id)

        if not report:
            return jsonify({"error": f"Report '{report_id}' not found."}), 404

        # If target is English, just return existing ai_summary
        if target == "en":
            summary_val = report.get("ai_summary", report.get("summary", ""))
            return jsonify({"ai_summary": summary_val}), 200

        # If French translation already exists, return it
        translations = report.get("translations", {}) or {}
        existing_fr = translations.get("fr", {}) or {}
        existing_summary = report.get("ai_summary_fr") or existing_fr.get("ai_summary")
        if existing_summary:
            merged_translations = {
                **existing_fr,
                "ai_summary": existing_summary,
            }
            return jsonify({
                "ai_summary_fr": merged_translations.get("ai_summary"),
                "migration_recommendation_fr": merged_translations.get("migration_recommendation"),
                "ai_insights_fr": merged_translations.get("ai_insights"),
                "ai_error_fr": merged_translations.get("ai_error"),
                "details_fr": merged_translations.get("details"),
                "translations": {"fr": merged_translations},
                "used_ai": False,
            }), 200

        # Build structured translation payload covering the main report fields.
        source_payload = {
            "ai_summary": report.get("ai_summary", ""),
            "migration_recommendation": report.get("migration_recommendation", ""),
            "ai_insights": report.get("ai_insights", ""),
            "ai_error": report.get("ai_error", ""),
            "details": report.get("details", ""),
            "sections": {
                "components": [
                    {
                        "component_id": component.get("component_id", ""),
                        "reasoning_summary": component.get("reasoning_summary", ""),
                        "recommended_action": component.get("recommended_action", ""),
                    }
                    for component in report.get("sections", {}).get("components", [])
                ],
                "blockers": [
                    {
                        "component_id": blocker.get("component_id", ""),
                        "reasoning_summary": blocker.get("reasoning_summary", ""),
                        "recommended_action": blocker.get("recommended_action", ""),
                    }
                    for blocker in report.get("sections", {}).get("blockers", [])
                ],
                "recommendations": [
                    {
                        "component_id": recommendation.get("component_id", ""),
                        "action": recommendation.get("action", ""),
                        "reason": recommendation.get("reason", ""),
                    }
                    for recommendation in report.get("sections", {}).get("recommendations", [])
                ],
            },
        }

        # Build a prompt that asks Gemini to translate the structured content.
        prompt = (
            "Translate the following structured report fields into French. "
            "Preserve component names, API identifiers, code snippets and technical terms "
            "in English. Keep a professional consulting tone, and return only valid "
            "JSON with the same structure.\n\n"
            "Input:\n"
            f"{source_payload}"
        )

        result = generate_report_json(prompt, fallback_json=source_payload)
        translated_data = result.get("data", {})

        translated_ai_summary = translated_data.get("ai_summary", source_payload["ai_summary"])
        translated_recommendation = translated_data.get(
            "migration_recommendation", source_payload["migration_recommendation"]
        )
        translated_ai_insights = translated_data.get("ai_insights", source_payload["ai_insights"])
        translated_ai_error = translated_data.get("ai_error", source_payload["ai_error"])
        translated_details = translated_data.get("details", source_payload["details"])
        translated_sections = translated_data.get("sections", source_payload["sections"])

        updates = {
            "ai_summary_fr": translated_ai_summary,
            "translations.fr.ai_summary": translated_ai_summary,
            "translations.fr.migration_recommendation": translated_recommendation,
            "translations.fr.ai_insights": translated_ai_insights,
            "translations.fr.ai_error": translated_ai_error,
            "translations.fr.details": translated_details,
            "translations.fr.sections": translated_sections,
        }
        report_repo.update_report(report_id, updates)

        response_body = {
            "ai_summary_fr": translated_ai_summary,
            "migration_recommendation_fr": translated_recommendation,
            "ai_insights_fr": translated_ai_insights,
            "ai_error_fr": translated_ai_error,
            "details_fr": translated_details,
            "translations": {"fr": translated_data},
            "used_ai": result.get("used_ai", False),
        }
        return jsonify(response_body), 200

    except Exception as error:  # pylint: disable=broad-exception-caught
        logger.error("Error translating report %s: %s", report_id, error)
        return jsonify({"error": str(error)}), 500


def _load_matrix(data: dict) -> dict | None:
    """
    Load a compatibility matrix by matrix_id or latest matrix for analysis_id.
    """
    compatibility_repo = CompatibilityRepository()

    if data.get("matrix_id"):
        return compatibility_repo.get_matrix_by_id(data["matrix_id"])

    if data.get("analysis_id"):
        return compatibility_repo.get_latest_matrix_by_analysis_id(data["analysis_id"])

    return None

@app.route("/reports/<report_id>", methods=["DELETE"])
def delete_report(report_id):
    """Soft delete a report by setting its status to False."""
    try:
        report_repo = ReportRepository()
        success = report_repo.soft_delete_report(report_id)

        if not success:
            return jsonify({
                "error": f"Report '{report_id}' not found or already deleted."
            }), 404

        return jsonify({
            "message": f"Report '{report_id}' deleted successfully (soft delete)."
        }), 200

    except Exception as error:  # pylint: disable=broad-exception-caught
        logger.error("Error deleting report: %s", error)
        return jsonify({"error": str(error)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5004))
    debug = os.getenv("DEBUG", "false").lower() in {"1", "true", "yes"}
    app.run(host="0.0.0.0", port=port, debug=debug)
