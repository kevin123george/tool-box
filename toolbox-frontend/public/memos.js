/* ===========================================================
   MEMOS PAGE
=============================================================*/

// Pagination state
let memoPage = { current: 0, total: 1, size: 10, totalElements: 0 };
let memoActiveCategory = '';

// Category badge colours
const MEMO_CAT_BADGE = {
    personal: 'badge-info',
    work:     'badge-secondary',
    ideas:    'badge-warning',
    journal:  'badge-success',
};
const MEMO_CAT_BORDER = {
    personal: 'border-l-info',
    work:     'border-l-secondary',
    ideas:    'border-l-warning',
    journal:  'border-l-success',
};

// Quill editors
let quillMain = null;
let quillEdit = null;

/* Initialize Quill Editors */
(window.__pageInits = window.__pageInits || {}).memos = function () {
    requireAuth();
    // Re-create Quill instances on each page visit (DOM is replaced on SPA nav)
    quillMain = new Quill('#memoContent', {
        theme: 'snow',
        modules: {
            toolbar: [
                ['bold', 'italic', 'underline', 'strike'],
                ['blockquote', 'code-block'],
                [{ 'header': 1 }, { 'header': 2 }],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                [{ 'align': [] }],
                ['link'],
                ['clean']
            ]
        },
        placeholder: 'Write your memo content here...'
    });
    quillEdit = new Quill('#editMemoContent', {
        theme: 'snow',
        modules: {
            toolbar: [
                ['bold', 'italic', 'underline', 'strike'],
                ['blockquote', 'code-block'],
                [{ 'header': 1 }, { 'header': 2 }],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                [{ 'align': [] }],
                ['link'],
                ['clean']
            ]
        },
        placeholder: 'Edit memo content...'
    });
    loadMemos();
};

/* Escape key handler for memo modals */
document.addEventListener("keydown", function(e) {
    if (e.key === "Escape") {
        closeMemoModal();
        closeMemoViewModal();
    }
});

/* ===========================================================
   MEMO FUNCTIONS
=============================================================*/

