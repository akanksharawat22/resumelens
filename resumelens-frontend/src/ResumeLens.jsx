import { useState, useRef, useEffect, Fragment } from 'react';
import './ResumeLens.css';
import './features.css';
import { API_BASE, authHeaders, getToken, setToken, fetchMe, getAnalysis } from './api';
import AuthModal from './AuthModal';
import XrayPanel from './XrayPanel';
import GuardPanel from './GuardPanel';
import HistoryPanel from './HistoryPanel';

function scoreColorVar(score) {
  if (score >= 75) return 'var(--color-sage-dark)';
  if (score >= 50) return 'var(--color-cobalt)';
  return 'var(--color-apricot-dark)';
}

function scoreBgVar(score) {
  if (score >= 75) return 'var(--color-sage-light)';
  if (score >= 50) return 'var(--color-cobalt-light)';
  return 'var(--color-apricot-light)';
}

function scoreVerdict(score) {
  if (score >= 80) return 'Strong match';
  if (score >= 65) return 'Moderate match';
  if (score >= 50) return 'Needs work';
  return 'Weak match';
}

function BrandLogo({ className = '' }) {
  return (
    <div className={`brand-logo ${className}`}>
      <svg
        width="34"
        height="34"
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="brand-logo-svg"
      >
        {/* Navy rounded container */}
        <rect width="36" height="36" rx="9" fill="var(--color-deep-ink)" />
        {/* Outer subtle optical lens ring */}
        <circle cx="18" cy="18" r="11" stroke="var(--color-cobalt)" strokeWidth="1.8" strokeOpacity="0.45" />
        {/* Concentric aperture iris ring */}
        <circle cx="18" cy="18" r="8" stroke="var(--color-warm-ivory)" strokeWidth="1.8" strokeDasharray="9 3" />
        {/* Cobalt central lens core */}
        <circle cx="18" cy="18" r="4.2" fill="var(--color-cobalt)" />
        {/* Precision optical reflection glint */}
        <circle cx="16.5" cy="16.5" r="1.3" fill="#FFFFFF" />
        {/* Lens alignment tick marks */}
        <line x1="18" y1="4.5" x2="18" y2="7" stroke="var(--color-cobalt)" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="18" y1="29" x2="18" y2="31.5" stroke="var(--color-cobalt)" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="4.5" y1="18" x2="7" y2="18" stroke="var(--color-cobalt)" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="29" y1="18" x2="31.5" y2="18" stroke="var(--color-cobalt)" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <span className="brand-name">
        Resume<span className="brand-name-accent">Lens</span>
      </span>
    </div>
  );
}

function IconCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconMissing() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

function IconIssue() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="3" />
    </svg>
  );
}

function IconStrength() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function IconArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function IconFilePdf() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function StepTracker({ step }) {
  const steps = [
    { n: 1, label: 'Upload' },
    { n: 2, label: 'Scan & Score' },
    { n: 3, label: 'Improve' },
    { n: 4, label: 'Export PDF' },
  ];
  return (
    <div className="progress-track" aria-label="Analysis progress">
      {steps.map((s, i) => (
        <Fragment key={s.n}>
          <div className={`progress-node ${step === s.n ? 'active' : ''} ${step > s.n ? 'done' : ''}`}>
            <span className="node-dot">
              {step > s.n ? <IconCheck /> : s.n}
            </span>
            <span className="node-label">{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`progress-connector ${step > s.n ? 'filled' : ''}`} />
          )}
        </Fragment>
      ))}
    </div>
  );
}

