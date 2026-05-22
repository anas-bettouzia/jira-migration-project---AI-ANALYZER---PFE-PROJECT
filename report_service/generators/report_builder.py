"""
Report Builder for the Report Service.

Builds a structured migration report from a compatibility matrix.
"""

import uuid
import os
import json
import importlib
from datetime import datetime
from functools import lru_cache

from report_service.llm.prompt_builder import build_report_prompt


@lru_cache(maxsize=1)
def _load_component_mapping() -> dict:
    """Load component ID -> human name mapping from config/components.json if present."""
    root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    cfg_path = os.path.join(root_dir, "config", "components.json")
    if not os.path.exists(cfg_path):
        return {}

    try:
        with open(cfg_path, "r", encoding="utf-8") as fh:
            return json.load(fh)
    except (OSError, json.JSONDecodeError, ValueError):
        return {}


def _get_component_name(component: dict) -> dict:
    """Return a tuple-like dict with name and source for a component.

    Priority: override mapping by component_id -> component_name -> location.workflow -> "".
    """
    mapping = _load_component_mapping()
    comp_id = component.get("component_id", "")

    if comp_id and comp_id in mapping and mapping.get(comp_id):
        return {"name": mapping.get(comp_id), "source": "override"}

    if component.get("component_name"):
        return {
            "name": component.get("component_name"),
            "source": component.get("component_name_source", "extracted"),
        }

    loc = component.get("location", {}) or {}
    if isinstance(loc, dict) and loc.get("workflow"):
        return {"name": loc.get("workflow"), "source": "workflow"}

    return {"name": "", "source": ""}


def _format_component_display_name(component: dict) -> str:
    """Return the human-friendly component display name."""
    name_info = _get_component_name(component)
    comp_id = component.get("component_id", "")
    name = name_info.get("name", "")
    if name and comp_id:
        return f"{name} ({comp_id})"
    if name:
        return name
    return comp_id


def build_report(matrix: dict) -> dict:
    """Build a structured report from a compatibility matrix."""
    report_id = str(uuid.uuid4())

    summary = matrix.get("summary", {})
    components = matrix.get("components", [])
    blockers = matrix.get("blockers", [])

    executive_summary = _build_executive_summary(summary)

    report = {
        "report_id": report_id,
        "matrix_id": matrix.get("matrix_id", ""),
        "analysis_id": matrix.get("analysis_id", ""),
        "generated_at": datetime.utcnow().isoformat(),
        "title": "Jira Data Center to Cloud Migration Compatibility Report",
        "summary": executive_summary,
        "migration_score": summary.get("migration_score", 0),
        "migration_recommendation": summary.get("migration_recommendation", ""),
        "statistics": summary,
        "sections": {
            "executive_summary": executive_summary,
            "risk_overview": _build_risk_overview(summary),
            "blockers": _build_blockers_section(blockers),
            "components": _build_components_section(components),
            "recommendations": _build_recommendations_section(components),
        },
        "raw_matrix": {
            "matrix_id": matrix.get("matrix_id", ""),
            "analysis_id": matrix.get("analysis_id", ""),
        },
    }

    ai_prompt = build_report_prompt(report)
    fallback_text = _build_fallback_ai_summary(report)

    try:
        gemini_module = importlib.import_module("report_service.llm.gemini_client")
        generate_report_text = getattr(gemini_module, "generate_report_text")
        ai_result = generate_report_text(ai_prompt, fallback_text=fallback_text)
    except (ImportError, ModuleNotFoundError, AttributeError) as err:
        ai_result = {
            "text": fallback_text,
            "used_ai": False,
            "model": "",
            "error": str(err),
        }

    report["ai_summary"] = ai_result.get("text", fallback_text)
    report["ai_used"] = ai_result.get("used_ai", False)
    report["ai_model"] = ai_result.get("model", "")
    report["ai_error"] = ai_result.get("error", "")

    return report


