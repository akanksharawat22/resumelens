from flask import Blueprint, g, jsonify, request, send_file

from . import llm
from .auth import login_required, optional_user
from .db import dumps, get_db, loads
from .pdfs import build_resume_pdf, extract_text
from .ratelimit import rate_limited

bp = Blueprint("main", __name__)


@bp.get("/")
def home():
    return jsonify({"message": "ResumeLens backend is running!"})


def _clean_analysis(raw):
    """Gemini output is untrusted: coerce it into the shape the UI expects."""
    if not isinstance(raw, dict):
        raw = {}

    def str_list(key):
        value = raw.get(key)
        return [str(v) for v in value] if isinstance(value, list) else []

    try:
        score = max(0, min(100, int(round(float(raw.get("ats_score", 0))))))
    except (TypeError, ValueError):
        score = 0
    return {
        "ats_score": score,
        "missing_skills": str_list("missing_skills"),
        "issues": str_list("issues"),
        "strengths": str_list("strengths"),
    }


@bp.post("/upload")
@optional_user
@rate_limited
def upload_resume():
    file = request.files.get("resume")
    if file is None:
        return jsonify({"error": "No file uploaded"}), 400
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400
    if not file.filename.lower().endswith(".pdf"):
        return jsonify({"error": "Only PDF files are supported"}), 400

    pdf_bytes = file.read()
    if not pdf_bytes.startswith(b"%PDF"):
        return jsonify({"error": "That file is not a valid PDF"}), 400

    job_description = request.form.get("job_description", "")

    try:
        extracted_text = extract_text(pdf_bytes)
    except Exception as e:
        return jsonify({"error": f"Could not read PDF: {e}"}), 500

    prompt = f"""You are an expert ATS (Applicant Tracking System) resume reviewer.

Compare the RESUME below against the JOB DESCRIPTION below. Respond ONLY with valid JSON, no other text, no markdown formatting, in exactly this structure:

{{
  "ats_score": <number 0-100>,
  "missing_skills": [<list of specific skills/keywords from the job description missing in the resume>],
  "issues": [<list of genuine, specific issues with the resume, e.g. weak bullet points, missing quantifiable results. If the resume is already strong, return an empty list>],
  "strengths": [<list of things the resume already does well relative to this job>]
}}

RESUME:
{extracted_text}

JOB DESCRIPTION:
{job_description}
"""
    try:
        analysis = _clean_analysis(llm.generate_json(prompt))
    except Exception as e:
        return jsonify({"error": f"Gemini analysis failed: {e}"}), 500

    analysis_id = None
    if g.user is not None:
        db = get_db()
        cur = db.execute(
            """INSERT INTO analyses
               (user_id, filename, job_description, resume_text, score, analysis_json)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (g.user["id"], file.filename, job_description, extracted_text,
             analysis["ats_score"], dumps(analysis)),
        )
        db.commit()
        analysis_id = cur.lastrowid

    return jsonify({
        "message": "Resume analyzed successfully",
        "filename": file.filename,
        "resume_text": extracted_text,
        "analysis": analysis,
        "analysis_id": analysis_id,
    })


@bp.post("/improve")
@optional_user
@rate_limited
def improve_resume():
    data = request.get_json(silent=True) or {}
    resume_text = data.get("resume_text")
    job_description = data.get("job_description")
    missing_skills = data.get("missing_skills", [])
    issues = data.get("issues", [])

    if not resume_text or not job_description:
        return jsonify({"error": "Missing resume text or job description"}), 400

    prompt = f"""
You are an expert resume writer. Rewrite the following resume to fix the issues
listed and better align with the job description, WITHOUT fabricating experience
the candidate doesn't have. Only rephrase, restructure, and emphasize existing
content more effectively. Naturally incorporate missing skills ONLY if they are
plausible additions based on existing experience — do not invent new jobs or skills.

ORIGINAL RESUME:
{resume_text}

JOB DESCRIPTION:
{job_description}

ISSUES TO FIX:
{issues}

MISSING SKILLS TO CONSIDER (only if genuinely applicable):
{missing_skills}

Return the improved resume as clean, well-structured plain text, organized under
clear section headers (e.g. SUMMARY, SKILLS, EXPERIENCE, PROJECTS, EDUCATION).
Do not include any commentary, notes, or explanations — only the resume content itself.
"""
    try:
        improved_text = llm.generate_text(prompt)
    except Exception as e:
        return jsonify({"error": f"Gemini improvement failed: {e}"}), 500

    analysis_id = data.get("analysis_id")
    if g.user is not None and analysis_id:
        db = get_db()
        db.execute(
            "UPDATE analyses SET improved_text = ? WHERE id = ? AND user_id = ?",
            (improved_text, analysis_id, g.user["id"]),
        )
        db.commit()

    return jsonify({"improved_resume": improved_text})


@bp.post("/download-pdf")
def download_pdf():
    data = request.get_json(silent=True) or {}
    resume_text = data.get("resume_text")
    if not resume_text:
        return jsonify({"error": "Missing resume text"}), 400
    try:
        pdf_buffer = build_resume_pdf(resume_text)
    except Exception as e:
        return jsonify({"error": f"Could not generate PDF: {e}"}), 500
    return send_file(
        pdf_buffer, mimetype="application/pdf",
        as_attachment=True, download_name="Improved_Resume.pdf",
    )


# ---------- saved history (login required) ----------

@bp.get("/analyses")
@login_required
def list_analyses():
    rows = get_db().execute(
        """SELECT id, filename, score, created_at, improved_text IS NOT NULL AS improved
           FROM analyses WHERE user_id = ? ORDER BY id DESC LIMIT 100""",
        (g.user["id"],),
    ).fetchall()
    return jsonify({"analyses": [
        {"id": r["id"], "filename": r["filename"], "score": r["score"],
         "created_at": r["created_at"], "improved": bool(r["improved"])}
        for r in rows
    ]})


@bp.get("/analyses/<int:analysis_id>")
@login_required
def get_analysis(analysis_id):
    r = get_db().execute(
        "SELECT * FROM analyses WHERE id = ? AND user_id = ?",
        (analysis_id, g.user["id"]),
    ).fetchone()
    if r is None:
        return jsonify({"error": "Analysis not found"}), 404
    return jsonify({
        "id": r["id"], "filename": r["filename"], "created_at": r["created_at"],
        "job_description": r["job_description"], "resume_text": r["resume_text"],
        "analysis": loads(r["analysis_json"]), "improved_resume": r["improved_text"],
    })


@bp.delete("/analyses/<int:analysis_id>")
@login_required
def delete_analysis(analysis_id):
    db = get_db()
    cur = db.execute(
        "DELETE FROM analyses WHERE id = ? AND user_id = ?", (analysis_id, g.user["id"])
    )
    db.commit()
    if cur.rowcount == 0:
        return jsonify({"error": "Analysis not found"}), 404
    return jsonify({"deleted": analysis_id})