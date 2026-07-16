"""
PDF export utilities for Report Service.

Generates a branded PDF migration report from a structured report dict.
"""

# pylint: disable=too-many-lines

import re
from datetime import datetime
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Image,
    KeepTogether,
    LongTable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

BASE_DIR = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT_DIR = BASE_DIR / "generated_reports"
LOGO_PATH = BASE_DIR / "assets" / "logo-spectrum-groupe.png"

BRAND_NAVY = colors.HexColor("#111B46")
BRAND_BLUE = colors.HexColor("#2F80ED")
BRAND_CYAN = colors.HexColor("#00B8D9")
BRAND_GREEN = colors.HexColor("#16A06A")
BRAND_RED = colors.HexColor("#E84855")
BRAND_ORANGE = colors.HexColor("#F59E0B")
TEXT_MUTED = colors.HexColor("#5E6B8A")
BORDER = colors.HexColor("#D7E0F0")
SOFT_BLUE = colors.HexColor("#EEF5FF")
SOFT_GREEN = colors.HexColor("#EAF8F1")
SOFT_RED = colors.HexColor("#FFF0F0")
SOFT_ORANGE = colors.HexColor("#FFF7E6")
SOFT_SLATE = colors.HexColor("#F3F6FB")

PRIORITY_ORDER = {
    "BLOCKER": 0,
    "CRITICAL": 0,
    "MAJOR": 1,
    "MINOR": 2,
    "INFO": 3,
}

PDF_TEXT = {
    "en": {
        "generated": "Generated",
        "source": "Source",
        "migration_package": "Migration package",
        "title": "Cloud readiness report",
        "migration_score": "Migration score",
        "critical_blockers": "Critical blockers",
        "components": "Components",
        "compatible": "Compatible",
        "incompatible": "Incompatible",
        "top_priorities": "Top priorities",
        "decision_blockers": "Migration is not recommended until these blockers are resolved.",
        "priority": "Priority",
        "component": "Component",
        "status": "Status",
        "short_action": "Short action",
        "executive_summary": "Executive summary",
        "risk_overview": "Risk overview",
        "risk_category": "Risk category",
        "count": "Count",
        "interpretation": "Interpretation",
        "blockers": "Blockers",
        "major": "Major",
        "minor": "Minor",
        "info": "Info",
        "partial": "Partial",
        "blockers_interpretation": "Must be resolved before migration",
        "major_interpretation": "Requires technical review",
        "minor_interpretation": "Low impact improvement",
        "info_interpretation": "Informational finding",
        "compatible_interpretation": "Ready or low risk",
        "partial_interpretation": "Needs adaptation",
        "incompatible_interpretation": "Not directly Cloud ready",
        "no_blockers": "No critical blockers detected.",
        "plugin": "Plugin",
        "risk": "Risk",
        "recommended_action": "Recommended action",
        "component_assessment": "Component assessment",
        "type": "Type",
        "prioritized_recommendations": "Prioritized recommendations",
        "no_recommendations": "No prioritized recommendations were generated.",
        "continued_text": (
            "Report text continues in the "
            "detailed analysis available in "
            "JSON export."
        ),
        "footer_source": "Source",
        "footer_report": "Report",
        "decision_status": "Migration decision status",
        "decision_status_blocked": "Migration not recommended",
        "decision_status_detail_blocked": (
            "{count} blocker(s) must be resolved before "
            "Cloud migration."
        ),
        "decision_status_review": "Migration requires review",
        "decision_status_detail_review": (
            "Major findings need stakeholder alignment "
            "before go/no-go."
        ),
        "decision_status_ready": "Ready for migration review",
        "decision_status_detail_ready": "No critical blocker detected.",
        "page": "Page",
    },
    "fr": {
        "generated": "Généré le",
        "source": "Source",
        "migration_package": "Package de migration",
        "title": "Rapport de préparation Cloud",
        "migration_score": "Score de migration",
        "critical_blockers": "Blocages critiques",
        "components": "Composants",
        "compatible": "Compatibles",
        "incompatible": "Incompatibles",
        "top_priorities": "Priorités principales",
        "decision_blockers": (
            "La migration n'est pas recommandée tant que ces blocages "
            "ne sont pas résolus."
        ),
        "priority": "Priorité",
        "component": "Composant",
        "status": "Statut",
        "short_action": "Action courte",
        "executive_summary": "Résumé exécutif",
        "risk_overview": "Vue d'ensemble des risques",
        "risk_category": "Catégorie de risque",
        "count": "Nombre",
        "interpretation": "Interprétation",
        "blockers": "Blocages",
        "major": "Majeurs",
        "minor": "Mineurs",
        "info": "Info",
        "partial": "Partiels",
        "blockers_interpretation": "À résoudre avant la migration",
        "major_interpretation": "Nécessite une revue technique",
        "minor_interpretation": "Amélioration à faible impact",
        "info_interpretation": "Constat informatif",
        "compatible_interpretation": "Prêt ou faible risque",
        "partial_interpretation": "Nécessite une adaptation",
        "incompatible_interpretation": "Pas directement prêt pour le Cloud",
        "no_blockers": "Aucun blocage critique détecté.",
        "plugin": "Plugin",
        "risk": "Risque",
        "recommended_action": "Action recommandée",
        "component_assessment": "Évaluation des composants",
        "type": "Type",
        "prioritized_recommendations": "Recommandations prioritaires",
        "no_recommendations": "Aucune recommandation prioritaire n'a été générée.",
        "continued_text": (
            "Le texte du rapport continue dans "
            "l'analyse détaillée disponible dans "
            "l'export JSON."
        ),
        "footer_source": "Source",
        "footer_report": "Rapport",
        "decision_status": "État de décision",
        "decision_status_blocked": "Migration non recommandée",
        "decision_status_detail_blocked": "{count} blocage(s) à résoudre avant la migration Cloud.",
        "decision_status_review": "Migration à revoir",
        "decision_status_detail_review": (
            "Les constats majeurs doivent être alignés "
            "avant la décision."
        ),
        "decision_status_ready": "Prêt pour revue migration",
        "decision_status_detail_ready": "Aucun blocage critique détecté.",
        "page": "Page",
    },
}


