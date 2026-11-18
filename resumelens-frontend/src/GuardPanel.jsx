import { useState } from 'react';
import { verifyRewrite } from './api';

const STATUS_LABEL = {
  grounded: 'Supported by your resume',
  jd_added: 'Added from job description',
  unsupported: 'Not found in your resume',
};

export default function GuardPanel({
  original,
  improved,
  setImproved,
  jobDescription,
  guard,
  setGuard,
}) {
  const [showAll, setShowAll] = useState(false);
  const [editing, setEditing] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  if (!guard) return null;

  const lines = guard.lines || [];
  const visible = showAll ? lines : lines.filter((l) => l.status !== 'grounded');

  async function recheck() {
    setChecking(true);
    setError('');
    try {
      const data = await verifyRewrite(original, improved, jobDescription);
      setGuard(data.guard);
    } catch (e) {
      setError(e.message || 'Could not re-check right now.');
    } finally {
      setChecking(false);
    }
  }

  const trustClass =
    guard.trust_score >= 85 ? 'rl-good' : guard.trust_score >= 60 ? 'rl-warn' : 'rl-bad';

  return (
    <div className="rl-guard">
      <div className="rl-panel-head">
        <div>
          <h4>Truthfulness Check</h4>
          <p className="rl-muted">
            Every rewritten line is compared with your original resume. Only keep what is true.
          </p>
        </div>
        <div className={`rl-score-pill ${trustClass}`}>
          <strong>{guard.trust_score}</strong>
          <span>/100 trust</span>
        </div>
      </div>

      <div className="rl-chip-row">
        <span className="rl-chip rl-chip-ok">✓ {guard.grounded} supported</span>
        <span className="rl-chip rl-chip-warn">! {guard.jd_added} from job description</span>
        <span className="rl-chip rl-chip-miss">✗ {guard.unsupported} not in your resume</span>
      </div>

      {visible.length === 0 ? (
        <div className="audit-empty-success">
          ✓ Every checked line is backed by your original resume.
        </div>
      ) : (
        <ul className="rl-line-list">
          {visible.map((line, i) => (
            <li key={i} className={`rl-line rl-line-${line.status}`}>
              <span className="rl-line-status">{STATUS_LABEL[line.status]}</span>
              <p className="rl-line-text">{line.text}</p>
              {line.new_numbers.length > 0 && (
                <p className="rl-line-why">
                  New numbers: <strong>{line.new_numbers.join(', ')}</strong>. Did you really measure this?
                </p>
              )}
              {line.new_terms.length > 0 && (
                <p className="rl-line-why">
                  New names or tools: <strong>{line.new_terms.join(', ')}</strong>
                </p>
              )}
              {line.jd_terms.length > 0 && (
                <p className="rl-line-why">
                  Keywords added from the job description: <strong>{line.jd_terms.join(', ')}</strong>.
                  Keep them only if you have used them.
                </p>
              )}
              {line.closest_original && line.status !== 'grounded' && (
                <p className="rl-line-orig">Closest original line: “{line.closest_original}”</p>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="rl-actions">
        {lines.length > visible.length || showAll ? (
          <button type="button" className="btn-reset-link" onClick={() => setShowAll(!showAll)}>
            {showAll ? 'Show only flagged lines' : 'Show all lines'}
          </button>
        ) : null}
        <button type="button" className="btn-reset-link" onClick={() => setEditing(!editing)}>
          {editing ? 'Hide editor' : 'Edit the rewrite and re-check'}
        </button>
      </div>

      {editing && (
        <div className="rl-editor">
          <textarea
            className="job-desc-textarea"
            rows={12}
            value={improved}
            onChange={(e) => setImproved(e.target.value)}
            aria-label="Edit rewritten resume"
          />
          <button type="button" className="btn-primary btn-sm" onClick={recheck} disabled={checking}>
            {checking ? 'Checking...' : 'Re-check my edits'}
          </button>
          {error && <p className="rl-line-why">{error}</p>}
          <p className="rl-muted">Your edits are used when you download the PDF.</p>
        </div>
      )}
    </div>
  );
}