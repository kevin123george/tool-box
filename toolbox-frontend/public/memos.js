/* ===========================================================
   MEMOS PAGE
=============================================================*/

// Pagination state
let memoPage = { current: 0, total: 1, size: 10, totalElements: 0 };

// Quill editors
let quillMain = null;
let quillEdit = null;

/* Initialize Quill Editors */
document.addEventListener('DOMContentLoaded', function() {
    requireAuth();
    // Main editor
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

    // Edit editor
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

    // Load memos on page load
    loadMemos();
});

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
    const res = await authFetch(`${API}/api/memos?page=${page}&size=${size}`);
    const response = await res.json();
    const data = response.content;

    memoPage = {
        current: response.number,
        total: response.totalPages,
        size: response.size,
        totalElements: response.totalElements
    };

    updatePaginationControls('memo', memoPage);

    let html = '<div class="stats-grid">';

    data.forEach(m => {
        const plain = stripHtml(m.content || "");
        const short = truncate(plain, 80);

        html += `
        <div class="stat-card" style="text-align:left;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                <div style="font-weight:bold; font-size:14px; flex:1;">${m.title}</div>
                ${m.pinned ? '<div style="color:#f90; font-size:11px;">📌</div>' : ''}
            </div>
            <div style="font-size:10px; opacity:0.6; text-transform:uppercase; margin-bottom:8px;">${m.category}</div>
            <div style="font-size:12px; opacity:0.8; margin-bottom:10px; min-height:40px;">${short || "<i>(no content)</i>"}</div>
            <div style="display:flex; gap:4px; flex-wrap:wrap;">
                <button class="btn" style="flex:1; min-width:50px;" onclick="viewMemo('${m.id}')">VIEW</button>
                <button class="btn" style="flex:1; min-width:50px;" onclick="copyMemo('${m.id}')">COPY</button>
                <button class="btn" style="flex:1; min-width:50px;" onclick="showEditMemo('${m.id}')">EDIT</button>
                <button class="btn" style="flex:1; min-width:50px;" onclick="delMemo('${m.id}')">DEL</button>
            </div>
        </div>`;
    });

    html += '</div>';
    document.getElementById('memoList').innerHTML = html;
}

function memoChangePageSize() { loadMemos(0); }
function memoGoToPage(page) { loadMemos(page); }
function memoPrevPage() { if (memoPage.current > 0) loadMemos(memoPage.current - 1); }
function memoNextPage() { if (memoPage.current < memoPage.total - 1) loadMemos(memoPage.current + 1); }
function memoGoToLastPage() { loadMemos(memoPage.total - 1); }
function memoGoToInput() {
    const input = parseInt(document.getElementById('memoPageInput').value);
    if (input >= 1 && input <= memoPage.total) loadMemos(input - 1);
}

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

    document.getElementById('viewMemoTitle').textContent = m.title;
    document.getElementById('viewMemoContent').innerHTML = m.content;

    document.getElementById('viewMemoMeta').textContent = `Category: ${m.category}\nPinned: ${m.pinned ? 'Yes' : 'No'}`;

    if (m.media) {
        document.getElementById('viewMemoImage').src = `data:image/*;base64,${m.media}`;
        document.getElementById('viewMemoImageWrapper').style.display = "block";
    } else {
        document.getElementById('viewMemoImageWrapper').style.display = "none";
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
