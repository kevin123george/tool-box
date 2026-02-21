/* ===========================================================
   PDF Reader — pdfs.js
   Depends on: shared.js (authFetch, showToast, showLoading,
               hideLoading, requireAuth, openModal, closeModal,
               truncate, API)
   Renderer: PDF.js loaded from CDN on demand
=============================================================*/

const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs';
const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';

const HIGHLIGHT_COLORS = {
    yellow: 'rgba(250, 204, 21, 0.45)',
    green:  'rgba(74, 222, 128, 0.45)',
    pink:   'rgba(244, 114, 182, 0.45)',
};

/* ── State ─────────────────────────────────────────────── */
let currentPdfId   = null;
let currentPdfMeta = null;   // PdfDocumentDTO
let pdfJsDoc       = null;
let currentPage    = 1;
let totalPages     = 0;
let scale          = 1.5;
let allAnnotations = [];

// Pending note placement
let pendingNotePosition = null; // { pdfId, page, normX, normY }
let viewingNoteId       = null;

// Progress save debounce
let progressSaveTimer = null;

/* ── Init ──────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    requireAuth();
    loadLibrary();
});

/* ==========================================================
   LIBRARY
========================================================== */

async function loadLibrary() {
    showLoading('Loading PDFs…');
    try {
        const res = await authFetch(`${API}/api/pdfs`);
        if (!res || !res.ok) throw new Error('Failed to load');
        const list = await res.json();
        renderLibrary(list);
    } catch (e) {
        showToast('Failed to load PDF library', 'error');
    } finally {
        hideLoading();
    }
}

function renderLibrary(list) {
    const grid = document.getElementById('pdfGrid');
    if (!list.length) {
        grid.innerHTML = `
            <div class="col-span-full flex flex-col items-center p-12 border-2 border-dashed border-base-300 rounded-xl text-center">
                <div class="text-5xl mb-4 opacity-30">📄</div>
                <div class="font-bold uppercase mb-1">No PDFs yet</div>
                <div class="text-sm opacity-50">Upload a PDF to get started</div>
            </div>`;
        return;
    }

    grid.innerHTML = list.map(pdf => {
        const pct    = pdf.progressPercent ? pdf.progressPercent.toFixed(0) : 0;
        const size   = formatBytes(pdf.fileSize);
        const lastRead = pdf.lastReadAt
            ? new Date(pdf.lastReadAt).toLocaleDateString()
            : 'Never';
        const pages  = pdf.totalPages > 0
            ? `${pdf.lastPage} / ${pdf.totalPages} pages`
            : 'Not yet opened';

        return `
        <div class="card bg-base-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
             onclick="openReader('${escHtml(pdf.id)}')">
            <div class="card-body p-4 gap-2">
                <div class="flex items-start justify-between gap-2">
                    <div class="flex items-center gap-2 min-w-0">
                        <span class="text-2xl shrink-0">📄</span>
                        <div class="min-w-0">
                            <div class="font-semibold text-sm truncate" title="${escHtml(pdf.filename)}">${escHtml(truncate(pdf.filename, 40))}</div>
                            <div class="text-xs opacity-40">${size}</div>
                        </div>
                    </div>
                    <button class="btn btn-ghost btn-xs btn-square opacity-0 group-hover:opacity-100 text-error shrink-0"
                            onclick="event.stopPropagation(); deletePdf('${escHtml(pdf.id)}')"
                            title="Delete PDF">
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
        </div>`;
    }).join('');
}

async function handlePdfUpload(input) {
    const file = input.files[0];
    if (!file) return;
    input.value = '';

    if (file.size > 500 * 1024 * 1024) {
        showToast('File exceeds 500 MB limit', 'error');
        return;
    }
    if (file.type !== 'application/pdf') {
        showToast('Only PDF files are allowed', 'error');
        return;
    }

    showLoading('Uploading PDF…');
    try {
        const fd = new FormData();
        fd.append('file', file);
        const res = await authFetch(`${API}/api/pdfs/upload`, { method: 'POST', body: fd });
        if (!res || !res.ok) {
            const msg = await res.text().catch(() => '');
            throw new Error(msg || 'Upload failed');
        }
        showToast('PDF uploaded', 'success');
        await loadLibrary();
    } catch (e) {
        showToast(e.message || 'Upload failed', 'error');
    } finally {
        hideLoading();
    }
}