def export_report_to_pdf(
    report: dict,
    output_dir: str | Path = DEFAULT_OUTPUT_DIR,
) -> str:
    """Export a migration report to PDF and return the file path."""
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    report_id = report.get("report_id", "unknown-report")
    file_path = output_path / f"{report_id}.pdf"

    doc = SimpleDocTemplate(
        str(file_path),
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
    )
    language = _pdf_language(report)
    doc.report_id = report_id
    doc.source_filename = _report_source_name(report, language)
    doc.language = language

    styles = _build_styles()
    story = []

    _add_cover_header(story, report, styles, language)
    _add_summary_cards(story, report, styles, language)
    _add_top_priorities(story, report, styles, language)
    _add_executive_summary(story, report, styles, language)
    _add_risk_overview(story, report, styles, language)
    _add_blockers(story, report, styles, language)
    _add_components(story, report, styles, language)
    _add_recommendations(story, report, styles, language)

    doc.build(story, onFirstPage=_draw_page_frame, onLaterPages=_draw_page_frame)
    return str(file_path)


def _build_styles():
    """Return custom ReportLab styles for the branded report."""
    styles = getSampleStyleSheet()

    styles.add(ParagraphStyle(
        name="Eyebrow",
        parent=styles["BodyText"],
        textColor=BRAND_BLUE,
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        uppercase=True,
    ))
    styles.add(ParagraphStyle(
        name="ReportTitle",
        parent=styles["Title"],
        textColor=BRAND_NAVY,
        fontName="Helvetica-Bold",
        fontSize=24,
        leading=29,
        spaceAfter=8,
    ))
    styles.add(ParagraphStyle(
        name="Subtitle",
        parent=styles["BodyText"],
        textColor=TEXT_MUTED,
        fontSize=10,
        leading=16,
        spaceBefore=4,
    ))
    styles.add(ParagraphStyle(
        name="SectionTitle",
        parent=styles["Heading2"],
        textColor=BRAND_NAVY,
        fontName="Helvetica-Bold",
        fontSize=14,
        leading=18,
        spaceBefore=10,
        spaceAfter=8,
    ))
    styles.add(ParagraphStyle(
        name="CardLabel",
        parent=styles["BodyText"],
        textColor=TEXT_MUTED,
        fontName="Helvetica-Bold",
        fontSize=7,
        leading=9,
        alignment=TA_CENTER,
    ))
    styles.add(ParagraphStyle(
        name="CardValue",
        parent=styles["BodyText"],
        textColor=BRAND_NAVY,
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        alignment=TA_CENTER,
    ))
    styles.add(ParagraphStyle(
        name="SmallRight",
        parent=styles["BodyText"],
        textColor=TEXT_MUTED,
        fontSize=8,
        leading=10,
        alignment=TA_RIGHT,
    ))
    styles.add(ParagraphStyle(
        name="TableHeader",
        parent=styles["BodyText"],
        textColor=colors.white,
        fontName="Helvetica-Bold",
        fontSize=6.8,
        leading=8.2,
        alignment=TA_LEFT,
        wordWrap="CJK",
        splitLongWords=True,
    ))
    styles.add(ParagraphStyle(
        name="TableCell",
        parent=styles["BodyText"],
        textColor=colors.HexColor("#17233F"),
        fontName="Helvetica",
        fontSize=6.6,
        leading=8.4,
        alignment=TA_LEFT,
        wordWrap="CJK",
        splitLongWords=True,
    ))
    styles.add(ParagraphStyle(
        name="TableCellStrong",
        parent=styles["TableCell"],
        fontName="Helvetica-Bold",
    ))
    styles.add(ParagraphStyle(
        name="PriorityBadge",
        parent=styles["BodyText"],
        textColor=colors.white,
        fontName="Helvetica-Bold",
        fontSize=6.8,
        leading=8.4,
        alignment=TA_CENTER,
        wordWrap="CJK",
        splitLongWords=True,
    ))
    styles["BodyText"].fontSize = 9
    styles["BodyText"].leading = 13
    styles["BodyText"].textColor = colors.HexColor("#26324D")
    styles["Heading1"].textColor = BRAND_NAVY
    styles["Heading2"].textColor = BRAND_NAVY
    return styles


