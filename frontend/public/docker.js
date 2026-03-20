(window.__pageInits = window.__pageInits || {}).docker = function () {
    loadDockerContainers();
    showHostNotice();
};

// ── Host detection ─────────────────────────────────────────────────────────
function getServiceHost() {
    // Derive host from API base (same Tailscale address, just swap port)
    const base = window.__API_BASE || '';
    if (base) {
        try {
            return new URL(base).hostname;
        } catch (_) {}
    }
    return window.location.hostname;
}

function showHostNotice() {
    const el = document.getElementById('hostDisplay');
    if (el) el.textContent = getServiceHost();
}

function buildServiceUrl(host, port, scheme = 'http') {
    return `${scheme}://${host}:${port}`;
}

// ── Port parsing ────────────────────────────────────────────────────────────
// Docker ports format: "0.0.0.0:3000->3000/tcp, 0.0.0.0:9099->9099/tcp"
// Also: ":::3000->3000/tcp"  or  "3000/tcp" (no host binding)
function parsePorts(portsStr) {
    if (!portsStr) return [];
    const results = [];
    const parts = portsStr.split(',').map(s => s.trim());
    for (const part of parts) {
        // Match  0.0.0.0:PORT->  or  :::PORT->
        const m = part.match(/(?:[\d.]+|::):(\d+)->/);
        if (m) {
            results.push({ hostPort: m[1], raw: part });
        }
    }
    return results;
}

// ── Copy helper ─────────────────────────────────────────────────────────────
async function copyText(text, btn) {
    await navigator.clipboard.writeText(text);
    const orig = btn.textContent;
    btn.textContent = '✓';
    btn.classList.add('btn-success');
    setTimeout(() => { btn.textContent = orig; btn.classList.remove('btn-success'); }, 1500);
}

// ── Status badge ────────────────────────────────────────────────────────────
function statusBadge(status) {
    const up = status.toLowerCase().startsWith('up');
    const paused = status.toLowerCase().includes('pause');
    if (paused) return `<span class="badge badge-warning badge-sm">paused</span>`;
    if (up)     return `<span class="badge badge-success badge-sm">running</span>`;
    return          `<span class="badge badge-error badge-sm">stopped</span>`;
}

// ── Main loader ─────────────────────────────────────────────────────────────
let _refreshTimer = null;

async function loadDockerContainers() {
    const host = getServiceHost();
    const showAll = document.getElementById('showAllContainers')?.checked;

    try {
        const res = await authFetch(`${API}/api/system/docker`);
        if (!res.ok) throw new Error(await res.text());
        let containers = await res.json();

        if (containers[0]?.error) {
            document.getElementById('dockerContainers').innerHTML =
                `<div class="alert alert-error">${containers[0].error}</div>`;
            return;
        }

        // Filter stopped if not showing all
        const running = containers.filter(c => c.status?.toLowerCase().startsWith('up'));
        const stopped = containers.filter(c => !c.status?.toLowerCase().startsWith('up'));
        const visible = showAll ? containers : running;

        // Stats
        document.getElementById('dockerStats').innerHTML = `
            <div class="stat bg-base-200 rounded-box px-4 py-2">
                <div class="stat-title text-xs">Running</div>
                <div class="stat-value text-2xl text-success">${running.length}</div>
            </div>
            <div class="stat bg-base-200 rounded-box px-4 py-2">
                <div class="stat-title text-xs">Stopped</div>
                <div class="stat-value text-2xl text-error">${stopped.length}</div>
            </div>
            <div class="stat bg-base-200 rounded-box px-4 py-2">
                <div class="stat-title text-xs">Total</div>
                <div class="stat-value text-2xl">${containers.length}</div>
            </div>`;

        // Cards
        if (visible.length === 0) {
            document.getElementById('dockerContainers').innerHTML =
                `<div class="alert">No containers found.</div>`;
            return;
        }

        document.getElementById('dockerContainers').innerHTML = visible.map(c => {
            const ports = parsePorts(c.ports);
            const isUp = c.status?.toLowerCase().startsWith('up');

            const portLinks = ports.map(p => {
                const url = buildServiceUrl(host, p.hostPort);
                return `
                <div class="flex items-center gap-2">
                    <a href="${url}" target="_blank" rel="noopener"
                       class="btn btn-xs btn-outline ${isUp ? '' : 'btn-disabled opacity-50'} font-mono">
                        :${p.hostPort}
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                    </a>
                    <button class="btn btn-xs btn-ghost font-mono" onclick="copyText('${url}', this)" title="Copy URL">
                        copy
                    </button>
                </div>`;
            }).join('');

            const noPortsMsg = ports.length === 0
                ? `<span class="text-xs opacity-50">no exposed ports</span>`
                : '';

            // Short image name (strip registry prefix)
            const imgShort = c.image.replace(/^[^/]+\//, '').split(':')[0];
            const imgTag   = c.image.includes(':') ? c.image.split(':').pop() : 'latest';

            return `
            <div class="card bg-base-200 shadow-sm hover:shadow-md transition-shadow">
                <div class="card-body p-4">
                    <div class="flex items-start justify-between gap-3 flex-wrap">

                        <div class="flex items-center gap-3 min-w-0">
                            <!-- Status indicator dot -->
                            <div class="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${isUp ? 'bg-success' : 'bg-error'}"></div>
                            <div class="min-w-0">
                                <div class="flex items-center gap-2 flex-wrap">
                                    <span class="font-bold text-base truncate">${c.name}</span>
                                    ${statusBadge(c.status)}
                                </div>
                                <div class="flex items-center gap-2 mt-0.5">
                                    <span class="text-xs opacity-60 font-mono">${imgShort}</span>
                                    <span class="badge badge-ghost badge-xs font-mono">${imgTag}</span>
                                    <span class="text-xs opacity-40 font-mono">${c.id}</span>
                                </div>
                                <div class="text-xs opacity-50 mt-0.5">${c.status}</div>
                            </div>
                        </div>

                        <!-- Port links -->
                        <div class="flex flex-wrap gap-2 items-center">
                            ${portLinks}
                            ${noPortsMsg}
                            <button class="btn btn-xs btn-ghost opacity-50" onclick="copyText('${c.name}', this)" title="Copy container name">
                                name
                            </button>
                        </div>

                    </div>
                </div>
            </div>`;
        }).join('');

    } catch (e) {
        document.getElementById('dockerContainers').innerHTML =
            `<div class="alert alert-error">Failed to load: ${e.message}</div>`;
    }
}

window.__pageCleanup = function () {
    if (_refreshTimer) { clearInterval(_refreshTimer); _refreshTimer = null; }
};
