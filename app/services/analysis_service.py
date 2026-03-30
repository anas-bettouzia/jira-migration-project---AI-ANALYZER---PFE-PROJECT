from app.services.ai_service import generate_ai_insights
from app.repositories.report_repo import save_report

def analyze_data(data):
    findings = [
        {"type": "critical", "msg": "ScriptRunner not compatible"},
        {"type": "warning", "msg": "Field format issue"}
    ]

    ai = generate_ai_insights(findings)

    result = {
        "score": 78,
        "findings": findings,
        "ai_recommendations": ai
    }

    save_report(result)

    return result