def _report_source_name(report: dict, language: str) -> str:
    """Return the best visible source name for the PDF report."""
    return str(
        report.get("analysis_name")
        or report.get("source_filename")
        or _pdf_text(language, "migration_package")
    )


def _pdf_decision_status(report: dict) -> dict:
    """Return the report decision state used in PDF export."""
    stats = report.get("statistics", {}) or {}
    score = stats.get("migration_score", report.get("migration_score", 0)) or 0
    blockers = stats.get("blocker_count", report.get("blocker_count", 0)) or 0
    incompatible = stats.get("incompatible_count", 0) or 0
    major = stats.get("major_count", 0) or 0
    safe_score = score >= 70
    is_blocked = incompatible > 0 or blockers > 1
    needs_review = not is_blocked and (major > 0 or (blockers == 1 and safe_score))

    if is_blocked:
        return {
            "label": "decision_status_blocked",
            "detail": "decision_status_detail_blocked",
            "count": blockers,
        }

    if needs_review:
        return {
            "label": "decision_status_review",
            "detail": "decision_status_detail_review",
            "count": blockers,
        }

    return {
        "label": "decision_status_ready",
        "detail": "decision_status_detail_ready",
        "count": blockers,
    }


def _add_cover_header(story: list, report: dict, styles, language: str) -> None:
    """Add branded report heading with logo and metadata."""
    logo = _logo_flowable(width=44 * mm)
    generated_at = _format_date(report.get("generated_at", ""))
    source_filename = _report_source_name(report, language)

    meta = Paragraph(
        f"<b>{_pdf_text(language, 'generated')}:</b> {generated_at}<br/>"
        f"<b>{_pdf_text(language, 'source')}:</b> {_clean_inline(source_filename)}",
        styles["SmallRight"],
    )
    header_cells = [[logo if logo else Paragraph("Spectrum Groupe", styles["Eyebrow"]), meta]]
    header = Table(header_cells, colWidths=[86 * mm, 74 * mm])
    header.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
    ]))
    story.append(header)

    story.append(_accent_bar())
    story.append(Spacer(1, 8))
    story.append(Paragraph(_pdf_text(language, "title"), styles["ReportTitle"]))
    story.append(Paragraph(_clean_inline(_cover_summary(report, language)), styles["Subtitle"]))
    story.append(Spacer(1, 14))