async function deletePdf(id) {
    if (!confirm('Delete this PDF and all its annotations?')) return;
    showLoading('Deleting…');
    try {
        const res = await authFetch(`${API}/api/pdfs/${id}`, { method: 'DELETE' });
        if (!res || !res.ok) throw new Error('Delete failed');
        showToast('PDF deleted', 'success');
        await loadLibrary();
    } catch (e) {
        showToast('Delete failed', 'error');
    } finally {
        hideLoading();
    }
}

/* ==========================================================
   READER
========================================================== */

async function openReader(id) {
    currentPdfId = id;
    allAnnotations = [];
    pdfJsDoc = null;

    // Fetch metadata first
    const listRes = await authFetch(`${API}/api/pdfs`);
    if (listRes && listRes.ok) {
        const list = await listRes.json();
        currentPdfMeta = list.find(p => p.id === id) || null;
    }

    showView('reader');
    document.getElementById('readerTitle').textContent =
        currentPdfMeta ? truncate(currentPdfMeta.filename, 40) : 'PDF';
    document.getElementById('pdfViewport').innerHTML = '';
    document.getElementById('totalPagesLabel').textContent = '—';
    document.getElementById('pageInput').value = 1;

    showLoading('Loading PDF…');
    try {
        await ensurePdfJs();
        const res = await authFetch(`${API}/api/pdfs/${id}/file`);
        if (!res || !res.ok) throw new Error('Failed to fetch PDF');
        const arrayBuffer = await res.arrayBuffer();

        const pdfjsLib = await getPdfJs();
        const loadTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
        pdfJsDoc = await loadTask.promise;
        totalPages = pdfJsDoc.numPages;

        document.getElementById('totalPagesLabel').textContent = totalPages;
        document.getElementById('pageInput').max = totalPages;
        document.getElementById('zoomLabel').textContent = Math.round(scale * 100) + '%';

        // Patch totalPages to backend (only if not already set)
        authFetch(`${API}/api/pdfs/${id}/totalPages`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ totalPages })
        });

        await buildPagePlaceholders();
        await loadAnnotations();

        const startPage = (currentPdfMeta && currentPdfMeta.lastPage > 1)
            ? currentPdfMeta.lastPage : 1;
        scrollToPage(startPage);
        setupScrollObserver();

    } catch (e) {
        showToast('Failed to open PDF: ' + e.message, 'error');
        closeReader();
    } finally {
        hideLoading();
    }

    setupHighlightListener();
}

function closeReader() {
    cancelNoteMode();
    hideColorPicker();
    if (progressSaveTimer) { clearTimeout(progressSaveTimer); progressSaveTimer = null; }
    pdfJsDoc = null;
    currentPdfId = null;
    allAnnotations = [];
    document.getElementById('pdfViewport').innerHTML = '';
    showView('library');
    loadLibrary();
}

/* ── PDF.js lazy load ──────────────────────────────────── */
let _pdfjsLib = null;
async function ensurePdfJs() {
    if (_pdfjsLib) return;
    await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.type = 'module';
        // We need a module-compatible dynamic import
        const script = document.createElement('script');
        script.type = 'module';
        script.textContent = `
            import * as pdfjsLib from '${PDFJS_CDN}';
            pdfjsLib.GlobalWorkerOptions.workerSrc = '${PDFJS_WORKER}';
            window.__pdfjsLib = pdfjsLib;
        `;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
        // Give module time to execute
        setTimeout(resolve, 1500);
    });
}

async function getPdfJs() {
    // Poll until __pdfjsLib is available (loaded via module script)
    for (let i = 0; i < 50; i++) {
        if (window.__pdfjsLib) return window.__pdfjsLib;
        await sleep(100);
    }
    throw new Error('PDF.js failed to load');
}

/* ── Page placeholders + rendering ────────────────────── */
async function buildPagePlaceholders() {
    const viewport = document.getElementById('pdfViewport');
    viewport.innerHTML = '';

    // Get page 1 to determine dimensions
    const firstPage = await pdfJsDoc.getPage(1);
    const vp = firstPage.getViewport({ scale });

    for (let n = 1; n <= totalPages; n++) {
        const container = document.createElement('div');
        container.className = 'pdf-page-container';
        container.dataset.page = n;
        container.dataset.rendered = 'false';
        container.style.width  = vp.width + 'px';
        container.style.height = vp.height + 'px';
        container.style.background = '#fff';

        const canvas = document.createElement('canvas');
        const annotLayer = document.createElement('div');
        annotLayer.className = 'annot-layer';

        container.appendChild(canvas);
        container.appendChild(annotLayer);
        viewport.appendChild(container);
    }

    // Render first few pages immediately
    for (let n = 1; n <= Math.min(3, totalPages); n++) {
        renderPage(n);
    }
}

