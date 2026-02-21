/* ===========================================================
   PDF Reader — pdfs.js
   Depends on: shared.js (authFetch, showToast, showLoading,
               hideLoading, requireAuth, openModal, closeModal,
               truncate, API)
=============================================================*/

const PDFJS_CDN    = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs';
const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';

const HIGHLIGHT_COLORS = {
    yellow: 'rgba(250, 204, 21, 0.45)',
    green:  'rgba(74, 222, 128, 0.45)',
    pink:   'rgba(244, 114, 182, 0.45)',
};

// Pages to keep rendered on each side of current page (7 total window)
const PAGE_WINDOW = 3;

// LRU cache: keep up to 3 recently opened PDF.js document objects
// so re-opening the same PDF is instant (no re-fetch).
const _pdfDocCache = new Map(); // pdfId → pdfJsDoc

/* ── State ─────────────────────────────────────────────── */
let currentPdfId        = null;
let currentPdfMeta      = null;
let pdfJsDoc            = null;
let currentPage         = 1;
let totalPages          = 0;
let scale               = 1.5;
let allAnnotations      = [];
let pendingNotePosition = null;
let viewingNoteId       = null;
let progressSaveTimer   = null;

// Marker tool
let markerActive = false;
let markerColor  = 'yellow';
let _markerDrag  = null;

// Pen tool
let penActive        = false;
let penColor         = '#1e1e1e';
let _penStroke       = null; // { pageEl, points: [{x,y}…], pageW, pageH, ctx }

// Annotation history (for undo)
let _annotHistory    = []; // stack of annotation IDs added this session

// Delete bubble
let _bubbleAnnotId   = null;
let _bubblePageEl    = null;

// Pinch zoom
let _pinch           = null; // { dist, startScale }
let _pinchLastScale  = null;
let _wheelZoomTimer  = null;

// Library state
let allPdfs        = [];
let activeGroup    = null; // null = All

/* ── Init ──────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    requireAuth();
    loadLibrary();

    // Close floating pickers/bubbles on outside click
    document.addEventListener('click', e => {
        for (const [btnId, rowId] of [['markerBtn','markerColorRow'],['penBtn','penColorRow']]) {
            const row = document.getElementById(rowId);
            if (row && !row.classList.contains('hidden') &&
                !document.getElementById(btnId)?.contains(e.target) &&
                !row.contains(e.target)) {
                row.classList.add('hidden');
            }
        }
        const bubble = document.getElementById('annotDeleteBubble');
        if (bubble && !bubble.classList.contains('hidden') && !bubble.contains(e.target)) {
            hideAnnotDeleteBubble();
        }
    });

    // Ctrl/Cmd+Z → undo last annotation
    document.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && currentPdfId) {
            e.preventDefault();
            undoLastAnnotation();
        }
    });
});

/* ==========================================================
   LIBRARY
========================================================== */

async function loadLibrary() {
    showLoading('Loading PDFs…');
    try {
        const res = await authFetch(`${API}/api/pdfs`);
        if (!res || !res.ok) throw new Error();
        allPdfs = await res.json();
        renderGroupTabs();
        renderLibrary();
    } catch {
        showToast('Failed to load PDF library', 'error');
    } finally {
        hideLoading();
    }
}

/* ── Group tabs ────────────────────────────────────────── */
function getGroups() {
    const groups = [...new Set(allPdfs.map(p => p.group).filter(Boolean))].sort();
    return groups;
}

function renderGroupTabs() {
    const tabs  = document.getElementById('groupTabs');
    const groups = getGroups();

    // Populate datalist for upload group input
    const dl = document.getElementById('groupSuggestions');
    if (dl) dl.innerHTML = groups.map(g => `<option value="${escHtml(g)}">`).join('');

    if (!groups.length) { tabs.innerHTML = ''; return; }

    const allActive = activeGroup === null;
    let html = `<button class="btn btn-sm ${allActive ? 'btn-primary' : 'btn-ghost opacity-60'}"
                         onclick="setGroupFilter(null)">All</button>`;
    groups.forEach(g => {
        const active = activeGroup === g;
        html += `<button class="btn btn-sm ${active ? 'btn-primary' : 'btn-ghost opacity-60'}"
                          onclick="setGroupFilter('${escHtml(g)}')">${escHtml(g)}</button>`;
    });
    // Ungrouped tab (only if some PDFs have no group)
    if (allPdfs.some(p => !p.group)) {
        const active = activeGroup === '';
        html += `<button class="btn btn-sm ${active ? 'btn-primary' : 'btn-ghost opacity-60'} opacity-40"
                          onclick="setGroupFilter('')">Ungrouped</button>`;
    }
    tabs.innerHTML = html;
}

function setGroupFilter(group) {
    activeGroup = group;
    renderGroupTabs();
    renderLibrary();
}

/* ── Library grid ──────────────────────────────────────── */
function renderLibrary() {
    const grid = document.getElementById('pdfGrid');
    let list = allPdfs;
    if (activeGroup === '') {
        list = allPdfs.filter(p => !p.group);
    } else if (activeGroup !== null) {
        list = allPdfs.filter(p => p.group === activeGroup);
    }

    if (!list.length) {
        grid.innerHTML = `
            <div class="col-span-full flex flex-col items-center p-12 border-2 border-dashed border-base-300 rounded-xl text-center">
                <div class="text-5xl mb-4 opacity-30">📄</div>
                <div class="font-bold uppercase mb-1">${activeGroup !== null ? 'No PDFs in this group' : 'No PDFs yet'}</div>
                <div class="text-sm opacity-50">Upload a PDF to get started</div>
            </div>`;
        return;
    }

    const groups = getGroups();
    grid.innerHTML = list.map(pdf => {
        const pct     = pdf.progressPercent ? pdf.progressPercent.toFixed(0) : 0;
        const size    = formatBytes(pdf.fileSize);
        const lastRead = pdf.lastReadAt
            ? new Date(pdf.lastReadAt).toLocaleDateString()
            : 'Never';
        const pages = pdf.totalPages > 0
            ? `${pdf.lastPage} / ${pdf.totalPages} pages`
            : 'Not yet opened';

        // Group badge + dropdown
        const groupOptions = [
            `<option value="">— No group —</option>`,
            ...groups.map(g => `<option value="${escHtml(g)}" ${g === pdf.group ? 'selected' : ''}>${escHtml(g)}</option>`),
            `<option value="__new__">+ New group…</option>`
        ].join('');

        return `
        <div class="card bg-base-200 shadow-sm hover:shadow-md transition-shadow group">
            <!-- Clickable area -->
            <div class="card-body p-4 gap-2 cursor-pointer" onclick="openReader('${escHtml(pdf.id)}')">
                <div class="flex items-start justify-between gap-2">
                    <div class="flex items-center gap-2 min-w-0">
                        <span class="text-2xl shrink-0">📄</span>
                        <div class="min-w-0">
                            <div class="font-semibold text-sm truncate" title="${escHtml(pdf.filename)}">${escHtml(truncate(pdf.filename, 38))}</div>
                            <div class="text-xs opacity-40">${size}</div>
                        </div>
                    </div>
                    <button class="btn btn-ghost btn-xs btn-square opacity-0 group-hover:opacity-100 text-error shrink-0"
                            onclick="event.stopPropagation(); deletePdf('${escHtml(pdf.id)}')" title="Delete">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                            <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/>
                        </svg>
                    </button>
                </div>

                <!-- Progress bar -->
                <div class="w-full bg-base-300 rounded-full h-1.5 mt-1">
                    <div class="pdf-progress" style="width:${pct}%"></div>
                </div>
                <div class="flex justify-between text-xs opacity-40">
                    <span>${pages}</span>
                    <span>${lastRead}</span>
                </div>
            </div>

            <!-- Group row (outside clickable area) -->
            <div class="px-4 pb-3 flex items-center gap-2" onclick="event.stopPropagation()">
                <select class="select select-bordered select-xs flex-1 text-xs opacity-70"
                        onchange="changeCardGroup('${escHtml(pdf.id)}', this)">
                    ${groupOptions}
                </select>
            </div>
        </div>`;
    }).join('');
}