def _add_summary_cards(story: list, report: dict, styles, language: str) -> None:
    """Add score and status cards."""
    risk = report.get("sections", {}).get("risk_overview", {})
    score = report.get("migration_score", 0)
    blockers = risk.get("blockers", 0)
    components = report.get("statistics", {}).get("total_components", 0)
    compatible = risk.get("compatible", 0)
    incompatible = risk.get("incompatible", 0)

    rows = [[
        _metric_card(
            _pdf_text(language, "migration_score"),
            f"{score}/100",
            styles,
            SOFT_BLUE,
        ),
        _metric_card(
            _pdf_text(language, "critical_blockers"),
            str(blockers),
            styles,
            SOFT_RED if blockers else SOFT_GREEN,
        ),
        _metric_card(
            _pdf_text(language, "components"),
            str(components),
            styles,
            SOFT_BLUE,
        ),
        _metric_card(
            _pdf_text(language, "compatible"),
            str(compatible),
            styles,
            SOFT_GREEN,
        ),
        _metric_card(
            _pdf_text(language, "incompatible"),
            str(incompatible),
            styles,
            SOFT_ORANGE if incompatible else SOFT_GREEN,
        ),
    ]]
    table = Table(rows, colWidths=[32 * mm] * 5)
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 3),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3),
    ]))
    story.append(table)
    story.append(Spacer(1, 8))
    _add_decision_status(story, report, styles, language)
    story.append(Spacer(1, 14))


def _add_top_priorities(story: list, report: dict, styles, language: str) -> None:
    """Add the most important migration decisions before detailed tables."""
    blockers = _top_blockers(report, limit=5)
    if not blockers:
        return

    story.append(Paragraph(_pdf_text(language, "top_priorities"), styles["SectionTitle"]))
    story.append(_notice_box(
        _pdf_text(language, "decision_blockers"),
        styles,
        SOFT_RED,
        BRAND_RED,
    ))
    story.append(Spacer(1, 6))

    rows = [_table_row([
        _pdf_text(language, "priority"),
        _pdf_text(language, "component"),
        _pdf_text(language, "status"),
        _pdf_text(language, "short_action"),
    ], styles, header=True)]
    for blocker in blockers:
        priority = _component_priority(blocker)
        rows.append([
            _priority_badge(
                _display_finding_value(priority, language),
                styles,
            ),
            _table_cell(_component_label(blocker), styles, strong=True),
            _table_cell(
                _display_finding_value(
                    _component_status(blocker),
                    language,
                ),
                styles,
                strong=True,
            ),
            _table_cell(
                _short_text(
                    _component_action(blocker, report, "blockers"),
                    120,
                ),
                styles,
            ),
        ])

    table = Table(rows, colWidths=[22 * mm, 42 * mm, 30 * mm, 66 * mm], repeatRows=1)
    style_commands = _table_style(header_color=BRAND_RED).getCommands()
    for row_index, blocker in enumerate(blockers, start=1):
        style_commands.extend([
            (
                "BACKGROUND",
                (0, row_index),
                (0, row_index),
                _priority_color(_component_priority(blocker)),
            ),
            ("VALIGN", (0, row_index), (0, row_index), "MIDDLE"),
        ])
    table.setStyle(TableStyle(style_commands))
    story.append(table)
    story.append(Spacer(1, 10))


def _add_executive_summary(story: list, report: dict, styles, language: str) -> None:
    """Add executive summary generated by AI or deterministic fallback."""
    story.append(Paragraph(_pdf_text(language, "executive_summary"), styles["SectionTitle"]))
    summary_text = (
        _translated_report_field(report, "ai_summary", language)
        or report.get("summary", "")
    )
    _add_markdown_text(story, summary_text, styles, language)
    story.append(Spacer(1, 8))


def _add_decision_status(story: list, report: dict, styles, language: str) -> None:
    """Add the top migration decision status summary to the PDF."""
    status = _pdf_decision_status(report)
    label = _pdf_text(language, status["label"])
    detail = _pdf_text(language, status["detail"]).format(count=status["count"])
    if status["label"] == "decision_status_blocked":
        color = BRAND_RED
        background = SOFT_RED
    elif status["label"] == "decision_status_review":
        color = BRAND_ORANGE
        background = SOFT_ORANGE
    else:
        color = BRAND_GREEN
        background = SOFT_GREEN

    story.append(Paragraph(_pdf_text(language, "decision_status"), styles["SectionTitle"]))
    story.append(_notice_box(
        f"{label}: {detail}",
        styles,
        background,
        color,
    ))
    story.append(Spacer(1, 8))