async function renderPage(pageNum) {
    const container = document.querySelector(`.pdf-page-container[data-page="${pageNum}"]`);
    if (!container || container.dataset.rendered === 'true') return;
    container.dataset.rendered = 'true';

    const page = await pdfJsDoc.getPage(pageNum);
    const vp   = page.getViewport({ scale });

    const canvas  = container.querySelector('canvas');
    const ctx     = canvas.getContext('2d');
    canvas.width  = vp.width;
    canvas.height = vp.height;
    container.style.width  = vp.width  + 'px';
    container.style.height = vp.height + 'px';

    await page.render({ canvasContext: ctx, viewport: vp }).promise;

    drawAnnotationsForPage(pageNum, container, vp.width, vp.height);
}

async function rerenderAllPages() {
    // Mark all unrendered and re-render visible + nearby
    document.querySelectorAll('.pdf-page-container').forEach(c => {
        c.dataset.rendered = 'false';
    });
    for (let n = Math.max(1, currentPage - 1); n <= Math.min(totalPages, currentPage + 2); n++) {
        await renderPage(n);
    }
}

/* ── Scroll observer ───────────────────────────────────── */
let scrollObserver = null;

function setupScrollObserver() {
    if (scrollObserver) scrollObserver.disconnect();

    scrollObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const n = parseInt(entry.target.dataset.page);

            // Update current page display
            currentPage = n;
            document.getElementById('pageInput').value = n;

            // Render ±2 pages
            for (let i = n - 2; i <= n + 2; i++) {
                if (i >= 1 && i <= totalPages) renderPage(i);
            }

            scheduleProgressSave();
        });
    }, {
        root: document.getElementById('pdfViewport'),
        threshold: 0.3
    });

    document.querySelectorAll('.pdf-page-container').forEach(c => {
        scrollObserver.observe(c);
    });
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

/* ── Navigation helpers ────────────────────────────────── */
function scrollToPage(n) {
    const container = document.querySelector(`.pdf-page-container[data-page="${n}"]`);
    if (container) {
        container.scrollIntoView({ behavior: 'instant', block: 'start' });
        currentPage = n;
        document.getElementById('pageInput').value = n;
    }
}

function readerPageStep(delta) {
    const target = Math.max(1, Math.min(totalPages, currentPage + delta));
    scrollToPage(target);
}

function readerGoToPage(val) {
    const n = parseInt(val);
    if (n >= 1 && n <= totalPages) scrollToPage(n);
}

/* ── Zoom ──────────────────────────────────────────────── */
async function readerZoom(delta) {
    scale = Math.max(0.5, Math.min(4.0, scale + delta));
    document.getElementById('zoomLabel').textContent = Math.round(scale * 100) + '%';
    showLoading('Rendering…');
    try {
        await rerenderAllPages();
    } finally {
        hideLoading();
    }
}

/* ── Download ──────────────────────────────────────────── */
async function downloadCurrentPdf() {
    if (!currentPdfId) return;
    showLoading('Downloading…');
    try {
        const res = await authFetch(`${API}/api/pdfs/${currentPdfId}/file`);
        if (!res || !res.ok) throw new Error('Download failed');
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = currentPdfMeta ? currentPdfMeta.filename : 'document.pdf';
        a.click();
        URL.revokeObjectURL(url);
    } catch (e) {
        showToast('Download failed', 'error');
    } finally {
        hideLoading();
    }
}

/* ── Annotation sidebar ────────────────────────────────── */
function toggleAnnotSidebar() {
    const aside = document.getElementById('annotSidebar');
    aside.classList.toggle('hidden');
}

