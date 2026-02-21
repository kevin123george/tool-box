const API = "";

/* ===========================================================
   TOAST NOTIFICATION SYSTEM (DaisyUI alerts)
=============================================================*/

function showToast(message, type = 'info', title = null, duration = 4000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const alertClass = {
        success: 'alert-success',
        error: 'alert-error',
        warning: 'alert-warning',
        info: 'alert-info'
    };

    const toast = document.createElement('div');
    toast.className = `alert ${alertClass[type] || alertClass.info} shadow-lg`;
    toast.innerHTML = `
        <div>
            <span class="font-bold">${title || ''}</span>
            <span>${message}</span>
        </div>
        <button class="btn btn-ghost btn-xs" onclick="closeToast(this.closest('.alert'))" aria-label="Close notification">&times;</button>
    `;

    container.appendChild(toast);

    if (duration > 0) {
        setTimeout(() => closeToast(toast), duration);
    }

    return toast;
}

function closeToast(toast) {
    if (!toast || toast.classList.contains('hiding')) return;
    toast.classList.add('hiding');
    toast.style.transition = 'opacity 0.3s, transform 0.3s';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
}

/* ===========================================================
   LOADING STATE MANAGEMENT
=============================================================*/

function showLoading(text = 'Loading...') {
    const overlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    if (overlay) {
        overlay.classList.add('active');
        if (loadingText) loadingText.textContent = text;
    }
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
}

function setButtonLoading(button, loading) {
    if (!button) return;
    if (loading) {
        button.disabled = true;
        button.dataset.originalText = button.textContent;
        button.innerHTML = '<span class="loading loading-spinner loading-xs"></span>';
    } else {
        button.disabled = false;
        if (button.dataset.originalText) {
            button.textContent = button.dataset.originalText;
        }
    }
}

/* ===========================================================
   THEME (DaisyUI multi-theme)
=============================================================*/

const DAISY_THEMES = [
    'light','dark','cupcake','bumblebee','emerald','corporate','synthwave','retro',
    'cyberpunk','valentine','halloween','garden','forest','aqua','lofi','pastel',
    'fantasy','wireframe','black','luxury','dracula','cmyk','autumn','business',
    'acid','lemonade','night','coffee','winter','dim','nord','sunset',
    'caramellatte','abyss','silk'
];

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme || 'dark');
}

function setTheme(theme) {
    localStorage.setItem('daisyTheme', theme);
    applyTheme(theme);
}

function renderThemePicker() {
    const container = document.getElementById('themePickerContainer');
    if (!container) return;

    const current = localStorage.getItem('daisyTheme') || 'dark';

    container.innerHTML = `
        <div class="dropdown dropdown-end">
            <div tabindex="0" role="button" class="btn btn-ghost btn-sm gap-1">
                <svg width="20" height="20" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block stroke-current"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"></path></svg>
                <span class="hidden sm:inline text-xs uppercase">${current}</span>
                <svg width="12" height="12" class="hidden sm:inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
            </div>
            <ul tabindex="0" class="dropdown-content z-[200] menu menu-sm bg-base-200 rounded-box shadow-2xl p-2 w-52 max-h-80 overflow-y-auto flex-nowrap">
                ${DAISY_THEMES.map(t => `
                    <li><button class="text-xs ${t === current ? 'active font-bold' : ''}" onclick="setTheme('${t}')">${t}</button></li>
                `).join('')}
            </ul>
        </div>
    `;
}

// Legacy aliases
function applyMode() { applyTheme(localStorage.getItem('daisyTheme') || 'dark'); renderThemePicker(); }
function toggleMode() { /* no-op, replaced by theme picker */ }

// Apply theme immediately
applyTheme(localStorage.getItem('daisyTheme') || 'dark');

/* ===========================================================
   HELPERS
=============================================================*/

function stripHtml(h) { let d = document.createElement("div"); d.innerHTML = h; return d.innerText; }
function truncate(s, n) { return !s ? "" : s.length > n ? s.slice(0, n - 3) + "..." : s; }

function formatLocalDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function isMobile() {
    return window.innerWidth <= 768 || 'ontouchstart' in window;
}

const LIGHT_THEMES = ['light','cupcake','bumblebee','emerald','corporate','garden','lofi','pastel','fantasy','wireframe','cmyk','autumn','acid','lemonade','winter','caramellatte','silk'];

function isDarkTheme() {
    return !LIGHT_THEMES.includes(document.documentElement.getAttribute('data-theme'));
}

function getChartTextColor() {
    return getComputedStyle(document.body).color;
}

function getChartGridColor() {
    return isDarkTheme() ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
}

/* ===========================================================
   MODAL UTILS (dialog API)
=============================================================*/

function openModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.tagName === 'DIALOG') {
        el.showModal();
    } else {
        el.style.display = "flex";
    }
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.tagName === 'DIALOG') {
        el.close();
    } else {
        el.style.display = "none";
    }
}

/* ===========================================================
   PAGINATION HELPERS
=============================================================*/

function updatePaginationControls(prefix, pageData) {
    const { current, total, size, totalElements } = pageData;

    const start = current * size + 1;
    const end = Math.min((current + 1) * size, totalElements);
    document.getElementById(`${prefix}PageInfo`).textContent =
        `Showing ${start}-${end} of ${totalElements}`;

    document.getElementById(`${prefix}PageInput`).value = current + 1;
    document.getElementById(`${prefix}TotalPagesSpan`).textContent = `of ${total}`;

    document.getElementById(`${prefix}FirstBtn`).disabled = current === 0;
    document.getElementById(`${prefix}PrevBtn`).disabled = current === 0;
    document.getElementById(`${prefix}NextBtn`).disabled = current === total - 1;
    document.getElementById(`${prefix}LastBtn`).disabled = current === total - 1;
}

/* ===========================================================
   EMPTY STATES
=============================================================*/

function renderEmptyState(containerId, icon, title, message, buttonText, buttonAction) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div class="flex flex-col items-center p-10 border-2 border-dashed border-base-300 rounded-lg text-center">
            <div class="text-5xl mb-4 opacity-50">${icon}</div>
            <div class="font-bold uppercase mb-2">${title}</div>
            <div class="text-sm opacity-70 mb-4">${message}</div>
            ${buttonText ? `<button class="btn btn-primary btn-sm" onclick="${buttonAction}">${buttonText}</button>` : ''}
        </div>
    `;
}

/* ===========================================================
   AUTH HELPERS
=============================================================*/

function getToken() {
    return localStorage.getItem('authToken');
}

function requireAuth() {
    if (!getToken()) {
        window.location.href = '/login.html';
    }
}

async function authFetch(url, options = {}) {
    const token = getToken();
    if (!token) {
        window.location.href = '/login.html';
        return;
    }
    const headers = {
        ...(options.headers || {}),
        'Authorization': `Bearer ${token}`
    };
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401 || res.status === 403) {
        logout();
        return;
    }
    return res;
}

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
    window.location.href = '/login.html';
}

/* ── Privacy mode ───────────────────────────────────
   Blurs all .stat-value and .tabular-nums elements.
   State persists in localStorage across pages.
──────────────────────────────────────────────────── */
function togglePrivacy() {
    const on = document.body.classList.toggle('privacy-mode');
    localStorage.setItem('privacyMode', on ? '1' : '');
    document.getElementById('privacyEyeOn')?.classList.toggle('hidden', on);
    document.getElementById('privacyEyeOff')?.classList.toggle('hidden', !on);
}

function initPrivacy() {
    if (localStorage.getItem('privacyMode')) {
        document.body.classList.add('privacy-mode');
        document.getElementById('privacyEyeOn')?.classList.add('hidden');
        document.getElementById('privacyEyeOff')?.classList.remove('hidden');
    }
}