def _add_risk_overview(story: list, report: dict, styles, language: str) -> None:
    """Add risk overview table."""
    story.append(Paragraph(_pdf_text(language, "risk_overview"), styles["SectionTitle"]))
    risk = report.get("sections", {}).get("risk_overview", {})
    rows = [
        [
            _pdf_text(language, "risk_category"),
            _pdf_text(language, "count"),
            _pdf_text(language, "interpretation"),
        ],
        [
            _pdf_text(language, "blockers"),
            risk.get("blockers", 0),
            _pdf_text(language, "blockers_interpretation"),
        ],
        [
            _pdf_text(language, "major"),
            risk.get("major", 0),
            _pdf_text(language, "major_interpretation"),
        ],
        [
            _pdf_text(language, "minor"),
            risk.get("minor", 0),
            _pdf_text(language, "minor_interpretation"),
        ],
        [
            _pdf_text(language, "info"),
            risk.get("info", 0),
            _pdf_text(language, "info_interpretation"),
        ],
        [
            _pdf_text(language, "compatible"),
            risk.get("compatible", 0),
            _pdf_text(language, "compatible_interpretation"),
        ],
        [
            _pdf_text(language, "partial"),
            risk.get("partial", 0),
            _pdf_text(language, "partial_interpretation"),
        ],
        [
            _pdf_text(language, "incompatible"),
            risk.get("incompatible", 0),
            _pdf_text(language, "incompatible_interpretation"),
        ],
    ]
    table = Table(rows, colWidths=[44 * mm, 22 * mm, 94 * mm], repeatRows=1)
    table.setStyle(_table_style(header_color=BRAND_NAVY))
    story.append(table)
    story.append(Spacer(1, 10))


def _add_blockers(story: list, report: dict, styles, language: str) -> None:
    """Add blocker details."""
    blockers = report.get("sections", {}).get("blockers", [])
    story.append(Paragraph(_pdf_text(language, "critical_blockers"), styles["SectionTitle"]))

    if not blockers:
        story.append(
            _notice_box(
                _pdf_text(language, "no_blockers"),
                styles,
                SOFT_GREEN,
                BRAND_GREEN,
            )
        )
        story.append(Spacer(1, 8))
        return

    rows = [_table_row([
        _pdf_text(language, "component"),
        _pdf_text(language, "plugin"),
        _pdf_text(language, "risk"),
        _pdf_text(language, "status"),
        _pdf_text(language, "recommended_action"),
    ], styles, header=True)]
    for blocker in blockers:
        rows.append([
            _table_cell(_component_label(blocker), styles),
            _table_cell(blocker.get("plugin", "-"), styles),
            _table_cell(
                _display_finding_value(_component_priority(blocker), language),
                styles,
                strong=True,
            ),
            _table_cell(
                _display_finding_value(_component_status(blocker), language),
                styles,
                strong=True,
            ),
            _table_cell(
                _short_text(
                    _component_action(blocker, report, "blockers"),
                    95,
                ),
                styles,
            ),
        ])

    table = LongTable(rows, colWidths=[34 * mm, 20 * mm, 18 * mm, 27 * mm, 71 * mm], repeatRows=1)
    table.setStyle(_table_style(header_color=BRAND_RED))
    story.append(table)
    story.append(Spacer(1, 10))



def _add_components(story: list, report: dict, styles, language: str) -> None:
    """Add a compact component assessment section."""
    components = report.get("sections", {}).get("components", [])
    if not components:
        return

    story.append(Paragraph(_pdf_text(language, "component_assessment"), styles["SectionTitle"]))
    rows = [_table_row([
        _pdf_text(language, "component"),
        _pdf_text(language, "type"),
        _pdf_text(language, "status"),
        _pdf_text(language, "risk"),
        _pdf_text(language, "recommended_action"),
    ], styles, header=True)]
    for component in components:
        rows.append([
            _table_cell(_component_label(component), styles),
            _table_cell(component.get("component_type", "-"), styles),
            _table_cell(
                _display_finding_value(_component_status(component), language),
                styles,
                strong=True,
            ),
            _table_cell(
                _display_finding_value(_component_priority(component), language),
                styles,
                strong=True,
            ),
            _table_cell(
                _short_text(
                    _component_action(component, report, "components"),
                    95,
                ),
                styles,
            ),
        ])

    table = LongTable(rows, colWidths=[34 * mm, 22 * mm, 28 * mm, 18 * mm, 68 * mm], repeatRows=1)
    table.setStyle(_table_style(header_color=BRAND_BLUE))
    story.append(table)
    story.append(Spacer(1, 10))


