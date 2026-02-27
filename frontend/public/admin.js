/* ===========================================================
   ADMIN — User Management
=============================================================*/

requireAuth();

if ((localStorage.getItem('userRole') || '').toUpperCase() !== 'ADMIN') {
    window.location.href = '/';
}

const currentUserId = localStorage.getItem('userId');
const ONLINE_MS = 5 * 60 * 1000; // 5 minutes = "online now"
let pendingDeleteId = null;

/* -------------------------------------------------------
   Load & render
------------------------------------------------------- */
async function loadUsers() {
    const el = document.getElementById('usersContent');
    el.innerHTML = `
        <div class="flex items-center gap-3 p-10 opacity-40">
            <span class="loading loading-spinner loading-sm"></span>
            <span class="text-sm">Loading users...</span>
        </div>`;

    try {
        const res = await authFetch(`${API}/api/system/users`);
        if (!res.ok) throw new Error('Failed to load users');
        const users = await res.json();
        renderStats(users);
        renderUsers(users);
    } catch (e) {
        el.innerHTML = `<div class="alert alert-error text-sm">${e.message}</div>`;
    }
}

/* -------------------------------------------------------
   Stats bar
------------------------------------------------------- */
function renderStats(users) {
    const total   = users.length;
    const admins  = users.filter(u => u.role === 'ADMIN').length;
    const online  = users.filter(u => isOnline(u)).length;
    const recent  = users.filter(u => u.lastLoginAt && Date.now() - new Date(u.lastLoginAt) < 24 * 60 * 60 * 1000).length;

    document.getElementById('statsBar').innerHTML = `
        <div class="stats stats-horizontal bg-base-200 shadow-sm w-full">
            <div class="stat py-3 px-5">
                <div class="stat-title text-xs">Total Users</div>
                <div class="stat-value text-2xl">${total}</div>
            </div>
            <div class="stat py-3 px-5">
                <div class="stat-title text-xs">Admins</div>
                <div class="stat-value text-2xl text-warning">${admins}</div>
            </div>
            <div class="stat py-3 px-5">
                <div class="stat-title text-xs">Online Now</div>
                <div class="stat-value text-2xl text-success">${online}</div>
                <div class="stat-desc text-xs">last 5 min</div>
            </div>
            <div class="stat py-3 px-5">
                <div class="stat-title text-xs">Active Today</div>
                <div class="stat-value text-2xl">${recent}</div>
                <div class="stat-desc text-xs">logged in 24h</div>
            </div>
        </div>`;
}

