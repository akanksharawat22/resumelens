"""ATS X-ray: inspect a PDF the way an applicant tracking system would."""
import re
from io import BytesIO

import pdfplumber

EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
PHONE_RE = re.compile(r"(?:\+?\d[\d\s().-]{8,}\d)")
SECTIONS = {
    "experience": r"\b(experience|employment|work history|internships?)\b",
    "education": r"\beducation\b",
    "skills": r"\bskills?\b|\btechnologies\b|\btech stack\b",
    "projects": r"\bprojects?\b",
}
PENALTY = {"high": 25, "medium": 12, "low": 5}


def _has_gutter(words, page_width):
    """True if a clear vertical white strip splits the page into two text columns."""
    if len(words) < 40:
        return False
    strip = page_width * 0.02
    total = len(words)
    x = page_width * 0.30
    while x + strip <= page_width * 0.70:
        left = sum(1 for w in words if w["x1"] <= x)
        right = sum(1 for w in words if w["x0"] >= x + strip)
        crossing = total - left - right
        if left >= total * 0.25 and right >= total * 0.25 and crossing <= total * 0.05:
            return True
        x += page_width * 0.005
    return False


def _issue(severity, code, message, fix):
    return {"severity": severity, "code": code, "message": message, "fix": fix}


def xray_pdf(pdf_bytes):
    issues = []
    texts = []
    columns_pages, table_pages, big_images = [], [], 0
    small_images = 0

    with pdfplumber.open(BytesIO(pdf_bytes)) as pdf:
        page_count = len(pdf.pages)
        for number, page in enumerate(pdf.pages, start=1):
            texts.append(page.extract_text() or "")
            words = page.extract_words()
            if _has_gutter(words, float(page.width)):
                columns_pages.append(number)
            try:
                if page.find_tables():
                    table_pages.append(number)
            except Exception:
                pass
            page_area = float(page.width) * float(page.height)
            for img in page.images:
                area = abs(img["x1"] - img["x0"]) * abs(img["bottom"] - img["top"])
                if area > page_area * 0.04:
                    big_images += 1
                else:
                    small_images += 1

    text = "\n".join(texts).strip()
    words_count = len(text.split())
    lowered = text.lower()

    if words_count < 40:
        issues.append(_issue(
            "high", "no_text",
            "Almost no readable text was found. This looks like a scanned or image-only PDF, "
            "so an ATS would see an empty resume.",
            "Export the resume as a text-based PDF from Word or Google Docs instead of scanning or printing to image.",
        ))

    if columns_pages:
        issues.append(_issue(
            "medium", "multi_column",
            f"Two-column layout detected on page {', '.join(map(str, columns_pages))}. "
            "Many parsers read straight across the columns and mix up your sections.",
            "Use a single-column layout, or keep the sidebar to short items like skills only.",
        ))

    if table_pages:
        issues.append(_issue(
            "medium", "tables",
            f"Table structure detected on page {', '.join(map(str, table_pages))}. "
            "Table cells are often read out of order or dropped.",
            "Replace tables with simple headings and bullet points.",
        ))

    if big_images:
        issues.append(_issue(
            "medium", "large_images",
            "Large image(s) found, such as a photo or a graphic. ATS ignores images and some "
            "recruiters prefer no photo.",
            "Remove photos and decorative graphics. Keep important information as real text.",
        ))
    elif small_images >= 3:
        issues.append(_issue(
            "low", "icons",
            f"{small_images} small images found (likely icons). If they replace words such as a "
            "phone or email label, an ATS cannot read them.",
            "Write contact details as plain text next to any icon.",
        ))

    garbled = len(re.findall(r"\(cid:\d+\)|[\ue000-\uf8ff\ufffd]", text))
    if garbled >= 3:
        issues.append(_issue(
            "medium", "bad_glyphs",
            f"{garbled} unreadable symbols found (custom bullets or fonts). They show up as junk in an ATS.",
            "Use standard bullets and common fonts such as Arial, Calibri or Times New Roman.",
        ))

    contact = {
        "email": bool(EMAIL_RE.search(text)),
        "phone": bool(PHONE_RE.search(text)),
        "linkedin": "linkedin" in lowered,
        "github": "github" in lowered,
    }
    if words_count >= 40 and not contact["email"]:
        issues.append(_issue(
            "high", "no_email",
            "No email address found in the text. If it is inside an image or a header, an ATS misses it.",
            "Put your email in the main body of the page as plain text.",
        ))
    if words_count >= 40 and not contact["phone"]:
        issues.append(_issue(
            "low", "no_phone",
            "No phone number found in the text.",
            "Add a phone number as plain text near the top.",
        ))

    sections_found = [name for name, pattern in SECTIONS.items() if re.search(pattern, lowered)]
    if words_count >= 40:
        missing = [name for name in ("experience", "education", "skills") if name not in sections_found]
        if missing:
            issues.append(_issue(
                "medium", "missing_sections",
                "Standard section headings not found: " + ", ".join(missing) + ". "
                "An ATS files information by these headings.",
                "Use plain headings such as Experience, Education and Skills.",
            ))

    if page_count > 2:
        issues.append(_issue(
            "low", "too_long",
            f"The resume is {page_count} pages long.",
            "Keep it to 1 page (2 at most for senior roles).",
        ))

    score = max(0, 100 - sum(PENALTY[i["severity"]] for i in issues))
    order = {"high": 0, "medium": 1, "low": 2}
    issues.sort(key=lambda i: order[i["severity"]])

    return {
        "readability_score": score,
        "pages": page_count,
        "word_count": words_count,
        "contact": contact,
        "sections_found": sections_found,
        "issues": issues,
        "ats_text": text,
    }