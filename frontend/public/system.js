/* ===========================================================
   SYSTEM STATS
=============================================================*/

let statsAutoRefresh = true;
let statsRefreshInterval = null;

function initSystemStatsTab() {
    loadSystemStats();

    if (statsAutoRefresh) {
        statsRefreshInterval = setInterval(loadSystemStats, 900);
    }
}

async function loadSystemStats() {
    try {
        const response = await authFetch('/api/system/stats');
        const stats = await response.json();
        renderSystemStats(stats);
    } catch (error) {
        console.error('Failed to load system stats:', error);
        document.getElementById('systemStatsContent').innerHTML =
            '<div style="padding:20px;text-align:center;color:#f33;">Failed to load system stats</div>';
    }
}

function renderSystemStats(stats) {
    const content = document.getElementById('systemStatsContent');

    const safe = (val, decimals = 1) => {
        if (val === null || val === undefined || isNaN(val) || val < 0) return '0.' + '0'.repeat(decimals);
        return val.toFixed(decimals);
    };

    const cpuLoad = (stats.systemCpuLoad >= 0 && !isNaN(stats.systemCpuLoad)) ? stats.systemCpuLoad : 0;
    const memUsage = (stats.systemMemoryUsagePercent >= 0 && !isNaN(stats.systemMemoryUsagePercent)) ? stats.systemMemoryUsagePercent : 0;
    const diskUsage = (stats.diskUsagePercent >= 0 && !isNaN(stats.diskUsagePercent)) ? stats.diskUsagePercent : 0;

    const cpuColor = cpuLoad > 80 ? '#f33' : '#0f0';
    const memColor = memUsage > 90 ? '#f33' : '#0f0';
    const diskColor = diskUsage > 90 ? '#f33' : '#0f0';

    content.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <h2 style="margin:0;">System Monitor</h2>
            <div style="display:flex; gap:10px; align-items:center;">
                <label style="font-size:12px; cursor:pointer;">
                    <input type="checkbox" id="statsAutoRefresh" ${statsAutoRefresh ? 'checked' : ''}
                           onchange="toggleStatsAutoRefresh(this.checked)">
                    Auto-refresh (3s)
                </label>
                <button class="btn" onclick="loadSystemStats()">Refresh</button>
            </div>
        </div>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:12px; margin-bottom:20px;">

            <!-- CPU Card -->
            <div class="card" style="display:block;">
                <div style="font-weight:bold; margin-bottom:10px; text-transform:uppercase; font-size:12px;">CPU</div>
                <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                    <span style="opacity:0.7; font-size:12px;">Processors:</span>
                    <strong>${stats.availableProcessors} cores</strong>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                    <span style="opacity:0.7; font-size:12px;">System Load:</span>
                    <strong style="color:${cpuColor}">${safe(cpuLoad, 1)}%</strong>
                </div>
                <div style="height:8px; background:rgba(255,255,255,0.1); margin:8px 0; position:relative; overflow:hidden;">
                    <div style="height:100%; width:${cpuLoad}%; background:${cpuColor}; transition:width 0.3s;"></div>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                    <span style="opacity:0.7; font-size:12px;">Load Average:</span>
                    <strong style="font-size:11px;">${safe(stats.loadAverage[0], 2)} / ${safe(stats.loadAverage[1], 2)} / ${safe(stats.loadAverage[2], 2)}</strong>
                </div>
                <div style="opacity:0.5; font-size:10px; text-align:right;">1min / 5min / 15min</div>
            </div>

            <!-- Memory Card -->
            <div class="card" style="display:block;">
                <div style="font-weight:bold; margin-bottom:10px; text-transform:uppercase; font-size:12px;">Memory</div>
                <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                    <span style="opacity:0.7; font-size:12px;">Total:</span>
                    <strong>${safe(stats.systemTotalMemoryMB / 1024, 1)} GB</strong>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                    <span style="opacity:0.7; font-size:12px;">Used:</span>
                    <strong style="color:${memColor}">${safe(stats.systemUsedMemoryMB / 1024, 1)} GB</strong>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                    <span style="opacity:0.7; font-size:12px;">Free:</span>
                    <strong>${safe(stats.systemFreeMemoryMB / 1024, 1)} GB</strong>
                </div>
                <div style="height:8px; background:rgba(255,255,255,0.1); margin:8px 0; position:relative; overflow:hidden;">
                    <div style="height:100%; width:${memUsage}%; background:${memColor}; transition:width 0.3s;"></div>
                </div>
                <div style="display:flex; justify-content:space-between;">
                    <span style="opacity:0.7; font-size:12px;">Usage:</span>
                    <strong style="color:${memColor}">${safe(memUsage, 1)}%</strong>
                </div>
            </div>

            <!-- Disk Card -->
            <div class="card" style="display:block;">
                <div style="font-weight:bold; margin-bottom:10px; text-transform:uppercase; font-size:12px;">Disk</div>
                <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                    <span style="opacity:0.7; font-size:12px;">Total:</span>
                    <strong>${stats.diskTotalSpaceGB} GB</strong>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                    <span style="opacity:0.7; font-size:12px;">Used:</span>
                    <strong style="color:${diskColor}">${stats.diskUsedSpaceGB} GB</strong>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                    <span style="opacity:0.7; font-size:12px;">Free:</span>
                    <strong>${stats.diskFreeSpaceGB} GB</strong>
                </div>
                <div style="height:8px; background:rgba(255,255,255,0.1); margin:8px 0; position:relative; overflow:hidden;">
                    <div style="height:100%; width:${diskUsage}%; background:${diskColor}; transition:width 0.3s;"></div>
                </div>
                <div style="display:flex; justify-content:space-between;">
                    <span style="opacity:0.7; font-size:12px;">Usage:</span>
                    <strong style="color:${diskColor}">${safe(diskUsage, 1)}%</strong>
                </div>
            </div>

            ${stats.swapTotalMB > 0 ? `
            <!-- Swap Card -->
            <div class="card" style="display:block;">
                <div style="font-weight:bold; margin-bottom:10px; text-transform:uppercase; font-size:12px;">Swap</div>
                <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                    <span style="opacity:0.7; font-size:12px;">Total:</span>
                    <strong>${safe(stats.swapTotalMB / 1024, 1)} GB</strong>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                    <span style="opacity:0.7; font-size:12px;">Used:</span>
                    <strong>${safe(stats.swapUsedMB / 1024, 1)} GB</strong>
                </div>
                <div style="height:8px; background:rgba(255,255,255,0.1); margin:8px 0; position:relative; overflow:hidden;">
                    <div style="height:100%; width:${stats.swapUsagePercent}%; background:#0f0; transition:width 0.3s;"></div>
                </div>
                <div style="display:flex; justify-content:space-between;">
                    <span style="opacity:0.7; font-size:12px;">Usage:</span>
                    <strong>${safe(stats.swapUsagePercent, 1)}%</strong>
                </div>
            </div>
            ` : ''}

            <!-- Network Card -->
            <div class="card" style="display:block;">
                <div style="font-weight:bold; margin-bottom:10px; text-transform:uppercase; font-size:12px;">Network</div>
                <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                    <span style="opacity:0.7; font-size:12px;">Hostname:</span>
                    <strong style="font-size:11px;">${stats.hostname}</strong>
                </div>
                ${stats.ipAddresses.map(ip => `
                    <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                        <span style="opacity:0.7; font-size:12px;">IP:</span>
                        <strong style="font-size:11px;">${ip}</strong>
                    </div>
                `).join('')}
                <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                    <span style="opacity:0.7; font-size:12px;">RX:</span>
                    <strong style="font-size:11px;">${formatBytes(stats.networkRxBytes)}</strong>
                </div>
                <div style="display:flex; justify-content:space-between;">
                    <span style="opacity:0.7; font-size:12px;">TX:</span>
                    <strong style="font-size:11px;">${formatBytes(stats.networkTxBytes)}</strong>
                </div>
            </div>

            <!-- System Info Card -->
            <div class="card" style="display:block;">
                <div style="font-weight:bold; margin-bottom:10px; text-transform:uppercase; font-size:12px;">System Info</div>
                <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                    <span style="opacity:0.7; font-size:12px;">OS:</span>
                    <strong style="font-size:11px;">${stats.osName}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                    <span style="opacity:0.7; font-size:12px;">Version:</span>
                    <strong style="font-size:11px;">${stats.osVersion}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                    <span style="opacity:0.7; font-size:12px;">Arch:</span>
                    <strong style="font-size:11px;">${stats.osArch}</strong>
                </div>
                <div style="display:flex; justify-content:space-between;">
                    <span style="opacity:0.7; font-size:12px;">Uptime:</span>
                    <strong style="font-size:11px;">${formatUptime(stats.systemUptimeSeconds)}</strong>
                </div>
            </div>

            <!-- JVM Card -->
            <div class="card" style="display:block; opacity:0.8;">
                <div style="font-weight:bold; margin-bottom:10px; text-transform:uppercase; font-size:12px;">JVM (This App)</div>
                <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                    <span style="opacity:0.7; font-size:12px;">Heap Used:</span>
                    <strong>${stats.jvmHeapUsed} MB</strong>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                    <span style="opacity:0.7; font-size:12px;">Heap Max:</span>
                    <strong>${stats.jvmHeapMax} MB</strong>
                </div>
                <div style="height:8px; background:rgba(255,255,255,0.1); margin:8px 0; position:relative; overflow:hidden;">
                    <div style="height:100%; width:${stats.jvmHeapUsagePercent}%; background:#0f0; transition:width 0.3s;"></div>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                    <span style="opacity:0.7; font-size:12px;">Usage:</span>
                    <strong>${safe(stats.jvmHeapUsagePercent, 1)}%</strong>
                </div>
                <div style="display:flex; justify-content:space-between;">
                    <span style="opacity:0.7; font-size:12px;">Threads:</span>
                    <strong>${stats.threadCount} / ${stats.peakThreadCount}</strong>
                </div>
            </div>
        </div>
    `;
}

function toggleStatsAutoRefresh(enabled) {
    statsAutoRefresh = enabled;

    if (statsRefreshInterval) {
        clearInterval(statsRefreshInterval);
        statsRefreshInterval = null;
    }

    if (enabled) {
        statsRefreshInterval = setInterval(loadSystemStats, 3000);
    }
}

function formatBytes(bytes) {
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) {
        return `${gb.toFixed(2)} GB`;
    }
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(0)} MB`;
}

function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
}

function cleanupSystemStats() {
    if (statsRefreshInterval) {
        clearInterval(statsRefreshInterval);
        statsRefreshInterval = null;
    }
}

/* ===========================================================
   EMAIL NOTIFICATIONS
=============================================================*/
// Notifications are now handled server-side via SendGrid email.
// Configure SENDGRID_API_KEY and NOTIFICATION_TO_EMAIL in .env

/* ===========================================================
   INITIALIZE
=============================================================*/

(window.__pageInits = window.__pageInits || {}).system = function () {
    requireAuth();
    initSystemStatsTab();
    // Register cleanup for SPA navigation away from this page
    window.__pageCleanup = cleanupSystemStats;
};

window.addEventListener('beforeunload', cleanupSystemStats);
