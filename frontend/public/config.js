// API base URL — reads from localStorage so it can be changed in-app
// Falls back to the hardcoded Tailscale address if not set
const _stored = localStorage.getItem('apiBaseUrl') || '';
window.__API_BASE = _stored.includes('TAILSCALE_HOST') ? '' : _stored;