async function changeCardGroup(id, selectEl) {
    let value = selectEl.value;
    if (value === '__new__') {
        const name = prompt('New group name:');
        if (!name || !name.trim()) { selectEl.value = allPdfs.find(p=>p.id===id)?.group || ''; return; }
        value = name.trim();
    }
    try {
        const res = await authFetch(`${API}/api/pdfs/${id}/group`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ group: value || null })
        });
        if (!res || !res.ok) throw new Error();
        const updated = await res.json();
        const idx = allPdfs.findIndex(p => p.id === id);
        if (idx !== -1) allPdfs[idx] = updated;
        renderGroupTabs();
        renderLibrary();
    } catch {
        showToast('Failed to update group', 'error');
    }
}

async function deletePdf(id) {
    if (!confirm('Delete this PDF and all its annotations?')) return;
    showLoading('Deleting…');
    try {
        const res = await authFetch(`${API}/api/pdfs/${id}`, { method: 'DELETE' });
        if (!res || !res.ok) throw new Error();
        showToast('PDF deleted', 'success');
        await loadLibrary();
    } catch {
        showToast('Delete failed', 'error');
    } finally {
        hideLoading();
    }
}

/* ==========================================================
   UPLOAD QUEUE  (XHR for progress, sequential)
========================================================== */

let uploadQueue     = [];  // { file, status, progress, el }
let uploadRunning   = false;

function handlePdfUpload(input) {
    const files = Array.from(input.files);
    input.value = '';
    if (!files.length) return;

    const invalid = files.filter(f => f.type !== 'application/pdf');
    const tooBig  = files.filter(f => f.size > 500 * 1024 * 1024);

    if (invalid.length) {
        showToast(`${invalid.length} file(s) skipped — not a PDF`, 'warning');
    }
    if (tooBig.length) {
        showToast(`${tooBig.length} file(s) skipped — exceeds 500 MB`, 'warning');
    }

    const valid = files.filter(f => f.type === 'application/pdf' && f.size <= 500 * 1024 * 1024);
    if (!valid.length) return;

    // Add to queue
    valid.forEach(f => {
        uploadQueue.push({ file: f, status: 'waiting', progress: 0, el: null });
    });

    showUploadQueuePanel();
    renderUploadQueue();

    if (!uploadRunning) processUploadQueue();
}

function showUploadQueuePanel() {
    const panel = document.getElementById('uploadQueue');
    panel.style.display = 'block';
    document.getElementById('uploadQueueClose').style.display = 'none';
}

function dismissUploadQueue() {
    document.getElementById('uploadQueue').style.display = 'none';
    uploadQueue = [];
}

function renderUploadQueue() {
    const list = document.getElementById('uploadQueueList');
    list.innerHTML = uploadQueue.map((item, i) => {
        const statusIcon = item.status === 'done'    ? '✓'
                         : item.status === 'error'   ? '✕'
                         : item.status === 'uploading' ? ''
                         : '…';
        const statusColor = item.status === 'done'  ? 'text-success'
                          : item.status === 'error' ? 'text-error'
                          : 'opacity-40';
        return `
        <div id="upload-item-${i}" class="flex flex-col gap-1">
            <div class="flex items-center gap-2">
                <span class="text-xs flex-1 truncate opacity-70" title="${escHtml(item.file.name)}">${escHtml(truncate(item.file.name, 32))}</span>
                <span class="text-xs font-mono ${statusColor} shrink-0">${statusIcon || (item.progress > 0 ? item.progress + '%' : '—')}</span>
            </div>
            <div class="w-full h-1 bg-base-300 rounded-full overflow-hidden">
                <div class="upload-item-bar ${item.status === 'done' ? 'bg-success' : item.status === 'error' ? 'bg-error' : ''}"
                     style="width:${item.progress}%"></div>
            </div>
        </div>`;
    }).join('');

    const done    = uploadQueue.filter(i => i.status === 'done').length;
    const total   = uploadQueue.length;
    const titleEl = document.getElementById('uploadQueueTitle');
    if (titleEl) titleEl.textContent = done === total
        ? `Done — ${done} file${done !== 1 ? 's' : ''} uploaded`
        : `Uploading ${done + 1} of ${total}…`;
}

async function processUploadQueue() {
    uploadRunning = true;
    const group = (document.getElementById('uploadGroupInput')?.value || '').trim();

    for (let i = 0; i < uploadQueue.length; i++) {
        const item = uploadQueue[i];
        if (item.status !== 'waiting') continue;

        item.status = 'uploading';
        renderUploadQueue();

        try {
            await uploadFileWithProgress(item.file, group, pct => {
                item.progress = pct;
                // Update just this item's bar without full re-render
                const bar = document.querySelector(`#upload-item-${i} .upload-item-bar`);
                const lbl = document.querySelector(`#upload-item-${i} .font-mono`);
                if (bar) bar.style.width = pct + '%';
                if (lbl) lbl.textContent = pct + '%';
            });
            item.status   = 'done';
            item.progress = 100;
        } catch (e) {
            item.status = 'error';
            showToast(`Failed: ${item.file.name}`, 'error');
        }
        renderUploadQueue();
    }

    uploadRunning = false;

    // Show close button and reload library
    document.getElementById('uploadQueueClose').style.display = '';
    await loadLibrary();
}