def _add_recommendations(story: list, report: dict, styles, language: str) -> None:
    """Add prioritized recommendations."""
    recommendations = report.get("sections", {}).get("recommendations", [])
    story.append(
        Paragraph(
            _pdf_text(language, "prioritized_recommendations"),
            styles["SectionTitle"],
        )
    )

    if not recommendations:
        story.append(
            _notice_box(
                _pdf_text(language, "no_recommendations"),
                styles,
                SOFT_BLUE,
                BRAND_BLUE,
            )
        )
        return

    for recommendation in recommendations[:10]:
        priority = _component_priority(recommendation)
        component = _clean_inline(_component_label(recommendation))
        action = _clean_inline(
            _component_action(recommendation, report, "recommendations")
        )
        reason = _clean_inline(
            _component_reason(recommendation, report, "recommendations")
        )
        bg = (
            SOFT_RED
            if priority.upper() == "BLOCKER"
            else SOFT_ORANGE
            if priority.upper() == "MAJOR"
            else SOFT_SLATE
        )
        priority_color = _priority_color(priority)
        item = Table(
            [
                [
                    _priority_badge(
                        _display_finding_value(priority, language),
                        styles,
                    ),
                    Paragraph(
                        f"<b>{component}</b><br/>{action}",
                        styles["BodyText"],
                    ),
                ],
                ["", Paragraph(reason, styles["Subtitle"])],
            ],
            colWidths=[25 * mm, 135 * mm],
        )
        item.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), bg),
            ("BACKGROUND", (0, 0), (0, 0), priority_color),
            ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("VALIGN", (0, 0), (0, 0), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ]))
        story.append(KeepTogether([item, Spacer(1, 6)]))


def _add_markdown_text(
    story: list,
    text: str,
    styles,
    language: str,
    max_lines: int | None = None,
) -> None:
    """Convert simple Markdown text into ReportLab paragraphs."""
    lines = text.splitlines()
    rendered = 0

    for line in lines:
        if max_lines is not None and rendered >= max_lines:
            story.append(Paragraph(_pdf_text(language, "continued_text"), styles["Subtitle"]))
            return

        line = line.strip()

        if not line or line == "---":
            story.append(Spacer(1, 5))
            continue

        if line.startswith("## "):
            story.append(Paragraph(_clean_inline(line[3:]), styles["SectionTitle"]))
            rendered += 1
            continue

        if line.startswith("### "):
            story.append(Paragraph(f"<b>{_clean_inline(line[4:])}</b>", styles["BodyText"]))
            rendered += 1
            continue

        if line.startswith("*   ") or line.startswith("- "):
            content = line.replace("*   ", "", 1).replace("- ", "", 1)
            story.append(Paragraph(f"&#8226; {_clean_inline(content)}", styles["BodyText"]))
            rendered += 1
            continue

        story.append(Paragraph(_clean_inline(line), styles["BodyText"]))
        rendered += 1


def _draw_page_frame(canvas, doc) -> None:
    """Draw subtle footer and page number."""
    canvas.saveState()
    width, _height = A4
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.5)
    canvas.line(doc.leftMargin, 12 * mm, width - doc.rightMargin, 12 * mm)
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(TEXT_MUTED)
    footer_left = _footer_text(
        getattr(doc, "source_filename", ""),
        getattr(doc, "report_id", ""),
        getattr(doc, "language", "en"),
    )
    canvas.drawString(doc.leftMargin, 8 * mm, footer_left)
    canvas.drawRightString(
        width - doc.rightMargin,
        8 * mm,
        f"{_pdf_text(getattr(doc, 'language', 'en'), 'page')} {doc.page}",
    )
    canvas.restoreState()


def _logo_flowable(width: float):
    """Return Spectrum logo image if available."""
    if not LOGO_PATH.exists():
        return None
    image = Image(str(LOGO_PATH))
    ratio = image.imageHeight / float(image.imageWidth)
    image.drawWidth = width
    image.drawHeight = width * ratio
    return image


def _accent_bar() -> Table:
    """Return Spectrum-colored accent bar."""
    table = Table(
        [["", "", "", ""]],
        colWidths=[40 * mm, 40 * mm, 40 * mm, 40 * mm],
        rowHeights=[3],
    )
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#6BCB2D")),
        ("BACKGROUND", (1, 0), (1, 0), colors.HexColor("#2F80ED")),
        ("BACKGROUND", (2, 0), (2, 0), colors.HexColor("#F59E0B")),
        ("BACKGROUND", (3, 0), (3, 0), colors.HexColor("#E84855")),
    ]))
    return table


def _metric_card(label: str, value: str, styles, background) -> Table:
    """Build a small metric card."""
    card = Table([
        [Paragraph(_clean_inline(label.upper()), styles["CardLabel"])],
        [Paragraph(_clean_inline(value), styles["CardValue"])],
    ], colWidths=[30 * mm], rowHeights=[10 * mm, 14 * mm])
    card.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), background),
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return card


