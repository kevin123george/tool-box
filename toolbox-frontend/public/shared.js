const API = "";

/* ===========================================================
   TOAST NOTIFICATION SYSTEM
=============================================================*/

function showToast(message, type = 'info', title = null, duration = 4000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };

    const titles = {
        success: 'Success',
        error: 'Error',
        warning: 'Warning',
        info: 'Info'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <div class="toast-content">
            <div class="toast-title">${title || titles[type] || titles.info}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="closeToast(this.parentElement)" aria-label="Close notification">&times;</button>
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
        button.classList.add('loading');
        button.disabled = true;
        button.dataset.originalText = button.textContent;
        button.textContent = '';
    } else {
        button.classList.remove('loading');
        button.disabled = false;
        if (button.dataset.originalText) {
            button.textContent = button.dataset.originalText;
        }
    }
}

/* ===========================================================
   THEME
=============================================================*/

function applyMode() {
    const mode = localStorage.getItem("retroMode") || "dark";
    document.body.classList.toggle("light", mode === "light");
    const toggle = document.getElementById("modeToggle");
    if (toggle) toggle.textContent = mode === "light" ? "DARK MODE" : "LIGHT MODE";
}

function toggleMode() {
    const next = document.body.classList.contains("light") ? "dark" : "light";
    localStorage.setItem("retroMode", next);
    applyMode();
}

applyMode();

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

/* ===========================================================
   MODAL UTILS
=============================================================*/

function openModal(id) { document.getElementById(id).style.display = "flex"; }
function closeModal(id) { document.getElementById(id).style.display = "none"; }

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
        <div class="empty-state">
            <div class="empty-state-icon">${icon}</div>
            <div class="empty-state-title">${title}</div>
            <div class="empty-state-message">${message}</div>
            ${buttonText ? `<button class="btn" onclick="${buttonAction}">${buttonText}</button>` : ''}
        </div>
    `;
}
