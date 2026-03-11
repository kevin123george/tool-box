const GITHUB_REPO = 'kevin123george/tool-box';

async function loadDownloads() {
    const container = document.getElementById('downloadsContent');

    try {
        const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=5`);
        if (!res.ok) throw new Error('GitHub API error');
        const releases = await res.json();

        if (!releases.length) {
            container.innerHTML = `<div class="card bg-base-200 shadow-sm"><div class="card-body p-5">
                <p class="text-sm opacity-40">No releases yet. Push to main to trigger a build.</p>
            </div></div>`;
            return;
        }

        container.innerHTML = releases.map((rel, i) => {
            const apk = rel.assets.find(a => a.name.endsWith('.apk'));
            const date = new Date(rel.published_at).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric'
            });
            const size = apk ? (apk.size / 1024 / 1024).toFixed(1) + ' MB' : null;

            return `
            <div class="card bg-base-200 shadow-sm ${i === 0 ? 'border border-primary/30' : ''}">
                <div class="card-body p-5">
                    <div class="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                            <div class="flex items-center gap-2 mb-1">
                                <span class="font-semibold">${rel.name || rel.tag_name}</span>
                                ${i === 0 ? '<span class="badge badge-primary badge-sm">Latest</span>' : ''}
                            </div>
                            <div class="text-xs opacity-40">${date}${size ? ` · ${size}` : ''}</div>
                            ${rel.body ? `<p class="text-sm opacity-60 mt-2 whitespace-pre-line line-clamp-3">${rel.body.trim()}</p>` : ''}
                        </div>
                        ${apk ? `
                        <a href="${apk.browser_download_url}" class="btn btn-primary btn-sm shrink-0" download>
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"/>
                            </svg>
                            Download APK
                        </a>` : '<span class="text-xs opacity-30 self-center">No APK yet</span>'}
                    </div>
                </div>
            </div>`;
        }).join('');

    } catch (e) {
        container.innerHTML = `<div class="card bg-base-200 shadow-sm"><div class="card-body p-5">
            <p class="text-sm text-error">Failed to load releases: ${e.message}</p>
        </div></div>`;
    }
}

(window.__pageInits = window.__pageInits || {}).downloads = function () {
    requireAuth();
    loadDownloads();
};