function ScoreRing({ analysis }) {
  const ringRef = useRef(null);
  const score = Math.max(0, Math.min(100, Number(analysis?.ats_score) || 0));
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;
  const color = scoreColorVar(score);
  const bgColor = scoreBgVar(score);

  useEffect(() => {
    if (ringRef.current) {
      ringRef.current.style.strokeDashoffset = String(circumference);
      const frame = requestAnimationFrame(() => {
        if (ringRef.current) ringRef.current.style.strokeDashoffset = String(offset);
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [score, offset, circumference]);

  return (
    <div className="score-panel" style={{ background: bgColor }}>
      <div className="score-ring-wrap">
        <svg viewBox="0 0 100 100" width="100" height="100">
          <circle className="score-ring-bg" cx="50" cy="50" r="40" />
          <circle
            ref={ringRef}
            className="score-ring-fill"
            cx="50"
            cy="50"
            r="40"
            stroke={color}
            strokeDasharray={circumference}
            strokeDashoffset={circumference}
            transform="rotate(-90 50 50)"
          />
        </svg>
        <div className="score-ring-number" style={{ color }}>{score}</div>
      </div>
      <div className="score-meta">
        <span className="score-badge" style={{ backgroundColor: color, color: '#fff' }}>ATS Match</span>
        <div className="score-verdict">{scoreVerdict(score)}</div>
        <div className="score-subtext">Calibrated against role requirements</div>
      </div>
    </div>
  );
}

function FormattedResume({ text }) {
  const lines = (text || '').split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

  return (
    <div className="improved-text">
      {lines.map((line, i) => {
        const cleanLine = line.replace(/^\*\*|\*\*$/g, '').replace(/^#+\s*/, '');
        const isHeading = (cleanLine === cleanLine.toUpperCase() && cleanLine.length < 50 && /[A-Za-z]/.test(cleanLine))
          || /^(SUMMARY|EXPERIENCE|EDUCATION|SKILLS|PROJECTS|CERTIFICATIONS|HIGHLIGHTS)/i.test(cleanLine);

        if (isHeading) {
          return <h4 key={i} className="improved-heading">{cleanLine}</h4>;
        }
        if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
          return (
            <div key={i} className="improved-bullet">
              <span className="bullet-sym">•</span>
              <span>{line.replace(/^[•\-*]\s*/, '')}</span>
            </div>
          );
        }
        return <p key={i} className="improved-line">{line}</p>;
      })}
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
  const [xray, setXray] = useState(null);
  const [analysisId, setAnalysisId] = useState(null);
  const [guard, setGuard] = useState(null);
  const [user, setUser] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Improve state
  const [improving, setImproving] = useState(false);
  const [improveError, setImproveError] = useState('');
  const [improvedResume, setImprovedResume] = useState('');

  // Download state
  const [downloading, setDownloading] = useState(false);

  // Interactive UI state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup'
  const [policyModal, setPolicyModal] = useState(null); // 'privacy' | 'terms' | null
  const [previewTab, setPreviewTab] = useState('breakdown'); // 'breakdown' | 'bullets' | 'keywords'

  // Restore the login session on page load.
  useEffect(() => {
    if (!getToken()) return;
    fetchMe()
      .then((data) => setUser(data.user))
      .catch(() => setToken(''));
  }, []);

  function handleLogout() {
    setToken('');
    setUser(null);
    setHistoryOpen(false);
  }

  async function openSaved(id) {
    try {
      const data = await getAnalysis(id);
      setResumeText(data.resume_text || '');
      setJobDescription(data.job_description || '');
      setAnalysis(data.analysis);
      setXray(data.xray);
      setAnalysisId(data.id);
      setImprovedResume(data.improved_resume || '');
      setGuard(data.guard);
      setAnalyzeError('');
      setImproveError('');
      setStep(data.improved_resume ? 3 : 2);
      setHistoryOpen(false);
      scrollToSection('analyzer');
    } catch (e) {
      setAnalyzeError(e.message);
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0] || null;
    setResumeFile(file);
    if (file) setAnalyzeError('');
  }

  function handleReset() {
    setStep(1);
    setResumeFile(null);
    setJobDescription('');
    setAnalyzeError('');
    setAnalysis(null);
    setResumeText('');
    setXray(null);
    setAnalysisId(null);
    setGuard(null);
    setImproveError('');
    setImprovedResume('');
  }

  async function handleAnalyze() {
    setAnalyzeError('');

    if (!resumeFile) {
      setAnalyzeError('Please select a text-based PDF resume first.');
      return;
    }
    if (!jobDescription.trim()) {
      setAnalyzeError('Please paste the target job description to match against.');
      return;
    }

    const formData = new FormData();
    formData.append('resume', resumeFile);
    formData.append('job_description', jobDescription);

    setAnalyzing(true);
    setStep(2);
    setAnalysis(null);
    setXray(null);
    setAnalysisId(null);
    setGuard(null);
    setImprovedResume('');

    try {
      const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
      });
      const data = await response.json();

      if (response.ok) {
        setResumeText(data.resume_text);
        setAnalysis(data.analysis);
        setXray(data.xray || null);
        setAnalysisId(data.analysis_id || null);
      } else {
        setAnalyzeError(data.error || 'Server rejected the file.');
      }
    } catch {
      setAnalyzeError('Could not connect to backend server. If using Render free tier, please wait 30-45s for cold start and retry.');
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleImprove() {
    setImproveError('');

    if (!resumeText || !jobDescription || !analysis) {
      setImproveError('Please analyze a resume before generating an improved version.');
      return;
    }

    setImproving(true);
    setStep(3);

    try {
      const response = await fetch(`${API_BASE}/improve`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          resume_text: resumeText,
          job_description: jobDescription,
          missing_skills: analysis.missing_skills || [],
          issues: analysis.issues || [],
          analysis_id: analysisId,
        }),
      });
      const data = await response.json();

      if (response.ok) {
        setImprovedResume(data.improved_resume);
        setGuard(data.guard || null);
      } else {
        setImproveError(data.error || 'Improvement service error.');
      }
    } catch {
      setImproveError('Could not reach backend to improve resume. Please try again.');
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
        const data = await response.json().catch(() => ({}));
        alert('Could not download PDF: ' + (data.error || 'Server error.'));
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'ResumeLens_Improved_Resume.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Network error while generating PDF. Please ensure backend is running.');
    } finally {
      setDownloading(false);
    }
  }

  function scrollToSection(id) {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  return (
    <div className="resumelens-page">
      {/* ================= 1. NAVBAR ================= */}
      <header className="navbar">
        <div className="navbar-container">
          <a href="#" className="nav-brand" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
            <BrandLogo />
          </a>

          <nav className="nav-menu" aria-label="Main Navigation">
            <button type="button" className="nav-link" onClick={() => scrollToSection('features')}>Features</button>
            <button type="button" className="nav-link" onClick={() => scrollToSection('how-it-works')}>How It Works</button>
            <button type="button" className="nav-link" onClick={() => scrollToSection('benefits')}>Benefits</button>
            <button type="button" className="nav-link" onClick={() => scrollToSection('preview')}>Preview</button>
            <button type="button" className="nav-link" onClick={() => scrollToSection('about')}>About</button>
          </nav>

          <div className="nav-actions">
            {user ? (
              <>
                <button type="button" className="btn-login" onClick={() => setHistoryOpen(true)}>
                  My analyses
                </button>
                <button type="button" className="btn-login" onClick={handleLogout}>
                  Log out
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn-login"
                onClick={() => { setAuthMode('login'); setAuthModalOpen(true); }}
              >
                Log in
              </button>
            )}
            <button
              type="button"
              className="btn-primary btn-nav-cta"
              onClick={() => scrollToSection('analyzer')}
            >
              <span>Get Started</span>
              <IconArrowRight />
            </button>
            <button
              type="button"
              className="mobile-toggle"
              aria-label="Toggle navigation menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className={`bar ${mobileMenuOpen ? 'open' : ''}`} />
              <span className={`bar ${mobileMenuOpen ? 'open' : ''}`} />
              <span className={`bar ${mobileMenuOpen ? 'open' : ''}`} />
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="mobile-dropdown">
            <button type="button" className="mobile-nav-link" onClick={() => scrollToSection('features')}>Features</button>
            <button type="button" className="mobile-nav-link" onClick={() => scrollToSection('how-it-works')}>How It Works</button>
            <button type="button" className="mobile-nav-link" onClick={() => scrollToSection('benefits')}>Benefits</button>
            <button type="button" className="mobile-nav-link" onClick={() => scrollToSection('preview')}>Preview</button>
            <button type="button" className="mobile-nav-link" onClick={() => scrollToSection('analyzer')}>Live Analyzer</button>
            <button type="button" className="mobile-nav-link" onClick={() => scrollToSection('about')}>About</button>
            <div className="mobile-auth-row">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => { setMobileMenuOpen(false); setAuthMode('login'); setAuthModalOpen(true); }}
              >
                Log in
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => scrollToSection('analyzer')}
              >
                Analyze Resume
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ================= 2. HERO SECTION ================= */}
      <section className="hero-section">
        <div className="section-container hero-grid">
          <div className="hero-content">
            <div className="badge-pill hero-pill">
              <span className="pill-dot" />
              <span>CAREER-TECH ATS OPTIMIZER</span>
            </div>

            <h1 className="hero-headline">
              Your next opportunity starts with a <span className="headline-highlight">stronger resume.</span>
            </h1>

            <p className="hero-description">
              ResumeLens evaluates your resume against target job descriptions to surface keyword gaps, critique bullet clarity, and generate tailored, high-impact improvements — with zero fabricated experience.
            </p>

            <div className="hero-cta-group">
              <button
                type="button"
                className="btn-primary btn-large"
                onClick={() => scrollToSection('analyzer')}
              >
                <span>Analyze My Resume</span>
                <IconArrowRight />
              </button>
              <button
                type="button"
                className="btn-secondary btn-large"
                onClick={() => scrollToSection('features')}
              >
                <span>Explore Features</span>
              </button>
            </div>

            <div className="hero-trust-strip">
              <div className="trust-item">
                <span className="trust-check"><IconCheck /></span>
                <span>0% Fabricated Experience</span>
              </div>
              <div className="trust-item">
                <span className="trust-check"><IconCheck /></span>
                <span>Simulates Enterprise ATS Filters</span>
              </div>
              <div className="trust-item">
                <span className="trust-check"><IconCheck /></span>
                <span>Direct PDF Export</span>
              </div>
            </div>
          </div>

          {/* Realistic Product Preview Box (Clearly Labeled Illustrative) */}
          <div className="hero-preview-wrapper">
            <div className="preview-window">
              <div className="window-header">
                <div className="window-dots">
                  <span className="dot red" />
                  <span className="dot yellow" />
                  <span className="dot green" />
                </div>
                <div className="window-title">
                  <span className="window-doc-icon">📄</span>
                  <span className="window-title-text">Sample Candidate Audit (Senior Engineer)</span>
                </div>
                <div className="window-status-pill">
                  <span className="status-live-dot" />
                  <span>Illustrative Preview</span>
                </div>
              </div>

              <div className="window-body">
                {/* Illustrative score row */}
                <div className="preview-top-row">
                  <div className="preview-score-card">
                    <div className="preview-ring-mini">
                      <svg viewBox="0 0 72 72" width="62" height="62" aria-hidden="true">
                        <circle cx="36" cy="36" r="30" fill="none" stroke="var(--color-border)" strokeWidth="6" />
                        <circle
                          cx="36"
                          cy="36"
                          r="30"
                          fill="none"
                          stroke="var(--color-cobalt)"
                          strokeWidth="6"
                          strokeDasharray={2 * Math.PI * 30}
                          strokeDashoffset={2 * Math.PI * 30 * (1 - 0.84)}
                          strokeLinecap="round"
                          transform="rotate(-90 36 36)"
                        />
                      </svg>
                      <div className="preview-ring-num">84</div>
                    </div>
                    <div>
                      <div className="preview-score-title">Illustrative ATS Score</div>
                      <div className="preview-score-sub">Sample evaluation against role specifications</div>
                    </div>
                  </div>

                  <div className="preview-stat-card">
                    <div className="stat-label">SAMPLE MATCH RATIO</div>
                    <div className="stat-val">14 / 16 <span className="stat-sub">Keywords aligned</span></div>
                  </div>
                </div>

                {/* Keyword matrix */}
                <div className="preview-keyword-strip">
                  <div className="matrix-title">SAMPLE KEYWORDS & GAPS:</div>
                  <div className="tag-list">
                    <span className="tag tag-sage"><IconCheck /> Kubernetes</span>
                    <span className="tag tag-sage"><IconCheck /> Distributed Systems</span>
                    <span className="tag tag-sage"><IconCheck /> React 19</span>
                    <span className="tag tag-sage"><IconCheck /> TypeScript</span>
                    <span className="tag tag-apricot"><IconMissing /> OpenTelemetry</span>
                    <span className="tag tag-apricot"><IconMissing /> GraphQL Federation</span>
                  </div>
                </div>

                {/* Realistic Bullet Point Contrast Card */}
                <div className="preview-bullet-box">
                  <div className="bullet-header">
                    <span className="bullet-label">ILLUSTRATIVE BULLET COMPARISON</span>
                    <span className="bullet-badge">Sample Rewrite</span>
                  </div>
                  <div className="bullet-diff">
                    <div className="diff-row diff-before">
                      <span className="diff-tag">Original Draft</span>
                      <p>“Worked on backend microservices to improve system speed and fix API bugs.”</p>
                    </div>
                    <div className="diff-row diff-after">
                      <span className="diff-tag">Tailored Revision</span>
                      <p>“Architected 4 distributed event-driven microservices with Go & Redis, reducing p99 latency by 38% across 1.8M daily user requests.”</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Factual Feature Callout Pill */}
            <div className="hero-accent-pill">
              <span className="accent-pill-icon"><IconStrength /></span>
              <div>
                <strong>ATS-Aligned Formatting</strong>
                <p>Calibrated for automated enterprise screening</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 3. BENEFITS SECTION ================= */}
      <section id="benefits" className="section benefits-section">
        <div className="section-container">
          <div className="section-head text-center">
            <div className="badge-pill">WHY RESUMELENS</div>
            <h2 className="section-title">Engineered for career momentum, not guesswork.</h2>
            <p className="section-subtitle">
              Understand how automated applicant screening works and optimize your application with precision.
            </p>
          </div>

          <div className="benefits-grid">
            <div className="benefit-card benefit-card-cobalt">
              <div className="benefit-top-indicator indicator-cobalt" />
              <div className="benefit-card-inner">
                <div className="benefit-index">01</div>
                <div className="benefit-tag tag-cobalt">ALGORITHMIC VISIBILITY</div>
                <h3 className="benefit-title">Resume Insights That Matter</h3>
                <p className="benefit-desc">
                  Understand how modern ATS parsers interpret your experience, format density, and role hierarchy before a human ever reviews your file.
                </p>
                <div className="benefit-pill-preview">
                  <span className="micro-badge"><IconCheck /> Format Verification</span>
                  <span className="micro-badge"><IconCheck /> Hierarchy Analysis</span>
                </div>
                <ul className="benefit-list">
                  <li><IconCheck /> Section hierarchy & parsing health verification</li>
                  <li><IconCheck /> Real-time detection of unreadable graphics or tables</li>
                  <li><IconCheck /> Quantifiable impact and verb strength analysis</li>
                </ul>
              </div>
            </div>

            <div className="benefit-card benefit-card-apricot">
              <div className="benefit-top-indicator indicator-apricot" />
              <div className="benefit-card-inner">
                <div className="benefit-index">02</div>
                <div className="benefit-tag tag-apricot">MEASURABLE IMPACT</div>
                <h3 className="benefit-title">Actionable Improvement Suggestions</h3>
                <p className="benefit-desc">
                  Receive surgical bullet revisions that transform passive task descriptions into quantified achievements with scope, metrics, and business outcomes.
                </p>
                <div className="benefit-pill-preview">
                  <span className="micro-badge"><IconCheck /> Active Verbs</span>
                  <span className="micro-badge"><IconCheck /> 0-Fabrication Guard</span>
                </div>
                <ul className="benefit-list">
                  <li><IconCheck /> Rephrases weak duties into leadership outcomes</li>
                  <li><IconCheck /> Incorporates missing skills plausibly</li>
                  <li><IconCheck /> Strict 0-fabrication integrity safeguard</li>
                </ul>
              </div>
            </div>

            <div className="benefit-card benefit-card-sage">
              <div className="benefit-top-indicator indicator-sage" />
              <div className="benefit-card-inner">
                <div className="benefit-index">03</div>
                <div className="benefit-tag tag-sage">ROLE CALIBRATION</div>
                <h3 className="benefit-title">Job Readiness & Precision Alignment</h3>
                <p className="benefit-desc">
                  Compare your credentials side-by-side with specific job descriptions. Know exactly where your background aligns and what critical competencies to emphasize.
                </p>
                <div className="benefit-pill-preview">
                  <span className="micro-badge"><IconCheck /> JD Comparison</span>
                  <span className="micro-badge"><IconCheck /> Direct PDF Export</span>
                </div>
                <ul className="benefit-list">
                  <li><IconCheck /> Side-by-side keyword match ratio</li>
                  <li><IconCheck /> Immediate export to formatted, ATS-compliant PDF</li>
                  <li><IconCheck /> Tailored for every single job application</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 4. HOW IT WORKS SECTION ================= */}
      <section id="how-it-works" className="section how-it-works-section">
        <div className="section-container">
          <div className="section-head text-center">
            <div className="badge-pill">THREE SIMPLE STEPS</div>
            <h2 className="section-title">From PDF to recruiter-ready in two minutes.</h2>
            <p className="section-subtitle">
              A frictionless workflow built directly into the browser. No account required. Log in only if you want your history saved.
            </p>
          </div>

          <div className="steps-container">
            <div className="step-card step-card-1">
              <div className="step-num-badge">01</div>
              <div className="step-icon-wrap"><IconFilePdf /></div>
              <div className="step-category">INPUT STAGE</div>
              <h3 className="step-title">Upload & Parse</h3>
              <p className="step-desc">
                Select your text-based PDF resume and paste the target job description. Our engine extracts headers, work history, and skills cleanly in memory.
              </p>
              <div className="step-meta">
                <span className="meta-tag">PDF format</span>
                <span className="meta-tag">Under 5MB</span>
              </div>
            </div>

            <div className="step-connector">
              <span className="connector-line" />
              <span className="connector-arrow">➔</span>
            </div>

            <div className="step-card step-card-2">
              <div className="step-num-badge">02</div>
              <div className="step-icon-wrap"><IconIssue /></div>
              <div className="step-category">DIAGNOSTIC STAGE</div>
              <h3 className="step-title">Deep ATS Scan</h3>
              <p className="step-desc">
                Gemini 2.5 Flash maps your experience against required competencies, scoring compatibility and flagging missing keywords and vague bullet points.
              </p>
              <div className="step-meta">
                <span className="meta-tag">Semantic Analysis</span>
                <span className="meta-tag">10–15 sec</span>
              </div>
            </div>

            <div className="step-connector">
              <span className="connector-line" />
              <span className="connector-arrow">➔</span>
            </div>

            <div className="step-card step-card-3">
              <div className="step-num-badge">03</div>
              <div className="step-icon-wrap"><IconStrength /></div>
              <div className="step-category">OPTIMIZATION STAGE</div>
              <h3 className="step-title">Rewrite & Export</h3>
              <p className="step-desc">
                Review the rewritten resume tailored specifically for the role, verify the strengthened phrasing, and download a publication-ready PDF in one click.
              </p>
              <div className="step-meta">
                <span className="meta-tag">ReportLab Engine</span>
                <span className="meta-tag">ATS-Safe Layout</span>
              </div>
            </div>
          </div>

          <div className="how-cta-center">
            <button
              type="button"
              className="btn-primary"
              onClick={() => scrollToSection('analyzer')}
            >
              <span>Try It Now on Your Resume</span>
              <IconArrowRight />
            </button>
          </div>
        </div>
      </section>

      {/* ================= 5. FEATURES SECTION ================= */}
      <section id="features" className="section features-section">
        <div className="section-container">
          <div className="section-head text-center">
            <div className="badge-pill pill-light">SYSTEM CAPABILITIES</div>
            <h2 className="section-title">Precision tools built for high-stakes applications.</h2>
            <p className="section-subtitle">
              Every feature is tuned to eliminate the common pitfalls that cause automated applicant screening systems to discard promising candidates.
            </p>
          </div>

          <div className="features-grid">
            <div className="feature-item feature-item-cobalt">
              <div className="feature-category-tag">AUDIT</div>
              <div className="feature-icon-box box-cobalt"><IconCheck /></div>
              <h3 className="feature-title">Resume Analysis</h3>
              <p className="feature-desc">
                Comprehensive linguistic and structural audit of your resume content. Detects text density, active versus passive voice, and clear section demarcation.
              </p>
            </div>

            <div className="feature-item feature-item-sage">
              <div className="feature-category-tag">BENCHMARK</div>
              <div className="feature-icon-box box-sage"><IconStrength /></div>
              <h3 className="feature-title">ATS Match Score</h3>
              <p className="feature-desc">
                An objective 0–100 benchmark calibrated to modern ATS screening algorithms. Understand whether your resume passes initial filtering thresholds.
              </p>
            </div>

            <div className="feature-item feature-item-warm">
              <div className="feature-category-tag">ALIGNMENT</div>
              <div className="feature-icon-box box-warm"><IconFilePdf /></div>
              <h3 className="feature-title">Job Description Matching</h3>
              <p className="feature-desc">
                Direct comparative mapping between the job posting's stated requirements and your stated background. Highlights relevance and role alignment.
              </p>
            </div>

            <div className="feature-item feature-item-apricot">
              <div className="feature-category-tag">GAP DETECTION</div>
              <div className="feature-icon-box box-apricot"><IconMissing /></div>
              <h3 className="feature-title">Keyword Gap Analysis</h3>
              <p className="feature-desc">
                Surfaces specific technical skills, domain certifications, and industry terminology mentioned in the job description that are missing from your resume.
              </p>
            </div>

            <div className="feature-item feature-span-2 feature-item-highlight">
              <div className="feature-category-tag">INTELLIGENT REWRITE</div>
              <div className="feature-icon-box box-cobalt"><IconIssue /></div>
              <h3 className="feature-title">Resume Improvement Engine</h3>
              <p className="feature-desc">
                Rewrites and elevates your existing accomplishments to highlight relevant achievements with professional phrasing, without inventing false experience or non-existent roles.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 6. ANALYSIS PREVIEW SECTION ================= */}
      <section id="preview" className="section preview-section">
        <div className="section-container">
          <div className="section-head text-center">
            <div className="badge-pill">ILLUSTRATIVE SAMPLE SHOWCASE</div>
            <h2 className="section-title">See the depth of feedback before you run your own.</h2>
            <p className="section-subtitle">
              Explore an illustrative evaluation of a Senior Engineer resume applied to a Lead Architect role to see the exact structure of diagnostic feedback.
            </p>
          </div>

          <div className="illustrative-notice-strip">
            <span className="notice-icon">ℹ️</span>
            <span><strong>Illustrative Sample:</strong> The candidate scores, matched keywords, and rewritten bullet examples below demonstrate ResumeLens outputs.</span>
          </div>

          <div className="interactive-preview-card">
            <div className="preview-nav-tabs">
              <button
                type="button"
                className={`preview-tab-btn ${previewTab === 'breakdown' ? 'active' : ''}`}
                onClick={() => setPreviewTab('breakdown')}
              >
                Sample Score & Diagnostics
              </button>
              <button
                type="button"
                className={`preview-tab-btn ${previewTab === 'keywords' ? 'active' : ''}`}
                onClick={() => setPreviewTab('keywords')}
              >
                Sample Keyword Matrix
              </button>
              <button
                type="button"
                className={`preview-tab-btn ${previewTab === 'bullets' ? 'active' : ''}`}
                onClick={() => setPreviewTab('bullets')}
              >
                Illustrative Bullet Rewrites
              </button>
            </div>

            <div className="preview-tab-content">
              {previewTab === 'breakdown' && (
                <div className="tab-panel breakdown-panel">
                  <div className="sample-score-banner">
                    <div className="sample-gauge">
                      <div className="sample-gauge-val">82</div>
                      <div className="sample-gauge-sub">/ 100</div>
                    </div>
                    <div className="sample-verdict-box">
                      <div className="sample-verdict-header">
                        <span className="sample-verdict-tag tag-sage">Strong Match</span>
                        <span className="illustrative-tag">Sample Score</span>
                      </div>
                      <h4>High probability of passing automated screening</h4>
                      <p>Resume exhibits high technical density and clear career progression, but lacks explicit distributed architecture scale metrics.</p>
                    </div>
                  </div>

                  <div className="sample-columns">
                    <div className="sample-col">
                      <h5 className="sample-col-title text-sage"><IconStrength /> Strengths Identified</h5>
                      <ul className="sample-list">
                        <li>Demonstrated mastery of React, TypeScript, and modern state architecture.</li>
                        <li>Consistent leadership experience directing cross-functional squads.</li>
                        <li>Clear employment continuity with recognized tech enterprises.</li>
                      </ul>
                    </div>

                    <div className="sample-col">
                      <h5 className="sample-col-title text-apricot"><IconIssue /> Areas for Improvement</h5>
                      <ul className="sample-list">
                        <li>Bullet points lack quantifiable business metrics (e.g. latency, scale, volume).</li>
                        <li>Missing direct keywords: "GraphQL Federation" and "Observability".</li>
                        <li>Summary section is overly generic and lacks focus on target role.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {previewTab === 'keywords' && (
                <div className="tab-panel keywords-panel">
                  <div className="matrix-summary">
                    <strong>12 Sample Matched Keywords</strong> against job description • <strong>3 Critical Missing Keywords</strong>
                  </div>
                  <div className="matrix-groups">
                    <div className="matrix-group">
                      <span className="matrix-group-label text-sage">FOUND IN RESUME (SAMPLE MATCHED)</span>
                      <div className="tag-cloud">
                        <span className="tag tag-sage"><IconCheck /> React.js</span>
                        <span className="tag tag-sage"><IconCheck /> TypeScript</span>
                        <span className="tag tag-sage"><IconCheck /> Node.js</span>
                        <span className="tag tag-sage"><IconCheck /> PostgreSQL</span>
                        <span className="tag tag-sage"><IconCheck /> Docker</span>
                        <span className="tag tag-sage"><IconCheck /> AWS ECS</span>
                        <span className="tag tag-sage"><IconCheck /> REST APIs</span>
                        <span className="tag tag-sage"><IconCheck /> CI/CD Pipelines</span>
                      </div>
                    </div>

                    <div className="matrix-group">
                      <span className="matrix-group-label text-apricot">MISSING FROM RESUME (HIGH PRIORITY GAPS)</span>
                      <div className="tag-cloud">
                        <span className="tag tag-apricot"><IconMissing /> GraphQL Federation</span>
                        <span className="tag tag-apricot"><IconMissing /> OpenTelemetry / Tracing</span>
                        <span className="tag tag-apricot"><IconMissing /> Event-Driven Architecture</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {previewTab === 'bullets' && (
                <div className="tab-panel bullets-panel">
                  <div className="bullet-comparison-item">
                    <div className="comparison-side original-side">
                      <span className="side-label">Original Passive Bullet</span>
                      <p>“Responsible for redesigning the payment checkout flow and fixing user bugs on web and mobile.”</p>
                    </div>
                    <div className="comparison-arrow">➔</div>
                    <div className="comparison-side rewritten-side">
                      <span className="side-label">Optimized High-Impact Rewrite (Sample)</span>
                      <p>“Spearheaded the zero-downtime redesign of the payment checkout microservice, reducing cart abandonment by 14% and improving conversion velocity across 450K monthly checkouts.”</p>
                    </div>
                  </div>

                  <div className="bullet-comparison-item">
                    <div className="comparison-side original-side">
                      <span className="side-label">Original Passive Bullet</span>
                      <p>“Built dashboards for internal ops team using modern JavaScript and databases.”</p>
                    </div>
                    <div className="comparison-arrow">➔</div>
                    <div className="comparison-side rewritten-side">
                      <span className="side-label">Optimized High-Impact Rewrite (Sample)</span>
                      <p>“Developed real-time operational analytics dashboards with React and PostgreSQL, decreasing incident triage time by 42% for a 35-person engineering operations team.”</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="preview-card-footer">
              <span>Ready to run this analysis on your own background?</span>
              <button
                type="button"
                className="btn-primary btn-sm"
                onClick={() => scrollToSection('analyzer')}
              >
                Scan Your Resume Now
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 7. LIVE ANALYZER SECTION ================= */}
      <section id="analyzer" className="section analyzer-section">
        <div className="section-container">
          <div className="section-head text-center">
            <div className="badge-pill">INTERACTIVE WORKBENCH</div>
            <h2 className="section-title">Analyze & Optimize Your Resume</h2>
            <p className="section-subtitle">
              Upload your text-based PDF resume and paste the job description below to start your diagnostic.
            </p>
          </div>

          <StepTracker step={step} />

          <div className="analyzer-workbench">
            {/* Input Panel */}
            <div className="workbench-panel input-panel">
              <div className="panel-header">
                <div className="panel-header-badge">STEP 1 & 2</div>
                <h3 className="panel-title">Upload Application Data</h3>
                <p className="panel-sub">Provide your resume PDF and the target role description.</p>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="resumeUploadInput">
                  <span>Resume (Text-based PDF)</span>
                  <span className="form-label-hint">PDF • Max 5MB</span>
                </label>
                <label className={`file-dropzone ${resumeFile ? 'file-selected' : ''}`} htmlFor="resumeUploadInput">
                  <input
                    type="file"
                    id="resumeUploadInput"
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                  />
                  <div className="dropzone-content">
                    <div className="dropzone-icon">
                      <IconFilePdf />
                    </div>
                    {resumeFile ? (
                      <div className="dropzone-file-info">
                        <span className="filename-text">📄 {resumeFile.name}</span>
                        <span className="filesize-text">({(resumeFile.size / 1024).toFixed(0)} KB) — Click to change</span>
                      </div>
                    ) : (
                      <div className="dropzone-prompt">
                        <strong>Click to choose a PDF resume</strong>
                        <span>or drag and drop your file here</span>
                        <span className="dropzone-sub">Ensure the PDF has selectable text (not a flat scanned image)</span>
                      </div>
                    )}
                  </div>
                </label>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="jobDescInput">
                  <span>Job Description</span>
                  <span className="form-label-hint">Paste full role posting for accuracy</span>
                </label>
                <textarea
                  id="jobDescInput"
                  className="job-desc-textarea"
                  rows={9}
                  placeholder="Paste the target job description here (responsibilities, requirements, qualifications)..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
              </div>

              <button
                type="button"
                className={`btn-primary btn-full ${analyzing ? 'btn-loading' : ''}`}
                onClick={handleAnalyze}
                disabled={analyzing}
              >
                {analyzing ? (
                  <>
                    <span className="spinner" />
                    <span>Analyzing with Gemini...</span>
                  </>
                ) : (
                  <>
                    <span>Run ATS Diagnostic</span>
                    <IconArrowRight />
                  </>
                )}
              </button>

              <div className="input-tips-box">
                <strong>Tips for optimal analysis:</strong>
                <ul>
                  <li>Use a standard text-based PDF (not an image scan from a flatbed scanner).</li>
                  <li>Include the whole job description including requirements and qualifications.</li>
                  <li>Initial request on free-tier backend may take 30–45s if waking from sleep.</li>
                </ul>
              </div>
            </div>

            {/* Output Panel */}
            <div className="workbench-panel output-panel">
              <div className="panel-header">
                <div className="panel-header-badge badge-output">DIAGNOSTIC RESULTS</div>
                <h3 className="panel-title">Analysis & Optimization</h3>
                <p className="panel-sub">Review match score, gap analysis, and tailored rewrite.</p>
              </div>

              <div className="output-content-area">
                {analyzeError && !analyzing && (
                  <div className="error-banner">
                    <span className="error-icon"><IconIssue /></span>
                    <p>{analyzeError}</p>
                  </div>
                )}

                {analyzing && (
                  <div className="loading-state-card">
                    <div className="spinner-large" />
                    <h4>Analyzing your resume against the job description</h4>
                    <p>Evaluating keywords, measuring bullet impact, and checking ATS parseability. This usually takes 10–20 seconds.</p>
                    <span className="cold-start-note">Note: If the backend is waking up from idle, this may take up to 45 seconds.</span>
                  </div>
                )}

                {!analyzing && !analyzeError && !analysis && (
                  <div className="empty-state-card">
                    <div className="empty-icon-wrap">
                      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--color-cobalt)" strokeWidth="1.8" aria-hidden="true">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        <line x1="11" y1="8" x2="11" y2="14" />
                        <line x1="8" y1="11" x2="14" y2="11" />
                      </svg>
                    </div>
                    <h4>Awaiting Your Input</h4>
                    <p>Upload your resume and paste a job description on the left, then click <strong>Run ATS Diagnostic</strong> to see your score and recommendations.</p>
                  </div>
                )}

                {analysis && (
                  <div className="analysis-results-flow">
                    <ScoreRing analysis={analysis} />

                    <XrayPanel xray={xray} />

                    {!user && (
                      <p className="rl-save-hint">Log in to save this analysis to your history.</p>
                    )}

                    <div className="audit-section missing-section">
                      <div className="audit-section-head">
                        <span className="audit-icon text-apricot"><IconMissing /></span>
                        <h4>Missing Keywords & Skills</h4>
                      </div>
                      <div className="audit-tags">
                        {analysis.missing_skills && analysis.missing_skills.length > 0 ? (
                          analysis.missing_skills.map((skill, idx) => (
                            <span key={idx} className="tag tag-apricot">
                              <IconMissing /> {skill}
                            </span>
                          ))
                        ) : (
                          <div className="audit-empty-success">
                            <IconCheck /> All core keywords from the job description are present in your resume!
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="audit-section issues-section">
                      <div className="audit-section-head">
                        <span className="audit-icon text-apricot"><IconIssue /></span>
                        <h4>Areas for Improvement</h4>
                      </div>
                      <ul className="audit-bullet-list">
                        {analysis.issues && analysis.issues.length > 0 ? (
                          analysis.issues.map((issue, idx) => (
                            <li key={idx}><IconIssue /> <span>{issue}</span></li>
                          ))
                        ) : (
                          <li className="text-sage"><IconCheck /> <span>No structural issues detected. Strong formatting!</span></li>
                        )}
                      </ul>
                    </div>

                    <div className="audit-section strengths-section">
                      <div className="audit-section-head">
                        <span className="audit-icon text-sage"><IconStrength /></span>
                        <h4>Identified Strengths</h4>
                      </div>
                      <ul className="audit-bullet-list">
                        {analysis.strengths && analysis.strengths.length > 0 ? (
                          analysis.strengths.map((str, idx) => (
                            <li key={idx} className="strength-item"><IconStrength /> <span>{str}</span></li>
                          ))
                        ) : (
                          <li><span>Resume meets baseline qualifications.</span></li>
                        )}
                      </ul>
                    </div>

                    <div className="rewrite-trigger-box">
                      <button
                        type="button"
                        className="btn-primary btn-full"
                        onClick={handleImprove}
                        disabled={improving}
                      >
                        {improving ? (
                          <>
                            <span className="spinner" />
                            <span>Rewriting with Gemini...</span>
                          </>
                        ) : (
                          <>
                            <span>Generate Improved Resume Rewrite</span>
                            <IconArrowRight />
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        className="btn-reset-link"
                        onClick={handleReset}
                      >
                        Reset and scan a different resume
                      </button>
                    </div>

                    {improveError && (
                      <div className="error-banner">
                        <span className="error-icon"><IconIssue /></span>
                        <p>{improveError}</p>
                      </div>
                    )}

                    {improving && (
                      <div className="loading-state-card mini">
                        <div className="spinner" />
                        <p>Rewriting bullet points and naturally integrating missing competencies... (10–15s)</p>
                      </div>
                    )}

                    {improvedResume && !improving && (
                      <div className="improved-resume-container">
                        <div className="improved-resume-header">
                          <div>
                            <h4>Optimized Resume Content</h4>
                            <span className="improved-tag">Tailored for ATS & Recruiters</span>
                          </div>
                          <button
                            type="button"
                            className="btn-primary btn-download-top"
                            onClick={handleDownloadPdf}
                            disabled={downloading}
                          >
                            {downloading ? 'Generating PDF...' : 'Download PDF'}
                          </button>
                        </div>

                        <div className="improved-scroll-box">
                          <FormattedResume text={improvedResume} />
                        </div>

                        <GuardPanel
                          original={resumeText}
                          improved={improvedResume}
                          setImproved={setImprovedResume}
                          jobDescription={jobDescription}
                          guard={guard}
                          setGuard={setGuard}
                        />

                        <button
                          type="button"
                          className="btn-primary btn-full btn-download-bottom"
                          onClick={handleDownloadPdf}
                          disabled={downloading}
                        >
                          {downloading ? (
                            <>
                              <span className="spinner" />
                              <span>Generating Formatted PDF...</span>
                            </>
                          ) : (
                            <>
                              <IconFilePdf />
                              <span>Download as Clean ATS PDF</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 8. CLOSING CTA SECTION ================= */}
      <section className="section closing-cta-section">
        <div className="section-container">
          <div className="closing-cta-card">
            <div className="cta-content">
              <div className="badge-pill pill-light">START TODAY</div>
              <h2 className="cta-headline">Your next application deserves a stronger resume.</h2>
              <p className="cta-description">
                Do not leave your career up to automated keyword filters. Get your free match score, identify missing competencies, and apply with complete confidence.
              </p>
              <div className="cta-button-row">
                <button
                  type="button"
                  className="btn-primary btn-cta-light"
                  onClick={() => scrollToSection('analyzer')}
                >
                  <span>Analyze Your Resume — It's Free</span>
                  <IconArrowRight />
                </button>
                <button
                  type="button"
                  className="btn-secondary btn-cta-outline"
                  onClick={() => scrollToSection('preview')}
                >
                  <span>View Sample Audit</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 9. FOOTER ================= */}
      <footer id="about" className="footer">
        <div className="section-container footer-container">
          <div className="footer-col footer-col-brand">
            <BrandLogo />
            <p className="footer-tagline">
              An intelligent, career-tech resume diagnostic and optimization engine. Powered by modern AI with strict 0-fabrication integrity.
            </p>
            <div className="footer-status-pill">
              <span className="status-live-dot" />
              <span>Gemini 2.5 Flash Engine Active</span>
            </div>
          </div>

          <div className="footer-col">
            <h4 className="footer-col-title">Product</h4>
            <ul className="footer-links">
              <li><button type="button" onClick={() => scrollToSection('analyzer')}>Live Scanner</button></li>
              <li><button type="button" onClick={() => scrollToSection('features')}>ATS Match Score</button></li>
              <li><button type="button" onClick={() => scrollToSection('features')}>Keyword Analysis</button></li>
              <li><button type="button" onClick={() => scrollToSection('preview')}>Sample Audit</button></li>
              <li><button type="button" onClick={() => scrollToSection('analyzer')}>PDF Generator</button></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4 className="footer-col-title">Resources</h4>
            <ul className="footer-links">
              <li><button type="button" onClick={() => scrollToSection('how-it-works')}>How It Works</button></li>
              <li><button type="button" onClick={() => scrollToSection('benefits')}>ATS Best Practices</button></li>
              <li><button type="button" onClick={() => setPolicyModal('privacy')}>Data Privacy</button></li>
              <li><button type="button" onClick={() => setPolicyModal('terms')}>Terms of Service</button></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4 className="footer-col-title">About</h4>
            <p className="footer-about-text">
              Built as a modern career-tech portfolio project by <strong>Akanksha Rawat</strong>. Designed to empower job candidates with genuine clarity.
            </p>
            <div className="footer-contact">
              <a href="https://resumelens-vert.vercel.app" target="_blank" rel="noopener noreferrer" className="footer-link-external">
                Live Production Demo ↗
              </a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="section-container footer-bottom-inner">
            <p>© {new Date().getFullYear()} ResumeLens. All rights reserved.</p>
            <div className="footer-bottom-links">
              <button type="button" onClick={() => setPolicyModal('privacy')}>Privacy Policy</button>
              <span>•</span>
              <button type="button" onClick={() => setPolicyModal('terms')}>Terms & Conditions</button>
              <span>•</span>
              <button type="button" onClick={() => scrollToSection('analyzer')}>Launch App</button>
            </div>
          </div>
        </div>
      </footer>

      {/* ================= 10. AUTH MODAL & HISTORY ================= */}
      <AuthModal
        open={authModalOpen}
        mode={authMode}
        setMode={setAuthMode}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(u) => { setUser(u); setAuthModalOpen(false); }}
        logo={<BrandLogo />}
      />
      {historyOpen && (
        <HistoryPanel onClose={() => setHistoryOpen(false)} onOpen={openSaved} />
      )}

      {/* ================= 11. PRIVACY & TERMS MODAL ================= */}
      {policyModal && (
        <div className="modal-backdrop" onClick={() => setPolicyModal(null)}>
          <div className="modal-card modal-legal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close-btn"
              aria-label="Close modal"
              onClick={() => setPolicyModal(null)}
            >
              ✕
            </button>

            {policyModal === 'privacy' ? (
              <div className="legal-content">
                <h3>Privacy Policy</h3>
                <p><strong>Last Updated: 2026</strong></p>
                <p>
                  At ResumeLens, we treat candidate confidentiality with the utmost seriousness. When you upload a resume or job description to ResumeLens:
                </p>
                <ul>
                  <li><strong>Without an account:</strong> Your PDF is read in memory to extract text for Gemini analysis. Nothing is stored.</li>
                  <li><strong>With an account:</strong> We save the extracted resume text, the job description and your results so you can see your history. You can delete any saved analysis at any time.</li>
                  <li><strong>No Third-Party Advertising:</strong> Your data is never sold, leased, or utilized to train external public advertising models.</li>
                  <li><strong>Direct Client Delivery:</strong> Generated PDFs are constructed on the fly in memory and served directly back to your browser session.</li>
                </ul>
              </div>
            ) : (
              <div className="legal-content">
                <h3>Terms of Service</h3>
                <p><strong>Last Updated: 2026</strong></p>
                <p>
                  By utilizing ResumeLens, you agree to these fair usage guidelines:
                </p>
                <ul>
                  <li><strong>Honest Candidate Representation:</strong> ResumeLens provides stylistic, structural, and semantic suggestions. Users are solely responsible for ensuring all final resume statements are truthful representations of their experience.</li>
                  <li><strong>Personal Employment Usage:</strong> The tool is provided freely for individual candidates targeting active career opportunities.</li>
                  <li><strong>Availability:</strong> The free tier API is provided as-is without guarantee of 100% server uptime.</li>
                </ul>
              </div>
            )}

            <button type="button" className="btn-primary btn-full" onClick={() => setPolicyModal(null)}>
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
}