/* -------------------------------------------------------
   User table
------------------------------------------------------- */
function renderUsers(users) {
    const el = document.getElementById('usersContent');

    if (users.length === 0) {
        el.innerHTML = `<div class="p-10 opacity-40 text-sm text-center">No users found.</div>`;
        return;
    }

    // Sort: online first, then by lastSeenAt desc
    users.sort((a, b) => {
        const aOn = isOnline(a), bOn = isOnline(b);
        if (aOn !== bOn) return bOn - aOn;
        const aT = a.lastSeenAt ? new Date(a.lastSeenAt) : 0;
        const bT = b.lastSeenAt ? new Date(b.lastSeenAt) : 0;
        return bT - aT;
    });

    const rows = users.map(u => {
        const isSelf  = u.id === currentUserId;
        const isAdmin = u.role === 'ADMIN';
        const online  = isOnline(u);
        const initials = (u.name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

        const roleBadge = isAdmin
            ? `<span class="badge badge-warning badge-sm font-semibold">ADMIN</span>`
            : `<span class="badge badge-ghost badge-sm">USER</span>`;

        const onlineDot = online
            ? `<span class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-success rounded-full border-2 border-base-200"></span>`
            : '';

        const editBtn = `
            <button class="btn btn-ghost btn-xs"
                    onclick="openEditModal('${u.id}', '${escapeHtml(u.name)}', '${escapeHtml(u.email)}', '${u.role}', ${isSelf})">
                Edit
            </button>`;

        const resetBtn = isSelf ? '' : `
            <button class="btn btn-ghost btn-xs text-warning"
                    onclick="generateResetLink('${u.id}', '${escapeHtml(u.name)}')">
                Reset PW
            </button>`;

        const toggleBtn = isSelf ? '' : `
            <button class="btn btn-ghost btn-xs" onclick="toggleRole('${u.id}', '${u.role}')">
                ${isAdmin ? 'Demote' : 'Promote'}
            </button>`;

        const deleteBtn = isSelf ? '' : `
            <button class="btn btn-ghost btn-xs text-error"
                    onclick="openDeleteModal('${u.id}', '${escapeHtml(u.name)}', '${escapeHtml(u.email)}')">
                Delete
            </button>`;

        const emailNotifBtn = `
            <button class="btn btn-ghost btn-xs ${u.emailNotificationsEnabled ? 'text-success' : 'opacity-30'}"
                    title="${u.emailNotificationsEnabled ? 'Emails on — click to disable' : 'Emails off — click to enable'}"
                    onclick="toggleEmailNotifications('${u.id}', ${u.emailNotificationsEnabled})">
                ${u.emailNotificationsEnabled ? '✉️' : '🔕'}
            </button>`;

        return `
        <tr class="${online ? 'bg-success/5' : ''}">
            <td>
                <div class="flex items-center gap-3">
                    <div class="relative">
                        <div class="avatar placeholder">
                            <div class="bg-primary/15 text-primary rounded-full w-9 h-9 text-xs font-bold">
                                <span>${initials}</span>
                            </div>
                        </div>
                        ${onlineDot}
                    </div>
                    <div>
                        <div class="font-medium text-sm">
                            ${escapeHtml(u.name)}
                            ${isSelf ? `<span class="badge badge-primary badge-sm ml-1">you</span>` : ''}
                        </div>
                        <div class="text-xs opacity-50">${escapeHtml(u.email)}</div>
                    </div>
                </div>
            </td>
            <td>${roleBadge}</td>
            <td>
                ${online
                    ? `<span class="badge badge-success badge-sm gap-1"><span class="w-1.5 h-1.5 bg-success-content rounded-full inline-block animate-pulse"></span>Online</span>`
                    : u.lastSeenAt
                        ? `<span class="text-xs opacity-50">${timeAgo(u.lastSeenAt)}</span>`
                        : `<span class="text-xs opacity-25">Never</span>`
                }
            </td>
            <td>
                ${u.lastLoginAt
                    ? `<div class="text-xs opacity-60">${timeAgo(u.lastLoginAt)}</div>
                       <div class="text-xs opacity-30">${fmtDate(u.lastLoginAt)}</div>`
                    : `<span class="text-xs opacity-25">Never</span>`
                }
            </td>
            <td>
                <div class="text-xs opacity-40">${u.createdAt ? fmtDate(u.createdAt) : '—'}</div>
            </td>
            <td class="text-right">
                <div class="flex gap-1 justify-end flex-wrap">
                    ${editBtn}
                    ${resetBtn}
                    ${toggleBtn}
                    ${emailNotifBtn}
                    ${deleteBtn}
                </div>
            </td>
        </tr>`;
    }).join('');

    el.innerHTML = `
        <div class="card bg-base-200 shadow-sm">
            <div class="card-body p-0">
                <div class="overflow-x-auto">
                    <table class="table table-sm">
                        <thead>
                            <tr class="text-xs opacity-50 uppercase tracking-wider">
                                <th>User</th>
                                <th>Role</th>
                                <th>Last Seen</th>
                                <th>Last Login</th>
                                <th>Joined</th>
                                <th class="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
                <div class="px-4 pb-3 pt-1 text-xs opacity-40">${users.length} user${users.length !== 1 ? 's' : ''} total</div>
            </div>
        </div>`;
}

/* -------------------------------------------------------
   Password reset link
------------------------------------------------------- */
async function generateResetLink(userId, name) {
    try {
        const res = await authFetch(`${API}/api/system/users/${userId}/reset-link`, { method: 'POST' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to generate link');
        document.getElementById('resetLinkUser').textContent = name;
        document.getElementById('resetLinkInput').value = data.resetUrl;
        document.getElementById('resetLinkCopied').classList.add('hidden');
        document.getElementById('resetLinkModal').showModal();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

function copyResetLink() {
    const input = document.getElementById('resetLinkInput');
    navigator.clipboard.writeText(input.value).then(() => {
        document.getElementById('resetLinkCopied').classList.remove('hidden');
    });
}

/* -------------------------------------------------------
   Edit user
------------------------------------------------------- */
function openEditModal(userId, name, email, role, isSelf) {
    document.getElementById('editUserId').value  = userId;
    document.getElementById('editName').value    = name;
    document.getElementById('editEmail').value   = email;
    document.getElementById('editRole').value    = role;
    document.getElementById('editPassword').value = '';
    // Can't change own role
    document.getElementById('editRole').disabled = isSelf;
    document.getElementById('editModal').showModal();
}

async function saveEdit() {
    const userId = document.getElementById('editUserId').value;
    const name   = document.getElementById('editName').value.trim();
    const email  = document.getElementById('editEmail').value.trim();
    const role   = document.getElementById('editRole').value;
    const pass   = document.getElementById('editPassword').value;

    if (!name) { showToast('Name cannot be empty', 'error'); return; }
    if (!email) { showToast('Email cannot be empty', 'error'); return; }

    const body = { name, email, role };
    if (pass) body.newPassword = pass;

    const btn = document.getElementById('editSaveBtn');
    setButtonLoading(btn, true);
    try {
        const res = await authFetch(`${API}/api/system/users/${userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to save');
        document.getElementById('editModal').close();
        showToast('User updated', 'success');
        loadUsers();
    } catch (e) {
        showToast(e.message, 'error');
    } finally {
        setButtonLoading(btn, false);
    }
}

/* -------------------------------------------------------
   Role toggle
------------------------------------------------------- */
async function toggleRole(userId, currentRole) {
    const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
    try {
        const res = await authFetch(`${API}/api/system/users/${userId}/role`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: newRole })
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to update role');
        }
        showToast(`Role updated to ${newRole}`, 'success');
        loadUsers();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

/* -------------------------------------------------------
   Email notifications toggle
------------------------------------------------------- */
async function toggleEmailNotifications(userId, currentlyEnabled) {
    try {
        const res = await authFetch(`${API}/api/system/users/${userId}/email-notifications`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled: !currentlyEnabled })
        });
        if (!res.ok) throw new Error('Failed to update');
        showToast(`Email notifications ${!currentlyEnabled ? 'enabled' : 'disabled'}`, 'success');
        loadUsers();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

/* -------------------------------------------------------
   Delete flow
------------------------------------------------------- */
function openDeleteModal(userId, name, email) {
    pendingDeleteId = userId;
    document.getElementById('deleteModalName').textContent = `${name} (${email})`;
    document.getElementById('deleteModal').showModal();
}

async function confirmDelete() {
    if (!pendingDeleteId) return;
    const btn = document.getElementById('deleteConfirmBtn');
    setButtonLoading(btn, true);
    try {
        const res = await authFetch(`${API}/api/system/users/${pendingDeleteId}`, { method: 'DELETE' });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to delete user');
        }
        document.getElementById('deleteModal').close();
        showToast('User deleted', 'success');
        loadUsers();
    } catch (e) {
        showToast(e.message, 'error');
    } finally {
        setButtonLoading(btn, false);
        pendingDeleteId = null;
    }
}

/* -------------------------------------------------------
   Helpers
------------------------------------------------------- */
function isOnline(u) {
    if (!u.lastSeenAt) return false;
    return Date.now() - new Date(u.lastSeenAt).getTime() < ONLINE_MS;
}

function timeAgo(isoStr) {
    if (!isoStr) return '—';
    const diff = Date.now() - new Date(isoStr).getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60)  return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60)  return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24)  return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
}

function fmtDate(isoStr) {
    if (!isoStr) return '—';
    return new Date(isoStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function escapeHtml(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Page init — called by nav.js on first load and by router.js on SPA navigation
(window.__pageInits = window.__pageInits || {}).admin = function () {
    loadUsers();
};
