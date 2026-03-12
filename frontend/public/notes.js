/* =============================================================
   Notes — Obsidian-like markdown note-taking
   SPA page script — registers under key "notes"
============================================================= */

// ─── State ────────────────────────────────────────────────
let notes = [];
let folders = [];
let activeFolderId = null;
let activeTag = null;
let activeNote = null;
let easyMDE = null;
let saveTimer = null;
let searchTimer = null;
let currentEditorMode = 'edit';
let isSaving = false;

// ─── Page registration ────────────────────────────────────
(window.__pageInits = window.__pageInits || {}).notes = function () {
    requireAuth();
    initNotes();
};

window.__pageCleanup = function () {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    if (searchTimer) { clearTimeout(searchTimer); searchTimer = null; }
    destroyEasyMDE();
};

// ─── Init ─────────────────────────────────────────────────
async function initNotes() {
    await Promise.all([loadFolders(), loadNotes()]);
}

// ─── Load folders ─────────────────────────────────────────
async function loadFolders() {
    try {
        const res = await authFetch(API + '/api/notes/folders');
        if (!res || !res.ok) return;
        folders = await res.json();
        renderFolderTree();
    } catch (e) {
        console.error('loadFolders error', e);
    }
}

// ─── Load notes ───────────────────────────────────────────
async function loadNotes(folderId, tag, search) {
    folderId = folderId !== undefined ? folderId : activeFolderId;
    tag = tag !== undefined ? tag : activeTag;

    const params = new URLSearchParams({ page: 0, size: 200 });
    if (folderId) params.set('folderId', folderId);
    if (tag) params.set('tag', tag);
    if (search) params.set('search', search);

    try {
        const res = await authFetch(API + '/api/notes?' + params.toString());
        if (!res || !res.ok) return;
        const data = await res.json();
        notes = data.content || [];
        renderNoteList();
        updateAllNotesCount();
    } catch (e) {
        console.error('loadNotes error', e);
    }
}

// ─── Render folder tree ───────────────────────────────────
function renderFolderTree() {
    // All Notes button active state
    const allBtn = document.getElementById('allNotesBtn');
    if (allBtn) {
        allBtn.className = `w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-none transition-colors text-left ${
            activeFolderId === null && activeTag === null
                ? 'bg-primary/10 text-primary font-medium'
                : 'hover:bg-base-200'
        }`;
    }

    const folderListEl = document.getElementById('folderList');
    if (!folderListEl) return;

    if (folders.length === 0) {
        folderListEl.innerHTML = `<p class="px-3 py-2 text-xs opacity-30 italic">No folders yet</p>`;
    } else {
        folderListEl.innerHTML = folders.map(f => {
            const isActive = activeFolderId === f.id && activeTag === null;
            const noteCount = notes.filter(n => n.folderId === f.id).length;
            return `
            <div class="group flex items-center gap-1.5 px-3 py-1.5 cursor-pointer text-sm transition-colors rounded-none ${
                isActive ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-base-200'
            }" onclick="selectFolder('${f.id}')">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 shrink-0 opacity-50">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v8.25A2.25 2.25 0 0 0 4.5 16.5h15a2.25 2.25 0 0 0 2.25-2.25v-9A2.25 2.25 0 0 0 19.5 6H14.81l-2.25-1.69Z"/>
                </svg>
                <span class="flex-1 truncate">${escHtml(f.name)}</span>
                <span class="text-[10px] opacity-40 font-mono">${noteCount}</span>
                <button
                    class="btn btn-ghost btn-xs btn-square opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0"
                    title="Delete folder"
                    onclick="event.stopPropagation(); confirmDeleteFolder('${f.id}', '${escHtml(f.name)}')">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3 h-3 text-error">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>`;
        }).join('');
    }

    // Tags
    const allTags = [...new Set(notes.flatMap(n => n.tags || []))].sort();
    const tagListEl = document.getElementById('tagList');
    if (tagListEl) {
        if (allTags.length === 0) {
            tagListEl.innerHTML = `<span class="text-[10px] opacity-25 italic">No tags</span>`;
        } else {
            tagListEl.innerHTML = allTags.map(tag => `
                <span
                    class="badge badge-sm cursor-pointer select-none transition-colors ${activeTag === tag ? 'badge-primary' : 'badge-ghost hover:badge-primary'}"
                    onclick="selectTag('${escHtml(tag)}')">${escHtml(tag)}</span>
            `).join('');
        }
    }
}

