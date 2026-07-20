"""
Report Service for Jira DC → Cloud migration analysis.

Generates structured migration reports from compatibility matrices.
"""

import json
import logging
import os
import re
import sys

from dotenv import load_dotenv
from flask import Flask, jsonify, make_response, request, send_file
from flask_cors import CORS

load_dotenv()

from shared.core.config import Config

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# pylint: disable=wrong-import-position
from report_service.generators.json_export import export_report_to_json
from report_service.generators.pdf_export import export_report_to_pdf
from report_service.generators.report_builder import build_report
from report_service.llm.gemini_client import generate_report_json
from shared.repositories.compatibility_repository import CompatibilityRepository
from shared.repositories.report_repository import ReportRepository

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": Config.CORS_ALLOWED_ORIGINS}})

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
        report = build_report(
            matrix,
            language=language,
            source_filename=data.get("source_filename", ""),
            analysis_name=data.get("analysis_name", ""),
            user_email=data.get("user_email", matrix.get("user_email", "")),
            user_id=data.get("user_id", matrix.get("user_id", "")),
        )
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
    """Retrieve a generated report by report_id only if active and allowed."""
    try:
        report_repo = ReportRepository()
        user_email = request.args.get("user_email") or request.headers.get("X-User-Email")
        report = report_repo.get_report_by_id(report_id, user_email=user_email)

        if not report:
            return jsonify({"error": f"Report '{report_id}' not found."}), 404

        report.pop("_id", None)
        return jsonify(report), 200

    except Exception as error:  # pylint: disable=broad-exception-caught
        logger.error("Error retrieving report: %s", error)
        return jsonify({"error": str(error)}), 500

@app.route("/reports", methods=["GET"])
def list_reports():
    """List active generated reports, optionally scoped to a user."""
    try:
        report_repo = ReportRepository()
        limit = request.args.get("limit", 50, type=int)
        user_email = request.args.get("user_email") or request.headers.get("X-User-Email")
        reports = report_repo.list_reports(limit=limit, user_email=user_email)

        return jsonify({"reports": reports, "count": len(reports)}), 200

    except Exception as error:  # pylint: disable=broad-exception-caught
        logger.error("Error listing reports: %s", error)
        return jsonify({"error": str(error)}), 500

@app.route("/reports/archived", methods=["GET"])
def list_archived_reports():
    """List archived reports, optionally scoped to a user."""
    try:
        report_repo = ReportRepository()
        limit = request.args.get("limit", 50, type=int)
        user_email = request.args.get("user_email") or request.headers.get("X-User-Email")
        archived_reports = report_repo.list_archived_reports(limit=limit, user_email=user_email)
        return jsonify({"reports": archived_reports, "count": len(archived_reports)}), 200
    except Exception as error:  # pylint: disable=broad-exception-caught
        logger.error("Error listing archived reports: %s", error)
        return jsonify({"error": str(error)}), 500