def _notice_box(text: str, styles, background, border_color) -> Table:
    """Build a colored notice box."""
    table = Table([[Paragraph(_clean_inline(text), styles["BodyText"])]], colWidths=[160 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), background),
        ("BOX", (0, 0), (-1, -1), 0.7, border_color),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    return table


def _table_row(values: list[str], styles, header: bool = False) -> list[Paragraph]:
    """Build a table row whose cells wrap inside their columns."""
    return [_table_cell(value, styles, header=header) for value in values]


def _table_cell(value, styles, header: bool = False, strong: bool = False) -> Paragraph:
    """Build a ReportLab paragraph suitable for compact table cells."""
    style_name = "TableHeader" if header else "TableCellStrong" if strong else "TableCell"
    return Paragraph(_clean_inline(value), styles[style_name])


def _priority_badge(priority: str, styles) -> Paragraph:
    """Build a compact priority badge."""
    return Paragraph(_clean_inline(priority), styles["PriorityBadge"])


def _top_blockers(report: dict, limit: int = 5) -> list[dict]:
    """Return the highest priority blockers for the decision summary."""
    sections = report.get("sections", {})
    blockers = list(sections.get("blockers") or [])
    if not blockers:
        components = sections.get("components") or []
        blockers = [
            component for component in components
            if _component_priority(component).upper() == "BLOCKER"
        ]

    return sorted(blockers, key=_priority_sort_key)[:limit]


def _priority_sort_key(component: dict) -> tuple[int, int, str]:
    """Sort migration findings from most urgent to least urgent."""
    priority = _component_priority(component).upper()
    status = _component_status(component).upper()
    status_rank = 0 if status == "INCOMPATIBLE" else 1 if status == "NEEDS_RECREATION" else 2
    return (PRIORITY_ORDER.get(priority, 4), status_rank, _component_label(component).lower())


def _component_priority(component: dict) -> str:
    """Return a normalized priority label for a component-like dict."""
    return str(
        component.get("priority")
        or component.get("final_risk")
        or component.get("risk_level")
        or "REVIEW"
    ).upper()


def _component_status(component: dict) -> str:
    """Return a normalized migration status for a component-like dict."""
    return str(
        component.get("status")
        or component.get("final_status")
        or component.get("overall_status")
        or "-"
    ).upper()


def _component_action(
    component: dict,
    report: dict | None = None,
    section: str | None = None,
) -> str:
    """Return the best action text available for a component-like dict."""
    translated = _translated_section_field(report, section, component, "action")
    if translated:
        return translated
    translated = _translated_section_field(report, section, component, "recommended_action")
    if translated:
        return translated
    return str(component.get("action") or component.get("recommended_action") or "")


def _component_reason(
    component: dict,
    report: dict | None = None,
    section: str | None = None,
) -> str:
    """Return the best reason text available for a component-like dict."""
    translated = _translated_section_field(report, section, component, "reason")
    if translated:
        return translated
    translated = _translated_section_field(report, section, component, "reasoning_summary")
    if translated:
        return translated
    return str(component.get("reason") or component.get("reasoning_summary") or "")


def _priority_color(priority: str):
    """Return a brand color for a priority label."""
    normalized = priority.upper()
    if normalized in {"BLOCKER", "CRITICAL"}:
        return BRAND_RED
    if normalized == "MAJOR":
        return BRAND_ORANGE
    if normalized == "MINOR":
        return BRAND_BLUE
    return TEXT_MUTED


def _display_finding_value(value: str, language: str) -> str:
    """Return a reader-friendly PDF label for selected technical values."""
    normalized = str(value or "").upper()
    if _pdf_language({"language": language}) != "fr":
        return normalized or str(value or "")

    french_labels = {
        "BLOCKER": "Blocage",
        "INCOMPATIBLE": "Incompatible",
        "NEEDS_RECREATION": "À recréer",
    }
    return french_labels.get(normalized, normalized or str(value or ""))


def _short_text(text: str, max_chars: int) -> str:
    """Shorten dense table copy while preserving the detailed recommendation text."""
    normalized = re.sub(r"\s+", " ", str(text or "")).strip()
    if len(normalized) <= max_chars:
        return normalized
    truncated = normalized[:max_chars].rsplit(" ", 1)[0].rstrip(".,;:")
    return f"{truncated}..."


