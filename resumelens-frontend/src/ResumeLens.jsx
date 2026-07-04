import { useState, useRef, useEffect, Fragment } from 'react';
import './ResumeLens.css';

const API_BASE = 'http://localhost:5000';

function scoreColorVar(score) {
  if (score >= 75) return 'var(--mint)';
  if (score >= 50) return 'var(--violet)';
  return 'var(--rose)';
}
function scoreVerdict(score) {
  if (score >= 75) return 'Strong match';
  if (score >= 50) return 'Needs work';
  return 'Weak match';
}

function StepTracker({ step }) {
  const steps = [
    { n: 1, label: 'Upload' },
    { n: 2, label: 'Scan' },
    { n: 3, label: 'Improve' },
    { n: 4, label: 'Export' },
  ];
  return (
    <div className="progress-track">
      {steps.map((s, i) => (
        <Fragment key={s.n}>
          <div
            className={`progress-node ${step === s.n ? 'active' : ''} ${step > s.n ? 'done' : ''}`}
          >
            <span className="node-dot">{s.n}</span>
            <span className="node-label">{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`progress-connector ${step > s.n ? 'filled' : ''}`}
            />
          )}
        </Fragment>
      ))}
    </div>
  );
}

function ScoreRing({ analysis }) {
  const ringRef = useRef(null);
  const score = analysis.ats_score;
  const circumference = 2 * Math.PI * 38;
  const offset = circumference - (Math.min(Math.max(score, 0), 100) / 100) * circumference;
  const color = scoreColorVar(score);

  useEffect(() => {
    // start fully hidden, then animate to target offset on next frame
    if (ringRef.current) {
      ringRef.current.style.strokeDashoffset = String(circumference);
      requestAnimationFrame(() => {
        if (ringRef.current) ringRef.current.style.strokeDashoffset = String(offset);
      });
    }
  }, [score, offset, circumference]);

  return (
    <div className="score-panel revealing">
      <div className="score-ring-wrap">
        <svg viewBox="0 0 92 92">
          <circle className="score-ring-bg" cx="46" cy="46" r="38"></circle>
          <circle
            ref={ringRef}
            className="score-ring-fill"
            cx="46"
            cy="46"
            r="38"
            stroke={color}
            strokeDasharray={circumference}
            strokeDashoffset={circumference}
          ></circle>
        </svg>
        <div className="score-ring-number" style={{ color }}>{score}</div>
      </div>
      <div className="score-meta">
        <div className="score-label">ATS Match Score</div>
        <div className="score-verdict" style={{ color }}>{scoreVerdict(score)}</div>
      </div>
    </div>
  );
}

