"""
Prompt builder for Report Service.

Builds structured prompts for Gemini to generate
human-readable migration reports.
"""


def build_report_prompt(report: dict) -> str:
    """
    Build a prompt for generating a high-level migration report.

    Args:
        report: structured report dict from report_builder

    Returns:
        string prompt
    """

    summary = report.get("summary", "")
    score = report.get("migration_score", 0)
    recommendation = report.get("migration_recommendation", "")
    components = report.get("sections", {}).get("components", [])

    blockers = [
        c for c in components
        if c.get("final_risk") == "BLOCKER"
    ]

    prompt = f"""
You are a Jira Cloud migration expert.

Generate a professional migration report based on the following data.

=== CONTEXT ===
Migration Score: {score}/100

Summary:
{summary}

Global Recommendation:
{recommendation}

=== BLOCKERS ===
"""

    for b in blockers[:5]:
        prompt += f"""
- Component: {b.get("component_id")}
  Risk: {b.get("final_risk")}
  Issue: {b.get("reasoning_summary")}
  Fix: {b.get("recommended_action")}
"""

    prompt += """

=== INSTRUCTIONS ===

Write a clear, structured report with:

1. Executive Summary
2. Key Risks
3. Migration Strategy
4. Recommended Next Steps

Constraints:
- Keep it concise (max 300-500 words)
- Use professional consulting tone
- Do NOT repeat raw JSON
"""

    return prompt.strip()
