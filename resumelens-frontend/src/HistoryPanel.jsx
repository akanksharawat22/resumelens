import { useEffect, useState } from 'react';
import { deleteAnalysis, listAnalyses } from './api';

function formatDate(value) {
  // SQLite stores "YYYY-MM-DD HH:MM:SS" in UTC.
  const date = new Date(`${String(value).replace(' ', 'T')}Z`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function HistoryPanel({ onClose, onOpen }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    listAnalyses()
      .then((data) => {
        if (!cancelled) setItems(data.analyses);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || 'Could not load your history.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function remove(id) {
    try {
      await deleteAnalysis(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (e) {
      setError(e.message || 'Could not delete that analysis.');
    }
  }

  const scores = (items || []).map((i) => i.score).filter((s) => typeof s === 'number');
  const best = scores.length ? Math.max(...scores) : null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modal-legal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close-btn" aria-label="Close" onClick={onClose}>
          ✕
        </button>

        <div className="legal-content">
          <h3>My analyses</h3>
          <p>
            {items && items.length > 0
              ? `${items.length} saved · best score ${best ?? '-'}`
              : 'Your saved resume analyses appear here.'}
          </p>
        </div>

        {error && (
          <div className="error-banner" role="alert">
            <p>{error}</p>
          </div>
        )}

        {items === null && !error && <p className="rl-muted">Loading...</p>}

        {items && items.length === 0 && (
          <p className="rl-muted">Nothing saved yet. Run an analysis while logged in and it shows up here.</p>
        )}

        {items && items.length > 0 && (
          <ul className="rl-history-list">
            {items.map((item) => (
              <li key={item.id} className="rl-history-item">
                <button type="button" className="rl-history-open" onClick={() => onOpen(item.id)}>
                  <span className="rl-history-score">{item.score ?? '-'}</span>
                  <span className="rl-history-meta">
                    <strong>{item.filename || 'Resume'}</strong>
                    <span>
                      {formatDate(item.created_at)}
                      {item.improved ? ' · rewritten' : ''}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  className="btn-reset-link"
                  onClick={() => remove(item.id)}
                  aria-label={`Delete ${item.filename || 'analysis'}`}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}