def _footer_text(source_filename: str, report_id: str, language: str) -> str:
    """Build the footer context line."""
    source = _plain_text(source_filename or _pdf_text(language, "migration_package"), max_chars=58)
    short_report_id = _plain_text(report_id or "unknown", max_chars=12)
    return (
        f"Spectrum Groupe - {_pdf_text(language, 'footer_source')}: {source} - "
        f"{_pdf_text(language, 'footer_report')}: {short_report_id}"
    )


def _pdf_language(report: dict | None) -> str:
    """Return the supported PDF locale."""
    language = str((report or {}).get("language") or "en").strip().lower()
    return "fr" if language.startswith("fr") else "en"


def _pdf_text(language: str, key: str) -> str:
    """Return a static PDF label for the selected locale."""
    locale = "fr" if str(language or "").lower().startswith("fr") else "en"
    return PDF_TEXT.get(locale, PDF_TEXT["en"]).get(key, PDF_TEXT["en"].get(key, key))


def _translated_report_field(report: dict, field: str, language: str) -> str:
    """Return translated top-level report text when available."""
    if not str(language or "").lower().startswith("fr"):
        return str(report.get(field, "") or "")

    translations = report.get("translations", {}) or {}
    french = translations.get("fr", {}) or {}
    translated = report.get(f"{field}_fr") or french.get(field)
    return str(translated or report.get(field, "") or "")


def _cover_summary(report: dict, language: str) -> str:
    """Return the short cover summary in the requested PDF language."""
    if _pdf_language({"language": language}) != "fr":
        return str(report.get("summary", "") or "")

    stats = report.get("statistics", {}) or {}
    total = stats.get("total_components", report.get("total_components", 0)) or 0
    risk = report.get("sections", {}).get("risk_overview", {}) or {}
    blockers = (
        stats.get("blocker_count")
        if stats.get("blocker_count") is not None
        else risk.get("blockers", report.get("blocker_count", 0))
    ) or 0
    score = report.get("migration_score", stats.get("migration_score", 0)) or 0

    if total == 0:
        return "Aucun composant pertinent pour la migration n'a été détecté dans cette analyse."

    if blockers:
        return (
            f"L'analyse a identifié {total} composant(s) pertinent(s) pour la migration, "
            f"dont {blockers} blocage(s). Le score actuel de préparation à la migration "
            f"est de {score}/100. La migration ne doit pas avancer avant la résolution "
            "des blocages."
        )

    return (
        f"L'analyse a identifié {total} composant(s) pertinent(s) pour la migration. "
        f"Le score actuel de préparation à la migration est de {score}/100. "
        "Aucun blocage critique n'a été détecté, mais les risques majeurs et mineurs "
        "doivent être examinés."
    )


def _translated_section_field(
    report: dict | None,
    section: str | None,
    component: dict,
    field: str,
) -> str:
    """Return a translated section field matching by component_id when available."""
    if not report or _pdf_language(report) != "fr" or not section:
        return ""

    component_id = component.get("component_id")
    if not component_id:
        return ""

    translations = report.get("translations", {}) or {}
    french = translations.get("fr", {}) or {}
    translated_items = ((french.get("sections") or {}).get(section) or [])

    for translated in translated_items:
        if translated.get("component_id") == component_id:
            return str(translated.get(field) or "")

    return ""


def _table_style(header_color=BRAND_NAVY) -> TableStyle:
    """Return branded table style."""
    return TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), header_color),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFE")]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ])


def _format_date(value: str) -> str:
    """Format ISO date for the report header."""
    if not value:
        return datetime.utcnow().strftime("%Y-%m-%d")
    try:
        return (
            datetime.fromisoformat(
                str(value).replace("Z", "+00:00")
            ).strftime("%Y-%m-%d %H:%M UTC")
        )
    except ValueError:
        return str(value)


def _clean_inline(text: str) -> str:
    """Clean inline Markdown and make text ReportLab-safe."""
    text = str(text or "")
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    text = re.sub(r"\*\*(.*?)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"`(.*?)`", r"<font name='Courier'>\1</font>", text)
    return text


def _plain_text(text: str, max_chars: int | None = None) -> str:
    """Return compact plain text for canvas-only PDF areas."""
    value = re.sub(r"\s+", " ", str(text or "")).strip()
    if max_chars is not None and len(value) > max_chars:
        return f"{value[:max_chars].rsplit(' ', 1)[0].rstrip()}..."
    return value


def _component_label(component: dict) -> str:
    """Return the business component name shown in PDFs."""
    return component.get("component_name") or component.get("component_id", "")