function renderAnnotSidebar() {
    const list = document.getElementById('annotSidebarList');
    if (!list) return;
    if (!allAnnotations.length) {
        list.innerHTML = '<div class="text-xs opacity-40 text-center py-4">No annotations yet</div>';
        return;
    }
    const sorted = [...allAnnotations].sort((a, b) => a.page - b.page);
    list.innerHTML = sorted.map(a => {
        if (a.type === 'HIGHLIGHT') {
            const dot = HIGHLIGHT_COLORS[a.color] || HIGHLIGHT_COLORS.yellow;
            return `
            <div class="flex items-start gap-2 p-2 rounded-lg border border-base-300 bg-base-200 text-xs cursor-pointer hover:bg-base-300"
                 onclick="scrollToPage(${a.page})">
                <span style="width:10px;height:10px;border-radius:50%;background:${dot};display:inline-block;flex-shrink:0;margin-top:2px;"></span>
                <div>
                    <div class="font-semibold opacity-50 mb-0.5">Page ${a.page} · Highlight</div>
                    <div class="opacity-70 line-clamp-2">${escHtml(truncate(a.selectedText || '', 80))}</div>
                </div>
            </div>`;
        } else {
            return `
            <div class="flex items-start gap-2 p-2 rounded-lg border border-base-300 bg-base-200 text-xs cursor-pointer hover:bg-base-300"
                 onclick="scrollToPage(${a.page}); openNoteView('${escHtml(a.id)}')">
                <span class="shrink-0 mt-0.5">📝</span>
                <div>
                    <div class="font-semibold opacity-50 mb-0.5">Page ${a.page} · Note</div>
                    <div class="opacity-70 line-clamp-2">${escHtml(truncate(a.text || '', 80))}</div>
                </div>
            </div>`;
        }
    }).join('');
}

/* ==========================================================
   ANNOTATIONS — Load & Draw
========================================================== */

async function loadAnnotations() {
    if (!currentPdfId) return;
    try {
        const res = await authFetch(`${API}/api/pdfs/${currentPdfId}/annotations`);
        if (res && res.ok) {
            allAnnotations = await res.json();
        }
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

    const pageAnnotations = allAnnotations.filter(a => a.page === pageNum);

    pageAnnotations.forEach(a => {
        if (a.type === 'HIGHLIGHT' && a.rects) {
            const bg = HIGHLIGHT_COLORS[a.color] || HIGHLIGHT_COLORS.yellow;
            a.rects.forEach(r => {
                const div = document.createElement('div');
                div.className = 'hl-rect';
                div.style.left   = (r.x * pageW) + 'px';
                div.style.top    = (r.y * pageH) + 'px';
                div.style.width  = (r.width * pageW) + 'px';
                div.style.height = (r.height * pageH) + 'px';
                div.style.background = bg;
                layer.appendChild(div);
            });
        } else if (a.type === 'NOTE') {
            const div = document.createElement('div');
            div.className = 'note-icon';
            div.textContent = '📝';
            div.style.left = (a.noteX * pageW) + 'px';
            div.style.top  = (a.noteY * pageH) + 'px';
            div.addEventListener('click', (e) => {
                e.stopPropagation();
                openNoteView(a.id);
            });
            layer.appendChild(div);
        }
    });
}

/* ==========================================================
   HIGHLIGHTS
========================================================== */

let _savedRange  = null;
let _savedPageEl = null;

function setupHighlightListener() {
    const viewport = document.getElementById('pdfViewport');
    if (!viewport) return;
    viewport.addEventListener('mouseup', onViewportMouseUp);
}

function onViewportMouseUp(e) {
    if (document.body.classList.contains('note-mode')) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
        hideColorPicker();
        return;
    }
    const range = selection.getRangeAt(0);
    if (!range || range.collapsed) return;

    // Find the page container that contains the selection
    const pageEl = range.startContainer.parentElement?.closest('.pdf-page-container');
    if (!pageEl) { hideColorPicker(); return; }

    _savedRange  = range;
    _savedPageEl = pageEl;

    showColorPicker(e.clientX, e.clientY);
}

function showColorPicker(x, y) {
    const cp = document.getElementById('colorPicker');
    cp.style.display = 'flex';
    cp.style.left = x + 'px';
    cp.style.top  = (y - 48) + 'px';
}

function hideColorPicker() {
    document.getElementById('colorPicker').style.display = 'none';
    _savedRange  = null;
    _savedPageEl = null;
}

