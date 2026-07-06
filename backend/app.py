from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
import time
import pdfplumber
import json
from io import BytesIO
from xml.sax.saxutils import escape
from dotenv import load_dotenv
from google import genai
from reportlab.lib.pagesizes import letter
from reportlab.lib.enums import TA_CENTER
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

load_dotenv()

app = Flask(__name__)
CORS(app)
app = Flask(__name__)
CORS(app)
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024  # 5MB limit

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))


def generate_with_retry(model, contents, config=None, max_attempts=3, delay_seconds=2):
    """
    Calls Gemini and automatically retries if the model is temporarily
    overloaded (503 UNAVAILABLE). Waits a couple seconds between attempts.
    Re-raises the error if all attempts fail, or if the error isn't a
    temporary overload issue.
    """
    last_error = None
    for attempt in range(1, max_attempts + 1):
        try:
            if config:
                return client.models.generate_content(model=model, contents=contents, config=config)
            return client.models.generate_content(model=model, contents=contents)
        except Exception as e:
            last_error = e
            is_overloaded = "503" in str(e) or "UNAVAILABLE" in str(e)
            if is_overloaded and attempt < max_attempts:
                time.sleep(delay_seconds)
                continue
            raise last_error


def build_resume_pdf(resume_text):
    """
    Converts plain-text resume content (with ALL CAPS section headers and
    bullet lines) into a formatted PDF. Returns an in-memory PDF buffer.
    """
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

        # First non-heading line is treated as the candidate's name
        if i == 0 and not looks_like_heading:
            story.append(Paragraph(escape(line), name_style))
            name_line_used = True
            continue

        # Second line, if it looks like contact info, gets the contact style
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


@app.route('/')
def home():
    return jsonify({"message": "ResumeLens backend is running!"})

@app.route('/upload', methods=['POST'])
def upload_resume():
    if 'resume' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files['resume']

    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    if not file.filename.lower().endswith('.pdf'):
    return jsonify({"error": "Only PDF files are supported"}), 400

    job_description = request.form.get('job_description', '')

    safe_filename = secure_filename(file.filename)
filepath = os.path.join(UPLOAD_FOLDER, safe_filename)
file.save(filepath)

    extracted_text = ""
    try:
        with pdfplumber.open(filepath) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    extracted_text += page_text + "\n"
    except Exception as e:
        return jsonify({"error": f"Could not read PDF: {str(e)}"}), 500

    # Build the prompt for Gemini
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
        response = generate_with_retry(
            model="gemini-2.5-flash",
            contents=prompt,
            config={"response_mime_type": "application/json"}
        )
        raw_text = response.text.strip()

        # Clean up in case Gemini wraps it in markdown code fences
        if raw_text.startswith("```"):
            raw_text = raw_text.strip("`")
            if raw_text.startswith("json"):
                raw_text = raw_text[4:]
            raw_text = raw_text.strip()

        analysis = json.loads(raw_text)

    except Exception as e:
        return jsonify({"error": f"Gemini analysis failed: {str(e)}"}), 500

    return jsonify({
        "message": "Resume analyzed successfully",
        "filename": file.filename,
        "resume_text": extracted_text,
        "analysis": analysis
    }), 200


@app.route('/improve', methods=['POST'])
def improve_resume():
    data = request.get_json()

    resume_text = data.get('resume_text')
    job_description = data.get('job_description')
    missing_skills = data.get('missing_skills', [])
    issues = data.get('issues', [])

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
        response = generate_with_retry(
            model="gemini-2.5-flash",
            contents=prompt
        )
        improved_text = response.text
    except Exception as e:
        return jsonify({"error": f"Gemini improvement failed: {str(e)}"}), 500

    return jsonify({"improved_resume": improved_text})


@app.route('/download-pdf', methods=['POST'])
def download_pdf():
    data = request.get_json()
    resume_text = data.get('resume_text')

    if not resume_text:
        return jsonify({"error": "Missing resume text"}), 400

    try:
        pdf_buffer = build_resume_pdf(resume_text)
    except Exception as e:
        return jsonify({"error": f"Could not generate PDF: {str(e)}"}), 500

    return send_file(
        pdf_buffer,
        mimetype='application/pdf',
        as_attachment=True,
        download_name='Improved_Resume.pdf'
    )


if __name__ == '__main__':
    debug_mode = os.environ.get("FLASK_DEBUG", "False") == "True"
    app.run(debug=debug_mode, port=int(os.environ.get("PORT", 5000)))