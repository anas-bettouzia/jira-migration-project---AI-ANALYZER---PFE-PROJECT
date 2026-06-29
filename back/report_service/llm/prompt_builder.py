"""
Prompt builder for Report Service.

Builds structured prompts for Gemini to generate
human-readable migration reports.
"""

from datetime import datetime


def build_report_prompt(report: dict, language: str = "en") -> str:
    """
    Build a prompt for generating a high-level migration report.

    Args:
        report: structured report dict from report_builder

    Returns:
        string prompt
    """
    current_date = datetime.utcnow().strftime("%Y-%m-%d")

    summary = report.get("summary", "")
    score = report.get("migration_score", 0)
    recommendation = report.get("migration_recommendation", "")
    components = report.get("sections", {}).get("components", [])

    blockers = [
        component for component in components
        if component.get("final_risk") == "BLOCKER"
    ]

    # Language instruction: default is English. If French requested, instruct the
    # model to produce the report in French while preserving technical identifiers
    # (component names, code snippets) in English.
    lang_instruction = (
        "Write the report in English." if language == "en"
        else (
            "Write the report in French. Preserve code, component names and technical "
            "identifiers in English where appropriate; keep a professional tone."
        )
    )

    prompt = f"""
You are a Jira Cloud migration expert.

Generate a professional migration report based on the following data.

=== CONTEXT ===
Report Date: {current_date}
Migration Score: {score}/100

Summary:
{summary}

Global Recommendation:
{recommendation}

Language Instruction: {lang_instruction}

=== BLOCKERS ===
"""

    for blocker in blockers[:5]:
        prompt += f"""
- Component: {blocker.get("component_name") or blocker.get("component_id")}
  Risk: {blocker.get("final_risk")}
  Issue: {blocker.get("reasoning_summary")}
  Fix: {blocker.get("recommended_action")}
"""

    prompt += f"""

=== INSTRUCTIONS ===

Write a clear, structured report with:

1. Executive Summary
2. Key Risks
3. Migration Strategy
4. Recommended Next Steps

Constraints:
- Use this exact report date: {current_date}
- Do NOT write [Current Date]
- Keep it concise, between 300 and 500 words
- Use a professional consulting tone
- Do NOT repeat raw JSON
- Do NOT invent components or risks not present in the input data
- When referencing components, use their business names only; do not expose technical component IDs.
"""

    return prompt.strip()