def _build_executive_summary(summary: dict) -> str:
    """Build executive summary text."""
    total = summary.get("total_components", 0)
    blocker_count = summary.get("blocker_count", 0)
    score = summary.get("migration_score", 0)

    if total == 0:
        return "No migration-relevant components were found in this analysis."

    if blocker_count > 0:
        return (
            f"The analysis identified {total} migration-relevant component(s), "
            f"including {blocker_count} blocker(s). "
            f"The current migration readiness score is {score}/100. "
            "Migration should not proceed before blocker items are resolved."
        )

    return (
        f"The analysis identified {total} migration-relevant component(s). "
        f"The current migration readiness score is {score}/100. "
        "No blocker was detected, but major and minor items should be reviewed."
    )


def _build_fallback_ai_summary(report: dict) -> str:
    """Build deterministic fallback report text when AI is unavailable."""
    stats = report.get("statistics", {})
    score = report.get("migration_score", 0)
    recommendation = report.get("migration_recommendation", "")

    return (
        "Executive Summary\n"
        f"{report.get('summary', '')}\n\n"
        "Risk Overview\n"
        f"Blockers: {stats.get('blocker_count', 0)}, "
        f"Major: {stats.get('major_count', 0)}, "
        f"Minor: {stats.get('minor_count', 0)}, "
        f"Info: {stats.get('info_count', 0)}.\n\n"
        "Migration Readiness\n"
        f"The migration readiness score is {score}/100. {recommendation}\n\n"
        "Recommended Next Steps\n"
        "Resolve all BLOCKER items first, then review MAJOR risks, rewrite unsupported scripts, "
        "and re-run the compatibility analysis before planning the Cloud migration."
    )


def _build_risk_overview(summary: dict) -> dict:
    """Build risk overview."""
    return {
        "blockers": summary.get("blocker_count", 0),
        "major": summary.get("major_count", 0),
        "minor": summary.get("minor_count", 0),
        "info": summary.get("info_count", 0),
        "incompatible": summary.get("incompatible_count", 0),
        "partial": summary.get("partial_count", 0),
        "compatible": summary.get("compatible_count", 0),
        "needs_review": summary.get("needs_review_count", 0),
    }


def _build_blockers_section(blockers: list[dict]) -> list[dict]:
    """Build blocker section."""
    out = []
    for blocker in blockers:
        name_info = _get_component_name(blocker)
        out.append({
            "component_id": blocker.get("component_id", ""),
            "component_name": name_info.get("name"),
            "component_display_name": _format_component_display_name(blocker),
            "component_name_source": name_info.get("source"),
            "plugin": blocker.get("plugin", ""),
            "risk_level": blocker.get("risk_level", ""),
            "overall_status": blocker.get("overall_status", ""),
            "recommended_action": blocker.get("recommended_action", ""),
            "confidence": blocker.get("confidence"),
        })

    return out


def _build_components_section(components: list[dict]) -> list[dict]:
    """Build component details section."""
    out = []
    for component in components:
        name_info = _get_component_name(component)
        out.append({
            "component_id": component.get("component_id", ""),
            "component_name": name_info.get("name"),
            "component_display_name": _format_component_display_name(component),
            "component_name_source": name_info.get("source"),
            "component_type": component.get("component_type", ""),
            "plugin": component.get("plugin", ""),
            "location": component.get("location", {}),
            "final_status": component.get("final_status", component.get("overall_status", "")),
            "final_risk": component.get("final_risk", component.get("risk_level", "")),
            "confidence": component.get("confidence"),
            "features_analyzed": component.get("features_analyzed", []),
            "evidence_count": component.get("evidence_count", 0),
            "reasoning_summary": component.get("reasoning_summary", ""),
            "recommended_action": component.get("recommended_action", ""),
            "ai_reasoning": component.get("ai_reasoning", {}),
            "evidence": component.get("evidence", []),
        })

    return out


def _build_recommendations_section(components: list[dict]) -> list[dict]:
    """Build prioritized recommendations."""
    recommendations = []

    for component in components:
        risk = component.get("final_risk", component.get("risk_level", "INFO"))
        status = component.get("final_status", component.get("overall_status", ""))

        if risk in ("BLOCKER", "MAJOR"):
            name_info = _get_component_name(component)
            recommendations.append({
                "priority": risk,
                "component_id": component.get("component_id", ""),
                "component_name": name_info.get("name"),
                "component_display_name": _format_component_display_name(component),
                "component_name_source": name_info.get("source"),
                "status": status,
                "action": component.get("recommended_action", ""),
                "reason": component.get("reasoning_summary", ""),
            })

    return recommendations