@app.route("/reports/<report_id>/archive", methods=["POST"])
def archive_report(report_id):
    """Archive a report by moving it from reports to reports_archived."""
    try:
        report_repo = ReportRepository()
        user_email = request.args.get("user_email") or request.headers.get("X-User-Email")
        success = report_repo.archive_report(report_id, user_email=user_email)

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
    user_email = request.args.get("user_email") or request.headers.get("X-User-Email")
    report = report_repo.get_report_by_id(report_id, user_email=user_email)

    if not report:
        return jsonify({"error": f"Report '{report_id}' not found."}), 404

    report.pop("_id", None)
    file_path = export_report_to_json(report)
    response = make_response(send_file(file_path, as_attachment=True))
    filename = _sanitize_download_filename(
        report.get("analysis_name") or report.get("source_filename") or report_id,
        "json",
    )
    response.headers["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response

@app.route("/reports/<report_id>/pdf", methods=["GET"])
def export_pdf(report_id):
    """Export an active report as PDF file."""
    report_repo = ReportRepository()
    user_email = request.args.get("user_email") or request.headers.get("X-User-Email")
    report = report_repo.get_report_by_id(report_id, user_email=user_email)

    if not report:
        return jsonify({"error": f"Report '{report_id}' not found."}), 404

    report.pop("_id", None)
    requested_language = request.args.get("language")
    if requested_language in ("en", "fr"):
        report["language"] = requested_language
    file_path = export_report_to_pdf(report)
    response = make_response(send_file(file_path, as_attachment=True))
    filename = _sanitize_download_filename(
        report.get("analysis_name") or report.get("source_filename") or report_id,
        "pdf",
    )
    response.headers["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


def _sanitize_download_filename(value: str | None, extension: str) -> str:
    safe_base = re.sub(r"[^A-Za-z0-9_.-]+", "_", str(value or "report").strip())
    safe_base = safe_base.strip("._-")[:120] or "report"
    return f"{safe_base}.{extension}"

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
        user_email = request.args.get("user_email") or request.headers.get("X-User-Email")
        report = report_repo.get_report_by_id(report_id, user_email=user_email)

        if not report:
            return jsonify({"error": f"Report '{report_id}' not found."}), 404

        logger.info("Translate report request: report_id=%s target=%s", report_id, target)

        # Build structured payload used for translation and cache validation.
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

        if target == "en":
            # If the report was generated in English, return the stored summary.
            if report.get("language", "en") == "en":
                summary_val = report.get("ai_summary", report.get("summary", ""))
                return jsonify({"ai_summary": summary_val}), 200

            # Try to return a cached English translation when available.
            existing_en = report.get("ai_summary_en")
            if existing_en:
                return jsonify({"ai_summary": existing_en}), 200

            # If the report was generated in French, translate the French summary back to English.
            summary_val = report.get("ai_summary_fr") or report.get("ai_summary", "")
            recommendation_val = (
                report.get("migration_recommendation_fr")
                or report.get("migration_recommendation", "")
            )
            insights_val = report.get("ai_insights_fr") or report.get("ai_insights", "")
            error_val = report.get("ai_error_fr") or report.get("ai_error", "")
            details_val = report.get("details_fr") or report.get("details", "")
            sections_val = (
                (report.get("translations", {}) or {}).get("fr", {}).get("sections")
                or report.get("sections", {})
            )

            source_payload = {
                "ai_summary": summary_val,
                "migration_recommendation": recommendation_val,
                "ai_insights": insights_val,
                "ai_error": error_val,
                "details": details_val,
                "sections": sections_val,
            }

            def _preserve_component_ids(source_sections: dict, translated_sections: dict) -> dict:
                if not isinstance(translated_sections, dict):
                    return source_sections
                result_sections = {}
                for section_name in ("components", "blockers", "recommendations"):
                    source_items = source_sections.get(section_name, [])
                    translated_items = translated_sections.get(section_name, [])
                    merged_items = []
                    for index, item in enumerate(translated_items or []):
                        if not isinstance(item, dict):
                            merged_items.append(item)
                            continue
                        source_item = source_items[index] if index < len(source_items) else {}
                        merged_items.append({
                            **item,
                            "component_id": (
                                source_item.get("component_id", item.get("component_id", ""))
                            ),
                        })
                    result_sections[section_name] = merged_items
                return result_sections

            prompt = (
                "Translate ALL the following structured report fields into English. "
                "Translate reasoning_summary, recommended_action, action, reason, and other "
                "text fields to English. Keep component names, API identifiers, code snippets, "
                "and technical terms in English. Keep a professional consulting tone. "
                "Ensure the JSON structure is identical with translated values, and preserve "
                "component_id values exactly. "
                "Return ONLY a valid JSON object with no extra text.\n\n"
                "Input JSON:\n"
                f"{json.dumps(source_payload, ensure_ascii=False, indent=2)}"
            )

            result = generate_report_json(
                prompt,
                fallback_json=source_payload,
            )
            translated_data = result.get("data", {})
            translated_ai_summary = translated_data.get(
                "ai_summary",
                source_payload["ai_summary"],
            )
            translated_recommendation = translated_data.get(
                "migration_recommendation",
                source_payload["migration_recommendation"],
            )
            translated_ai_insights = translated_data.get(
                "ai_insights",
                source_payload["ai_insights"],
            )
            translated_ai_error = translated_data.get(
                "ai_error",
                source_payload["ai_error"],
            )
            translated_details = translated_data.get(
                "details",
                source_payload["details"],
            )
            translated_sections = _preserve_component_ids(
                source_payload["sections"],
                translated_data.get("sections", source_payload["sections"]),
            )

            response_body = {
                "ai_summary": translated_ai_summary,
                "migration_recommendation": translated_recommendation,
                "ai_insights": translated_ai_insights,
                "ai_error": translated_ai_error,
                "details": translated_details,
                "translations": {"en": {**translated_data, "sections": translated_sections}},
                "used_ai": result.get("used_ai", False),
                "error": result.get("error", ""),
            }

            should_cache = bool(result.get("used_ai"))
            if not should_cache:
                try:
                    should_cache = translated_data != source_payload
                except TypeError:
                    should_cache = False

            if should_cache:
                updates = {
                    "ai_summary_en": translated_ai_summary,
                    "translations.en.ai_summary": translated_ai_summary,
                "translations.en.migration_recommendation": translated_recommendation,
                "translations.en.ai_insights": translated_ai_insights,
                "translations.en.ai_error": translated_ai_error,
                "translations.en.details": translated_details,
                "translations.en.sections": translated_sections,
                }
                report_repo.update_report(report_id, updates)
                logger.info("Cached English translation for report_id=%s", report_id)

            return jsonify(response_body), 200

        # If a French translation already exists and is not identical
        # to the English source, return it.
        translations = report.get("translations", {}) or {}
        existing_fr = translations.get("fr", {}) or {}
        existing_summary = report.get("ai_summary_fr") or existing_fr.get("ai_summary")
        if existing_summary:
            cached_translation = {
                **existing_fr,
                "ai_summary": existing_summary,
            }

            # Helper: check if translations.sections contains any translated entries
            def _has_nonempty_sections(trans: dict) -> bool:
                if not trans:
                    return False
                secs = trans.get("sections") or {}
                comps = secs.get("components") or []
                blockers = secs.get("blockers") or []
                recs = secs.get("recommendations") or []
                return bool(comps or blockers or recs)

            # Consider translation 'complete' if sections or other fields are present
            is_complete = (
                _has_nonempty_sections(cached_translation)
                or bool(cached_translation.get("migration_recommendation"))
                or bool(cached_translation.get("ai_insights"))
                or bool(cached_translation.get("details"))
            )

            # Only return cached translation when it's both complete and different
            # from the original source payload (i.e., a real translation)
            if is_complete and cached_translation != source_payload:
                logger.info(
                    "Returning cached French translation for report_id=%s (complete)",
                    report_id,
                )
                return jsonify({
                    "ai_summary_fr": cached_translation.get("ai_summary"),
                    "migration_recommendation_fr": cached_translation.get(
                        "migration_recommendation"
                    ),
                    "ai_insights_fr": cached_translation.get("ai_insights"),
                    "ai_error_fr": cached_translation.get("ai_error"),
                    "details_fr": cached_translation.get("details"),
                    "translations": {"fr": cached_translation},
                    "used_ai": False,
                }), 200

            logger.info(
                "Cached French translation for report_id=%s is incomplete or identical to "
                "source payload; regenerating.",
                report_id,
            )

        def _preserve_component_ids(source_sections: dict, translated_sections: dict) -> dict:
            if not isinstance(translated_sections, dict):
                return source_sections
            result_sections = {}
            for section_name in ("components", "blockers", "recommendations"):
                source_items = source_sections.get(section_name, [])
                translated_items = translated_sections.get(section_name, [])
                merged_items = []
                for index, item in enumerate(translated_items or []):
                    if not isinstance(item, dict):
                        merged_items.append(item)
                        continue
                    source_item = source_items[index] if index < len(source_items) else {}
                    merged_items.append({
                        **item,
                        "component_id": (
                            source_item.get("component_id", item.get("component_id", ""))
                        ),
                    })
                result_sections[section_name] = merged_items
            return result_sections

        # Build a prompt that asks Gemini to translate the structured content.
        prompt = (
            "Translate ALL the following structured report fields into French. "
            "Translate reasoning_summary, recommended_action, action, reason, and other "
            "text fields to French. Keep component names, API identifiers, code snippets, "
            "and technical terms in English. Keep a professional consulting tone. "
            "Ensure the JSON structure is identical with translated values. "
            "Preserve component_id values exactly. "
            "Return ONLY a valid JSON object with no extra text.\n\n"
            "Input JSON:\n"
            f"{json.dumps(source_payload, ensure_ascii=False, indent=2)}"
        )

        result = generate_report_json(prompt, fallback_json=source_payload)
        translated_data = result.get("data", {})

        logger.info(
            "Gemini translation response for report_id=%s: used_ai=%s error=%s data_keys=%s",
            report_id,
            result.get("used_ai", False),
            result.get("error", ""),
            list(translated_data.keys()),
        )
        logger.debug("Gemini translated_data payload: %s", translated_data)

        translated_ai_summary = translated_data.get("ai_summary", source_payload["ai_summary"])
        translated_recommendation = translated_data.get(
            "migration_recommendation", source_payload["migration_recommendation"]
        )
        translated_ai_insights = translated_data.get("ai_insights", source_payload["ai_insights"])
        translated_ai_error = translated_data.get("ai_error", source_payload["ai_error"])
        translated_details = translated_data.get("details", source_payload["details"])
        translated_sections = _preserve_component_ids(
            source_payload["sections"],
            translated_data.get("sections", source_payload["sections"]),
        )

        response_body = {
            "ai_summary_fr": translated_ai_summary,
            "migration_recommendation_fr": translated_recommendation,
            "ai_insights_fr": translated_ai_insights,
            "ai_error_fr": translated_ai_error,
            "details_fr": translated_details,
            "translations": {"fr": {**translated_data, "sections": translated_sections}},
            "used_ai": result.get("used_ai", False),
            "error": result.get("error", ""),
        }

        # Only cache real translated content when Gemini actually generated a translation
        # and the result is not just the original English payload.
        should_cache = bool(result.get("used_ai"))
        if not should_cache:
            try:
                should_cache = translated_data != source_payload
            except TypeError:
                should_cache = False

        logger.info(
            "Translation finished for report_id=%s target=%s used_ai=%s should_cache=%s error=%s",
            report_id,
            target,
            result.get("used_ai", False),
            should_cache,
            result.get("error", ""),
        )

        if should_cache:
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
            logger.info("Cached French translation for report_id=%s", report_id)

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
        user_email = request.args.get("user_email") or request.headers.get("X-User-Email")
        success = report_repo.soft_delete_report(report_id, user_email=user_email)

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
    app.run(host=Config.FLASK_RUN_HOST, port=port, debug=debug)