function uploadFileWithProgress(file, group, onProgress) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const fd  = new FormData();
        fd.append('file', file);
        if (group) fd.append('group', group);

        xhr.upload.addEventListener('progress', e => {
            if (e.lengthComputable) onProgress(Math.round(e.loaded / e.total * 100));
        });
        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText));
            else reject(new Error(xhr.responseText));
        });
        xhr.addEventListener('error', () => reject(new Error('Network error')));

        xhr.open('POST', `${API}/api/pdfs/upload`);
        xhr.setRequestHeader('Authorization', `Bearer ${getToken()}`);
        xhr.send(fd);
    });
}

/* ==========================================================
   READER
========================================================== */

async function openReader(id) {
    currentPdfId   = id;
    allAnnotations = [];
    pdfJsDoc       = null;
    currentPdfMeta = allPdfs.find(p => p.id === id) || null;

    showView('reader');
    document.getElementById('readerTitle').textContent =
        currentPdfMeta ? truncate(currentPdfMeta.filename, 40) : 'PDF';
    document.getElementById('pdfViewport').innerHTML = '';
    document.getElementById('totalPagesLabel').textContent = '—';
    document.getElementById('pageInput').value = 1;

    showLoading('Loading PDF…');
    try {
        await ensurePdfJs();
        pdfJsDoc = await getOrLoadPdfDoc(id, currentPdfMeta?.fileSize || 0);
        totalPages = pdfJsDoc.numPages;

        document.getElementById('totalPagesLabel').textContent = totalPages;
        document.getElementById('pageInput').max = totalPages;
        document.getElementById('zoomLabel').textContent = Math.round(scale * 100) + '%';

        authFetch(`${API}/api/pdfs/${id}/totalPages`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ totalPages })
        });

        // Resolve start page BEFORE building placeholders so we fetch the
        // right page's dimensions and skip rendering anything irrelevant.
        const startPage = Math.min(
            Math.max(1, currentPdfMeta?.lastPage || 1),
            totalPages
        );

        await buildPagePlaceholders(startPage);
        await loadAnnotations();   // annotations loaded BEFORE first render

        scrollToPage(startPage);   // renders window around startPage
        setupScrollObserver();
    } catch (e) {
        showToast('Failed to open PDF: ' + e.message, 'error');
        closeReader();
    } finally {
        hideLoading();
    }

    _annotHistory = [];
    setupHighlightListener();
    setupMarkerListeners();
    setupPenListeners();
    setupPinchZoom();
}

function closeReader() {
    cancelNoteMode();
    deactivateMarker();
    deactivatePen();
    hideAnnotDeleteBubble();
    hideColorPicker();
    _annotHistory = [];
    if (progressSaveTimer) { clearTimeout(progressSaveTimer); progressSaveTimer = null; }
    pdfJsDoc = null; currentPdfId = null; allAnnotations = [];
    document.getElementById('pdfViewport').innerHTML = '';
    showView('library');
    loadLibrary();
}

/* ── PDF.js lazy load ──────────────────────────────────── */
let _pdfjsLib = null;
async function ensurePdfJs() {
    if (_pdfjsLib || window.__pdfjsLib) return;
    const script = document.createElement('script');
    script.type = 'module';
    script.textContent = `
        import * as pdfjsLib from '${PDFJS_CDN}';
        pdfjsLib.GlobalWorkerOptions.workerSrc = '${PDFJS_WORKER}';
        window.__pdfjsLib = pdfjsLib;
    `;
    document.head.appendChild(script);
    await sleep(1500);
}

async function getPdfJs() {
    for (let i = 0; i < 50; i++) {
        if (window.__pdfjsLib) return window.__pdfjsLib;
        await sleep(100);
    }
    throw new Error('PDF.js failed to load');
}

/**
 * Returns a cached PDF.js document, or fetches it fresh using a custom
 * PDFDataRangeTransport.
 *
 * Why not the simple `{ url, httpHeaders }` approach?
 * PDF.js issues an initial unbounded GET (no Range header) to discover the
 * file size. The server responds 200 and starts streaming the ENTIRE file.
 * PDF.js receives everything in that first response and never needs to make
 * range requests — so the whole PDF downloads before page 1 appears.
 *
 * PDFDataRangeTransport fixes this: we hand PDF.js the file size upfront
 * (already in currentPdfMeta.fileSize) and intercept every byte-range
 * request ourselves, adding the Authorization header. PDF.js only fetches
 * the bytes it actually needs (xref table + current page stream).
 */
async function getOrLoadPdfDoc(id, fileSize) {
    if (_pdfDocCache.has(id)) {
        const doc = _pdfDocCache.get(id);
        _pdfDocCache.delete(id);
        _pdfDocCache.set(id, doc);
        return doc;
    }
    const pdfjsLib = await getPdfJs();
    const url       = `${location.origin}${API}/api/pdfs/${id}/file`;
    const authToken = `Bearer ${getToken()}`;

    let doc;
    if (fileSize > 0 && pdfjsLib.PDFDataRangeTransport) {
        // ── Range-request transport ──────────────────────────
        const transport = new pdfjsLib.PDFDataRangeTransport(fileSize, new Uint8Array(0));
        let aborted = false;

        transport.requestDataRange = function (begin, end) {
            if (aborted) return;
            fetch(url, {
                headers: { Authorization: authToken, Range: `bytes=${begin}-${end - 1}` }
            })
            .then(r => (r.status === 206 || r.ok) ? r.arrayBuffer() : Promise.reject(r.status))
            .then(buf => { if (!aborted) transport.onDataRange(begin, new Uint8Array(buf)); })
            .catch(err => console.warn('[PDF range] fetch failed', err));
        };
        transport.abort = () => { aborted = true; };

        doc = await pdfjsLib.getDocument({
            range: transport,
            rangeChunkSize: 65536,
        }).promise;
    } else {
        // ── Fallback: full download (fileSize unknown or old PDF.js) ─
        doc = await pdfjsLib.getDocument({
            url,
            httpHeaders: { Authorization: authToken },
            disableRange: false,
            disableStream: false,
            rangeChunkSize: 65536,
        }).promise;
    }

    if (_pdfDocCache.size >= 3) {
        _pdfDocCache.delete(_pdfDocCache.keys().next().value);
    }
    _pdfDocCache.set(id, doc);
    return doc;
}

/* ── Pages ─────────────────────────────────────────────── */
async function buildPagePlaceholders(startPage = 1) {
    const viewport = document.getElementById('pdfViewport');
    viewport.innerHTML = '';

    // Fetch dimensions from startPage — the first page we'll actually render.
    // This is the only range request made here; page 1 is NOT pre-fetched
    // unless startPage === 1.
    const refPage = await pdfJsDoc.getPage(startPage);
    const vp = refPage.getViewport({ scale });

    for (let n = 1; n <= totalPages; n++) {
        const container = document.createElement('div');
        container.className = 'pdf-page-container';
        container.dataset.page = n;
        container.dataset.rendered = 'false';
        container.style.width  = vp.width + 'px';
        container.style.height = vp.height + 'px';
        container.style.background = '#fff';
        container.appendChild(document.createElement('canvas'));
        const al = document.createElement('div');
        al.className = 'annot-layer';
        container.appendChild(al);
        const dl = document.createElement('canvas');
        dl.className = 'draw-layer';
        container.appendChild(dl);
        viewport.appendChild(container);
    }
    // No rendering here — scrollToPage(startPage) in openReader calls
    // managePageWindow which renders exactly the right ±PAGE_WINDOW window.
    // Annotations are also loaded before that call, so first render is complete.
}

