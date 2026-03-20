let _dkTimer = null;
let _allContainers = [];
let _logsContainer = null;

(window.__pageInits = window.__pageInits || {}).docker = function () {
    loadDocker();
    updateHostDisplay();
    _dkTimer = setInterval(loadDocker, 30000);
};

window.__pageCleanup = function () {
    clearInterval(_dkTimer);
    _dkTimer = null;
};

function updateHostDisplay() {
    const host = getDkHost();
    const el = document.getElementById('dkHostDisplay');
    if (el) el.textContent = host;
}

function getDkHost() {
    const base = window.__API_BASE || '';
    if (base) {
        try { return new URL(base).hostname; } catch (_) {}
    }
    return window.location.hostname;
}

function parsePorts(portsStr) {
    if (!portsStr) return [];
    const results = [];
    for (const part of portsStr.split(',').map(s => s.trim())) {
        const m = part.match(/(?:[\d.]+|::):(\d+)->/);
        if (m) results.push(m[1]);
    }
    return [...new Set(results)];
}

function statusDot(status) {
    const s = status.toLowerCase();
    if (s.startsWith('up') && !s.includes('pause')) return 'bg-success';
    if (s.includes('pause')) return 'bg-warning';
    return 'bg-error';
}

function isRunning(status) {
    const s = (status || '').toLowerCase();
    return s.startsWith('up') && !s.includes('pause');
}

function stripAnsi(str) {
    return str.replace(/\x1b\[[0-9;]*m/g, '');
}

async function loadDocker() {
    const btn = document.getElementById('dkRefreshBtn');
    if (btn) { btn.disabled = true; btn.textContent = '…'; }
    try {
        const res = await authFetch(`${API}/api/system/docker`);
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        if (data[0]?.error) { showError(data[0].error); return; }

        _allContainers = data;

        const showAll = document.getElementById('dkShowAll')?.checked;
        renderTable(showAll ? data : data.filter(c => isRunning(c.status)));

        const running = data.filter(c => isRunning(c.status)).length;
        const stopped = data.length - running;
        const rEl = document.getElementById('dkStatRunning');
        const sEl = document.getElementById('dkStatStopped');
        if (rEl) rEl.textContent = `● ${running} running`;
        if (sEl) sEl.textContent = `● ${stopped} stopped`;

        data.filter(c => isRunning(c.status)).forEach(c => loadContainerStats(c.name));

    } catch (e) {
        showError(e.message);
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = '↺ Refresh'; }
    }
}