async function loadMemos(page = 0) {
    const size = parseInt(document.getElementById('memoPageSize').value) || 10;
    const catParam = memoActiveCategory ? `&category=${memoActiveCategory}` : '';
    const res = await authFetch(`${API}/api/memos?page=${page}&size=${size}${catParam}`);
    const response = await res.json();
    const data = response.content;

    memoPage = {
        current: response.number,
        total: response.totalPages,
        size: response.size,
        totalElements: response.totalElements
    };

    // Update count badge & page info
    const countEl = document.getElementById('memoCountBadge');
    if (countEl) countEl.textContent = response.totalElements;

    const pageInfoEl = document.getElementById('memoPageInfo');
    if (pageInfoEl) pageInfoEl.textContent =
        `Page ${memoPage.current + 1} of ${memoPage.total} · ${memoPage.totalElements} memo${memoPage.totalElements !== 1 ? 's' : ''}`;

    const prevBtn = document.getElementById('memoPrevBtn');
    const nextBtn = document.getElementById('memoNextBtn');
    const totalEl = document.getElementById('memoTotalPagesSpan');
    if (prevBtn) prevBtn.disabled = memoPage.current === 0;
    if (nextBtn) nextBtn.disabled = memoPage.current >= memoPage.total - 1;
    if (totalEl) totalEl.textContent = `${memoPage.current + 1} / ${memoPage.total}`;

    if (!data.length) {
        document.getElementById('memoList').innerHTML =
            '<div class="card bg-base-200 p-8 text-center"><p class="opacity-30 text-sm">No memos yet. Create your first one!</p></div>';
        return;
    }

    document.getElementById('memoList').innerHTML = data.map(m => {
        const plain   = stripHtml(m.content || '');
        const short   = truncate(plain, 120);
        const cat     = (m.category || 'personal').toLowerCase();
        const badge   = MEMO_CAT_BADGE[cat]  || 'badge-neutral';
        const border  = MEMO_CAT_BORDER[cat] || 'border-l-neutral';
        const dateStr = m.createdAt
            ? new Date(m.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            : '';

        return `
        <div class="card bg-base-200 shadow-sm border-l-4 ${border} hover:shadow-md transition-shadow">
            <div class="card-body p-4">
                <div class="flex items-start gap-2 mb-1">
                    ${m.pinned ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4 text-warning shrink-0 mt-0.5"><path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clip-rule="evenodd"/></svg>` : ''}
                    <h3 class="font-semibold text-base leading-snug flex-1">${m.title}</h3>
                    <span class="badge badge-sm ${badge} shrink-0">${cat}</span>
                </div>
                ${short ? `<p class="text-sm opacity-60 leading-relaxed line-clamp-2 mb-2">${short}</p>` : '<p class="text-sm opacity-25 italic mb-2">(no content)</p>'}
                <div class="flex items-center justify-between gap-2 mt-1">
                    <span class="text-xs opacity-30">${dateStr}</span>
                    <div class="flex gap-1">
                        <button class="btn btn-ghost btn-xs" onclick="viewMemo('${m.id}')">View</button>
                        <button class="btn btn-ghost btn-xs" onclick="copyMemo('${m.id}')">Copy</button>
                        <button class="btn btn-ghost btn-xs" onclick="showEditMemo('${m.id}')">Edit</button>
                        <button class="btn btn-ghost btn-xs text-error" onclick="delMemo('${m.id}')">Del</button>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');
}

function filterMemosByCategory(btn) {
    memoActiveCategory = btn.dataset.cat;
    document.querySelectorAll('#memoCategoryFilter button').forEach(b => {
        b.classList.remove('btn-primary');
        b.classList.add('btn-ghost');
    });
    btn.classList.remove('btn-ghost');
    btn.classList.add('btn-primary');
    loadMemos(0);
}

function memoChangePageSize() { loadMemos(0); }
function memoPrevPage() { if (memoPage.current > 0) loadMemos(memoPage.current - 1); }
function memoNextPage() { if (memoPage.current < memoPage.total - 1) loadMemos(memoPage.current + 1); }

async function addMemo() {
    const form = new FormData();
    form.append("title", document.getElementById('memoTitle').value);
    form.append("content", quillMain.root.innerHTML);
    form.append("category", document.getElementById('memoCategory').value);
    form.append("pinned", document.getElementById('memoPinned').checked);

    const file = document.getElementById('memoFile').files[0];
    if (file) form.append("media", file);

    await authFetch(`${API}/api/memos/upload`, { method: "POST", body: form });

    document.getElementById('memoTitle').value = "";
    quillMain.setContents([]);
    document.getElementById('memoPinned').checked = false;
    document.getElementById('memoFile').value = "";
    loadMemos(0);
}

async function delMemo(id) {
    await authFetch(`${API}/api/memos/${id}`, { method: "DELETE" });
    loadMemos(memoPage.current);
}

async function viewMemo(id) {
    const res = await authFetch(`${API}/api/memos/${id}`);
    const m = await res.json();

    const cat   = (m.category || 'personal').toLowerCase();
    const badge = MEMO_CAT_BADGE[cat] || 'badge-neutral';
    const dateStr = m.createdAt
        ? new Date(m.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : '';

    document.getElementById('viewMemoTitle').textContent = m.title;
    document.getElementById('viewMemoMeta').innerHTML = `
        <span class="badge badge-sm ${badge}">${cat}</span>
        ${m.pinned ? `<span class="badge badge-sm badge-warning">Pinned</span>` : ''}
        ${dateStr ? `<span class="text-xs opacity-30">${dateStr}</span>` : ''}
    `;
    document.getElementById('viewMemoContent').innerHTML = m.content || '<em class="opacity-30">No content</em>';

    const imgWrapper = document.getElementById('viewMemoImageWrapper');
    if (m.media) {
        document.getElementById('viewMemoImage').src = `data:image/*;base64,${m.media}`;
        imgWrapper.classList.remove('hidden');
    } else {
        imgWrapper.classList.add('hidden');
    }

    openModal("memoViewModal");
}

function closeMemoViewModal() { closeModal("memoViewModal"); }

async function copyMemo(id) {
    try {
        const res = await authFetch(`${API}/api/memos/${id}`);
        const m = await res.json();
        const temp = document.createElement("div");
        temp.innerHTML = m.title + " - " + (m.content || "");
        await navigator.clipboard.writeText(temp.innerText);
        showToast("Memo copied to clipboard!", "success");
    } catch (e) {
        showToast("Failed to copy memo: " + e.message, "error");
    }
}

let editingMemoId = null;

async function showEditMemo(id) {
    editingMemoId = id;

    const res = await authFetch(`${API}/api/memos/${id}`);
    const m = await res.json();

    document.getElementById('editMemoTitle').value = m.title;
    quillEdit.root.innerHTML = m.content || "";
    document.getElementById('editMemoCategory').value = m.category;
    document.getElementById('editMemoPinned').checked = m.pinned;
    document.getElementById('editMemoFile').value = "";

    openModal("memoModal");
}

function closeMemoModal() {
    editingMemoId = null;
    document.getElementById('editMemoFile').value = "";
    closeModal("memoModal");
}

async function saveMemoEdit() {
    const form = new FormData();
    form.append("title", document.getElementById('editMemoTitle').value);
    form.append("content", quillEdit.root.innerHTML);
    form.append("category", document.getElementById('editMemoCategory').value);
    form.append("pinned", document.getElementById('editMemoPinned').checked);

    const file = document.getElementById('editMemoFile').files[0];
    if (file) form.append("media", file);

    await authFetch(`${API}/api/memos/upload/${editingMemoId}`, {
        method: "PUT",
        body: form
    });

    closeMemoModal();
    loadMemos(memoPage.current);
}
