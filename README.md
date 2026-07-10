# ResumeLens

An AI-powered resume analyzer that shows you what recruiters and ATS bots actually see.

**🔗 Live demo:** [resumelens-vert.vercel.app](https://resumelens-vert.vercel.app)

> Note: the backend is hosted on Render's free tier, which sleeps after inactivity. The first request after idle time may take 30-60 seconds to wake up — subsequent requests are fast.

## What it does

- Upload your resume (PDF) and paste a job description
- Analyze — get an ATS match score, missing skills, resume issues, and strengths, powered by Google's Gemini API
- Improve — generate a rewritten version of your resume tailored to the job, without fabricating experience you don't have
- Export — download the improved resume as a formatted PDF

## Tech stack

**Backend:** Flask (Python), Google Gemini API, pdfplumber (PDF text extraction), ReportLab (PDF generation)

**Frontend:** React, Vite

## Running it locally

**Backend:**

cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python app.py
The backend runs on http://localhost:5000

**Frontend:**

cd resumelens-frontend
npm install
npm run dev

The frontend runs on http://localhost:5173

Built by Akanksha Rawat as a portfolio project.