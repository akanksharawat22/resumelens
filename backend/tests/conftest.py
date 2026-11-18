import io

import pytest
from reportlab.pdfgen import canvas

from resumelens import create_app, llm, ratelimit


@pytest.fixture()
def app(tmp_path):
    ratelimit.reset()
    return create_app({"DATABASE_PATH": str(tmp_path / "test.db"), "TESTING": True})


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def fake_llm(monkeypatch):
    monkeypatch.setattr(llm, "generate_json", lambda p: {
        "ats_score": "77", "missing_skills": ["Docker"], "issues": [], "strengths": ["Clear"]})
    monkeypatch.setattr(llm, "generate_text", lambda p: "IMPROVED RESUME TEXT")


@pytest.fixture()
def auth_header(client):
    r = client.post("/auth/signup", json={"email": "a@b.com", "password": "password123"})
    return {"Authorization": "Bearer " + r.json["token"]}


def make_pdf(lines, columns=False):
    buf = io.BytesIO()
    c = canvas.Canvas(buf)
    if columns:
        y = 780
        for i, line in enumerate(lines):
            x = 40 if i % 2 == 0 else 330
            if i % 2 == 0:
                y -= 16
            c.drawString(x, y, line)
    else:
        y = 780
        for line in lines:
            c.drawString(60, y, line)
            y -= 16
    c.save()
    return buf.getvalue()