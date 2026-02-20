/* ===========================================================
   ADMIN — User Management
=============================================================*/

requireAuth();

// Guard: non-admins get bounced to home
if ((localStorage.getItem('userRole') || '').toUpperCase() !== 'ADMIN') {
    window.location.href = '/';
}

const currentUserId = localStorage.getItem('userId');
let pendingDeleteId = null;

/* -------------------------------------------------------
   Load & render users
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
        renderUsers(users);
    } catch (e) {
        el.innerHTML = `<div class="alert alert-error text-sm">${e.message}</div>`;
    }
}

function renderUsers(users) {
    const el = document.getElementById('usersContent');

    if (users.length === 0) {
        el.innerHTML = `<div class="p-10 opacity-40 text-sm text-center">No users found.</div>`;
        return;
    }

    const rows = users.map(u => {
        const isSelf = u.id === currentUserId;
        const isAdmin = u.role === 'ADMIN';
        const initials = (u.name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
        const joined = u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

        const roleBadge = isAdmin
            ? `<span class="badge badge-warning badge-sm font-semibold">ADMIN</span>`
            : `<span class="badge badge-ghost badge-sm">USER</span>`;

        const selfBadge = isSelf ? `<span class="badge badge-primary badge-sm ml-1">you</span>` : '';

        const toggleBtn = isSelf ? '' : `
            <button class="btn btn-ghost btn-xs"
                    onclick="toggleRole('${u.id}', '${u.role}')"
                    title="${isAdmin ? 'Demote to USER' : 'Promote to ADMIN'}">
                ${isAdmin ? 'Demote' : 'Promote'}
            </button>`;

        const deleteBtn = isSelf ? '' : `
            <button class="btn btn-ghost btn-xs text-error"
                    onclick="openDeleteModal('${u.id}', '${escapeHtml(u.name)}', '${escapeHtml(u.email)}')">
                Delete
            </button>`;

        return `
        <tr>
            <td>
                <div class="flex items-center gap-3">
                    <div class="avatar placeholder">
                        <div class="bg-primary/15 text-primary rounded-full w-9 h-9 text-xs font-bold">
                            <span>${initials}</span>
                        </div>
                    </div>
                    <div>
                        <div class="font-medium text-sm">${escapeHtml(u.name)} ${selfBadge}</div>
                        <div class="text-xs opacity-50">${escapeHtml(u.email)}</div>
                    </div>
                </div>
            </td>
            <td>${roleBadge}</td>
            <td class="text-xs opacity-50">${joined}</td>
            <td class="text-right">
                <div class="flex gap-1 justify-end">
                    ${toggleBtn}
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
                                <th>Joined</th>
                                <th class="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows}
                        </tbody>
                    </table>
                </div>
                <div class="px-4 pb-3 pt-1 text-xs opacity-40">${users.length} user${users.length !== 1 ? 's' : ''} total</div>
            </div>
        </div>`;
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
function escapeHtml(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Init
loadUsers();
