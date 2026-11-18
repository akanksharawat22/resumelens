from resumelens.guard import check_rewrite

ORIGINAL = """Jane Doe
EXPERIENCE
Built a REST API using Python and Flask for the student portal at Acme College
Improved page load time by 20% across the portal
"""
JD = "We need Docker and Kubernetes experience with REST APIs"


def test_faithful_rephrase_is_grounded():
    out = check_rewrite(ORIGINAL, "Developed a REST API with Python and Flask for the student portal at Acme College", JD)
    assert out["lines"][0]["status"] == "grounded"
    assert out["trust_score"] == 100


def test_invented_metric_is_unsupported():
    out = check_rewrite(ORIGINAL, "Improved page load time by 65% across the portal", JD)
    line = out["lines"][0]
    assert line["status"] == "unsupported" and "65%" in line["new_numbers"]


def test_invented_employer_or_tool_is_unsupported():
    out = check_rewrite(ORIGINAL, "Led a team of engineers at Google using TensorFlow on the portal", JD)
    assert out["lines"][0]["status"] == "unsupported"


def test_jd_keyword_is_flagged_but_softer():
    out = check_rewrite(ORIGINAL, "Built a REST API using Python and Flask, deployed with Docker at Acme College", JD)
    line = out["lines"][0]
    assert line["status"] == "jd_added" and "Docker" in line["jd_terms"]
    assert 0 < out["trust_score"] < 100


def test_headings_and_short_lines_ignored():
    out = check_rewrite(ORIGINAL, "SUMMARY\nJane Doe\nSkills: Python", JD)
    assert out["total_lines"] == 0