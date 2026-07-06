"""
PDF export utilities for Report Service.

Generates a branded PDF migration report from a structured report dict.
"""

import re
from datetime import datetime
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Image,
    KeepTogether,
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

    styles = _build_styles()
    story = []

    _add_cover_header(story, report, styles)
    _add_summary_cards(story, report, styles)
    _add_executive_summary(story, report, styles)
    _add_risk_overview(story, report, styles)
    _add_blockers(story, report, styles)
    _add_components(story, report, styles)
    _add_recommendations(story, report, styles)

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
        leading=15,
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
    styles["BodyText"].fontSize = 9
    styles["BodyText"].leading = 13
    styles["BodyText"].textColor = colors.HexColor("#26324D")
    styles["Heading1"].textColor = BRAND_NAVY
    styles["Heading2"].textColor = BRAND_NAVY
    return styles


def _add_cover_header(story: list, report: dict, styles) -> None:
    """Add branded report heading with logo and metadata."""
    logo = _logo_flowable(width=44 * mm)
    generated_at = _format_date(report.get("generated_at", ""))
    source_filename = report.get("source_filename") or "Migration package"

    meta = Paragraph(
        f"<b>Generated:</b> {generated_at}<br/><b>Source:</b> {_clean_inline(source_filename)}",
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
    story.append(Spacer(1, 12))
    story.append(Paragraph("AI-generated migration assessment", styles["Eyebrow"]))
    story.append(Paragraph("Cloud readiness report", styles["ReportTitle"]))
    story.append(Paragraph(_clean_inline(report.get("summary", "")), styles["Subtitle"]))
    story.append(Spacer(1, 14))


def _add_summary_cards(story: list, report: dict, styles) -> None:
    """Add score and status cards."""
    risk = report.get("sections", {}).get("risk_overview", {})
    score = report.get("migration_score", 0)
    blockers = risk.get("blockers", 0)
    components = report.get("statistics", {}).get("total_components", 0)
    compatible = risk.get("compatible", 0)
    incompatible = risk.get("incompatible", 0)

    rows = [[
        _metric_card("Migration score", f"{score}/100", styles, SOFT_BLUE),
        _metric_card("Critical blockers", str(blockers), styles, SOFT_RED if blockers else SOFT_GREEN),
        _metric_card("Components", str(components), styles, SOFT_BLUE),
        _metric_card("Compatible", str(compatible), styles, SOFT_GREEN),
        _metric_card("Incompatible", str(incompatible), styles, SOFT_ORANGE if incompatible else SOFT_GREEN),
    ]]
    table = Table(rows, colWidths=[32 * mm] * 5)
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 3),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3),
    ]))
    story.append(table)
    story.append(Spacer(1, 14))


def _add_executive_summary(story: list, report: dict, styles) -> None:
    """Add executive summary generated by AI or deterministic fallback."""
    story.append(Paragraph("Executive summary", styles["SectionTitle"]))
    summary_text = report.get("ai_summary") or report.get("summary", "")
    _add_markdown_text(story, summary_text, styles)
    story.append(Spacer(1, 8))


def _add_risk_overview(story: list, report: dict, styles) -> None:
    """Add risk overview table."""
    story.append(Paragraph("Risk overview", styles["SectionTitle"]))
    risk = report.get("sections", {}).get("risk_overview", {})
    rows = [
        ["Risk category", "Count", "Interpretation"],
        ["Blockers", risk.get("blockers", 0), "Must be resolved before migration"],
        ["Major", risk.get("major", 0), "Requires technical review"],
        ["Minor", risk.get("minor", 0), "Low impact improvement"],
        ["Info", risk.get("info", 0), "Informational finding"],
        ["Compatible", risk.get("compatible", 0), "Ready or low risk"],
        ["Partial", risk.get("partial", 0), "Needs adaptation"],
        ["Incompatible", risk.get("incompatible", 0), "Not directly Cloud ready"],
    ]
    table = Table(rows, colWidths=[44 * mm, 22 * mm, 94 * mm], repeatRows=1)
    table.setStyle(_table_style(header_color=BRAND_NAVY))
    story.append(table)
    story.append(Spacer(1, 10))


