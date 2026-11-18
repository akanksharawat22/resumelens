export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const TOKEN_KEY = 'resumelens_token';

// localStorage can throw (private mode, blocked storage), so every access is wrapped.
export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export function authHeaders(extra = {}) {
  const token = getToken();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
}

async function request(path, { method = 'GET', body } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: authHeaders(body ? { 'Content-Type': 'application/json' } : {}),
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || 'Request failed');
    error.status = response.status;
    throw error;
  }
  return data;
}

export const signup = (email, password, name) =>
  request('/auth/signup', { method: 'POST', body: { email, password, name } });

export const login = (email, password) =>
  request('/auth/login', { method: 'POST', body: { email, password } });

export const fetchMe = () => request('/auth/me');

export const listAnalyses = () => request('/analyses');

export const getAnalysis = (id) => request(`/analyses/${id}`);

export const deleteAnalysis = (id) => request(`/analyses/${id}`, { method: 'DELETE' });

export const verifyRewrite = (original_text, improved_text, job_description) =>
  request('/verify', { method: 'POST', body: { original_text, improved_text, job_description } });