async function renderPage(pageNum) {
    const container = document.querySelector(`.pdf-page-container[data-page="${pageNum}"]`);
    if (!container || container.dataset.rendered === 'true') return;
    container.dataset.rendered = 'true';

    const page   = await pdfJsDoc.getPage(pageNum);
    const vp     = page.getViewport({ scale });
    const canvas = container.querySelector('canvas');
    const ctx    = canvas.getContext('2d');
    canvas.width  = vp.width;
    canvas.height = vp.height;
    container.style.width  = vp.width  + 'px';
    container.style.height = vp.height + 'px';
    const drawCanvas = container.querySelector('.draw-layer');
    if (drawCanvas) { drawCanvas.width = vp.width; drawCanvas.height = vp.height; }
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    drawAnnotationsForPage(pageNum, container, vp.width, vp.height);
}

async function rerenderAllPages() {
    // Resize ALL containers to the new scale so scroll layout stays correct,
    // even for pages that won't be re-rendered right now.
    const fp = await pdfJsDoc.getPage(1);
    const vp = fp.getViewport({ scale });
    document.querySelectorAll('.pdf-page-container').forEach(c => {
        c.dataset.rendered = 'false';
        c.style.width  = vp.width  + 'px';
        c.style.height = vp.height + 'px';
    });
    // Re-render only the current window
    const wS = Math.max(1, currentPage - PAGE_WINDOW);
    const wE = Math.min(totalPages, currentPage + PAGE_WINDOW);
    for (let n = wS; n <= wE; n++) await renderPage(n);
}

/** Clears canvas pixels for a page outside the window (placeholder stays sized). */
function unloadPage(container) {
    if (container.dataset.rendered !== 'true') return;
    container.dataset.rendered = 'false';
    const canvas = container.querySelector('canvas');
    if (canvas && canvas.width > 0) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    const dl = container.querySelector('.draw-layer');
    if (dl && dl.width > 0) dl.getContext('2d').clearRect(0, 0, dl.width, dl.height);
}

/** Renders pages [cur-WINDOW, cur+WINDOW] and unloads everything outside. */
function managePageWindow(pageNum) {
    const wS = Math.max(1, pageNum - PAGE_WINDOW);
    const wE = Math.min(totalPages, pageNum + PAGE_WINDOW);
    document.querySelectorAll('.pdf-page-container').forEach(c => {
        const n = parseInt(c.dataset.page);
        if (n >= wS && n <= wE) {
            renderPage(n); // no-op if already rendered
        } else {
            unloadPage(c);
        }
    });
}

/* ── Scroll observer ───────────────────────────────────── */
let scrollObserver = null;
function setupScrollObserver() {
    if (scrollObserver) scrollObserver.disconnect();
    scrollObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const n = parseInt(entry.target.dataset.page);
            currentPage = n;
            document.getElementById('pageInput').value = n;
            managePageWindow(n);
            scheduleProgressSave();
        });
    }, { root: document.getElementById('pdfViewport'), threshold: 0.3 });
    document.querySelectorAll('.pdf-page-container').forEach(c => scrollObserver.observe(c));
}

function scheduleProgressSave() {
    if (progressSaveTimer) clearTimeout(progressSaveTimer);
    progressSaveTimer = setTimeout(() => {
        if (currentPdfId && currentPage) {
            authFetch(`${API}/api/pdfs/${currentPdfId}/progress`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lastPage: currentPage })
            });
        }
    }, 2000);
}

function scrollToPage(n) {
    const c = document.querySelector(`.pdf-page-container[data-page="${n}"]`);
    if (!c) return;
    c.scrollIntoView({ behavior: 'instant', block: 'start' });
    currentPage = n;
    document.getElementById('pageInput').value = n;
    managePageWindow(n); // render window immediately, don't wait for observer
}
function readerPageStep(delta) { scrollToPage(Math.max(1, Math.min(totalPages, currentPage + delta))); }
function readerGoToPage(val) { const n = parseInt(val); if (n >= 1 && n <= totalPages) scrollToPage(n); }

async function readerZoom(delta) {
    scale = Math.max(0.5, Math.min(4.0, scale + delta));
    document.getElementById('zoomLabel').textContent = Math.round(scale * 100) + '%';
    showLoading('Rendering…');
    try { await rerenderAllPages(); } finally { hideLoading(); }
}

async function downloadCurrentPdf() {
    if (!currentPdfId) return;
    showLoading('Downloading…');
    try {
        const res = await authFetch(`${API}/api/pdfs/${currentPdfId}/file`);
        if (!res || !res.ok) throw new Error();
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const a    = Object.assign(document.createElement('a'), { href: url, download: currentPdfMeta?.filename || 'document.pdf' });
        a.click();
        URL.revokeObjectURL(url);
    } catch { showToast('Download failed', 'error'); }
    finally { hideLoading(); }
}

function toggleAnnotSidebar() {
    document.getElementById('annotSidebar').classList.toggle('hidden');
}

/* ==========================================================
   ANNOTATIONS
========================================================== */

async function loadAnnotations() {
    if (!currentPdfId) return;
    try {
        const res = await authFetch(`${API}/api/pdfs/${currentPdfId}/annotations`);
        if (res && res.ok) allAnnotations = await res.json();
    } catch (_) {}
    redrawAllAnnotations();
    renderAnnotSidebar();
}

function redrawAllAnnotations() {
    document.querySelectorAll('.pdf-page-container').forEach(container => {
        const n = parseInt(container.dataset.page);
        if (container.dataset.rendered === 'true') {
            const canvas = container.querySelector('canvas');
            drawAnnotationsForPage(n, container, canvas.width, canvas.height);
        }
    });
}

