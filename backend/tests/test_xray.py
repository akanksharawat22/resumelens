from resumelens.xray import xray_pdf
from tests.conftest import make_pdf

GOOD = (["Jane Doe  jane@x.com  +91 98765 43210  linkedin.com/in/jane"]
        + ["Experience", "Built a REST API with Python and Flask for the student portal at Acme College"] * 4
        + ["Education", "B.Tech Computer Science", "Skills", "Python Flask React SQL Git Docker"] * 2)


def codes(report):
    return {i["code"] for i in report["issues"]}


def test_clean_single_column_resume():
    r = xray_pdf(make_pdf(GOOD))
    assert r["readability_score"] >= 85
    assert not ({"multi_column", "no_text", "no_email"} & codes(r))
    assert r["contact"]["email"] and set(r["sections_found"]) >= {"experience", "education", "skills"}


def test_two_column_layout_detected():
    lines = [f"Left column item number {i} with several words here" if i % 2 == 0
             else f"Right column item number {i} with several words here" for i in range(60)]
    r = xray_pdf(make_pdf(lines, columns=True))
    assert "multi_column" in codes(r)


def test_empty_pdf_flagged_high():
    r = xray_pdf(make_pdf(["hi"]))
    assert "no_text" in codes(r) and r["issues"][0]["severity"] == "high"


def test_missing_email_flagged():
    r = xray_pdf(make_pdf([l for l in GOOD if "@" not in l]))
    assert "no_email" in codes(r)