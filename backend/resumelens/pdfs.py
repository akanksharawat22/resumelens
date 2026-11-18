"""PDF helpers: text extraction and rendering the improved resume to a PDF."""
from io import BytesIO
from xml.sax.saxutils import escape

import pdfplumber
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate


def extract_text(pdf_bytes):
    """Plain text of every page, the same text an ATS would try to parse."""
    text = ""
    with pdfplumber.open(BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text


def build_resume_pdf(resume_text):
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=letter,
        topMargin=0.6 * 72, bottomMargin=0.6 * 72,
        leftMargin=0.7 * 72, rightMargin=0.7 * 72
    )
    styles = getSampleStyleSheet()

    name_style = ParagraphStyle(
        'NameStyle', parent=styles['Title'], fontSize=18,
        alignment=TA_CENTER, spaceAfter=2, textColor=colors.HexColor('#0f172a')
    )
    contact_style = ParagraphStyle(
        'ContactStyle', parent=styles['Normal'], fontSize=9,
        alignment=TA_CENTER, textColor=colors.HexColor('#475569'), spaceAfter=14
    )
    heading_style = ParagraphStyle(
        'HeadingStyle', parent=styles['Heading2'], fontSize=12,
        fontName='Helvetica-Bold', textColor=colors.HexColor('#0f172a'),
        spaceBefore=12, spaceAfter=6,
        borderColor=colors.HexColor('#38bdf8'), borderWidth=0
    )
    body_style = ParagraphStyle(
        'BodyStyle', parent=styles['Normal'], fontSize=10,
        leading=14, spaceAfter=4
    )
    bullet_style = ParagraphStyle(
        'BulletStyle', parent=body_style, leftIndent=14, spaceAfter=3
    )

    lines = [line.strip() for line in resume_text.split('\n') if line.strip()]
    story = []
    name_line_used = False

    for i, line in enumerate(lines):
        upper = line.upper()
        looks_like_heading = (
            line == upper and len(line) < 45 and any(c.isalpha() for c in line)
        )

        if i == 0 and not looks_like_heading:
            story.append(Paragraph(escape(line), name_style))
            name_line_used = True
            continue

        if i == 1 and name_line_used and (
            '@' in line or 'linkedin' in line.lower() or '•' in line
        ):
            story.append(Paragraph(escape(line), contact_style))
            continue

        if looks_like_heading:
            story.append(Paragraph(escape(line), heading_style))
            continue

        if line.startswith(('•', '-', '*')):
            text = line.lstrip('•-* ').strip()
            story.append(Paragraph('• ' + escape(text), bullet_style))
            continue

        story.append(Paragraph(escape(line), body_style))

    doc.build(story)
    buffer.seek(0)
    return buffer