function renderTable(containers) {
    const host = getDkHost();
    const search = document.getElementById('dkSearch')?.value.toLowerCase() || '';
    const filtered = search
        ? containers.filter(c =>
            c.name.toLowerCase().includes(search) ||
            c.image.toLowerCase().includes(search))
        : containers;

    if (filtered.length === 0) {
        document.getElementById('dkTableBody').innerHTML =
            `<tr><td colspan="8" class="text-center py-8 opacity-50">No containers</td></tr>`;
        return;
    }

    const imgShort = img => img.split('/').pop().split(':')[0];
    const imgTag   = img => img.includes(':') ? img.split(':').pop() : 'latest';

    document.getElementById('dkTableBody').innerHTML = filtered.map(c => {
        const ports = parsePorts(c.ports);
        const up = isRunning(c.status);
        const dot = statusDot(c.status);

        const portBtns = ports.map(p => {
            const url = `http://${host}:${p}`;
            return `<a href="${url}" target="_blank" rel="noopener"
                       class="badge badge-outline badge-sm font-mono hover:badge-primary"
                       title="${url}">:${p}</a>`;
        }).join(' ');

        return `<tr class="hover" id="dkRow-${c.name}">
            <td><div class="w-2.5 h-2.5 rounded-full ${dot}"></div></td>
            <td>
                <span class="font-medium">${c.name}</span>
                <div class="text-xs opacity-40 font-mono">${c.id}</div>
            </td>
            <td>
                <span class="font-mono text-xs">${imgShort(c.image)}</span>
                <span class="badge badge-ghost badge-xs ml-1">${imgTag(c.image)}</span>
            </td>
            <td class="text-xs opacity-70">${c.status}</td>
            <td class="text-xs">${portBtns || '<span class="opacity-30">—</span>'}</td>
            <td id="dkCpu-${c.name}" class="text-xs font-mono opacity-50">…</td>
            <td id="dkMem-${c.name}" class="text-xs font-mono opacity-50">…</td>
            <td class="text-right">
                <div class="flex gap-1 justify-end">
                    ${up ? `
                    <button class="btn btn-xs btn-square btn-ghost text-warning" title="Stop"
                        onclick="dockerAction('stop','${c.name}')">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>
                    </button>
                    <button class="btn btn-xs btn-square btn-ghost text-info" title="Restart"
                        onclick="dockerAction('restart','${c.name}')">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                    </button>
                    ` : `
                    <button class="btn btn-xs btn-square btn-ghost text-success" title="Start"
                        onclick="dockerAction('start','${c.name}')">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    </button>
                    `}
                    <button class="btn btn-xs btn-square btn-ghost" title="Logs"
                        onclick="openLogs('${c.name}')">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h7"/></svg>
                    </button>
                    <button class="btn btn-xs btn-square btn-ghost" title="Inspect"
                        onclick="openInspect('${c.name}')">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"/></svg>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

function filterContainers() {
    const showAll = document.getElementById('dkShowAll')?.checked;
    renderTable(showAll ? _allContainers : _allContainers.filter(c => isRunning(c.status)));
}

async function loadContainerStats(name) {
    try {
        const res = await authFetch(`${API}/api/system/docker/${encodeURIComponent(name)}/stats`);
        if (!res.ok) return;
        const s = await res.json();
        if (s.error) return;
        const cpuEl = document.getElementById(`dkCpu-${name}`);
        const memEl = document.getElementById(`dkMem-${name}`);
        if (cpuEl) { cpuEl.textContent = s.cpu || '—'; cpuEl.classList.remove('opacity-50'); }
        if (memEl) { memEl.textContent = s.memPerc || '—'; memEl.classList.remove('opacity-50'); }
    } catch (_) {}
}

async function dockerAction(action, name) {
    const row = document.getElementById(`dkRow-${name}`);
    if (row) row.classList.add('opacity-50');
    try {
        const res = await authFetch(
            `${API}/api/system/docker/${encodeURIComponent(name)}/${action}`,
            { method: 'POST' }
        );
        if (!res.ok) { showToast(`Failed to ${action} ${name}`, 'error'); return; }
        showToast(`${name} ${action}ed`, 'success');
        setTimeout(loadDocker, 1500);
    } catch (e) {
        showToast(e.message, 'error');
    } finally {
        if (row) row.classList.remove('opacity-50');
    }
}

// ── Logs ─────────────────────────────────────────────────────────────────────

async function openLogs(name) {
    _logsContainer = name;
    document.getElementById('dkLogsTitle').textContent = `Logs — ${name}`;
    document.getElementById('dkLogsContent').textContent = 'Loading…';
    document.getElementById('dkLogsModal').showModal();
    await refreshLogs();
}

async function refreshLogs() {
    if (!_logsContainer) return;
    const tail = document.getElementById('dkLogsTail')?.value || 200;
    const pre = document.getElementById('dkLogsContent');
    try {
        const res = await authFetch(
            `${API}/api/system/docker/${encodeURIComponent(_logsContainer)}/logs?tail=${tail}`
        );
        const data = await res.json();
        pre.textContent = stripAnsi(data.logs || data.error || '(empty)');
        pre.scrollTop = pre.scrollHeight;
    } catch (e) {
        pre.textContent = 'Error: ' + e.message;
    }
}

function copyLogs() {
    const text = document.getElementById('dkLogsContent')?.textContent || '';
    navigator.clipboard.writeText(text);
    showToast('Logs copied', 'success');
}

// ── Inspect ───────────────────────────────────────────────────────────────────

async function openInspect(name) {
    document.getElementById('dkInspectTitle').textContent = `Inspect — ${name}`;
    document.getElementById('dkInspectContent').innerHTML =
        '<div class="loading loading-spinner"></div>';
    document.getElementById('dkInspectModal').showModal();
    try {
        const res = await authFetch(
            `${API}/api/system/docker/${encodeURIComponent(name)}/inspect`
        );
        const data = await res.json();
        if (data.error) {
            document.getElementById('dkInspectContent').textContent = data.error;
            return;
        }

        let env = [];
        try { env = JSON.parse(data.env || '[]'); } catch (_) {}
        let mounts = [];
        try { mounts = JSON.parse(data.mounts || '[]'); } catch (_) {}

        document.getElementById('dkInspectContent').innerHTML = `
            <div class="grid grid-cols-2 gap-2">
                <div class="bg-base-200 p-2 rounded"><span class="opacity-50 text-xs">Image</span><div class="font-mono text-xs mt-1">${data.image}</div></div>
                <div class="bg-base-200 p-2 rounded"><span class="opacity-50 text-xs">State</span><div class="font-mono text-xs mt-1">${data.state}</div></div>
                <div class="bg-base-200 p-2 rounded"><span class="opacity-50 text-xs">Restart Policy</span><div class="font-mono text-xs mt-1">${data.restartPolicy} (${data.restartCount}x)</div></div>
                <div class="bg-base-200 p-2 rounded"><span class="opacity-50 text-xs">Working Dir</span><div class="font-mono text-xs mt-1">${data.workdir || '/'}</div></div>
                <div class="bg-base-200 p-2 rounded col-span-2"><span class="opacity-50 text-xs">Created</span><div class="font-mono text-xs mt-1">${data.created}</div></div>
            </div>
            ${env.length ? `
            <div>
                <div class="font-bold text-xs opacity-50 mb-1 mt-2">ENVIRONMENT (${env.length})</div>
                <div class="bg-base-200 rounded p-2 space-y-0.5 max-h-40 overflow-auto">
                    ${env.map(e => `<div class="font-mono text-xs">${e}</div>`).join('')}
                </div>
            </div>` : ''}
            ${mounts.length ? `
            <div>
                <div class="font-bold text-xs opacity-50 mb-1 mt-2">VOLUMES (${mounts.length})</div>
                <div class="bg-base-200 rounded p-2 space-y-1 max-h-40 overflow-auto">
                    ${mounts.map(m => `<div class="font-mono text-xs">${m.Source || ''} → ${m.Destination || ''} <span class="badge badge-xs">${m.Mode || 'rw'}</span></div>`).join('')}
                </div>
            </div>` : ''}
        `;
    } catch (e) {
        document.getElementById('dkInspectContent').textContent = 'Error: ' + e.message;
    }
}

function showError(msg) {
    document.getElementById('dkTableBody').innerHTML =
        `<tr><td colspan="8"><div class="alert alert-error m-4">${msg}</div></td></tr>`;
}