async function saveHighlight(color) {
    hideColorPicker();
    if (!_savedRange || !_savedPageEl) return;

    const pageNum = parseInt(_savedPageEl.dataset.page);
    const canvas  = _savedPageEl.querySelector('canvas');
    const pageW   = canvas ? canvas.width  : _savedPageEl.offsetWidth;
    const pageH   = canvas ? canvas.height : _savedPageEl.offsetHeight;

    const containerRect = _savedPageEl.getBoundingClientRect();
    const clientRects   = Array.from(_savedRange.getClientRects());
    const selectedText  = _savedRange.toString();

    const rects = clientRects
        .filter(r => r.width > 0 && r.height > 0)
        .map(r => ({
            x:      (r.left - containerRect.left) / pageW,
            y:      (r.top  - containerRect.top)  / pageH,
            width:  r.width  / pageW,
            height: r.height / pageH,
        }));

    if (!rects.length) return;

    window.getSelection()?.removeAllRanges();

    try {
        const res = await authFetch(`${API}/api/pdfs/${currentPdfId}/annotations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'HIGHLIGHT',
                page: pageNum,
                color,
                selectedText,
                rects
            })
        });
        if (!res || !res.ok) throw new Error();
        const saved = await res.json();
        allAnnotations.push(saved);
        drawAnnotationsForPage(pageNum, _savedPageEl, pageW, pageH);
        renderAnnotSidebar();
    } catch (_) {
        showToast('Failed to save highlight', 'error');
    }
}

/* ==========================================================
   NOTES
========================================================== */

function startNoteMode() {
    document.body.classList.add('note-mode');
    document.getElementById('addNoteBtn').classList.add('btn-active');
    showToast('Click anywhere on a page to place a note', 'info', null, 3000);

    const viewport = document.getElementById('pdfViewport');
    viewport.addEventListener('click', onViewportClickForNote, { once: true });
}

function cancelNoteMode() {
    document.body.classList.remove('note-mode');
    const btn = document.getElementById('addNoteBtn');
    if (btn) btn.classList.remove('btn-active');
    const viewport = document.getElementById('pdfViewport');
    if (viewport) viewport.removeEventListener('click', onViewportClickForNote);
    pendingNotePosition = null;
}

function onViewportClickForNote(e) {
    document.body.classList.remove('note-mode');
    document.getElementById('addNoteBtn')?.classList.remove('btn-active');

    // Find which page was clicked
    const pageEl = e.target.closest('.pdf-page-container');
    if (!pageEl) { pendingNotePosition = null; return; }

    const pageNum = parseInt(pageEl.dataset.page);
    const canvas  = pageEl.querySelector('canvas');
    const pageW   = canvas ? canvas.width  : pageEl.offsetWidth;
    const pageH   = canvas ? canvas.height : pageEl.offsetHeight;

    const rect  = pageEl.getBoundingClientRect();
    const normX = (e.clientX - rect.left) / pageW;
    const normY = (e.clientY - rect.top)  / pageH;

    pendingNotePosition = { pdfId: currentPdfId, page: pageNum, normX, normY };

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

        // Redraw that page
        const container = document.querySelector(`.pdf-page-container[data-page="${page}"]`);
        if (container) {
            const canvas = container.querySelector('canvas');
            drawAnnotationsForPage(page, container, canvas ? canvas.width : container.offsetWidth, canvas ? canvas.height : container.offsetHeight);
        }
        renderAnnotSidebar();
    } catch (_) {
        showToast('Failed to save note', 'error');
    }
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
    closeModal('noteViewModal');

    const note = allAnnotations.find(a => a.id === viewingNoteId);
    try {
        const res = await authFetch(`${API}/api/pdfs/${currentPdfId}/annotations/${viewingNoteId}`, {
            method: 'DELETE'
        });
        if (!res || !res.ok) throw new Error();
        allAnnotations = allAnnotations.filter(a => a.id !== viewingNoteId);
        viewingNoteId = null;

        if (note) {
            const container = document.querySelector(`.pdf-page-container[data-page="${note.page}"]`);
            if (container) {
                const canvas = container.querySelector('canvas');
                drawAnnotationsForPage(note.page, container, canvas ? canvas.width : container.offsetWidth, canvas ? canvas.height : container.offsetHeight);
            }
        }
        renderAnnotSidebar();
    } catch (_) {
        showToast('Failed to delete note', 'error');
    }
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

/* ==========================================================
   UTILS
========================================================== */

function escHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}