function drawAnnotationsForPage(pageNum, container, pageW, pageH) {
    const layer = container.querySelector('.annot-layer');
    if (!layer) return;
    layer.innerHTML = '';
    allAnnotations.filter(a => a.page === pageNum).forEach(a => {
        if (a.type === 'HIGHLIGHT' && a.rects) {
            const bg = HIGHLIGHT_COLORS[a.color] || HIGHLIGHT_COLORS.yellow;
            a.rects.forEach(r => {
                const div = Object.assign(document.createElement('div'), { className: 'hl-rect' });
                Object.assign(div.style, {
                    left: r.x * pageW + 'px', top: r.y * pageH + 'px',
                    width: r.width * pageW + 'px', height: r.height * pageH + 'px',
                    background: bg, cursor: 'pointer'
                });
                div.addEventListener('mousedown', e => e.stopPropagation());
                div.addEventListener('click', e => {
                    if (markerActive || penActive) return;
                    e.stopPropagation();
                    showAnnotDeleteBubble(a.id, container, e.clientX, e.clientY, 'Highlight');
                });
                layer.appendChild(div);
            });
        } else if (a.type === 'NOTE') {
            const div = Object.assign(document.createElement('div'), { className: 'note-icon', textContent: '📝' });
            div.style.left = a.noteX * pageW + 'px';
            div.style.top  = a.noteY * pageH + 'px';
            div.addEventListener('click', e => { e.stopPropagation(); openNoteView(a.id); });
            layer.appendChild(div);
        }
    });

    // Freehand strokes on the draw-layer canvas
    const drawCanvas = container.querySelector('.draw-layer');
    if (drawCanvas && drawCanvas.width > 0) {
        const ctx = drawCanvas.getContext('2d');
        ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
        allAnnotations.filter(a => a.page === pageNum && a.type === 'FREEHAND' && a.strokes?.length).forEach(a => {
            _renderStrokes(ctx, a.strokes, a.color || '#1e1e1e', (a.strokeWidth || 0.003) * pageW, pageW, pageH);
        });
    }
}

function renderAnnotSidebar() {
    const list = document.getElementById('annotSidebarList');
    if (!list) return;
    if (!allAnnotations.length) {
        list.innerHTML = '<div class="text-xs opacity-40 text-center py-4">No annotations yet</div>';
        return;
    }
    list.innerHTML = [...allAnnotations].sort((a,b) => a.page - b.page).map(a => {
        if (a.type === 'HIGHLIGHT') {
            const dot = HIGHLIGHT_COLORS[a.color] || HIGHLIGHT_COLORS.yellow;
            return `<div class="flex items-start gap-2 p-2 rounded-lg border border-base-300 bg-base-200 text-xs cursor-pointer hover:bg-base-300"
                         onclick="scrollToPage(${a.page})">
                <span style="width:10px;height:10px;border-radius:50%;background:${dot};display:inline-block;flex-shrink:0;margin-top:2px;"></span>
                <div><div class="font-semibold opacity-50 mb-0.5">Page ${a.page} · Highlight</div>
                <div class="opacity-70 line-clamp-2">${escHtml(truncate(a.selectedText || '', 80))}</div></div></div>`;
        } else if (a.type === 'FREEHAND') {
            return `<div class="flex items-start gap-2 p-2 rounded-lg border border-base-300 bg-base-200 text-xs cursor-pointer hover:bg-base-300"
                         onclick="scrollToPage(${a.page})">
                <span style="width:10px;height:10px;border-radius:50%;background:${escHtml(a.color||'#1e1e1e')};display:inline-block;flex-shrink:0;margin-top:2px;"></span>
                <div><div class="font-semibold opacity-50 mb-0.5">Page ${a.page} · Drawing</div></div></div>`;
        } else {
            return `<div class="flex items-start gap-2 p-2 rounded-lg border border-base-300 bg-base-200 text-xs cursor-pointer hover:bg-base-300"
                         onclick="scrollToPage(${a.page}); openNoteView('${escHtml(a.id)}')">
                <span class="shrink-0 mt-0.5">📝</span>
                <div><div class="font-semibold opacity-50 mb-0.5">Page ${a.page} · Note</div>
                <div class="opacity-70 line-clamp-2">${escHtml(truncate(a.text || '', 80))}</div></div></div>`;
        }
    }).join('');
}

/* ── Highlights ────────────────────────────────────────── */
let _savedRange = null, _savedPageEl = null;

function setupHighlightListener() {
    const vp = document.getElementById('pdfViewport');
    if (vp) vp.addEventListener('mouseup', onViewportMouseUp);
}

function onViewportMouseUp(e) {
    if (document.body.classList.contains('note-mode')) return;
    if (document.body.classList.contains('marker-mode')) return;
    if (document.body.classList.contains('pen-mode')) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) { hideColorPicker(); return; }
    const range  = selection.getRangeAt(0);
    const pageEl = range.startContainer.parentElement?.closest('.pdf-page-container');
    if (!pageEl) { hideColorPicker(); return; }
    _savedRange = range; _savedPageEl = pageEl;
    showColorPicker(e.clientX, e.clientY);
}

function showColorPicker(x, y) {
    const cp = document.getElementById('colorPicker');
    cp.style.display = 'flex'; cp.style.left = x + 'px'; cp.style.top = (y - 48) + 'px';
}
function hideColorPicker() {
    document.getElementById('colorPicker').style.display = 'none';
    _savedRange = null; _savedPageEl = null;
}

