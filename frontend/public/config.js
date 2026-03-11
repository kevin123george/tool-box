// API base URL — reads from localStorage so it can be changed in-app
// Falls back to the hardcoded Tailscale address if not set
window.__API_BASE = localStorage.getItem('apiBaseUrl') || 'http://TAILSCALE_HOST:9099';
