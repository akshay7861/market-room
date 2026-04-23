#!/usr/bin/env python3
"""Generate a PDF from the synthesis audit + solution markdown report."""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

BASE = Path("/Users/akshaysingh/Documents/New project/knowledge")
INPUT_MD = BASE / "synthesis-quality-audit-and-solution-apr23-2026.md"
OUTPUT_PDF = BASE / "synthesis-quality-audit-and-solution-apr23-2026.pdf"

styles = getSampleStyleSheet()
title_style = ParagraphStyle(
    "Title",
    parent=styles["Title"],
    fontName="Helvetica-Bold",
    fontSize=19,
    leading=24,
    textColor=colors.HexColor("#0D1B2A"),
    spaceAfter=8,
)
h2_style = ParagraphStyle(
    "H2",
    parent=styles["Heading2"],
    fontName="Helvetica-Bold",
    fontSize=13,
    leading=17,
    textColor=colors.HexColor("#1E4D7B"),
    spaceBefore=8,
    spaceAfter=4,
)
body_style = ParagraphStyle(
    "Body",
    parent=styles["BodyText"],
    fontName="Helvetica",
    fontSize=9.5,
    leading=13.5,
    textColor=colors.HexColor("#2C3E50"),
    spaceAfter=2,
)
bullet_style = ParagraphStyle(
    "Bullet",
    parent=body_style,
    leftIndent=12,
    bulletIndent=2,
)


def md_to_flowables(md_text: str):
    flowables = []
    for raw_line in md_text.splitlines():
        line = raw_line.rstrip()
        if not line:
            flowables.append(Spacer(1, 3))
            continue
        if line.startswith("# "):
            flowables.append(Paragraph(line[2:].strip(), title_style))
            continue
        if line.startswith("## "):
            flowables.append(Spacer(1, 4))
            flowables.append(Paragraph(line[3:].strip(), h2_style))
            continue
        if line.startswith("---"):
            flowables.append(Spacer(1, 6))
            flowables.append(Paragraph("<font color='#BDC3C7'>________________________________________</font>", body_style))
            flowables.append(Spacer(1, 6))
            continue
        if line.startswith("- "):
            text = line[2:].strip().replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            flowables.append(Paragraph(f"&bull;&nbsp;&nbsp;{text}", bullet_style))
            continue
        if line[:2].isdigit() and line[1] == ".":
            text = line[2:].strip().replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            flowables.append(Paragraph(text, body_style))
            continue

        text = line.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        flowables.append(Paragraph(text, body_style))
    return flowables


def main():
    if not INPUT_MD.exists():
        raise FileNotFoundError(f"Missing input markdown: {INPUT_MD}")

    content = INPUT_MD.read_text(encoding="utf-8")
    story = md_to_flowables(content)
    doc = SimpleDocTemplate(
        str(OUTPUT_PDF),
        pagesize=A4,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
        title="Market Room Audit + Solution Report",
        author="Codex",
    )
    doc.build(story)
    print(f"PDF generated: {OUTPUT_PDF}")


if __name__ == "__main__":
    main()