async function saveHighlight(color) {
    hideColorPicker();
    if (!_savedRange || !_savedPageEl) return;
    const pageNum = parseInt(_savedPageEl.dataset.page);
    const canvas  = _savedPageEl.querySelector('canvas');
    const pageW   = canvas?.width  || _savedPageEl.offsetWidth;
    const pageH   = canvas?.height || _savedPageEl.offsetHeight;
    const containerRect = _savedPageEl.getBoundingClientRect();
    const rects = Array.from(_savedRange.getClientRects())
        .filter(r => r.width > 0 && r.height > 0)
        .map(r => ({
            x:      (r.left - containerRect.left) / pageW,
            y:      (r.top  - containerRect.top)  / pageH,
            width:  r.width  / pageW,
            height: r.height / pageH,
        }));
    const selectedText = _savedRange.toString();
    window.getSelection()?.removeAllRanges();
    if (!rects.length) return;
    try {
        const res = await authFetch(`${API}/api/pdfs/${currentPdfId}/annotations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'HIGHLIGHT', page: pageNum, color, selectedText, rects })
        });
        if (!res || !res.ok) throw new Error();
        const saved = await res.json();
        allAnnotations.push(saved);
        _annotHistory.push(saved.id);
        drawAnnotationsForPage(pageNum, _savedPageEl, pageW, pageH);
        renderAnnotSidebar();
    } catch { showToast('Failed to save highlight', 'error'); }
}

/* ── Marker highlight (drag-to-draw) ───────────────────── */
function toggleMarkerPicker() {
    if (markerActive) { deactivateMarker(); return; }
    document.getElementById('markerColorRow').classList.toggle('hidden');
}

function activateMarker(color) {
    markerColor  = color;
    markerActive = true;
    document.getElementById('markerColorRow').classList.add('hidden');
    document.body.classList.add('marker-mode');
    document.getElementById('markerBtn').classList.add('btn-active');
    cancelNoteMode();
    showToast('Drag on a page to draw a highlight', 'info', null, 2500);
}

function deactivateMarker() {
    markerActive = false;
    document.body.classList.remove('marker-mode');
    document.getElementById('markerBtn')?.classList.remove('btn-active');
    document.getElementById('markerColorRow')?.classList.add('hidden');
    _markerDrag = null;
}

function setupMarkerListeners() {
    const vp = document.getElementById('pdfViewport');
    if (!vp) return;
    vp.addEventListener('mousedown', onMarkerMouseDown);
    vp.addEventListener('mousemove', onMarkerMouseMove);
    vp.addEventListener('mouseup',   onMarkerMouseUp);
    vp.addEventListener('touchstart', onMarkerTouchStart, { passive: false });
    vp.addEventListener('touchmove',  onMarkerTouchMove,  { passive: false });
    vp.addEventListener('touchend',   onMarkerTouchEnd);
}

function onMarkerMouseDown(e) {
    if (!markerActive) return;
    const pageEl = e.target.closest('.pdf-page-container');
    if (!pageEl) return;
    e.preventDefault();
    const rect = pageEl.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const preview = document.createElement('div');
    preview.style.cssText = `position:absolute;pointer-events:none;mix-blend-mode:multiply;background:${HIGHLIGHT_COLORS[markerColor]};z-index:100;left:${x}px;top:${y}px;width:0;height:0;`;
    pageEl.appendChild(preview);
    _markerDrag = { pageEl, startX: x, startY: y, previewEl: preview };
}

function onMarkerMouseMove(e) {
    if (!_markerDrag) return;
    e.preventDefault();
    _updateMarkerPreview(e.clientX, e.clientY);
}

function _updateMarkerPreview(clientX, clientY) {
    const { pageEl, startX, startY, previewEl } = _markerDrag;
    const rect = pageEl.getBoundingClientRect();
    const curX = clientX - rect.left, curY = clientY - rect.top;
    const l = Math.min(startX, curX), t = Math.min(startY, curY);
    const w = Math.abs(curX - startX), h = Math.abs(curY - startY);
    Object.assign(previewEl.style, { left: l+'px', top: t+'px', width: w+'px', height: h+'px' });
}

async function onMarkerMouseUp(e) {
    if (!_markerDrag) return;
    const { pageEl, startX, startY, previewEl } = _markerDrag;
    _markerDrag = null;
    if (pageEl.contains(previewEl)) pageEl.removeChild(previewEl);
    const rect = pageEl.getBoundingClientRect();
    await _saveMarkerRect(pageEl, startX, startY, e.clientX - rect.left, e.clientY - rect.top);
}

function onMarkerTouchStart(e) {
    if (!markerActive || e.touches.length !== 1) return;
    const t = e.touches[0];
    const pageEl = document.elementFromPoint(t.clientX, t.clientY)?.closest('.pdf-page-container');
    if (!pageEl) return;
    e.preventDefault();
    const rect = pageEl.getBoundingClientRect();
    const x = t.clientX - rect.left, y = t.clientY - rect.top;
    const preview = document.createElement('div');
    preview.style.cssText = `position:absolute;pointer-events:none;mix-blend-mode:multiply;background:${HIGHLIGHT_COLORS[markerColor]};z-index:100;left:${x}px;top:${y}px;width:0;height:0;`;
    pageEl.appendChild(preview);
    _markerDrag = { pageEl, startX: x, startY: y, previewEl: preview };
}

function onMarkerTouchMove(e) {
    if (!_markerDrag) return;
    e.preventDefault();
    const t = e.touches[0];
    _updateMarkerPreview(t.clientX, t.clientY);
}

async function onMarkerTouchEnd(e) {
    if (!_markerDrag) return;
    const { pageEl, startX, startY, previewEl } = _markerDrag;
    _markerDrag = null;
    if (pageEl.contains(previewEl)) pageEl.removeChild(previewEl);
    const t = e.changedTouches[0];
    const rect = pageEl.getBoundingClientRect();
    await _saveMarkerRect(pageEl, startX, startY, t.clientX - rect.left, t.clientY - rect.top);
}

async function _saveMarkerRect(pageEl, startX, startY, endX, endY) {
    const canvas = pageEl.querySelector('canvas');
    const pageW  = canvas?.width  || pageEl.offsetWidth;
    const pageH  = canvas?.height || pageEl.offsetHeight;
    const l = Math.min(startX, endX), t = Math.min(startY, endY);
    const w = Math.abs(endX - startX), h = Math.abs(endY - startY);
    if (w < 5 || h < 5) return;
    const pageNum = parseInt(pageEl.dataset.page);
    const r = { x: l/pageW, y: t/pageH, width: w/pageW, height: h/pageH };
    try {
        const res = await authFetch(`${API}/api/pdfs/${currentPdfId}/annotations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'HIGHLIGHT', page: pageNum, color: markerColor, rects: [r] })
        });
        if (!res || !res.ok) throw new Error();
        const saved = await res.json();
        allAnnotations.push(saved);
        _annotHistory.push(saved.id);
        drawAnnotationsForPage(pageNum, pageEl, pageW, pageH);
        renderAnnotSidebar();
    } catch { showToast('Failed to save highlight', 'error'); }
}

/* ── Pen tool (freehand drawing) ───────────────────────── */
function togglePenPicker() {
    if (penActive) { deactivatePen(); return; }
    document.getElementById('penColorRow').classList.toggle('hidden');
}

function activatePen(color) {
    penColor  = color;
    penActive = true;
    document.getElementById('penColorRow').classList.add('hidden');
    document.body.classList.add('pen-mode');
    document.getElementById('penBtn').classList.add('btn-active');
    deactivateMarker();
    cancelNoteMode();
    showToast('Draw freely on the page', 'info', null, 2000);
}

function deactivatePen() {
    penActive = false;
    document.body.classList.remove('pen-mode');
    document.getElementById('penBtn')?.classList.remove('btn-active');
    document.getElementById('penColorRow')?.classList.add('hidden');
    _penStroke = null;
}

function setupPenListeners() {
    const vp = document.getElementById('pdfViewport');
    if (!vp) return;
    vp.addEventListener('mousedown',  onPenMouseDown);
    vp.addEventListener('mousemove',  onPenMouseMove);
    vp.addEventListener('mouseup',    onPenMouseUp);
    vp.addEventListener('mouseleave', onPenMouseLeave);
    vp.addEventListener('touchstart', onPenTouchStart, { passive: false });
    vp.addEventListener('touchmove',  onPenTouchMove,  { passive: false });
    vp.addEventListener('touchend',   onPenTouchEnd);
}

function _penPageInfo(clientX, clientY) {
    const el = document.elementFromPoint(clientX, clientY)?.closest('.pdf-page-container');
    if (!el) return null;
    const canvas = el.querySelector('canvas');
    const rect   = el.getBoundingClientRect();
    return { pageEl: el, rect,
             pageW: canvas?.width  || el.offsetWidth,
             pageH: canvas?.height || el.offsetHeight };
}

