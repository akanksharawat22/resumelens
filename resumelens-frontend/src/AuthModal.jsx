import { useState } from 'react';
import { login, signup, setToken } from './api';

export default function AuthModal({ open, mode, setMode, onClose, onSuccess, logo }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  function close() {
    setError('');
    setPassword('');
    onClose();
  }

  function switchMode(next) {
    setError('');
    setMode(next);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data =
        mode === 'login' ? await login(email, password) : await signup(email, password, name);
      setToken(data.token);
      setPassword('');
      onSuccess(data.user);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={close}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close-btn" aria-label="Close modal" onClick={close}>
          ✕
        </button>

        <div className="modal-header">
          {logo}
          <h3>{mode === 'login' ? 'Welcome back' : 'Create an account'}</h3>
          <p>
            {mode === 'login'
              ? 'Sign in to see your saved resume analyses.'
              : 'Save every analysis and track how your score improves.'}
          </p>
        </div>

        <div className="modal-notice-banner">
          <strong>No account needed to analyze.</strong> Log in only if you want your analyses saved
          to your history.
        </div>

        {error && (
          <div className="error-banner" role="alert">
            <p>{error}</p>
          </div>
        )}

        <form className="modal-form" onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div className="form-group">
              <label className="form-label" htmlFor="authName">Name (optional)</label>
              <input
                id="authName"
                type="text"
                className="modal-input"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>
          )}
          <div className="form-group">
            <label className="form-label" htmlFor="authEmail">Email Address</label>
            <input
              id="authEmail"
              type="email"
              className="modal-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="authPassword">
              <span>Password</span>
              {mode === 'signup' && <span className="form-label-hint">min. 8 characters</span>}
            </label>
            <input
              id="authPassword"
              type="password"
              className="modal-input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={mode === 'signup' ? 8 : undefined}
              required
            />
          </div>

          <button type="submit" className="btn-primary btn-full" disabled={busy}>
            {busy ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="modal-footer-switch">
          {mode === 'login' ? (
            <span>
              Need an account? <button type="button" onClick={() => switchMode('signup')}>Sign up free</button>
            </span>
          ) : (
            <span>
              Already have an account? <button type="button" onClick={() => switchMode('login')}>Log in</button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}