function updateAllNotesCount() {
    const el = document.getElementById('allNotesCount');
    if (el) el.textContent = notes.length;
}

// ─── Render note list ─────────────────────────────────────
function renderNoteList() {
    const listEl = document.getElementById('noteList');
    if (!listEl) return;

    if (notes.length === 0) {
        listEl.innerHTML = `
            <div class="flex flex-col items-center justify-center py-10 px-4 text-center opacity-40">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" class="w-10 h-10 mb-3">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"/>
                </svg>
                <p class="text-xs">No notes yet</p>
            </div>`;
        return;
    }

    listEl.innerHTML = notes.map(note => {
        const isActive = activeNote && activeNote.id === note.id;
        const preview = getContentPreview(note.content);
        const dateStr = relativeDate(note.updatedAt || note.createdAt);
        const tags = (note.tags || []).slice(0, 3);

        return `
        <div
            class="note-list-item border-b border-base-200 px-3 py-3 cursor-pointer transition-colors ${
                isActive ? 'bg-primary/10 border-l-2 border-l-primary' : 'hover:bg-base-200'
            }"
            onclick="selectNote(${JSON.stringify(note).replace(/"/g, '&quot;')})">
            <div class="font-semibold text-sm truncate leading-tight mb-0.5">${escHtml(note.title || 'Untitled')}</div>
            <div class="text-xs opacity-50 line-clamp-2 leading-relaxed mb-1.5">${escHtml(preview)}</div>
            <div class="flex items-center justify-between gap-1">
                <div class="flex gap-1 flex-wrap">
                    ${tags.map(t => `<span class="badge badge-xs badge-ghost opacity-60">${escHtml(t)}</span>`).join('')}
                </div>
                <span class="text-[10px] opacity-30 font-mono shrink-0">${dateStr}</span>
            </div>
        </div>`;
    }).join('');
}