function onPenMouseDown(e) {
    if (!penActive || e.touches?.length > 1) return;
    const info = _penPageInfo(e.clientX, e.clientY);
    if (!info) return;
    e.preventDefault();
    const { pageEl, rect, pageW, pageH } = info;
    const drawCanvas = pageEl.querySelector('.draw-layer');
    if (!drawCanvas) return;
    const ctx = drawCanvas.getContext('2d');
    const x = (e.clientX - rect.left) / pageW;
    const y = (e.clientY - rect.top)  / pageH;
    _penStroke = { pageEl, pageW, pageH, ctx, points: [{ x, y }] };
    _penBeginPath(ctx, x * pageW, y * pageH, pageW);
}

function onPenMouseMove(e) {
    if (!_penStroke) return;
    e.preventDefault();
    const { pageEl, pageW, pageH, ctx } = _penStroke;
    const rect = pageEl.getBoundingClientRect();
    const x = (e.clientX - rect.left) / pageW;
    const y = (e.clientY - rect.top)  / pageH;
    _penStroke.points.push({ x, y });
    ctx.lineTo(x * pageW, y * pageH);
    ctx.stroke();
}

async function onPenMouseUp(e) {
    if (!_penStroke) return;
    const stroke = _penStroke;
    _penStroke = null;
    await _savePenStroke(stroke);
}

function onPenMouseLeave(e) {
    if (_penStroke) onPenMouseUp(e);
}

function onPenTouchStart(e) {
    if (!penActive || e.touches.length !== 1) return;
    const t = e.touches[0];
    const info = _penPageInfo(t.clientX, t.clientY);
    if (!info) return;
    e.preventDefault();
    const { pageEl, rect, pageW, pageH } = info;
    const drawCanvas = pageEl.querySelector('.draw-layer');
    if (!drawCanvas) return;
    const ctx = drawCanvas.getContext('2d');
    const x = (t.clientX - rect.left) / pageW;
    const y = (t.clientY - rect.top)  / pageH;
    _penStroke = { pageEl, pageW, pageH, ctx, points: [{ x, y }] };
    _penBeginPath(ctx, x * pageW, y * pageH, pageW);
}

function onPenTouchMove(e) {
    if (!_penStroke || e.touches.length !== 1) return;
    e.preventDefault();
    const t = e.touches[0];
    const { pageEl, pageW, pageH, ctx } = _penStroke;
    const rect = pageEl.getBoundingClientRect();
    const x = (t.clientX - rect.left) / pageW;
    const y = (t.clientY - rect.top)  / pageH;
    _penStroke.points.push({ x, y });
    ctx.lineTo(x * pageW, y * pageH);
    ctx.stroke();
}

async function onPenTouchEnd(e) {
    if (!_penStroke) return;
    const stroke = _penStroke;
    _penStroke = null;
    await _savePenStroke(stroke);
}

function _penBeginPath(ctx, startX, startY, pageW) {
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.strokeStyle = penColor;
    ctx.lineWidth   = 0.003 * pageW;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.globalAlpha = 0.85;
}

function _renderStrokes(ctx, strokes, color, lineWidth, pageW, pageH) {
    ctx.strokeStyle = color;
    ctx.lineWidth   = lineWidth;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.globalAlpha = 0.85;
    strokes.forEach(pts => {
        if (!pts?.length) return;
        ctx.beginPath();
        ctx.moveTo(pts[0].x * pageW, pts[0].y * pageH);
        pts.slice(1).forEach(p => ctx.lineTo(p.x * pageW, p.y * pageH));
        ctx.stroke();
    });
    ctx.globalAlpha = 1;
}

async function _savePenStroke(stroke) {
    const { pageEl, pageW, pageH, points } = stroke;
    if (points.length < 2) return;
    const pageNum    = parseInt(pageEl.dataset.page);
    const strokeWidth = 0.003; // normalized
    try {
        const res = await authFetch(`${API}/api/pdfs/${currentPdfId}/annotations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'FREEHAND', page: pageNum,
                color: penColor, strokeWidth,
                strokes: [points]
            })
        });
        if (!res || !res.ok) throw new Error();
        const saved = await res.json();
        allAnnotations.push(saved);
        _annotHistory.push(saved.id);
        // Redraw entire draw-layer from saved annotations (normalises all strokes together)
        drawAnnotationsForPage(pageNum, pageEl, pageW, pageH);
        renderAnnotSidebar();
    } catch { showToast('Failed to save stroke', 'error'); }
}

/* ── Notes ─────────────────────────────────────────────── */
function startNoteMode() {
    document.body.classList.add('note-mode');
    document.getElementById('addNoteBtn').classList.add('btn-active');
    showToast('Click anywhere on a page to place a note', 'info', null, 3000);
    document.getElementById('pdfViewport').addEventListener('click', onViewportClickForNote, { once: true });
}

function cancelNoteMode() {
    document.body.classList.remove('note-mode');
    document.getElementById('addNoteBtn')?.classList.remove('btn-active');
    document.getElementById('pdfViewport')?.removeEventListener('click', onViewportClickForNote);
    pendingNotePosition = null;
}

function onViewportClickForNote(e) {
    document.body.classList.remove('note-mode');
    document.getElementById('addNoteBtn')?.classList.remove('btn-active');
    const pageEl = e.target.closest('.pdf-page-container');
    if (!pageEl) { pendingNotePosition = null; return; }
    const pageNum = parseInt(pageEl.dataset.page);
    const canvas  = pageEl.querySelector('canvas');
    const pageW   = canvas?.width  || pageEl.offsetWidth;
    const pageH   = canvas?.height || pageEl.offsetHeight;
    const rect    = pageEl.getBoundingClientRect();
    pendingNotePosition = {
        pdfId: currentPdfId, page: pageNum,
        normX: (e.clientX - rect.left) / pageW,
        normY: (e.clientY - rect.top)  / pageH,
    };
    document.getElementById('noteTextInput').value = '';
    openModal('noteInputModal');
}

async function confirmNote() {
    closeModal('noteInputModal');
    const text = document.getElementById('noteTextInput').value.trim();
    if (!text || !pendingNotePosition) { pendingNotePosition = null; return; }
    const { pdfId, page, normX, normY } = pendingNotePosition;
    pendingNotePosition = null;
    try {
        const res = await authFetch(`${API}/api/pdfs/${pdfId}/annotations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'NOTE', page, noteX: normX, noteY: normY, text })
        });
        if (!res || !res.ok) throw new Error();
        const saved = await res.json();
        allAnnotations.push(saved);
        _annotHistory.push(saved.id);
        const container = document.querySelector(`.pdf-page-container[data-page="${page}"]`);
        if (container) {
            const canvas = container.querySelector('canvas');
            drawAnnotationsForPage(page, container, canvas?.width || container.offsetWidth, canvas?.height || container.offsetHeight);
        }
        renderAnnotSidebar();
    } catch { showToast('Failed to save note', 'error'); }
}