def _add_blockers(story: list, report: dict, styles) -> None:
    """Add blocker details."""
    blockers = report.get("sections", {}).get("blockers", [])
    story.append(Paragraph("Critical blockers", styles["SectionTitle"]))

    if not blockers:
        story.append(_notice_box("No critical blockers detected.", styles, SOFT_GREEN, BRAND_GREEN))
        story.append(Spacer(1, 8))
        return

    rows = [["Component", "Plugin", "Risk", "Status", "Recommended action"]]
    for blocker in blockers[:12]:
        rows.append([
            _clean_inline(_component_label(blocker)),
            _clean_inline(blocker.get("plugin", "-")),
            _clean_inline(blocker.get("risk_level", "-")),
            _clean_inline(blocker.get("overall_status", "-")),
            _clean_inline(blocker.get("recommended_action", "")),
        ])

    table = Table(rows, colWidths=[34 * mm, 28 * mm, 22 * mm, 28 * mm, 48 * mm], repeatRows=1)
    table.setStyle(_table_style(header_color=BRAND_RED))
    story.append(table)
    if len(blockers) > 12:
        story.append(Paragraph(f"Only the first 12 blockers are shown out of {len(blockers)}.", styles["Subtitle"]))
    story.append(Spacer(1, 10))



def _add_components(story: list, report: dict, styles) -> None:
    """Add a compact component assessment section."""
    components = report.get("sections", {}).get("components", [])
    if not components:
        return

    story.append(Paragraph("Component assessment", styles["SectionTitle"]))
    rows = [["Component", "Type", "Status", "Risk", "Recommended action"]]
    for component in components[:20]:
        rows.append([
            _clean_inline(_component_label(component)),
            _clean_inline(component.get("component_type", "-")),
            _clean_inline(component.get("final_status", "-")),
            _clean_inline(component.get("final_risk", "-")),
            _clean_inline(component.get("recommended_action", "")),
        ])

    table = Table(rows, colWidths=[38 * mm, 24 * mm, 26 * mm, 20 * mm, 52 * mm], repeatRows=1)
    table.setStyle(_table_style(header_color=BRAND_BLUE))
    story.append(table)
    if len(components) > 20:
        story.append(Paragraph(f"Only the first 20 components are shown out of {len(components)}.", styles["Subtitle"]))
    story.append(Spacer(1, 10))
def _add_recommendations(story: list, report: dict, styles) -> None:
    """Add prioritized recommendations."""
    recommendations = report.get("sections", {}).get("recommendations", [])
    story.append(Paragraph("Prioritized recommendations", styles["SectionTitle"]))

    if not recommendations:
        story.append(_notice_box("No prioritized recommendations were generated.", styles, SOFT_BLUE, BRAND_BLUE))
        return

    for recommendation in recommendations[:10]:
        priority = _clean_inline(recommendation.get("priority", "Review"))
        component = _clean_inline(_component_label(recommendation))
        action = _clean_inline(recommendation.get("action", ""))
        reason = _clean_inline(recommendation.get("reason", ""))
        bg = SOFT_RED if priority.upper() == "BLOCKER" else SOFT_ORANGE
        item = Table([
            [Paragraph(f"<b>{priority}</b>", styles["BodyText"]), Paragraph(f"<b>{component}</b><br/>{action}", styles["BodyText"])],
            ["", Paragraph(reason, styles["Subtitle"])],
        ], colWidths=[25 * mm, 135 * mm])
        item.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), bg),
            ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ]))
        story.append(KeepTogether([item, Spacer(1, 6)]))


def _add_markdown_text(story: list, text: str, styles, max_lines: int | None = None) -> None:
    """Convert simple Markdown text into ReportLab paragraphs."""
    lines = text.splitlines()
    rendered = 0

    for line in lines:
        if max_lines is not None and rendered >= max_lines:
            story.append(Paragraph("Report text continues in the detailed analysis available in JSON export.", styles["Subtitle"]))
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
    canvas.drawString(doc.leftMargin, 8 * mm, "Spectrum Groupe - Jira DC to Cloud Migration Assessment")
    canvas.drawRightString(width - doc.rightMargin, 8 * mm, f"Page {doc.page}")
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
    table = Table([["", "", "", ""]], colWidths=[40 * mm, 40 * mm, 40 * mm, 40 * mm], rowHeights=[3])
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
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ])


def _format_date(value: str) -> str:
    """Format ISO date for the report header."""
    if not value:
        return datetime.utcnow().strftime("%Y-%m-%d")
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).strftime("%Y-%m-%d %H:%M UTC")
    except ValueError:
        return str(value)


def _clean_inline(text: str) -> str:
    """Clean inline Markdown and make text ReportLab-safe."""
    text = str(text or "")
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    text = re.sub(r"\*\*(.*?)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"`(.*?)`", r"<font name='Courier'>\1</font>", text)
    return text


def _component_label(component: dict) -> str:
    """Return the business component name shown in PDFs."""
    return component.get("component_name") or component.get("component_id", "")
