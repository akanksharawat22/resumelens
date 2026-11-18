const SEVERITY_LABEL = { high: 'Critical', medium: 'Warning', low: 'Minor' };

function scoreClass(score) {
  if (score >= 80) return 'rl-good';
  if (score >= 55) return 'rl-warn';
  return 'rl-bad';
}

export default function XrayPanel({ xray }) {
  if (!xray) return null;

  const contact = xray.contact || {};
  const chips = [
    ['Email', contact.email],
    ['Phone', contact.phone],
    ['LinkedIn', contact.linkedin],
    ['GitHub', contact.github],
  ];

  return (
    <div className="audit-section rl-xray">
      <div className="rl-panel-head">
        <div>
          <h4>ATS X-Ray</h4>
          <p className="rl-muted">How an applicant tracking system actually reads your PDF.</p>
        </div>
        <div className={`rl-score-pill ${scoreClass(xray.readability_score)}`}>
          <strong>{xray.readability_score}</strong>
          <span>/100 readable</span>
        </div>
      </div>

      <div className="rl-chip-row">
        {chips.map(([label, found]) => (
          <span key={label} className={`rl-chip ${found ? 'rl-chip-ok' : 'rl-chip-miss'}`}>
            {found ? '✓' : '✗'} {label}
          </span>
        ))}
        <span className="rl-chip rl-chip-neutral">
          {xray.pages} page{xray.pages === 1 ? '' : 's'} · {xray.word_count} words
        </span>
      </div>

      {xray.sections_found?.length > 0 && (
        <p className="rl-muted">
          Sections detected: <strong>{xray.sections_found.join(', ')}</strong>
        </p>
      )}

      {xray.issues?.length === 0 ? (
        <div className="audit-empty-success">
          ✓ No layout problems found. This PDF parses cleanly.
        </div>
      ) : (
        <ul className="rl-issue-list">
          {xray.issues.map((issue) => (
            <li key={issue.code} className={`rl-issue rl-sev-${issue.severity}`}>
              <span className="rl-sev-badge">{SEVERITY_LABEL[issue.severity] || issue.severity}</span>
              <div>
                <p className="rl-issue-msg">{issue.message}</p>
                <p className="rl-issue-fix"><strong>Fix:</strong> {issue.fix}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <details className="rl-details">
        <summary>Show the exact text an ATS extracts</summary>
        <pre className="rl-pre">{xray.ats_text || '(no text could be extracted)'}</pre>
      </details>
    </div>
  );
}