function openNoteView(annotId) {
    const note = allAnnotations.find(a => a.id === annotId);
    if (!note) return;
    viewingNoteId = annotId;
    document.getElementById('noteViewPage').textContent = note.page;
    document.getElementById('noteViewText').textContent = note.text || '';
    openModal('noteViewModal');
}

async function deleteCurrentNote() {
    if (!viewingNoteId || !currentPdfId) return;
    const id = viewingNoteId;
    viewingNoteId = null;
    closeModal('noteViewModal');
    await _deleteAnnotationById(id, null);
}

/* ==========================================================
   VIEW TOGGLE
========================================================== */
function showView(view) {
    const lib    = document.getElementById('libraryView');
    const reader = document.getElementById('readerView');
    if (view === 'reader') {
        lib.classList.add('hidden');
        reader.classList.remove('hidden');
        reader.classList.add('flex');
    } else {
        reader.classList.add('hidden');
        reader.classList.remove('flex');
        lib.classList.remove('hidden');
    }
}

/* ── Delete & Undo ──────────────────────────────────────── */
function showAnnotDeleteBubble(annotId, pageEl, clientX, clientY, label) {
    _bubbleAnnotId = annotId;
    _bubblePageEl  = pageEl;
    const bubble = document.getElementById('annotDeleteBubble');
    document.getElementById('annotDeleteLabel').textContent = label || 'Annotation';
    bubble.classList.remove('hidden');
    bubble.style.left = clientX + 'px';
    bubble.style.top  = (clientY - 44) + 'px';
}

function hideAnnotDeleteBubble() {
    document.getElementById('annotDeleteBubble')?.classList.add('hidden');
    _bubbleAnnotId = null;
    _bubblePageEl  = null;
}

async function deleteFromBubble() {
    if (!_bubbleAnnotId) return;
    await _deleteAnnotationById(_bubbleAnnotId, _bubblePageEl);
    hideAnnotDeleteBubble();
}

async function undoLastAnnotation() {
    if (!_annotHistory.length) { showToast('Nothing to undo', 'info'); return; }
    const annotId = _annotHistory.pop();
    const annot   = allAnnotations.find(a => a.id === annotId);
    const pageEl  = annot
        ? document.querySelector(`.pdf-page-container[data-page="${annot.page}"]`)
        : null;
    await _deleteAnnotationById(annotId, pageEl);
}

async function _deleteAnnotationById(annotId, pageEl) {
    if (!currentPdfId) return;
    const annot = allAnnotations.find(a => a.id === annotId);
    try {
        const res = await authFetch(`${API}/api/pdfs/${currentPdfId}/annotations/${annotId}`, { method: 'DELETE' });
        if (!res || !res.ok) throw new Error();
        allAnnotations = allAnnotations.filter(a => a.id !== annotId);
        _annotHistory  = _annotHistory.filter(id => id !== annotId);
        const container = pageEl ||
            (annot ? document.querySelector(`.pdf-page-container[data-page="${annot.page}"]`) : null);
        if (container) {
            const canvas = container.querySelector('canvas');
            drawAnnotationsForPage(
                parseInt(container.dataset.page), container,
                canvas?.width || container.offsetWidth,
                canvas?.height || container.offsetHeight
            );
        }
        renderAnnotSidebar();
    } catch { showToast('Failed to delete annotation', 'error'); }
}

/* ── Pinch & scroll zoom ────────────────────────────────── */
function setupPinchZoom() {
    const vp = document.getElementById('pdfViewport');
    if (!vp) return;

    // Ctrl+scroll / trackpad pinch (fires as wheel+ctrlKey)
    vp.addEventListener('wheel', e => {
        if (!(e.ctrlKey || e.metaKey)) return;
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        scale = Math.max(0.5, Math.min(4.0, scale + delta));
        document.getElementById('zoomLabel').textContent = Math.round(scale * 100) + '%';
        if (_wheelZoomTimer) clearTimeout(_wheelZoomTimer);
        _wheelZoomTimer = setTimeout(async () => {
            showLoading('Rendering…');
            try { await rerenderAllPages(); } finally { hideLoading(); }
        }, 400);
    }, { passive: false });

    // Two-finger touch pinch
    vp.addEventListener('touchstart', e => {
        if (e.touches.length !== 2) return;
        // Cancel any in-progress draw
        if (_markerDrag) {
            if (_markerDrag.pageEl.contains(_markerDrag.previewEl))
                _markerDrag.pageEl.removeChild(_markerDrag.previewEl);
            _markerDrag = null;
        }
        _penStroke = null;
        _pinch = {
            dist: Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            ),
            startScale: scale
        };
        _pinchLastScale = scale;
    }, { passive: true });

    vp.addEventListener('touchmove', e => {
        if (e.touches.length !== 2 || !_pinch) return;
        e.preventDefault();
        const dist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
        _pinchLastScale = Math.max(0.5, Math.min(4.0, _pinch.startScale * dist / _pinch.dist));
        // Live CSS scale for smooth visual feedback
        vp.style.transform       = `scale(${_pinchLastScale / scale})`;
        vp.style.transformOrigin = 'center top';
        document.getElementById('zoomLabel').textContent = Math.round(_pinchLastScale * 100) + '%';
    }, { passive: false });

    vp.addEventListener('touchend', async e => {
        if (!_pinch || e.touches.length > 0) return;
        vp.style.transform = '';
        const newScale = _pinchLastScale ?? scale;
        _pinch = null; _pinchLastScale = null;
        if (Math.abs(newScale - scale) > 0.04) {
            scale = newScale;
            document.getElementById('zoomLabel').textContent = Math.round(scale * 100) + '%';
            showLoading('Rendering…');
            try { await rerenderAllPages(); } finally { hideLoading(); }
        }
    }, { passive: true });
}

/* ── Fullscreen ─────────────────────────────────────────── */
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.getElementById('readerView').requestFullscreen()
            .catch(() => showToast('Fullscreen not available', 'warning'));
    } else {
        document.exitFullscreen();
    }
}

document.addEventListener('fullscreenchange', () => {
    const isFs = !!document.fullscreenElement;
    const btn  = document.getElementById('fullscreenBtn');
    const path = document.querySelector('#fullscreenIcon path');
    if (!btn || !path) return;
    btn.title = isFs ? 'Exit fullscreen' : 'Fullscreen';
    // Swap between expand and compress icons
    path.setAttribute('d', isFs
        ? 'M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5M15 15l5.25 5.25'
        : 'M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15'
    );
});

/* ==========================================================
   UTILS
========================================================== */
function escHtml(str) {
    return String(str || '')
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function formatBytes(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b/1024).toFixed(1) + ' KB';
    return (b/1048576).toFixed(1) + ' MB';
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