function getContentPreview(content) {
    if (!content) return '';
    // Strip markdown syntax for preview
    return content
        .replace(/#{1,6}\s/g, '')
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/~~(.+?)~~/g, '$1')
        .replace(/`{1,3}[^`]*`{1,3}/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
        .replace(/^[-*+]\s/gm, '')
        .replace(/^\d+\.\s/gm, '')
        .replace(/^>\s/gm, '')
        .replace(/\[\[([^\]]+)\]\]/g, '$1')
        .replace(/\n+/g, ' ')
        .trim()
        .slice(0, 160);
}

// ─── Select folder / tag ──────────────────────────────────
function selectFolder(folderId) {
    activeFolderId = folderId;
    activeTag = null;
    const searchInput = document.getElementById('noteSearchInput');
    if (searchInput) searchInput.value = '';
    loadNotes(folderId, null, null).then(() => {
        renderFolderTree();
    });
}

function selectTag(tag) {
    activeTag = activeTag === tag ? null : tag;
    activeFolderId = null;
    const searchInput = document.getElementById('noteSearchInput');
    if (searchInput) searchInput.value = '';
    loadNotes(null, activeTag, null).then(() => {
        renderFolderTree();
    });
}

// ─── Select / open note ───────────────────────────────────
function selectNote(note) {
    // note might be a string ID or object
    if (typeof note === 'string') {
        note = notes.find(n => n.id === note);
        if (!note) return;
    }

    activeNote = note;
    renderNoteList();
    openEditor(note);
}

function openEditor(note) {
    const emptyState = document.getElementById('editorEmptyState');
    const editorContent = document.getElementById('editorContent');
    if (emptyState) emptyState.classList.add('hidden');
    if (editorContent) editorContent.classList.remove('hidden');

    // Set title
    const titleInput = document.getElementById('noteTitleInput');
    if (titleInput) titleInput.value = note.title || '';

    // Render tags
    renderNoteTags(note.tags || []);

    // Init or update EasyMDE
    initEasyMDE(note.content || '');

    // Update word count
    updateWordCount(note.content || '');

    // Clear saved indicator
    const savedEl = document.getElementById('lastSavedDisplay');
    if (savedEl) savedEl.textContent = '';
}

// ─── New note ─────────────────────────────────────────────
async function newNote() {
    const note = {
        title: 'Untitled',
        content: '',
        folderId: activeFolderId || null,
        tags: []
    };
    try {
        const res = await authFetch(API + '/api/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(note)
        });
        if (!res || !res.ok) { showToast('Failed to create note', 'error'); return; }
        const created = await res.json();
        notes.unshift(created);
        renderNoteList();
        renderFolderTree();
        selectNote(created);
        // Focus title
        setTimeout(() => {
            const t = document.getElementById('noteTitleInput');
            if (t) { t.focus(); t.select(); }
        }, 100);
    } catch (e) {
        console.error('newNote error', e);
        showToast('Failed to create note', 'error');
    }
}

// ─── Save note ────────────────────────────────────────────
async function saveNote() {
    if (!activeNote || isSaving) return;
    isSaving = true;

    const title = document.getElementById('noteTitleInput')?.value || 'Untitled';
    const content = easyMDE ? easyMDE.value() : '';

    const payload = {
        title,
        content,
        folderId: activeNote.folderId || null,
        tags: activeNote.tags || []
    };

    try {
        const res = await authFetch(API + '/api/notes/' + activeNote.id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res && res.ok) {
            const updated = await res.json();
            activeNote = updated;
            // Update in list
            const idx = notes.findIndex(n => n.id === updated.id);
            if (idx !== -1) notes[idx] = updated;
            else notes.unshift(updated);
            renderNoteList();
            renderFolderTree();

            // Show saved time
            const savedEl = document.getElementById('lastSavedDisplay');
            if (savedEl) savedEl.textContent = 'Saved ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            // Update preview if in split/preview mode
            if (currentEditorMode !== 'edit') {
                updatePreview();
            }
        }
    } catch (e) {
        console.error('saveNote error', e);
    } finally {
        isSaving = false;
    }
}

// ─── Delete note ──────────────────────────────────────────
function confirmDeleteNote() {
    if (!activeNote) return;
    if (!confirm(`Delete "${activeNote.title || 'Untitled'}"? This cannot be undone.`)) return;
    deleteNote(activeNote.id);
}

async function deleteNote(id) {
    try {
        const res = await authFetch(API + '/api/notes/' + id, { method: 'DELETE' });
        if (!res) return;
        notes = notes.filter(n => n.id !== id);
        if (activeNote && activeNote.id === id) {
            activeNote = null;
            closeEditor();
        }
        renderNoteList();
        renderFolderTree();
        showToast('Note deleted', 'success');
    } catch (e) {
        console.error('deleteNote error', e);
        showToast('Failed to delete note', 'error');
    }
}

function closeEditor() {
    const emptyState = document.getElementById('editorEmptyState');
    const editorContent = document.getElementById('editorContent');
    if (emptyState) emptyState.classList.remove('hidden');
    if (editorContent) editorContent.classList.add('hidden');
    destroyEasyMDE();
}

// ─── Folders ──────────────────────────────────────────────
function promptNewFolder() {
    const modal = document.getElementById('newFolderModal');
    const input = document.getElementById('newFolderNameInput');
    if (input) input.value = '';
    if (modal) modal.showModal();
    setTimeout(() => input && input.focus(), 50);
}

async function submitNewFolder() {
    const input = document.getElementById('newFolderNameInput');
    const name = input?.value?.trim();
    if (!name) return;
    await createFolder(name);
    document.getElementById('newFolderModal')?.close();
}

async function createFolder(name) {
    try {
        const res = await authFetch(API + '/api/notes/folders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        if (!res || !res.ok) { showToast('Failed to create folder', 'error'); return; }
        const folder = await res.json();
        folders.push(folder);
        renderFolderTree();
        showToast('Folder created', 'success');
    } catch (e) {
        console.error('createFolder error', e);
        showToast('Failed to create folder', 'error');
    }
}

function confirmDeleteFolder(id, name) {
    if (!confirm(`Delete folder "${name}"? Notes inside will be moved to All Notes.`)) return;
    deleteFolder(id);
}

async function deleteFolder(id) {
    try {
        const res = await authFetch(API + '/api/notes/folders/' + id, { method: 'DELETE' });
        if (!res) return;
        folders = folders.filter(f => f.id !== id);
        if (activeFolderId === id) {
            activeFolderId = null;
        }
        // Reload notes to reflect unlinked folderId
        await loadNotes();
        renderFolderTree();
        showToast('Folder deleted', 'success');
    } catch (e) {
        console.error('deleteFolder error', e);
        showToast('Failed to delete folder', 'error');
    }
}

// ─── Tags on active note ──────────────────────────────────
function renderNoteTags(tags) {
    const row = document.getElementById('noteTagsRow');
    if (!row) return;
    row.innerHTML = (tags || []).map(t => `
        <span class="badge badge-sm badge-ghost gap-1">
            ${escHtml(t)}
            <button class="opacity-50 hover:opacity-100" onclick="removeTagFromNote('${escHtml(t)}')" title="Remove tag">×</button>
        </span>
    `).join('') + `
        <button class="btn btn-ghost btn-xs gap-0.5 opacity-40 hover:opacity-100 text-xs" onclick="promptAddTag()">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3 h-3">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
            </svg>
            tag
        </button>`;
}

function promptAddTag() {
    if (!activeNote) return;
    const modal = document.getElementById('addTagModal');
    const input = document.getElementById('addTagInput');
    if (input) input.value = '';
    if (modal) modal.showModal();
    setTimeout(() => input && input.focus(), 50);
}

async function submitAddTag() {
    const input = document.getElementById('addTagInput');
    const tag = input?.value?.trim();
    if (!tag || !activeNote) return;
    document.getElementById('addTagModal')?.close();
    const tags = [...new Set([...(activeNote.tags || []), tag])];
    activeNote.tags = tags;
    renderNoteTags(tags);
    scheduleSave();
}

async function removeTagFromNote(tag) {
    if (!activeNote) return;
    activeNote.tags = (activeNote.tags || []).filter(t => t !== tag);
    renderNoteTags(activeNote.tags);
    scheduleSave();
}

// ─── EasyMDE ──────────────────────────────────────────────
function initEasyMDE(initialValue) {
    destroyEasyMDE();

    const textarea = document.getElementById('noteEditorTextarea');
    if (!textarea) return;

    easyMDE = new EasyMDE({
        element: textarea,
        toolbar: false,
        status: false,
        autofocus: true,
        spellChecker: false,
        minHeight: '100%',
        initialValue: initialValue || '',
        shortcuts: {
            toggleBold: 'Ctrl-B',
            toggleItalic: 'Ctrl-I',
        }
    });

    // Listen for changes
    easyMDE.codemirror.on('change', () => {
        updateWordCount(easyMDE.value());
        scheduleSave();
        if (currentEditorMode !== 'edit') {
            updatePreview();
        }
    });
}

function destroyEasyMDE() {
    if (easyMDE) {
        try {
            easyMDE.toTextArea();
        } catch (e) { /* ignore */ }
        easyMDE = null;
    }
}

// ─── Editor mode ──────────────────────────────────────────
function setEditorMode(mode) {
    currentEditorMode = mode;
    const mdeWrapper = document.getElementById('editorMdeWrapper');
    const previewPane = document.getElementById('editorPreviewPane');
    const editBtn = document.getElementById('modeEditBtn');
    const splitBtn = document.getElementById('modeSplitBtn');
    const previewBtn = document.getElementById('modePreviewBtn');

    // Reset button styles
    [editBtn, splitBtn, previewBtn].forEach(b => {
        if (b) b.className = 'join-item btn btn-xs btn-ghost';
    });

    if (mode === 'edit') {
        if (editBtn) editBtn.className = 'join-item btn btn-xs btn-primary';
        if (mdeWrapper) { mdeWrapper.classList.remove('hidden'); mdeWrapper.style.width = '100%'; }
        if (previewPane) previewPane.classList.add('hidden');
    } else if (mode === 'split') {
        if (splitBtn) splitBtn.className = 'join-item btn btn-xs btn-primary';
        if (mdeWrapper) { mdeWrapper.classList.remove('hidden'); mdeWrapper.style.width = '50%'; }
        if (previewPane) { previewPane.classList.remove('hidden'); previewPane.style.width = '50%'; }
        updatePreview();
    } else if (mode === 'preview') {
        if (previewBtn) previewBtn.className = 'join-item btn btn-xs btn-primary';
        if (mdeWrapper) mdeWrapper.classList.add('hidden');
        if (previewPane) { previewPane.classList.remove('hidden'); previewPane.style.width = '100%'; }
        updatePreview();
    }

    // Refresh CodeMirror when becoming visible
    if (mode !== 'preview' && easyMDE) {
        setTimeout(() => easyMDE.codemirror.refresh(), 10);
    }
}

// ─── Preview rendering ────────────────────────────────────
function updatePreview() {
    const pane = document.getElementById('editorPreviewPane');
    if (!pane) return;
    const content = easyMDE ? easyMDE.value() : (activeNote?.content || '');
    pane.innerHTML = renderPreview(content);
}

function renderPreview(content) {
    if (!content) return '<p class="opacity-30 text-sm italic">Nothing to preview</p>';

    // Replace [[wikilinks]] before parsing markdown
    const withWikilinks = content.replace(/\[\[([^\]]+)\]\]/g, (_, title) => {
        const safe = title.replace(/"/g, '&quot;');
        return `<span class="wikilink" onclick="searchAndOpenNote(&quot;${safe}&quot;)">${escHtml(title)}</span>`;
    });

    if (typeof marked !== 'undefined') {
        return marked.parse(withWikilinks);
    }
    // Fallback: basic paragraph rendering
    return '<pre>' + escHtml(content) + '</pre>';
}

window.searchAndOpenNote = function (title) {
    const found = notes.find(n => n.title && n.title.toLowerCase() === title.toLowerCase());
    if (found) {
        selectNote(found);
    } else {
        // Load search
        const searchInput = document.getElementById('noteSearchInput');
        if (searchInput) {
            searchInput.value = title;
            debounceSearch(title);
        }
        showToast(`No note found: "${title}"`, 'warning');
    }
};

// ─── Word count ───────────────────────────────────────────
function updateWordCount(content) {
    const el = document.getElementById('wordCountDisplay');
    if (!el) return;
    if (!content) { el.textContent = '0 words'; return; }
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    el.textContent = words + (words === 1 ? ' word' : ' words');
}

// ─── Auto-save debounce ───────────────────────────────────
function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        saveNote();
        saveTimer = null;
    }, 1500);
}

// ─── Search debounce ──────────────────────────────────────
function debounceSearch(value) {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        if (value.trim()) {
            activeFolderId = null;
            activeTag = null;
            loadNotes(null, null, value.trim()).then(renderFolderTree);
        } else {
            loadNotes(activeFolderId, activeTag, null).then(renderFolderTree);
        }
        searchTimer = null;
    }, 300);
}

// ─── Helpers ──────────────────────────────────────────────
function escHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function relativeDate(iso) {
    if (!iso) return '';
    const now = Date.now();
    const then = new Date(iso).getTime();
    const diff = now - then;
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const days = Math.floor(hr / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