export default function ResumeLens() {
  const [step, setStep] = useState(1);

  // Upload / analyze state
  const [resumeFile, setResumeFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [resumeText, setResumeText] = useState('');

  // Improve state
  const [improving, setImproving] = useState(false);
  const [improveError, setImproveError] = useState('');
  const [improvedResume, setImprovedResume] = useState('');

  // Download state
  const [downloading, setDownloading] = useState(false);

  function handleFileChange(e) {
    setResumeFile(e.target.files[0] || null);
  }

  async function handleAnalyze() {
    setAnalyzeError('');

    if (!resumeFile) {
      setAnalyzeError('Please select a file first.');
      return;
    }
    if (jobDescription.trim() === '') {
      setAnalyzeError('Please paste the job description.');
      return;
    }

    const formData = new FormData();
    formData.append('resume', resumeFile);
    formData.append('job_description', jobDescription);

    setAnalyzing(true);
    setStep(2);
    setAnalysis(null);
    setImprovedResume('');

    try {
      const response = await fetch(`${API_BASE}/upload`, { method: 'POST', body: formData });
      const data = await response.json();

      if (response.ok) {
        setResumeText(data.resume_text);
        setAnalysis(data.analysis);
      } else {
        setAnalyzeError(data.error);
      }
    } catch (err) {
      setAnalyzeError('Could not connect to backend. Is the server running?');
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleImprove() {
    setImproveError('');

    if (!resumeText || !jobDescription || !analysis) {
      setImproveError('Please analyze a resume first.');
      return;
    }

    setImproving(true);
    setStep(3);

    try {
      const response = await fetch(`${API_BASE}/improve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resume_text: resumeText,
          job_description: jobDescription,
          missing_skills: analysis.missing_skills,
          issues: analysis.issues,
        }),
      });
      const data = await response.json();

      if (response.ok) {
        setImprovedResume(data.improved_resume);
      } else {
        setImproveError(data.error);
      }
    } catch (err) {
      setImproveError('Could not connect to backend. Is the server running?');
    } finally {
      setImproving(false);
    }
  }

  async function handleDownloadPdf() {
    if (!improvedResume) {
      alert('Please generate the improved resume first.');
      return;
    }

    setDownloading(true);
    setStep(4);

    try {
      const response = await fetch(`${API_BASE}/download-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume_text: improvedResume }),
      });
      if (!response.ok) {
        const data = await response.json();
        alert('❌ ' + data.error);
        return;
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Improved_Resume.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('❌ Could not connect to backend. Is the server running?');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="resumelens-app">
      <div className="wrap">

        <div className="header">
          <div className="brand-mark">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="17" cy="17" r="11" stroke="#201d18" strokeWidth="2.4" />
              <line x1="25.5" y1="25.5" x2="35" y2="35" stroke="#f0a93f" strokeWidth="2.8" strokeLinecap="round" />
            </svg>
            <div>
              <h1>ResumeLens</h1>
              <p>See what recruiters and ATS bots actually see</p>
            </div>
          </div>
        </div>

        <StepTracker step={step} />

        <div className="stack">

          {/* INPUT */}
          <div className="panel">
            <p className="panel-title">Start here</p>
            <p className="panel-sub">Upload your resume and the job you're targeting.</p>

            <label htmlFor="resumeInput">Resume (PDF)</label>
            <label className="file-drop" htmlFor="resumeInput">
              <input type="file" id="resumeInput" accept=".pdf" onChange={handleFileChange} />
              <span className={`file-drop-label ${resumeFile ? 'has-file' : ''}`}>
                {resumeFile ? `📄 ${resumeFile.name}` : 'Click to choose a PDF file'}
              </span>
            </label>

            <label htmlFor="jobDescInput">Job description</label>
            <textarea
              id="jobDescInput"
              placeholder="Paste the job description here..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />

            <button
              className={`btn-analyze ${analyzing ? 'scanning' : ''}`}
              onClick={handleAnalyze}
              disabled={analyzing}
            >
              {analyzing ? 'Analyzing...' : 'Analyze My Resume'}
            </button>

            <div className="tips-block">
              <h4>For best results</h4>
              <ul>
                <li>Use a text-based PDF, not a scanned image — scanned resumes can't be read properly.</li>
                <li>Paste the full job description, not just the title, so the match is accurate.</li>
                <li>Analysis takes about 10–15 seconds. Improve and PDF export are just as quick.</li>
              </ul>
            </div>
          </div>

          {/* OUTPUT */}
          <div className="panel">
            <p className="panel-title">Your results</p>
            <p className="panel-sub">A breakdown of how your resume stacks up.</p>

            <div id="result">
              {analyzeError && !analyzing && (
                <p className="error-text">❌ {analyzeError}</p>
              )}

              {analyzing && (
                <div className="placeholder-state">
                  <p className="status-text">Analyzing your resume against the job description — this can take up to 15 seconds.</p>
                </div>
              )}

              {!analyzing && !analyzeError && !analysis && (
                <div className="placeholder-state">
                  <div className="ph-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <circle cx="11" cy="11" r="7" stroke="#f0a93f" strokeWidth="2" />
                      <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="#f0a93f" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <p className="ph-title">Nothing to show yet</p>
                  <p>Upload your resume and a job description, then hit "Analyze My Resume" to see your score and feedback.</p>
                </div>
              )}

              {analysis && (
                <>
                  <ScoreRing analysis={analysis} />

                  <div className="section missing">
                    <h3>Missing Skills</h3>
                    <ul>
                      {analysis.missing_skills.length
                        ? analysis.missing_skills.map((s, i) => <li key={i}>{s}</li>)
                        : <li>None — great match!</li>}
                    </ul>
                  </div>

                  <div className="section issues">
                    <h3>Issues</h3>
                    <ul>
                      {analysis.issues.length
                        ? analysis.issues.map((s, i) => <li key={i}>{s}</li>)
                        : <li>No major issues found.</li>}
                    </ul>
                  </div>

                  <div className="section strengths">
                    <h3>Strengths</h3>
                    <ul>
                      {analysis.strengths.length
                        ? analysis.strengths.map((s, i) => <li key={i}>{s}</li>)
                        : <li>—</li>}
                    </ul>
                  </div>

                  <button className="btn-improve" onClick={handleImprove} disabled={improving}>
                    {improving ? 'Rewriting...' : 'Generate Improved Resume'}
                  </button>

                  <div id="improvedResult">
                    {improveError && <p className="error-text">❌ {improveError}</p>}
                    {improving && <p className="status-text">Generating your improved resume — this can take up to 15 seconds.</p>}

                    {improvedResume && !improving && (
                      <>
                        <div className="improved-box">
                          <h3>Improved Resume</h3>
                          <div className="improved-text">{improvedResume}</div>
                        </div>
                        <button className="btn-download" onClick={handleDownloadPdf} disabled={downloading}>
                          {downloading ? 'Preparing PDF...' : 'Download as PDF'}
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}