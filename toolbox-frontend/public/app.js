const API = "";
let currentGoalId = null;
let editingHoldingId = null;
let editingWatchlistId = null;
let stocksRefreshInterval = null;
let historyRefreshInterval = null;

// Pagination state
let memoPage = { current: 0, total: 1, size: 10, totalElements: 0 };
let financePage = { current: 0, total: 1, size: 10, totalElements: 0 };

/* ===========================================================
   TOAST NOTIFICATION SYSTEM
=============================================================*/

function showToast(message, type = 'info', title = null, duration = 4000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };

    const titles = {
        success: 'Success',
        error: 'Error',
        warning: 'Warning',
        info: 'Info'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <div class="toast-content">
            <div class="toast-title">${title || titles[type] || titles.info}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="closeToast(this.parentElement)" aria-label="Close notification">&times;</button>
    `;

    container.appendChild(toast);

    // Auto-remove after duration
    if (duration > 0) {
        setTimeout(() => closeToast(toast), duration);
    }

    return toast;
}

function closeToast(toast) {
    if (!toast || toast.classList.contains('hiding')) return;
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 300);
}

/* ===========================================================
   LOADING STATE MANAGEMENT
=============================================================*/

function showLoading(text = 'Loading...') {
    const overlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    if (overlay) {
        overlay.classList.add('active');
        if (loadingText) loadingText.textContent = text;
    }
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
}

function setButtonLoading(button, loading) {
    if (!button) return;
    if (loading) {
        button.classList.add('loading');
        button.disabled = true;
        button.dataset.originalText = button.textContent;
        button.textContent = '';
    } else {
        button.classList.remove('loading');
        button.disabled = false;
        if (button.dataset.originalText) {
            button.textContent = button.dataset.originalText;
        }
    }
}

/* ===========================================================
   DASHBOARD
=============================================================*/

async function loadDashboard() {
    try {
        // Fetch dashboard data from API
        const res = await fetch(`${API}/api/dashboard`);
        if (!res.ok) {
            // If endpoint doesn't exist yet, aggregate locally
            await loadDashboardFallback();
            return;
        }
        const data = await res.json();
        renderDashboard(data);
    } catch (e) {
        console.error("Failed to load dashboard:", e);
        await loadDashboardFallback();
    }
}

async function loadDashboardFallback() {
    try {
        // Aggregate data from existing endpoints
        let totalCash = 0;
        let portfolioValue = 0;
        let portfolioInvested = 0;
        let budgetData = null;
        let goalData = null;

        // Fetch finance summary
        try {
            const finRes = await fetch(`${API}/api/finance/summary`);
            if (finRes.ok) {
                const finData = await finRes.json();
                totalCash = finData.totalBalance || 0;
            }
        } catch (e) { console.error('Finance fetch error:', e); }

        // Fetch stock stats
        try {
            const stockRes = await fetch(`${API}/api/stocks/stats`);
            if (stockRes.ok) {
                const stockData = await stockRes.json();
                portfolioValue = stockData.currentValue || 0;
                portfolioInvested = stockData.totalInvested || 0;
            }
        } catch (e) { console.error('Stock fetch error:', e); }

        // Fetch current month budget
        try {
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth() + 1;
            const budgetRes = await fetch(`${API}/api/budget/${year}/${month}`);
            if (budgetRes.ok) {
                budgetData = await budgetRes.json();
            }
        } catch (e) { console.error('Budget fetch error:', e); }

        // Fetch first goal
        try {
            const goalsRes = await fetch(`${API}/api/goal`);
            if (goalsRes.ok) {
                const goals = await goalsRes.json();
                if (goals.length > 0) {
                    const goalRes = await fetch(`${API}/api/goal/${goals[0].id}`);
                    if (goalRes.ok) {
                        goalData = await goalRes.json();
                    }
                }
            }
        } catch (e) { console.error('Goal fetch error:', e); }

        // Render dashboard with aggregated data
        const netWorth = totalCash + portfolioValue;
        const portfolioReturn = portfolioInvested > 0
            ? ((portfolioValue - portfolioInvested) / portfolioInvested * 100)
            : 0;

        document.getElementById('dashTotalCash').textContent = '€' + totalCash.toFixed(2);
        document.getElementById('dashPortfolioValue').textContent = '€' + portfolioValue.toFixed(2);
        document.getElementById('dashNetWorth').textContent = '€' + netWorth.toFixed(2);

        const returnEl = document.getElementById('dashPortfolioReturn');
        returnEl.textContent = (portfolioReturn >= 0 ? '+' : '') + portfolioReturn.toFixed(2) + '%';
        returnEl.className = 'stat-value ' + (portfolioReturn >= 0 ? 'positive' : 'negative');

        // Budget data
        if (budgetData) {
            document.getElementById('dashBudgetIncome').textContent = '€' + (budgetData.totalIncome || 0).toFixed(2);
            document.getElementById('dashBudgetExpenses').textContent = '€' + (budgetData.totalExpenses || 0).toFixed(2);
            const savings = (budgetData.totalIncome || 0) - (budgetData.totalExpenses || 0);
            const savingsEl = document.getElementById('dashBudgetSavings');
            savingsEl.textContent = '€' + savings.toFixed(2);
            savingsEl.style.color = savings >= 0 ? '#0f0' : '#f33';

            const adherence = budgetData.budgetAdherence || 100;
            document.getElementById('dashBudgetBar').style.width = Math.min(adherence, 100) + '%';
            document.getElementById('dashBudgetBar').style.background = adherence > 100 ? '#f33' : '#0f0';
            document.getElementById('dashBudgetPercent').textContent = adherence.toFixed(1) + '%';
        }

        // Goal data
        if (goalData) {
            document.getElementById('dashGoalCurrent').textContent = '€' + (goalData.currentCorpus || 0).toFixed(2);
            document.getElementById('dashGoalTarget').textContent = '€' + (goalData.requiredCorpus || 0).toFixed(2);
            document.getElementById('dashGoalFireAge').textContent = goalData.goalAchievedAge || '--';

            const progress = goalData.requiredCorpus > 0
                ? (goalData.currentCorpus / goalData.requiredCorpus * 100)
                : 0;
            document.getElementById('dashGoalBar').style.width = Math.min(progress, 100) + '%';
            document.getElementById('dashGoalPercent').textContent = progress.toFixed(1) + '%';
        }

        // Fitness data
        try {
            const fitnessRes = await fetch(`${API}/api/fitness/stats`);
            if (fitnessRes.ok) {
                const fitnessData = await fitnessRes.json();
                document.getElementById('dashFitnessStreak').textContent = (fitnessData.currentStreak || 0) + ' days';
                document.getElementById('dashFitnessWeek').textContent = (fitnessData.thisWeekWorkouts || 0) + ' workouts';

                const weightChangeEl = document.getElementById('dashWeightChange');
                if (fitnessData.weightChange != null) {
                    const change = fitnessData.weightChange;
                    weightChangeEl.textContent = (change >= 0 ? '+' : '') + change.toFixed(1) + ' kg';
                    weightChangeEl.className = 'stat-value ' + (change <= 0 ? 'positive' : 'negative');
                }
            }

            const weightRes = await fetch(`${API}/api/fitness/weight/latest`);
            if (weightRes.ok) {
                const weightData = await weightRes.json();
                document.getElementById('dashCurrentWeight').textContent = weightData.weight.toFixed(1) + ' kg';
            }
        } catch (e) { console.error('Fitness fetch error:', e); }
    } catch (e) {
        console.error("Failed to load dashboard fallback:", e);
        showToast("Failed to load dashboard data", "error");
    }
}

function renderDashboard(data) {
    document.getElementById('dashTotalCash').textContent = '€' + (data.totalCash || 0).toFixed(2);
    document.getElementById('dashPortfolioValue').textContent = '€' + (data.portfolioValue || 0).toFixed(2);
    document.getElementById('dashNetWorth').textContent = '€' + (data.netWorth || 0).toFixed(2);

    const returnEl = document.getElementById('dashPortfolioReturn');
    const portfolioReturn = data.portfolioReturn || 0;
    returnEl.textContent = (portfolioReturn >= 0 ? '+' : '') + portfolioReturn.toFixed(2) + '%';
    returnEl.className = 'stat-value ' + (portfolioReturn >= 0 ? 'positive' : 'negative');

    // Budget
    document.getElementById('dashBudgetIncome').textContent = '€' + (data.budgetIncome || 0).toFixed(2);
    document.getElementById('dashBudgetExpenses').textContent = '€' + (data.budgetExpenses || 0).toFixed(2);
    const savings = (data.budgetIncome || 0) - (data.budgetExpenses || 0);
    const savingsEl = document.getElementById('dashBudgetSavings');
    savingsEl.textContent = '€' + savings.toFixed(2);
    savingsEl.style.color = savings >= 0 ? '#0f0' : '#f33';

    const adherence = data.budgetAdherence || 100;
    document.getElementById('dashBudgetBar').style.width = Math.min(adherence, 100) + '%';
    document.getElementById('dashBudgetBar').style.background = adherence > 100 ? '#f33' : '#0f0';
    document.getElementById('dashBudgetPercent').textContent = adherence.toFixed(1) + '%';

    // Goal
    document.getElementById('dashGoalCurrent').textContent = '€' + (data.goalCurrent || 0).toFixed(2);
    document.getElementById('dashGoalTarget').textContent = '€' + (data.goalTarget || 0).toFixed(2);
    document.getElementById('dashGoalFireAge').textContent = data.goalFireAge || '--';

    const progress = data.goalProgress || 0;
    document.getElementById('dashGoalBar').style.width = Math.min(progress, 100) + '%';
    document.getElementById('dashGoalPercent').textContent = progress.toFixed(1) + '%';

    // Fitness
    document.getElementById('dashFitnessStreak').textContent = (data.fitnessCurrentStreak || 0) + ' days';
    document.getElementById('dashFitnessWeek').textContent = (data.fitnessThisWeek || 0) + ' workouts';
    document.getElementById('dashCurrentWeight').textContent = data.currentWeight ? data.currentWeight.toFixed(1) + ' kg' : '-- kg';

    const weightChangeEl = document.getElementById('dashWeightChange');
    if (data.weightChange != null) {
        const change = data.weightChange;
        weightChangeEl.textContent = (change >= 0 ? '+' : '') + change.toFixed(1) + ' kg';
        weightChangeEl.className = 'stat-value ' + (change <= 0 ? 'positive' : 'negative');
    } else {
        weightChangeEl.textContent = '-- kg';
        weightChangeEl.className = 'stat-value';
    }
}

/* ===========================================================
   CSV EXPORT
=============================================================*/

async function exportPortfolioCsv() {
    try {
        showLoading('Exporting CSV...');
        const res = await fetch(`${API}/api/stocks/export`);

        if (!res.ok) {
            throw new Error('Export failed');
        }

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `portfolio-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        hideLoading();
        showToast('Portfolio exported successfully!', 'success');
    } catch (e) {
        hideLoading();
        showToast('Failed to export portfolio: ' + e.message, 'error');
    }
}

/* ===========================================================
   EMPTY STATES
=============================================================*/

function renderEmptyState(containerId, icon, title, message, buttonText, buttonAction) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">${icon}</div>
            <div class="empty-state-title">${title}</div>
            <div class="empty-state-message">${message}</div>
            ${buttonText ? `<button class="btn" onclick="${buttonAction}">${buttonText}</button>` : ''}
        </div>
    `;
}

/* ===========================================================
   KEYBOARD NAVIGATION FOR TABS
=============================================================*/

document.addEventListener('DOMContentLoaded', function() {
    const tablist = document.querySelector('[role="tablist"]');
    if (tablist) {
        tablist.addEventListener('keydown', function(e) {
            const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
            const currentIndex = tabs.findIndex(tab => tab.classList.contains('active'));

            let newIndex = currentIndex;

            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                newIndex = (currentIndex + 1) % tabs.length;
                e.preventDefault();
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                newIndex = (currentIndex - 1 + tabs.length) % tabs.length;
                e.preventDefault();
            } else if (e.key === 'Home') {
                newIndex = 0;
                e.preventDefault();
            } else if (e.key === 'End') {
                newIndex = tabs.length - 1;
                e.preventDefault();
            }

            if (newIndex !== currentIndex) {
                tabs[newIndex].focus();
                tabs[newIndex].click();
            }
        });
    }
});

// Quill editors
let quillMain = null;
let quillEdit = null;

/* Theme */
function applyMode() {
    const mode = localStorage.getItem("retroMode") || "dark";
    document.body.classList.toggle("light", mode==="light");
    modeToggle.textContent = mode==="light" ? "DARK MODE" : "LIGHT MODE";
}
function toggleMode() {
    const next = document.body.classList.contains("light") ? "dark" : "light";
    localStorage.setItem("retroMode", next);
    applyMode();
}
applyMode();

/* Initialize Quill Editors */
document.addEventListener('DOMContentLoaded', function() {
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
});

/* Tabs */
function switchTab(which) {
    // Clean up system stats interval when leaving the tab
    if (document.getElementById("tabSystemStats")?.classList.contains("active")) {
        cleanupSystemStats();
    }

    // Clean up history refresh interval when leaving
    if (historyRefreshInterval) {
        clearInterval(historyRefreshInterval);
        historyRefreshInterval = null;
    }

    // Update tab states and aria-selected
    const tabs = ['dashboard', 'memo', 'finance', 'stocks', 'stockhistory', 'research', 'budget', 'subscriptions', 'calendar', 'analytics', 'systemstats', 'fitness'];
    tabs.forEach(tab => {
        const tabEl = document.getElementById(`tab${tab.charAt(0).toUpperCase() + tab.slice(1).replace('history', 'History').replace('stats', 'Stats')}`);
        if (tabEl) {
            tabEl.classList.toggle("active", which === tab);
            tabEl.setAttribute('aria-selected', which === tab);
        }
    });

    // Fix specific tab IDs
    document.getElementById("tabDashboard")?.classList.toggle("active", which === "dashboard");
    document.getElementById("tabMemo")?.classList.toggle("active", which === "memo");
    document.getElementById("tabFinance")?.classList.toggle("active", which === "finance");
    document.getElementById("tabStocks")?.classList.toggle("active", which === "stocks");
    document.getElementById("tabStockHistory")?.classList.toggle("active", which === "stockhistory");
    document.getElementById("tabBudget")?.classList.toggle("active", which === "budget");
    document.getElementById("tabSubscriptions")?.classList.toggle("active", which === "subscriptions");
    document.getElementById("tabCalendar")?.classList.toggle("active", which === "calendar");
    document.getElementById("tabAnalytics")?.classList.toggle("active", which === "analytics");
    document.getElementById("tabSystemStats")?.classList.toggle("active", which === "systemstats");
    document.getElementById("tabResearch")?.classList.toggle("active", which === "research");
    document.getElementById("tabFitness")?.classList.toggle("active", which === "fitness");

    dashboardTabContent?.classList.toggle("hidden", which !== "dashboard");
    memoTabContent.classList.toggle("hidden", which !== "memo");
    financeTabContent.classList.toggle("hidden", which !== "finance");
    stocksTabContent.classList.toggle("hidden", which !== "stocks");
    stockHistoryTabContent.classList.toggle("hidden", which !== "stockhistory");
    budgetTabContent.classList.toggle("hidden", which !== "budget");
    document.getElementById("subscriptionsTabContent")?.classList.toggle("hidden", which !== "subscriptions");
    document.getElementById("calendarTabContent")?.classList.toggle("hidden", which !== "calendar");
    document.getElementById("analyticsTabContent")?.classList.toggle("hidden", which !== "analytics");
    systemStatsTabContent.classList.toggle("hidden", which !== "systemstats");
    researchTabContent.classList.toggle("hidden", which !== "research");
    document.getElementById("fitnessTabContent")?.classList.toggle("hidden", which !== "fitness");

    if (which === "dashboard") {
        loadDashboard();
    } else if (which === "finance") {
        loadFinance();
        loadGoalList();
    } else if (which === "stocks") {
        loadStocks();
        if (!stocksRefreshInterval) {
            stocksRefreshInterval = setInterval(loadStocks, 30000);
        }
    } else if (which === "stockhistory") {
        // Initialize advanced charts when tab is shown
        if (typeof window.onStockHistoryTabShown === 'function') {
            window.onStockHistoryTabShown();
        } else {
            loadStockHistory();
        }
        // Disable auto-refresh for advanced charts (user controls refresh)
    } else if (which === "budget") {
        goToCurrentMonth();
    } else if (which === "systemstats") {
        initSystemStatsTab();
    } else if (which === "research") {
        loadLatestResearch();
    } else if (which === "fitness") {
        loadFitnessTab();
    } else {
        if (stocksRefreshInterval) {
            clearInterval(stocksRefreshInterval);
            stocksRefreshInterval = null;
        }
    }
}
/* Helpers */
function stripHtml(h){ let d=document.createElement("div"); d.innerHTML=h; return d.innerText; }
function truncate(s,n){ return !s?"" : s.length>n ? s.slice(0,n-3)+"..." : s; }

/* Modal Utils */
function openModal(id){ document.getElementById(id).style.display="flex"; }
function closeModal(id){ document.getElementById(id).style.display="none"; }

document.addEventListener("keydown",(e)=>{
    if(e.key==="Escape"){
        closeMemoModal();
        closeMemoViewModal();
        closeFinanceModal();
        closeFinanceViewModal();
        closeStockHoldingModal();
        closeWatchlistModal();
    }
});

/* ===========================================================
   PAGINATION HELPERS
=============================================================*/

function updatePaginationControls(prefix, pageData) {
    const { current, total, size, totalElements } = pageData;

    const start = current * size + 1;
    const end = Math.min((current + 1) * size, totalElements);
    document.getElementById(`${prefix}PageInfo`).textContent =
        `Showing ${start}-${end} of ${totalElements}`;

    document.getElementById(`${prefix}PageInput`).value = current + 1;
    document.getElementById(`${prefix}TotalPagesSpan`).textContent = `of ${total}`;

    document.getElementById(`${prefix}FirstBtn`).disabled = current === 0;
    document.getElementById(`${prefix}PrevBtn`).disabled = current === 0;
    document.getElementById(`${prefix}NextBtn`).disabled = current === total - 1;
    document.getElementById(`${prefix}LastBtn`).disabled = current === total - 1;
}

/* ===========================================================
   MEMOS
=============================================================*/

async function loadMemos(page = 0){
    const size = parseInt(document.getElementById('memoPageSize').value) || 10;
    const res = await fetch(`${API}/api/memos?page=${page}&size=${size}`);
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

    data.forEach(m=>{
        const plain = stripHtml(m.content || "");
        const short = truncate(plain,80);

        html+=`
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
    memoList.innerHTML=html;
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

async function addMemo(){
    const form=new FormData();
    form.append("title", memoTitle.value);
    form.append("content", quillMain.root.innerHTML); // Get HTML from Quill
    form.append("category", memoCategory.value);
    form.append("pinned", memoPinned.checked);

    const file=memoFile.files[0];
    if(file) form.append("media",file);

    await fetch(`${API}/api/memos/upload`,{ method:"POST", body:form });

    memoTitle.value="";
    quillMain.setContents([]); // Clear Quill editor
    memoPinned.checked=false;
    memoFile.value="";
    loadMemos(0);
}

async function delMemo(id){
    await fetch(`${API}/api/memos/${id}`,{ method:"DELETE" });
    loadMemos(memoPage.current);
}

async function viewMemo(id){
    const res = await fetch(`${API}/api/memos/${id}`);
    const m = await res.json();

    viewMemoTitle.textContent = m.title;
    viewMemoContent.innerHTML = m.content; // Display formatted content

    viewMemoMeta.textContent = `Category: ${m.category}\nPinned: ${m.pinned?'Yes':'No'}`;

    if(m.media){
        viewMemoImage.src=`data:image/*;base64,${m.media}`;
        viewMemoImageWrapper.style.display="block";
    } else{
        viewMemoImageWrapper.style.display="none";
    }

    openModal("memoViewModal");
}
function closeMemoViewModal(){ closeModal("memoViewModal"); }

async function copyMemo(id){
    try {
        const res = await fetch(`${API}/api/memos/${id}`);
        const m = await res.json();
        const temp=document.createElement("div");
        temp.innerHTML=m.title+" - "+(m.content||"");
        await navigator.clipboard.writeText(temp.innerText);
        showToast("Memo copied to clipboard!", "success");
    } catch (e) {
        showToast("Failed to copy memo: " + e.message, "error");
    }
}

let editingMemoId=null;

async function showEditMemo(id){
    editingMemoId=id;

    const res=await fetch(`${API}/api/memos/${id}`);
    const m=await res.json();

    editMemoTitle.value=m.title;
    quillEdit.root.innerHTML = m.content || ""; // Load HTML into Quill
    editMemoCategory.value=m.category;
    editMemoPinned.checked=m.pinned;
    editMemoFile.value="";

    openModal("memoModal");
}

function closeMemoModal(){ editingMemoId=null; editMemoFile.value=""; closeModal("memoModal"); }

async function saveMemoEdit(){
    const form=new FormData();
    form.append("title", editMemoTitle.value);
    form.append("content", quillEdit.root.innerHTML); // Get HTML from Quill
    form.append("category", editMemoCategory.value);
    form.append("pinned", editMemoPinned.checked);

    const file=editMemoFile.files[0];
    if(file) form.append("media",file);

    await fetch(`${API}/api/memos/upload/${editingMemoId}`,{
        method:"PUT",
        body:form
    });

    closeMemoModal();
    loadMemos(memoPage.current);
}

/* ====================== FINANCE ====================== */

async function loadFinanceSummary() {
    const res = await fetch(`${API}/api/finance/summary`);
    const s = await res.json();

    sumTotal.textContent = "€" + s.totalBalance.toFixed(2);

    sumByModeList.innerHTML = "";
    Object.entries(s.totalByMode).forEach(([mode, value]) => {
        const li = document.createElement("li");
        li.textContent = `${mode}: € ${value.toFixed(2)}`;
        sumByModeList.appendChild(li);
    });

    sumByBankList.innerHTML = "";
    Object.entries(s.totalByBank).forEach(([bank, value]) => {
        const li = document.createElement("li");
        li.textContent = `${bank}: € ${value.toFixed(2)}`;
        sumByBankList.appendChild(li);
    });
}

function renderGoalChart(projectionText) {
    const lines = projectionText.split("\n").filter(l => l.includes("Age"));
    const ages = [];
    const values = [];

    lines.forEach(line => {
        const m = line.match(/Age (\d+): €([\d\.]+)/);
        if (m) {
            ages.push(Number(m[1]));
            values.push(parseFloat(m[2]));
        }
    });

    const canvas = document.getElementById("goalChart");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (values.length === 0) return;

    const maxValue = Math.max(...values);

    ctx.strokeStyle = "#0f0";
    ctx.lineWidth = 2;
    ctx.beginPath();

    values.forEach((v, i) => {
        const x = (i / (values.length - 1)) * canvas.width;
        const y = canvas.height - (v / maxValue) * canvas.height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });

    ctx.stroke();
}

function clearGoalDisplay() {
    goalTargetIncome.textContent = "";
    goalRequiredCorpus.textContent = "";
    goalCurrentCorpus.textContent = "";
    goalAchieved.textContent = "";
    goalFireAge.textContent = "";

    const canvas = document.getElementById("goalChart");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

async function loadGoal() {
    const sel = document.getElementById("goalSelect");
    if (!sel) return;
    const goalId = sel.value;
    if (!goalId) {
        currentGoalId = null;
        clearGoalDisplay();
        return;
    }

    const res = await fetch(`/api/goal/${goalId}`);
    const g = await res.json();
    currentGoalId = g.id;

    goalTargetIncome.textContent = "€" + g.targetYearlyIncome.toFixed(2);
    goalRequiredCorpus.textContent = "€" + g.requiredCorpus.toFixed(2);
    goalCurrentCorpus.textContent = "€" + g.currentCorpus.toFixed(2);
    goalAchieved.textContent = g.goalAchieved ? "YES 🎉" : "NO";

    goalTargetIncomeInput.value = g.targetYearlyIncome;
    goalTaxRateInput.value = g.taxRate;
    goalReturnRateInput.value = g.expectedReturnRate;
    goalContributionInput.value = g.yearlyContribution;
    goalAgeInput.value = g.currentAge;

    const projText = await fetch(`/api/goal/${goalId}/projection`).then(r => r.text());
    const match = projText.match(/Age (\d+)/);
    goalFireAge.textContent = match ? match[1] : (g.goalAchievedAge || "—");

    goalYearsToGoal.textContent = g.yearsToGoal ?? "—";
    goalAge.textContent = g.goalAchievedAge ?? "—";

    const remaining = g.requiredCorpus - g.currentCorpus;
    goalRemainingCorpus.textContent = "€" + remaining.toFixed(2);

    let progress = (g.currentCorpus / g.requiredCorpus) * 100;
    if (progress > 100) progress = 100;

    goalProgress.textContent = progress.toFixed(1) + "%";
    document.getElementById("goalProgressFill").style.width = progress + "%";

    renderGoalChart(projText);
}

function onGoalSelectChange() {
    loadGoal();
    goalStatus.textContent = "";
}

function newGoalForm() {
    currentGoalId = null;
    goalSelect.value = "";
    goalTargetIncomeInput.value = "";
    goalTaxRateInput.value = "";
    goalReturnRateInput.value = "";
    goalContributionInput.value = "";
    goalAgeInput.value = "";
    goalStatus.textContent = "Creating new goal…";
    clearGoalDisplay();
}

async function saveGoalForm() {
    const payload = {
        targetYearlyIncome: parseFloat(goalTargetIncomeInput.value || 0),
        taxRate: parseFloat(goalTaxRateInput.value || 0),
        expectedReturnRate: parseFloat(goalReturnRateInput.value || 0),
        yearlyContribution: parseFloat(goalContributionInput.value || 0),
        currentAge: parseInt(goalAgeInput.value || 0, 10)
    };
    if (currentGoalId) {
        payload.id = currentGoalId;
    }

    goalStatus.textContent = "Saving…";

    const res = await fetch(`/api/goal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    const saved = await res.json();
    currentGoalId = saved.id;

    await loadGoalList(saved.id);
    goalStatus.textContent = "Saved ✔";
}

async function deleteGoal() {
    if (!currentGoalId) {
        goalStatus.textContent = "No goal selected to delete.";
        return;
    }

    goalStatus.textContent = "Deleting…";

    await fetch(`/api/goal/${currentGoalId}`, { method: "DELETE" });

    currentGoalId = null;
    goalSelect.value = "";
    clearGoalDisplay();
    await loadGoalList();
    newGoalForm();
    goalStatus.textContent = "Deleted.";
}

async function loadFinance(page = 0) {
    const size = parseInt(document.getElementById('financePageSize').value) || 10;
    const res = await fetch(`${API}/api/finance?page=${page}&size=${size}`);
    const response = await res.json();
    const data = response.content;

    financePage = {
        current: response.number,
        total: response.totalPages,
        size: response.size,
        totalElements: response.totalElements
    };

    updatePaginationControls('finance', financePage);

    let html = '<div class="stats-grid">';

    data.forEach(acc => {
        const modified = acc.lastModified ? new Date(acc.lastModified).toLocaleString() : "—";

        html += `
        <div class="stat-card" style="text-align:left;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <div style="font-weight:bold; font-size:14px;">${acc.bank}</div>
                <div style="font-size:11px; opacity:0.6; text-transform:uppercase;">${acc.mode || "Unknown"}</div>
            </div>
            <div style="font-size:20px; font-weight:bold; margin:10px 0;">€${acc.balance.toFixed(2)}</div>
            <div style="font-size:10px; opacity:0.5; margin-bottom:10px;">${modified}</div>
            <div style="display:flex; gap:4px; flex-wrap:wrap;">
                <button class="btn" style="flex:1; min-width:60px;" onclick="viewFinance('${acc.id}')">VIEW</button>
                <button class="btn" style="flex:1; min-width:60px;" onclick="showEditFinance('${acc.id}')">EDIT</button>
                <button class="btn" style="flex:1; min-width:60px;" onclick="delFinance('${acc.id}')">DEL</button>
            </div>
        </div>`;
    });

    html += '</div>';

    document.getElementById("financeList").innerHTML = html;

    loadFinanceSummary();
}

function financeChangePageSize() { loadFinance(0); }
function financeGoToPage(page) { loadFinance(page); }
function financePrevPage() { if (financePage.current > 0) loadFinance(financePage.current - 1); }
function financeNextPage() { if (financePage.current < financePage.total - 1) loadFinance(financePage.current + 1); }
function financeGoToLastPage() { loadFinance(financePage.total - 1); }
function financeGoToInput() {
    const input = parseInt(document.getElementById('financePageInput').value);
    if (input >= 1 && input <= financePage.total) loadFinance(input - 1);
}

async function addFinance() {
    const form = {
        bank: financeBank.value,
        mode: mode.value,
        balance: parseFloat(financeBalance.value || 0)
    };

    await fetch(`${API}/api/finance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
    });

    loadFinance(0);
    if (document.getElementById("goalSelect").value) {
        loadGoal();
    }
}

async function viewFinance(id) {
    const res = await fetch(`${API}/api/finance/${id}`);
    const acc = await res.json();

    viewFinanceBank.textContent = acc.bank;
    viewMode.textContent = acc.mode || "Unknown";
    viewFinanceBalance.textContent = "€" + acc.balance.toFixed(2);

    openModal("financeViewModal");
}

function closeFinanceViewModal() { closeModal("financeViewModal"); }

let editingFinanceId = null;

async function showEditFinance(id) {
    editingFinanceId = id;

    const res = await fetch(`${API}/api/finance/${id}`);
    const acc = await res.json();

    editFinanceBank.value = acc.bank;
    editMode.value = acc.mode;
    editFinanceBalance.value = acc.balance;

    openModal("financeModal");
}

function closeFinanceModal() {
    editingFinanceId = null;
    closeModal("financeModal");
}

async function saveFinanceEdit() {
    const updated = {
        bank: editFinanceBank.value,
        mode: editMode.value,
        balance: parseFloat(editFinanceBalance.value || 0)
    };

    await fetch(`${API}/api/finance/${editingFinanceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
    });

    closeFinanceModal();
    loadFinance(financePage.current);
}

async function delFinance(id) {
    await fetch(`${API}/api/finance/${id}`, { method: "DELETE" });
    loadFinance(financePage.current);
}

async function loadGoalList(selectedId) {
    const res = await fetch(`/api/goal`);
    const goals = await res.json();

    const sel = document.getElementById("goalSelect");
    sel.innerHTML = `<option value="">(Select a goal)</option>`;

    goals.forEach(g => {
        const opt = document.createElement("option");
        opt.value = g.id;
        opt.textContent = `Goal ${g.id}`;
        sel.appendChild(opt);
    });

    if (goals.length > 0) {
        sel.value = selectedId || goals[0].id;
        loadGoal();
    } else {
        currentGoalId = null;
        clearGoalDisplay();
    }
}

/* ===========================================================
   STOCKS / PORTFOLIO
=============================================================*/

async function loadStocks() {
    await loadStockStats();
    await loadHoldings();
    await loadWatchlist();
}

async function loadStockStats() {
    try {
        const res = await fetch(`${API}/api/stocks/stats`);
        const stats = await res.json();

        statInvested.textContent = "€" + stats.totalInvested.toFixed(2);
        statValue.textContent = "€" + stats.currentValue.toFixed(2);

        const profit = stats.totalProfit;
        const profitPercent = (profit / stats.totalInvested * 100) || 0;

        statProfit.textContent = "€" + profit.toFixed(2);
        statProfit.className = "stat-value " + (profit >= 0 ? "positive" : "negative");

        statReturn.textContent = profitPercent.toFixed(2) + "%";
        statReturn.className = "stat-value " + (profit >= 0 ? "positive" : "negative");
    } catch (e) {
        console.error("Failed to load stats:", e);
    }
}

async function loadHoldings() {
    try {
        const res = await fetch(`${API}/api/stocks`);
        const holdings = await res.json();

        if (!holdings || holdings.length === 0) {
            holdingsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📈</div>
                    <div class="empty-state-title">No Holdings Yet</div>
                    <div class="empty-state-message">Start building your portfolio by adding your first stock!</div>
                    <button class="btn" onclick="showAddHolding()">ADD YOUR FIRST STOCK</button>
                </div>`;
            return;
        }

        let html = `
        <div class="stock-row stock-header">
            <div>Symbol</div>
            <div>Qty</div>
            <div>Buy €</div>
            <div>Current €</div>
            <div>P/L €</div>
            <div>P/L %</div>
        </div>`;

        holdings.forEach(h => {
            const pl = (h.currentPrice - h.buyPrice) * h.quantity;
            const plPercent = ((h.currentPrice - h.buyPrice) / h.buyPrice * 100) || 0;
            const plClass = pl >= 0 ? "positive" : "negative";

            html += `
            <div class="stock-row">
                <div><strong>${h.symbol}</strong></div>
                <div>${h.quantity}</div>
                <div>${h.buyPrice.toFixed(2)}</div>
                <div>${h.currentPrice.toFixed(2)}</div>
                <div class="${plClass}">${pl >= 0 ? '+' : ''}${pl.toFixed(2)}</div>
                <div class="${plClass}">${plPercent >= 0 ? '+' : ''}${plPercent.toFixed(2)}%</div>
            </div>
            <div style="padding:0 8px 8px 8px;">
                <div class="profit-bar">
                    <div class="profit-bar-fill ${plClass}" style="width:${Math.min(Math.abs(plPercent), 100)}%; background:${pl >= 0 ? '#0f0' : '#f33'};"></div>
                </div>
                <div style="text-align:right; margin-top:4px;">
                    <button class="btn" onclick="showEditHolding('${h.id}', '${h.symbol}', ${h.quantity}, ${h.buyPrice})" aria-label="Edit ${h.symbol}">EDIT</button>
                    <button class="btn" onclick="delHolding('${h.id}')" aria-label="Delete ${h.symbol}">DEL</button>
                </div>
            </div>`;
        });

        holdingsList.innerHTML = html;
    } catch (e) {
        console.error("Failed to load holdings:", e);
        showToast("Failed to load holdings", "error");
    }
}

async function loadWatchlist() {
    try {
        const res = await fetch(`${API}/api/stocks-watch`);
        const watchlist = await res.json();

        if (!watchlist || watchlist.length === 0) {
            watchlistList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">👀</div>
                    <div class="empty-state-title">Watchlist Empty</div>
                    <div class="empty-state-message">Track stocks you're interested in by adding them to your watchlist!</div>
                    <button class="btn" onclick="showAddWatchlist()">ADD TO WATCHLIST</button>
                </div>`;
            return;
        }

        let html = `
        <div class="stock-row stock-header">
            <div>Symbol</div>
            <div>Initial €</div>
            <div>Current €</div>
            <div>Δ €</div>
            <div>Δ %</div>
            <div></div>
        </div>`;

        watchlist.forEach(w => {
            const delta = w.currentPrice - w.initialPrice;
            const deltaPercent = (delta / w.initialPrice * 100) || 0;
            const deltaClass = delta >= 0 ? "positive" : "negative";

            html += `
            <div class="stock-row">
                <div><strong>${w.symbol}</strong></div>
                <div>${w.initialPrice.toFixed(2)}</div>
                <div>${w.currentPrice.toFixed(2)}</div>
                <div class="${deltaClass}">${delta >= 0 ? '+' : ''}${delta.toFixed(2)}</div>
                <div class="${deltaClass}">${deltaPercent >= 0 ? '+' : ''}${deltaPercent.toFixed(2)}%</div>
                <div style="text-align:right;">
                    <button class="btn" onclick="delWatchlist('${w.symbol}')" aria-label="Remove ${w.symbol} from watchlist">DEL</button>
                </div>
            </div>`;
        });

        watchlistList.innerHTML = html;
    } catch (e) {
        console.error("Failed to load watchlist:", e);
        showToast("Failed to load watchlist", "error");
    }
}

function refreshStocks() {
    loadStocks();
}

function showAddHolding() {
    editingHoldingId = null;
    stockHoldingModalTitle.textContent = "Add Holding";
    stockSymbol.value = "";
    stockQuantity.value = "";
    stockBuyPrice.value = "";
    openModal("stockHoldingModal");
}

function showEditHolding(id, symbol, quantity, buyPrice) {
    editingHoldingId = id;
    stockHoldingModalTitle.textContent = "Edit Holding";
    stockSymbol.value = symbol;
    stockQuantity.value = quantity;
    stockBuyPrice.value = buyPrice;
    openModal("stockHoldingModal");
}

function closeStockHoldingModal() {
    editingHoldingId = null;
    closeModal("stockHoldingModal");
}

async function saveStockHolding() {
    const data = {
        symbol: stockSymbol.value.toUpperCase(),
        quantity: parseFloat(stockQuantity.value),
        buyPrice: parseFloat(stockBuyPrice.value)
    };

    if (!data.symbol || !data.quantity || !data.buyPrice) {
        showToast("Please fill all fields", "warning");
        return;
    }

    try {
        if (editingHoldingId) {
            await fetch(`${API}/api/stocks/${editingHoldingId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
        } else {
            await fetch(`${API}/api/stocks`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
        }

        closeStockHoldingModal();
        loadStocks();
        showToast("Stock holding saved successfully!", "success");
    } catch (e) {
        showToast("Error saving holding: " + e.message, "error");
    }
}

async function delHolding(id) {
    if (!confirm("Delete this holding?")) return;

    await fetch(`${API}/api/stocks/${id}`, { method: "DELETE" });
    loadStocks();
}

function showAddWatchlist() {
    editingWatchlistId = null;
    watchlistModalTitle.textContent = "Add to Watchlist";
    watchSymbol.value = "";
    watchInitialPrice.value = "";
    openModal("watchlistModal");
}

function closeWatchlistModal() {
    editingWatchlistId = null;
    closeModal("watchlistModal");
}

async function saveWatchlist() {
    const data = {
        symbol: watchSymbol.value.toUpperCase(),
        initialPrice: parseFloat(watchInitialPrice.value)
    };

    if (!data.symbol || !data.initialPrice) {
        showToast("Please fill all fields", "warning");
        return;
    }

    try {
        await fetch(`${API}/api/stocks-watch`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        closeWatchlistModal();
        loadStocks();
        showToast("Watchlist item saved successfully!", "success");
    } catch (e) {
        showToast("Error saving watchlist item: " + e.message, "error");
    }
}

async function delWatchlist(id) {
    if (!confirm("Remove from watchlist?")) return;

    await fetch(`${API}/api/stocks-watch/${id}`, { method: "DELETE" });
    loadStocks();
}


/* ===========================================================
   BUDGET TRACKER
=============================================================*/

let currentBudgetMonth = null;
let currentBudgetData = null;

function getCurrentYearMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

function goToCurrentMonth() {
    const current = getCurrentYearMonth();
    document.getElementById('budgetMonthPicker').value = current;
    loadBudgetForSelectedMonth();
    loadBudgetComparison();
}

async function loadBudgetForSelectedMonth() {
    const picker = document.getElementById('budgetMonthPicker');
    if (!picker.value) {
        goToCurrentMonth();
        return;
    }

    const [year, month] = picker.value.split('-');
    currentBudgetMonth = { year: parseInt(year), month: parseInt(month) };

    try {
        const res = await fetch(`${API}/api/budget/${year}/${month}`);

        if (res.ok) {
            currentBudgetData = await res.json();
            displayBudgetData();
        } else if (res.status === 404) {
            // Budget doesn't exist yet - create empty one
            currentBudgetData = {
                month: `${year}-${month}`,
                plannedIncome: {},
                plannedExpenses: {},
                incomeRecords: [],
                expenseRecords: []
            };
            displayBudgetData();
        }
    } catch (e) {
        console.error("Error loading budget:", e);
    }
}

function displayBudgetData() {
    if (!currentBudgetData) return;

    const p = currentBudgetData;

    // Fill planned income fields
    document.getElementById('planSalary').value = p.plannedIncome?.SALARY || '';
    document.getElementById('planBonus').value = p.plannedIncome?.BONUS || '';
    document.getElementById('planFreelance').value = p.plannedIncome?.FREELANCE || '';
    document.getElementById('planOtherIncome').value = p.plannedIncome?.OTHER || '';

    // Fill planned expense fields
    document.getElementById('planRent').value = p.plannedExpenses?.RENT || '';
    document.getElementById('planUtilities').value = p.plannedExpenses?.UTILITIES || '';
    document.getElementById('planInternet').value = p.plannedExpenses?.INTERNET || '';
    document.getElementById('planTransport').value = p.plannedExpenses?.TRANSPORT || '';
    document.getElementById('planFuel').value = p.plannedExpenses?.FUEL || '';
    document.getElementById('planGroceries').value = p.plannedExpenses?.GROCERIES || '';
    document.getElementById('planDining').value = p.plannedExpenses?.DINING_OUT || '';
    document.getElementById('planEntertainment').value = p.plannedExpenses?.ENTERTAINMENT || '';
    document.getElementById('planSubscriptions').value = p.plannedExpenses?.SUBSCRIPTIONS || '';
    document.getElementById('planGym').value = p.plannedExpenses?.GYM || '';
    document.getElementById('planOtherExpense').value = p.plannedExpenses?.OTHER || '';

    // Update summary
    document.getElementById('summaryPlannedIncome').textContent = '€' + (p.totalPlannedIncome || 0).toFixed(2);
    document.getElementById('summaryActualIncome').textContent = '€' + (p.totalIncome || 0).toFixed(2);
    document.getElementById('summaryPlannedExpenses').textContent = '€' + (p.totalPlannedExpenses || 0).toFixed(2);
    document.getElementById('summaryActualExpenses').textContent = '€' + (p.totalExpenses || 0).toFixed(2);
    document.getElementById('summarySavings').textContent = '€' + (p.remaining || 0).toFixed(2);
    document.getElementById('summarySavingsRate').textContent = (p.savingsRate || 0).toFixed(1) + '%';
    document.getElementById('summaryAdherence').textContent = (p.budgetAdherence || 100).toFixed(1) + '%';

    // Display income records
    displayIncomeRecords(p.incomeRecords || []);

    // Display expense records
    displayExpenseRecords(p.expenseRecords || []);
}

function displayIncomeRecords(records) {
    let html = '';

    records.forEach((rec, idx) => {
        const date = new Date(rec.recordDate).toLocaleDateString();
        html += `
        <div class="card" style="margin-bottom:6px;">
            <div class="card-main">
                <div style="font-weight:bold; font-size:12px;">${rec.category}</div>
                <div style="font-size:11px; opacity:0.7;">€${rec.amount.toFixed(2)}</div>
                <div style="font-size:10px; opacity:0.5;">${rec.description}</div>
                <div style="font-size:9px; opacity:0.4;">${date}</div>
            </div>
            <button class="btn" onclick="deleteIncomeRecord(${idx})">DEL</button>
        </div>`;
    });

    document.getElementById('incomeRecordsList').innerHTML = html || '<div style="opacity:0.5; font-size:11px;">No income records yet</div>';
}

function displayExpenseRecords(records) {
    let html = '';

    records.forEach((rec, idx) => {
        const date = new Date(rec.recordDate).toLocaleDateString();
        html += `
        <div class="card" style="margin-bottom:6px;">
            <div class="card-main">
                <div style="font-weight:bold; font-size:12px;">${rec.category}</div>
                <div style="font-size:11px; opacity:0.7;">€${rec.amount.toFixed(2)}</div>
                <div style="font-size:10px; opacity:0.5;">${rec.description}</div>
                <div style="font-size:9px; opacity:0.4;">${date}</div>
            </div>
            <button class="btn" onclick="deleteExpenseRecord(${idx})">DEL</button>
        </div>`;
    });

    document.getElementById('expenseRecordsList').innerHTML = html || '<div style="opacity:0.5; font-size:11px;">No expense records yet</div>';
}

async function saveBudgetPlan() {
    if (!currentBudgetMonth) return;

    const plannedIncome = {};
    const plannedExpenses = {};

    // Gather planned income
    const salary = parseFloat(document.getElementById('planSalary').value);
    const bonus = parseFloat(document.getElementById('planBonus').value);
    const freelance = parseFloat(document.getElementById('planFreelance').value);
    const otherIncome = parseFloat(document.getElementById('planOtherIncome').value);

    if (salary) plannedIncome.SALARY = salary;
    if (bonus) plannedIncome.BONUS = bonus;
    if (freelance) plannedIncome.FREELANCE = freelance;
    if (otherIncome) plannedIncome.OTHER = otherIncome;

    // Gather planned expenses
    const rent = parseFloat(document.getElementById('planRent').value);
    const utilities = parseFloat(document.getElementById('planUtilities').value);
    const internet = parseFloat(document.getElementById('planInternet').value);
    const transport = parseFloat(document.getElementById('planTransport').value);
    const fuel = parseFloat(document.getElementById('planFuel').value);
    const groceries = parseFloat(document.getElementById('planGroceries').value);
    const dining = parseFloat(document.getElementById('planDining').value);
    const entertainment = parseFloat(document.getElementById('planEntertainment').value);
    const subscriptions = parseFloat(document.getElementById('planSubscriptions').value);
    const gym = parseFloat(document.getElementById('planGym').value);
    const otherExpense = parseFloat(document.getElementById('planOtherExpense').value);

    if (rent) plannedExpenses.RENT = rent;
    if (utilities) plannedExpenses.UTILITIES = utilities;
    if (internet) plannedExpenses.INTERNET = internet;
    if (transport) plannedExpenses.TRANSPORT = transport;
    if (fuel) plannedExpenses.FUEL = fuel;
    if (groceries) plannedExpenses.GROCERIES = groceries;
    if (dining) plannedExpenses.DINING_OUT = dining;
    if (entertainment) plannedExpenses.ENTERTAINMENT = entertainment;
    if (subscriptions) plannedExpenses.SUBSCRIPTIONS = subscriptions;
    if (gym) plannedExpenses.GYM = gym;
    if (otherExpense) plannedExpenses.OTHER = otherExpense;

    const payload = {
        plannedIncome,
        plannedExpenses,
        autoCreateRecords: true  // Auto-create records from planned amounts
    };

    await fetch(`${API}/api/budget/${currentBudgetMonth.year}/${currentBudgetMonth.month}/planned`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    loadBudgetForSelectedMonth();
}
async function addIncome() {
    if (!currentBudgetMonth) return;

    const category = document.getElementById('incomeCategory').value;
    const amount = parseFloat(document.getElementById('incomeAmount').value);
    const description = document.getElementById('incomeDescription').value;

    if (!amount || amount <= 0) {
        showToast('Please enter a valid amount', 'warning');
        return;
    }

    const record = { category, amount, description };

    try {
        await fetch(`${API}/api/budget/${currentBudgetMonth.year}/${currentBudgetMonth.month}/income`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(record)
        });

        document.getElementById('incomeAmount').value = '';
        document.getElementById('incomeDescription').value = '';

        loadBudgetForSelectedMonth();
        showToast('Income record added!', 'success');
    } catch (e) {
        showToast('Failed to add income: ' + e.message, 'error');
    }
}

async function addExpense() {
    if (!currentBudgetMonth) return;

    const category = document.getElementById('expenseCategory').value;
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    const description = document.getElementById('expenseDescription').value;

    if (!amount || amount <= 0) {
        showToast('Please enter a valid amount', 'warning');
        return;
    }

    const record = { category, amount, description };

    try {
        await fetch(`${API}/api/budget/${currentBudgetMonth.year}/${currentBudgetMonth.month}/expenses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(record)
        });

        document.getElementById('expenseAmount').value = '';
        document.getElementById('expenseDescription').value = '';

        loadBudgetForSelectedMonth();
        showToast('Expense record added!', 'success');
    } catch (e) {
        showToast('Failed to add expense: ' + e.message, 'error');
    }
}

async function deleteIncomeRecord(index) {
    if (!currentBudgetMonth || !confirm('Delete this income record?')) return;

    await fetch(`${API}/api/budget/${currentBudgetMonth.year}/${currentBudgetMonth.month}/income/${index}`, {
        method: 'DELETE'
    });

    loadBudgetForSelectedMonth();
}

async function deleteExpenseRecord(index) {
    if (!currentBudgetMonth || !confirm('Delete this expense record?')) return;

    await fetch(`${API}/api/budget/${currentBudgetMonth.year}/${currentBudgetMonth.month}/expenses/${index}`, {
        method: 'DELETE'
    });

    loadBudgetForSelectedMonth();
}

// ============================================
// BUDGET COMPARISON
// ============================================

let comparisonChart = null;

async function loadBudgetComparison() {
    const months = document.getElementById('comparisonMonths')?.value || 6;

    try {
        const res = await fetch(`${API}/api/budget/compare?months=${months}`);
        if (!res.ok) {
            console.error('Failed to load budget comparison');
            return;
        }

        const data = await res.json();
        renderBudgetComparisonChart(data);
        renderBudgetComparisonTable(data);
    } catch (e) {
        console.error('Error loading budget comparison:', e);
    }
}

function renderBudgetComparisonChart(data) {
    const canvas = document.getElementById('comparisonChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Destroy existing chart if any
    if (comparisonChart) {
        comparisonChart.destroy();
    }

    const labels = data.map(d => d.month);
    const incomeData = data.map(d => d.income);
    const expenseData = data.map(d => d.expenses);
    const savingsData = data.map(d => d.savings);

    comparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Income',
                    data: incomeData,
                    backgroundColor: '#0f0',
                    borderColor: '#0f0',
                    borderWidth: 1
                },
                {
                    label: 'Expenses',
                    data: expenseData,
                    backgroundColor: '#f33',
                    borderColor: '#f33',
                    borderWidth: 1
                },
                {
                    label: 'Savings',
                    data: savingsData,
                    backgroundColor: '#39f',
                    borderColor: '#39f',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: getComputedStyle(document.body).getPropertyValue('--text').trim() || '#fff',
                        font: { family: 'monospace', size: 11 }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: getComputedStyle(document.body).getPropertyValue('--text').trim() || '#fff',
                        font: { family: 'monospace', size: 10 }
                    },
                    grid: {
                        color: 'rgba(255,255,255,0.1)'
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: getComputedStyle(document.body).getPropertyValue('--text').trim() || '#fff',
                        font: { family: 'monospace', size: 10 },
                        callback: value => '€' + value.toFixed(0)
                    },
                    grid: {
                        color: 'rgba(255,255,255,0.1)'
                    }
                }
            }
        }
    });
}

function renderBudgetComparisonTable(data) {
    const container = document.getElementById('budgetComparisonTable');
    if (!container) return;

    let html = `
        <div class="stock-row stock-header">
            <div>Month</div>
            <div>Income</div>
            <div>Expenses</div>
            <div>Savings</div>
            <div>Savings Rate</div>
            <div>Adherence</div>
        </div>`;

    data.forEach(d => {
        const savingsClass = d.savings >= 0 ? 'positive' : 'negative';
        const adherenceClass = d.budgetAdherence <= 100 ? 'positive' : 'negative';

        html += `
        <div class="stock-row">
            <div><strong>${d.month}</strong></div>
            <div>€${d.income.toFixed(2)}</div>
            <div>€${d.expenses.toFixed(2)}</div>
            <div class="${savingsClass}">€${d.savings.toFixed(2)}</div>
            <div class="${savingsClass}">${d.savingsRate.toFixed(1)}%</div>
            <div class="${adherenceClass}">${d.budgetAdherence.toFixed(1)}%</div>
        </div>`;
    });

    container.innerHTML = html;
}

// ============================================
// SYSTEM STATS TAB
// ============================================

let statsAutoRefresh = true;
let statsRefreshInterval = null;

function initSystemStatsTab() {
    loadSystemStats();

    // Start auto-refresh
    if (statsAutoRefresh) {
        statsRefreshInterval = setInterval(loadSystemStats, 900);
    }
}

async function loadSystemStats() {
    try {
        const response = await fetch('/api/system/stats');
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

    // Safe number formatter - handles NaN and negative values
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
            <h2 style="margin:0;">🖥️ System Monitor</h2>
            <div style="display:flex; gap:10px; align-items:center;">
                <label style="font-size:12px; cursor:pointer;">
                    <input type="checkbox" id="statsAutoRefresh" ${statsAutoRefresh ? 'checked' : ''} 
                           onchange="toggleStatsAutoRefresh(this.checked)">
                    Auto-refresh (3s)
                </label>
                <button class="btn" onclick="loadSystemStats()">🔄 Refresh</button>
            </div>
        </div>
        
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:12px; margin-bottom:20px;">
            
            <!-- CPU Card -->
            <div class="card" style="display:block;">
                <div style="font-weight:bold; margin-bottom:10px; text-transform:uppercase; font-size:12px;">⚡ CPU</div>
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
                <div style="font-weight:bold; margin-bottom:10px; text-transform:uppercase; font-size:12px;">💾 Memory</div>
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
                <div style="font-weight:bold; margin-bottom:10px; text-transform:uppercase; font-size:12px;">💽 Disk</div>
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
                <div style="font-weight:bold; margin-bottom:10px; text-transform:uppercase; font-size:12px;">💿 Swap</div>
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
                <div style="font-weight:bold; margin-bottom:10px; text-transform:uppercase; font-size:12px;">🌐 Network</div>
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
                <div style="font-weight:bold; margin-bottom:10px; text-transform:uppercase; font-size:12px;">ℹ️ System Info</div>
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
                <div style="font-weight:bold; margin-bottom:10px; text-transform:uppercase; font-size:12px;">☕ JVM (This App)</div>
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

// Clean up interval when switching tabs
function cleanupSystemStats() {
    if (statsRefreshInterval) {
        clearInterval(statsRefreshInterval);
        statsRefreshInterval = null;
    }
}

// ============================================
// PUSH NOTIFICATIONS
// ============================================

let publicVapidKey = null;
let pushSubscription = null;

async function initPushNotifications() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.log('Push notifications not supported');
        updateNotificationUI(false);
        return;
    }

    try {
        // Register service worker
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration);

        // Get public VAPID key from server
        const response = await fetch('/api/push/public-key');
        const data = await response.json();
        publicVapidKey = data.publicKey;
        console.log('Got VAPID public key');

        // Check if already subscribed
        pushSubscription = await registration.pushManager.getSubscription();
        console.log('Existing subscription:', pushSubscription ? 'Yes' : 'No');

        updateNotificationUI(pushSubscription !== null);
    } catch (error) {
        console.error('Error initializing push notifications:', error);
        updateNotificationUI(false);
    }
}

async function subscribeToPush() {
    try {
        const permission = await Notification.requestPermission();
        console.log('Notification permission:', permission);

        if (permission !== 'granted') {
            showToast('Please enable notifications in your browser settings', 'warning');
            return;
        }

        const registration = await navigator.serviceWorker.ready;
        console.log('Service worker ready');

        // Convert VAPID key
        const convertedKey = urlBase64ToUint8Array(publicVapidKey);

        // Subscribe to push
        pushSubscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedKey
        });

        console.log('Push subscription created:', pushSubscription);

        // Send subscription to server
        const response = await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                endpoint: pushSubscription.endpoint,
                keys: {
                    p256dh: arrayBufferToBase64(pushSubscription.getKey('p256dh')),
                    auth: arrayBufferToBase64(pushSubscription.getKey('auth'))
                },
                deviceName: navigator.userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop',
                userAgent: navigator.userAgent
            })
        });

        if (response.ok) {
            showToast('Push notifications enabled!', 'success');
            updateNotificationUI(true);
        } else {
            throw new Error('Failed to subscribe on server');
        }
    } catch (error) {
        console.error('Error subscribing to push:', error);
        showToast('Failed to enable notifications: ' + error.message, 'error');
    }
}

async function unsubscribeFromPush() {
    try {
        if (pushSubscription) {
            await pushSubscription.unsubscribe();

            await fetch('/api/push/unsubscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    endpoint: pushSubscription.endpoint
                })
            });

            pushSubscription = null;
            showToast('Push notifications disabled', 'info');
            updateNotificationUI(false);
        }
    } catch (error) {
        console.error('Error unsubscribing:', error);
        showToast('Error: ' + error.message, 'error');
    }
}

async function testNotification() {
    try {
        const response = await fetch('/api/push/test', { method: 'POST' });
        const result = await response.json();

        if (result.success) {
            showToast(result.message + ' Check your device for the notification!', 'success');
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        console.error('Error sending test notification:', error);
        showToast('Error: ' + error.message, 'error');
    }
}

function updateNotificationUI(isSubscribed) {
    const statusDiv = document.getElementById('notificationStatus');
    const subscribeBtn = document.getElementById('subscribeBtn');
    const unsubscribeBtn = document.getElementById('unsubscribeBtn');
    const testBtn = document.getElementById('testNotificationBtn');

    if (!statusDiv) return;

    if (isSubscribed) {
        statusDiv.textContent = '✅ Notifications enabled';
        statusDiv.style.color = '#0f0';
        if (subscribeBtn) subscribeBtn.style.display = 'none';
        if (unsubscribeBtn) unsubscribeBtn.style.display = 'inline-block';
        if (testBtn) testBtn.style.display = 'inline-block';
    } else {
        statusDiv.textContent = '⚪ Notifications disabled';
        statusDiv.style.color = '#999';
        if (subscribeBtn) subscribeBtn.style.display = 'inline-block';
        if (unsubscribeBtn) unsubscribeBtn.style.display = 'none';
        if (testBtn) testBtn.style.display = 'none';
    }
}

// Helper functions
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initPushNotifications();
});

// ============================================
// STOCK HISTORY
// ============================================

let historyChart = null;
let currentChartType = 'line';
let isFullscreen = false;

async function loadStockHistory() {
    try {
        const symbol = document.getElementById('histStockFilter').value;
        const dateFrom = document.getElementById('histDateFrom').value;
        const dateTo = document.getElementById('histDateTo').value;

        // Build query params
        let statsParams = new URLSearchParams();
        if (symbol) statsParams.append('symbol', symbol);
        if (dateFrom) statsParams.append('from', new Date(dateFrom).toISOString());
        if (dateTo) {
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59, 999);
            statsParams.append('to', toDate.toISOString());
        }

        // Fetch aggregated stats
        const statsRes = await fetch(`${API}/api/hist/stats?${statsParams}`);
        const statsData = await statsRes.json();

        // Update symbols dropdown if needed
        if (document.getElementById('histStockFilter').options.length <= 1) {
            const filterSelect = document.getElementById('histStockFilter');
            const currentFilter = filterSelect.value;

            filterSelect.innerHTML = '<option value="all">All Stocks</option>';
            statsData.symbols.forEach(sym => {
                const opt = document.createElement('option');
                opt.value = sym;
                opt.textContent = sym;
                if (sym === currentFilter) opt.selected = true;
                filterSelect.appendChild(opt);
            });
        }

        // Update stats cards
        updatePriceStats(statsData);

        // Fetch chart data
        let chartParams = new URLSearchParams();
        if (symbol) chartParams.append('symbol', symbol);
        if (dateFrom) chartParams.append('from', new Date(dateFrom).toISOString());
        if (dateTo) {
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59, 999);
            chartParams.append('to', toDate.toISOString());
        }

        const chartRes = await fetch(`${API}/api/hist/chart?${chartParams}`);
        const chartData = await chartRes.json();

        // Render chart
        renderPriceChart(chartData.data, symbol);

        // Fetch recent entries for table
        let tableParams = new URLSearchParams();
        tableParams.append('limit', '20');
        if (symbol) tableParams.append('symbol', symbol);

        const tableRes = await fetch(`${API}/api/hist/recent?${tableParams}`);
        const tableData = await tableRes.json();

        // Render table
        renderHistoryTable(tableData);

    } catch (error) {
        console.error('Error loading stock history:', error);
    }
}

function updatePriceStats(stats) {
    const investedEl = document.getElementById('histStatInvested');
    const valueEl = document.getElementById('histStatValue');
    const buyPriceEl = document.getElementById('histStatBuyPrice');
    const currentPriceEl = document.getElementById('histStatCurrentPrice');
    const priceChangeEl = document.getElementById('histStatPriceChange');
    const changePercentEl = document.getElementById('histStatChangePercent');

    investedEl.textContent = `$${stats.totalInvested.toFixed(2)}`;
    valueEl.textContent = `$${stats.totalValue.toFixed(2)}`;
    buyPriceEl.textContent = `$${stats.avgBuyPrice.toFixed(2)}`;
    currentPriceEl.textContent = `$${stats.currentPrice.toFixed(2)}`;
    priceChangeEl.textContent = `$${stats.priceChange.toFixed(2)}`;
    changePercentEl.textContent = `${stats.changePercent.toFixed(2)}%`;

    // Color total value based on gain/loss
    const valueGain = stats.totalValue - stats.totalInvested;
    valueEl.classList.toggle('positive', valueGain >= 0);
    valueEl.classList.toggle('negative', valueGain < 0);

    priceChangeEl.classList.toggle('positive', stats.priceChange >= 0);
    priceChangeEl.classList.toggle('negative', stats.priceChange < 0);
    changePercentEl.classList.toggle('positive', stats.changePercent >= 0);
    changePercentEl.classList.toggle('negative', stats.changePercent < 0);
}

function renderPriceChart(dataBySymbol, selectedFilter) {
    const ctx = document.getElementById('historyChart');

    if (historyChart) {
        historyChart.destroy();
    }

    const isDark = !document.body.classList.contains('light');
    const textColor = isDark ? '#fff' : '#000';
    const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

    // Get current chart type from selector
    currentChartType = document.getElementById('chartType').value;

    // Prepare datasets
    const datasets = [];
    const colors = ['#0f0', '#0ff', '#ff0', '#f0f', '#fa0', '#0af'];
    let colorIndex = 0;

    const symbols = Object.keys(dataBySymbol);

    if (selectedFilter !== 'all' && symbols.length === 1) {
        // Single stock - show buy price and current price
        const data = dataBySymbol[selectedFilter] || [];

        // Convert to time-series data points
        const currentPriceData = data.map(d => ({
            x: new Date(d.date),
            y: d.currentPrice
        }));

        const buyPriceData = data.map(d => ({
            x: new Date(d.date),
            y: d.buyPrice
        }));

        const isAreaChart = currentChartType === 'area';

        datasets.push({
            label: `${selectedFilter} - Current Price`,
            data: currentPriceData,
            borderColor: '#0f0',
            backgroundColor: isAreaChart ? 'rgba(0,255,0,0.3)' : 'rgba(0,255,0,0.1)',
            borderWidth: currentChartType === 'bar' ? 0 : 3,
            tension: 0.4,
            fill: isAreaChart,
            pointRadius: currentChartType === 'bar' ? 0 : 4,
            pointHoverRadius: currentChartType === 'bar' ? 0 : 6,
            pointBackgroundColor: '#0f0',
            pointBorderColor: isDark ? '#000' : '#fff',
            pointBorderWidth: 2
        });

        datasets.push({
            label: `${selectedFilter} - Buy Price`,
            data: buyPriceData,
            borderColor: '#666',
            backgroundColor: isAreaChart ? 'rgba(100,100,100,0.2)' : 'rgba(100,100,100,0.1)',
            borderWidth: currentChartType === 'bar' ? 0 : 2,
            tension: 0.4,
            fill: isAreaChart,
            borderDash: currentChartType === 'bar' ? [] : [8, 4],
            pointRadius: currentChartType === 'bar' ? 0 : 3,
            pointHoverRadius: currentChartType === 'bar' ? 0 : 5,
            pointBackgroundColor: '#666',
            pointBorderColor: isDark ? '#000' : '#fff',
            pointBorderWidth: 2
        });

        historyChart = new Chart(ctx, {
            type: currentChartType === 'area' ? 'line' : currentChartType,
            data: { datasets },
            options: getAdvancedChartOptions(textColor, gridColor, isDark, true)
        });

    } else {
        // Multiple stocks - show current price for each
        const isAreaChart = currentChartType === 'area';

        symbols.forEach(symbol => {
            const data = dataBySymbol[symbol];

            const priceData = data.map(d => ({
                x: new Date(d.date),
                y: d.currentPrice
            }));

            datasets.push({
                label: symbol,
                data: priceData,
                borderColor: colors[colorIndex % colors.length],
                backgroundColor: isAreaChart
                    ? colors[colorIndex % colors.length].replace(')', ', 0.3)').replace('rgb', 'rgba')
                    : 'transparent',
                borderWidth: currentChartType === 'bar' ? 0 : 3,
                tension: 0.4,
                fill: isAreaChart,
                pointRadius: currentChartType === 'bar' ? 0 : 3,
                pointHoverRadius: currentChartType === 'bar' ? 0 : 6,
                pointBackgroundColor: colors[colorIndex % colors.length],
                pointBorderColor: isDark ? '#000' : '#fff',
                pointBorderWidth: 2
            });

            colorIndex++;
        });

        historyChart = new Chart(ctx, {
            type: currentChartType === 'area' ? 'line' : currentChartType,
            data: { datasets },
            options: getAdvancedChartOptions(textColor, gridColor, isDark, false)
        });
    }
}

function getAdvancedChartOptions(textColor, gridColor, isDark, isSingleStock) {
    return {
        responsive: true,
        maintainAspectRatio: true,
        interaction: {
            mode: 'index',
            intersect: false
        },
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    color: textColor,
                    font: {
                        family: 'monospace',
                        size: 12,
                        weight: 'bold'
                    },
                    padding: 15,
                    usePointStyle: true,
                    pointStyle: 'circle'
                }
            },
            tooltip: {
                enabled: true,
                backgroundColor: isDark ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.9)',
                titleColor: textColor,
                bodyColor: textColor,
                borderColor: textColor,
                borderWidth: 2,
                titleFont: {
                    family: 'monospace',
                    size: 13,
                    weight: 'bold'
                },
                bodyFont: {
                    family: 'monospace',
                    size: 12
                },
                padding: 12,
                displayColors: true,
                callbacks: {
                    title: function(context) {
                        const date = new Date(context[0].parsed.x);
                        return date.toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                        });
                    },
                    label: function(context) {
                        const label = context.dataset.label || '';
                        const value = context.parsed.y;
                        return label + ': $' + value.toFixed(2);
                    },
                    afterBody: function(context) {
                        if (isSingleStock && context.length === 2) {
                            const current = context[0].parsed.y;
                            const buy = context[1].parsed.y;
                            const diff = current - buy;
                            const pct = ((diff / buy) * 100).toFixed(2);
                            return [
                                '',
                                'Change: $' + diff.toFixed(2) + ' (' + pct + '%)'
                            ];
                        }
                        return '';
                    }
                }
            }
        },
        scales: {
            x: {
                type: 'time',
                time: {
                    // Let Chart.js auto-detect the best unit
                    minUnit: 'minute',
                    displayFormats: {
                        millisecond: 'HH:mm:ss.SSS',
                        second: 'HH:mm:ss',
                        minute: 'HH:mm',
                        hour: 'MMM d, HH:mm',
                        day: 'MMM d',
                        week: 'MMM d',
                        month: 'MMM yyyy',
                        quarter: 'MMM yyyy',
                        year: 'yyyy'
                    },
                    tooltipFormat: 'MMM d, yyyy HH:mm:ss'
                },
                ticks: {
                    color: textColor,
                    font: {
                        family: 'monospace',
                        size: 10
                    },
                    maxRotation: 45,
                    minRotation: 45,
                    autoSkip: true,
                    autoSkipPadding: 20,
                    maxTicksLimit: 15
                },
                grid: {
                    color: gridColor,
                    drawBorder: true,
                    borderColor: textColor
                },
                title: {
                    display: true,
                    text: 'TIME',
                    color: textColor,
                    font: {
                        family: 'monospace',
                        size: 11,
                        weight: 'bold'
                    }
                }
            },
            y: {
                ticks: {
                    color: textColor,
                    font: {
                        family: 'monospace',
                        size: 11
                    },
                    callback: function(value) {
                        return '$' + value.toFixed(2);
                    },
                    padding: 8
                },
                grid: {
                    color: gridColor,
                    drawBorder: true,
                    borderColor: textColor
                },
                title: {
                    display: true,
                    text: 'PRICE',
                    color: textColor,
                    font: {
                        family: 'monospace',
                        size: 11,
                        weight: 'bold'
                    }
                }
            }
        },
        animation: false,
        transitions: {
            active: {
                animation: {
                    duration: 0
                }
            }
        }
    };
}

function renderHistoryTable(histories) {
    const tableEl = document.getElementById('historyTable');

    if (histories.length === 0) {
        tableEl.innerHTML = '<div style="padding:12px; border:1px solid var(--border); opacity:0.6;">No history data available</div>';
        return;
    }

    let html = `
        <div class="stock-row stock-header">
            <div>SYMBOL</div>
            <div>QTY</div>
            <div>BUY PRICE</div>
            <div>CURR PRICE</div>
            <div>GAIN/LOSS</div>
            <div>UPDATED</div>
        </div>
    `;

    histories.forEach(item => {
        const gainLoss = (item.currentPrice - item.buyPrice) * item.quantity;
        const gainPercent = ((item.currentPrice - item.buyPrice) / item.buyPrice * 100).toFixed(2);
        const gainClass = gainLoss >= 0 ? 'positive' : 'negative';
        const updatedDate = new Date(item.updatedAt).toLocaleString();

        html += `
            <div class="stock-row">
                <div style="font-weight:bold;">${item.symbol}</div>
                <div>${item.quantity}</div>
                <div>$${item.buyPrice.toFixed(2)}</div>
                <div>$${item.currentPrice.toFixed(2)}</div>
                <div class="${gainClass}">$${gainLoss.toFixed(2)} (${gainPercent}%)</div>
                <div style="font-size:10px; opacity:0.7;">${updatedDate}</div>
            </div>
        `;
    });

    tableEl.innerHTML = html;
}

function clearDateFilter() {
    document.getElementById('histDateFrom').value = '';
    document.getElementById('histDateTo').value = '';
    loadStockHistory();
}

function setChartTimeRange(range) {
    const now = new Date();
    let fromDate = new Date();

    switch(range) {
        case '1h':
            fromDate.setHours(now.getHours() - 1);
            break;
        case '6h':
            fromDate.setHours(now.getHours() - 6);
            break;
        case '12h':
            fromDate.setHours(now.getHours() - 12);
            break;
        case '1d':
            fromDate.setDate(now.getDate() - 1);
            break;
        case '1w':
            fromDate.setDate(now.getDate() - 7);
            break;
        case '1m':
            fromDate.setMonth(now.getMonth() - 1);
            break;
        case '3m':
            fromDate.setMonth(now.getMonth() - 3);
            break;
        case '6m':
            fromDate.setMonth(now.getMonth() - 6);
            break;
        case '1y':
            fromDate.setFullYear(now.getFullYear() - 1);
            break;
        case 'all':
            document.getElementById('histDateFrom').value = '';
            document.getElementById('histDateTo').value = '';
            loadStockHistory();
            return;
    }

    // Format dates for input fields
    const fromStr = fromDate.toISOString().split('T')[0];
    const toStr = now.toISOString().split('T')[0];

    document.getElementById('histDateFrom').value = fromStr;
    document.getElementById('histDateTo').value = toStr;
    loadStockHistory();
}

function changeChartType() {
    // Reload chart with new type
    loadStockHistory();
}

function toggleFullscreen() {
    const container = document.getElementById('chartContainer');
    const btn = document.getElementById('fullscreenBtn');

    if (!isFullscreen) {
        // Enter fullscreen using Fullscreen API if available
        if (container.requestFullscreen) {
            container.requestFullscreen().catch(() => {
                // fallback to CSS fullscreen
                container.classList.add('fullscreen');
            });
        } else if (container.webkitRequestFullscreen) { /* Safari */
            container.webkitRequestFullscreen();
        } else {
            container.classList.add('fullscreen');
        }
        btn.textContent = '⛶ EXIT FULLSCREEN';
        isFullscreen = true;

        // Resize chart after a short delay to allow layout
        setTimeout(() => {
            if (historyChart) historyChart.resize();
        }, 100);

        // Add escape key listener
        document.addEventListener('keydown', handleFullscreenEscape);
    } else {
        // Exit fullscreen via API if possible
        if (document.exitFullscreen) {
            document.exitFullscreen().catch(() => exitFullscreen());
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else {
            exitFullscreen();
        }
    }
}

function exitFullscreen() {
    const container = document.getElementById('chartContainer');
    const btn = document.getElementById('fullscreenBtn');

    container.classList.remove('fullscreen');
    btn.textContent = '⛶ FULLSCREEN';
    isFullscreen = false;

    // Resize chart
    if (historyChart) {
        historyChart.resize();
    }

    // Remove escape key listener
    document.removeEventListener('keydown', handleFullscreenEscape);

    // Ensure browser exits fullscreen state if needed
    if (document.fullscreenElement || document.webkitFullscreenElement) {
        try {
            if (document.exitFullscreen) document.exitFullscreen();
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        } catch (e) {
            // ignore
        }
    }
}

function handleFullscreenEscape(e) {
    if (e.key === 'Escape' && isFullscreen) {
        exitFullscreen();
    }
}

function exportChartImage() {
    if (!historyChart) return;

    const url = historyChart.toBase64Image();
    const link = document.createElement('a');
    link.download = `stock-chart-${new Date().toISOString().split('T')[0]}.png`;
    link.href = url;
    link.click();
}

// ============================================
// STOCK RESEARCH - FIXED VERSION
// ============================================

/**
 * Generate research report
 */
async function generateResearch() {
    const button = document.querySelector('#generateBtn');
    if (!button) return;

    button.disabled = true;
    button.textContent = 'GENERATING...';

    const container = document.getElementById('researchResults');
    if (container) {
        container.innerHTML = '<div style="padding:20px;text-align:center;opacity:0.7;">GENERATING RESEARCH REPORT...</div>';
    }

    try {
        // Add 2-minute timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000);

        const response = await fetch('/api/research/generate', {
            method: 'POST',
            signal: controller.signal  // ✅ Adds timeout control
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
// After fetch, add:
        clearTimeout(timeoutId);
        const report = await response.json();
        displayResearchReport(report);

    } catch (error) {
        console.error('Error generating research:', error);
        if (container) {
            container.innerHTML = `
                <div style="padding:20px;text-align:center;border:1px solid var(--border);">
                    ERROR: ${error.message}
                </div>
            `;
        }
    } finally {
        button.disabled = false;
        button.textContent = '🔍 GENERATE RESEARCH REPORT';
    }
}

/**
 * Load latest research report
 */
async function loadLatestResearch() {
    try {
        const response = await fetch('/api/research/latest');

        if (!response.ok) {
            if (response.status === 404) {
                console.log('No research reports found');
                return;
            }
            throw new Error(`HTTP ${response.status}`);
        }

        const report = await response.json();
        displayResearchReport(report);

    } catch (error) {
        console.error('Error loading latest research:', error);
    }
}

/**
 * Display the research report
 */
function displayResearchReport(report) {
    const container = document.getElementById('researchResults');
    if (!container) return;

    container.innerHTML = '';

    // Portfolio summary
    const summarySection = document.createElement('div');
    summarySection.className = 'portfolio-summary';
    summarySection.innerHTML = `
        <div class="summary-card">
            <div class="summary-label">TOTAL VALUE</div>
            <div class="summary-value">$${report.totalValue.toFixed(2)}</div>
        </div>
        <div class="summary-card">
            <div class="summary-label">TOTAL GAIN/LOSS</div>
            <div class="summary-value ${report.totalGain >= 0 ? 'positive' : 'negative'}">
                ${report.totalGain >= 0 ? '+' : ''}$${report.totalGain.toFixed(2)}
            </div>
        </div>
        <div class="summary-card">
            <div class="summary-label">RETURN %</div>
            <div class="summary-value ${report.gainPercentage >= 0 ? 'positive' : 'negative'}">
                ${report.gainPercentage >= 0 ? '+' : ''}${report.gainPercentage.toFixed(2)}%
            </div>
        </div>
        <div class="summary-card">
            <div class="summary-label">OVERALL SENTIMENT</div>
            <div class="summary-value ${
        report.overallSentiment === 'BULLISH' ? 'positive' :
            report.overallSentiment === 'BEARISH' ? 'negative' : 'neutral'
    }">
                ${report.overallSentiment}
            </div>
        </div>
    `;
    container.appendChild(summarySection);

    // Stock analysis cards
    const holdingsMap = {};
    report.holdings.forEach(h => holdingsMap[h.symbol] = h);

    for (const [symbol, analysis] of Object.entries(report.analyses)) {
        const holding = holdingsMap[symbol];
        if (holding) {
            const card = createStockAnalysisCard(symbol, analysis, holding);
            container.appendChild(card);
        }
    }

    // ✅ CRITICAL: Attach event listeners for show more buttons
    attachShowMoreListeners();
}

/**
 * Create stock analysis card with sorted news
 */
function createStockAnalysisCard(symbol, analysis, holding) {
    const card = document.createElement('div');
    card.className = 'stock-analysis-card';

    const currentValue = holding.currentPrice * holding.quantity;
    const costBasis = holding.buyPrice * holding.quantity;
    const gain = currentValue - costBasis;
    const gainPct = (gain / costBasis) * 100;

    const sentimentClass =
        analysis.sentimentScore > 0.2 ? 'positive' :
            analysis.sentimentScore < -0.2 ? 'negative' : 'neutral';

    const rsi = analysis.technicalIndicators?.rsi ?? null;
    const rsiStatus = rsi === null ? 'N/A' :
        rsi > 70 ? 'OVERBOUGHT' :
            rsi < 30 ? 'OVERSOLD' : 'NEUTRAL';

    const rsiClass =
        rsi === null ? 'neutral' :
            rsi > 70 ? 'negative' :
                rsi < 30 ? 'positive' : 'neutral';

    // ✅ SORT NEWS BY RELEVANCE (HIGHEST FIRST)
    const sortedNews = [...analysis.news].sort(
        (a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0)
    );

    // ✅ GENERATE NEWS HTML WITH HIDDEN CLASS
    const newsHTML = sortedNews.map((n, i) => `
        <div class="news-item ${i >= 3 ? 'hidden-news-item' : ''}">
            <a href="${n.url}" target="_blank" class="news-title">${n.title}</a>
            <div class="news-meta">
                ${n.source || 'Unknown'} |
                Sentiment ${(n.tickerSentimentScore ?? 0).toFixed(3)} |
                Relevance ${(n.relevanceScore ?? 0).toFixed(2)}
            </div>
        </div>
    `).join('');

    const hiddenCount = Math.max(0, sortedNews.length - 3);

    card.innerHTML = `
        <div class="stock-header">
            <div class="stock-symbol">${symbol}</div>
            <div class="stock-return ${gainPct >= 0 ? 'positive' : 'negative'}">
                ${gainPct >= 0 ? '+' : ''}${gainPct.toFixed(2)}%
            </div>
        </div>

        <div class="stock-metrics">
            <div class="metric-box">
                <div class="metric-label">SENTIMENT</div>
                <div class="metric-value ${sentimentClass}">
                    ${analysis.sentimentScore.toFixed(3)}
                </div>
            </div>

            <div class="metric-box">
                <div class="metric-label">RSI (14)</div>
                <div class="metric-value ${rsiClass}">
                    ${rsi === null ? 'N/A' : rsi.toFixed(1)}
                </div>
                <div class="metric-sublabel">${rsiStatus}</div>
            </div>

            <div class="metric-box">
                <div class="metric-label">CURRENT PRICE</div>
                <div class="metric-value">$${holding.currentPrice.toFixed(2)}</div>
            </div>

            <div class="metric-box">
                <div class="metric-label">SHARES</div>
                <div class="metric-value">${holding.quantity.toFixed(2)}</div>
            </div>
        </div>

        <div class="recommendation-box">
            <div class="recommendation-label">RECOMMENDATION</div>
            <div class="recommendation-text">${analysis.recommendation}</div>
        </div>

        <div class="news-section">
            <div class="news-header">RECENT NEWS (${sortedNews.length})</div>
            <div class="news-list" data-symbol="${symbol}">
                ${newsHTML}
                ${
        hiddenCount > 0
            ? `<div class="show-more-news" data-symbol="${symbol}">
                               + ${hiddenCount} more article${hiddenCount > 1 ? 's' : ''}
                           </div>`
            : ''
    }
            </div>
        </div>
    `;

    return card;
}

/**
 * ✅ ATTACH EVENT LISTENERS TO SHOW MORE BUTTONS
 */
function attachShowMoreListeners() {
    const showMoreButtons = document.querySelectorAll('.show-more-news');

    showMoreButtons.forEach(button => {
        button.addEventListener('click', function() {
            const symbol = this.getAttribute('data-symbol');
            const newsList = document.querySelector(`.news-list[data-symbol="${symbol}"]`);
            const hiddenItems = newsList.querySelectorAll('.hidden-news-item');

            // Toggle visibility
            const isExpanded = this.classList.contains('expanded');

            if (isExpanded) {
                // Collapse
                hiddenItems.forEach(item => {
                    item.style.display = 'none';
                });
                this.textContent = `+ ${hiddenItems.length} more article${hiddenItems.length > 1 ? 's' : ''}`;
                this.classList.remove('expanded');
            } else {
                // Expand
                hiddenItems.forEach(item => {
                    item.style.display = 'block';
                });
                this.textContent = '− SHOW LESS';
                this.classList.add('expanded');
            }
        });
    });
}


loadMemos();

/* ===========================================================
   FITNESS TRACKER
=============================================================*/

let weightChart = null;

async function loadFitnessTab() {
    // Set default dates
    document.getElementById('workoutDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('weightDate').value = new Date().toISOString().split('T')[0];

    // Load today's workout first (most important)
    await loadTodaysWorkout();

    // Load all data in parallel
    await Promise.all([
        loadFitnessStats(),
        loadWeeklyWorkouts(),
        loadWeightData(),
        loadWorkoutHistory(),
        loadTemplates(),
        loadFitnessAnalytics()
    ]);

    // Load plans after templates (needs template cache)
    await loadPlans();
}

/* ===========================================================
   TODAY'S WORKOUT
=============================================================*/

let todaysWorkoutData = null;

async function loadTodaysWorkout() {
    try {
        const res = await fetch(`${API}/api/fitness/today`);
        if (!res.ok) throw new Error('Failed to load today\'s workout');
        todaysWorkoutData = await res.json();

        const banner = document.getElementById('todaysWorkoutBanner');
        const typeEl = document.getElementById('todaysWorkoutType');
        const planEl = document.getElementById('todaysWorkoutPlan');
        const statusEl = document.getElementById('todaysWorkoutStatus');
        const actionsEl = document.getElementById('todaysWorkoutActions');

        if (todaysWorkoutData.todaysWorkout && todaysWorkoutData.todaysWorkout.completed) {
            // Already completed today
            banner.style.borderColor = '#0f0';
            typeEl.textContent = todaysWorkoutData.scheduledTemplate?.name || 'Workout';
            typeEl.style.color = '#0f0';
            planEl.textContent = todaysWorkoutData.planName ? `From: ${todaysWorkoutData.planName}` : '';
            statusEl.innerHTML = '<span style="color:#0f0;">✓ Completed today!</span>';
            actionsEl.innerHTML = '<button class="btn" onclick="showTodaysWorkoutModal()">VIEW DETAILS</button>';
        } else if (todaysWorkoutData.scheduledTemplate) {
            // Has scheduled workout
            const template = todaysWorkoutData.scheduledTemplate;
            banner.style.borderColor = '#f90';
            typeEl.textContent = template.name;
            typeEl.style.color = '#f90';
            planEl.textContent = todaysWorkoutData.planName ? `From: ${todaysWorkoutData.planName}` : '';

            const exerciseCount = template.exercises?.length || 0;
            const duration = template.estimatedDuration || 0;
            statusEl.innerHTML = `<span style="opacity:0.7;">${exerciseCount} exercises • ~${duration} min</span>`;
            actionsEl.innerHTML = '<button class="btn" onclick="showTodaysWorkoutModal()" style="background:#0f0; color:#000; font-weight:bold;">START WORKOUT</button>';
        } else {
            // Rest day
            banner.style.borderColor = '#888';
            typeEl.textContent = 'Rest Day';
            typeEl.style.color = '#888';
            planEl.textContent = todaysWorkoutData.planName ? `From: ${todaysWorkoutData.planName}` : 'No active plan';
            statusEl.innerHTML = '<span style="opacity:0.7;">Take it easy today!</span>';
            actionsEl.innerHTML = '<button class="btn" onclick="showTodaysWorkoutModal()">LOG ANYWAY</button>';
        }
    } catch (e) {
        console.error('Failed to load today\'s workout:', e);
        document.getElementById('todaysWorkoutType').textContent = 'No plan active';
        document.getElementById('todaysWorkoutStatus').textContent = 'Create a plan to get started';
    }
}

function showTodaysWorkoutModal() {
    const modal = document.getElementById('todaysWorkoutModal');
    const title = document.getElementById('todaysWorkoutModalTitle');
    const planInfo = document.getElementById('todaysWorkoutModalPlan');
    const exerciseList = document.getElementById('todaysExerciseList');

    if (!todaysWorkoutData) {
        showToast('No workout data available', 'error');
        return;
    }

    const template = todaysWorkoutData.scheduledTemplate;
    const existingWorkout = todaysWorkoutData.todaysWorkout;

    if (template) {
        title.textContent = template.name;
        planInfo.textContent = template.notes || '';

        // Build exercise checklist
        if (template.exercises && template.exercises.length > 0) {
            exerciseList.innerHTML = template.exercises.map((ex, idx) => {
                const isChecked = existingWorkout?.completed ? 'checked disabled' : '';
                const weightInfo = ex.weight ? `@ ${ex.weight}kg` : '';
                const setsReps = ex.sets && ex.reps ? `${ex.sets} x ${ex.reps} ${weightInfo}` : '';
                const duration = ex.durationSeconds ? `${Math.round(ex.durationSeconds / 60)} min` : '';

                return `
                    <div class="exercise-checklist-item" style="display:flex; align-items:center; padding:12px; border:1px solid var(--border); margin-bottom:8px;">
                        <input type="checkbox" id="exercise_${idx}" ${isChecked} style="width:20px; height:20px; margin-right:12px;">
                        <div style="flex:1;">
                            <div style="font-weight:bold;">${ex.name}</div>
                            <div style="font-size:12px; opacity:0.7;">${setsReps || duration || ''}</div>
                            ${ex.notes ? `<div style="font-size:11px; opacity:0.5;">${ex.notes}</div>` : ''}
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            exerciseList.innerHTML = '<div style="opacity:0.5; padding:12px;">No exercises defined for this template</div>';
        }

        // Pre-fill duration
        document.getElementById('todayWorkoutDuration').value = template.estimatedDuration || '';
    } else {
        title.textContent = 'Rest Day';
        planInfo.textContent = 'No workout scheduled, but you can log one anyway';
        exerciseList.innerHTML = `
            <div style="padding:12px;">
                <label>Workout Type:</label>
                <select id="restDayWorkoutType" style="margin-top:8px;">
                    <option value="CARDIO">Cardio</option>
                    <option value="FULL_BODY">Full Body</option>
                    <option value="CORE">Core</option>
                    <option value="REST">Rest (just tracking)</option>
                </select>
            </div>
        `;
    }

    // Pre-fill notes if existing workout
    if (existingWorkout) {
        document.getElementById('todayWorkoutDuration').value = existingWorkout.durationMinutes || '';
        document.getElementById('todayWorkoutCalories').value = existingWorkout.caloriesBurned || '';
        document.getElementById('todayWorkoutNotes').value = existingWorkout.notes || '';
    } else {
        document.getElementById('todayWorkoutCalories').value = '';
        document.getElementById('todayWorkoutNotes').value = '';
    }

    openModal('todaysWorkoutModal');
}

async function completeTodaysWorkout() {
    const duration = document.getElementById('todayWorkoutDuration').value;
    const calories = document.getElementById('todayWorkoutCalories').value;
    const notes = document.getElementById('todayWorkoutNotes').value;

    const template = todaysWorkoutData?.scheduledTemplate;
    const existingWorkout = todaysWorkoutData?.todaysWorkout;

    let exerciseType = template?.exerciseType || 'FULL_BODY';

    // If rest day, get selected type
    const restDaySelect = document.getElementById('restDayWorkoutType');
    if (restDaySelect) {
        exerciseType = restDaySelect.value;
    }

    try {
        let method = 'POST';
        let url = `${API}/api/fitness/workouts`;

        const workoutData = {
            workoutDate: new Date().toISOString().split('T')[0],
            exerciseType: exerciseType,
            durationMinutes: duration ? parseInt(duration) : null,
            caloriesBurned: calories ? parseInt(calories) : null,
            notes: notes || (template ? `Completed: ${template.name}` : null),
            completed: true
        };

        // If already exists, update instead
        if (existingWorkout) {
            method = 'PUT';
            url = `${API}/api/fitness/workouts/${existingWorkout.id}`;
        }

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(workoutData)
        });

        if (!res.ok) throw new Error('Failed to save workout');

        closeModal('todaysWorkoutModal');
        showToast('Workout completed! Great job!', 'success');

        // Refresh everything
        await Promise.all([
            loadTodaysWorkout(),
            loadFitnessStats(),
            loadWeeklyWorkouts(),
            loadWorkoutHistory()
        ]);
    } catch (e) {
        console.error('Failed to complete workout:', e);
        showToast('Failed to save workout', 'error');
    }
}

async function loadFitnessStats() {
    try {
        const res = await fetch(`${API}/api/fitness/stats`);
        if (!res.ok) throw new Error('Failed to load fitness stats');
        const stats = await res.json();

        document.getElementById('fitnessCurrentStreak').textContent = `${stats.currentStreak} days`;
        document.getElementById('fitnessLongestStreak').textContent = `${stats.longestStreak} days`;
        document.getElementById('fitnessThisWeek').textContent = `${stats.thisWeekWorkouts} workouts`;
        document.getElementById('fitnessTotalWorkouts').textContent = stats.totalWorkouts;

        // Update streak color based on value
        const streakEl = document.getElementById('fitnessCurrentStreak');
        if (stats.currentStreak >= 7) {
            streakEl.classList.add('positive');
        } else if (stats.currentStreak === 0) {
            streakEl.classList.remove('positive');
        }
    } catch (e) {
        console.error('Failed to load fitness stats:', e);
    }
}

async function loadWeeklyWorkouts() {
    try {
        const res = await fetch(`${API}/api/fitness/workouts/week`);
        if (!res.ok) throw new Error('Failed to load weekly workouts');
        const workouts = await res.json();

        // Map workouts by day
        const dayMap = {
            'MONDAY': 'Mon',
            'TUESDAY': 'Tue',
            'WEDNESDAY': 'Wed',
            'THURSDAY': 'Thu',
            'FRIDAY': 'Fri'
        };

        // Reset all days
        Object.keys(dayMap).forEach(day => {
            const abbrev = dayMap[day];
            document.getElementById(`day${abbrev}`).textContent = '-';
            document.getElementById(`status${abbrev}`).textContent = '';
            document.getElementById(`status${abbrev}`).className = 'day-status';
        });

        // Fill in workouts
        workouts.forEach(w => {
            const dayKey = w.dayOfWeek;
            if (dayMap[dayKey]) {
                const abbrev = dayMap[dayKey];
                const typeDisplay = w.exerciseType ? w.exerciseType.replace('_', ' ') : '-';
                document.getElementById(`day${abbrev}`).textContent = typeDisplay;

                const statusEl = document.getElementById(`status${abbrev}`);
                if (w.completed) {
                    statusEl.textContent = '✓';
                    statusEl.classList.add('completed');
                } else {
                    statusEl.textContent = '○';
                    statusEl.classList.add('pending');
                }
            }
        });
    } catch (e) {
        console.error('Failed to load weekly workouts:', e);
    }
}

async function loadWeightData() {
    try {
        // Load latest weight
        const latestRes = await fetch(`${API}/api/fitness/weight/latest`);
        if (latestRes.ok) {
            const latest = await latestRes.json();
            document.getElementById('currentWeight').textContent = `${latest.weight} kg`;
        }

        // Load weight history for chart
        const historyRes = await fetch(`${API}/api/fitness/weight?days=30`);
        if (!historyRes.ok) throw new Error('Failed to load weight history');
        const history = await historyRes.json();

        renderWeightChart(history);

        // Calculate weight change indicator
        if (history.length >= 2) {
            const sorted = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));
            const first = sorted[0].weight;
            const last = sorted[sorted.length - 1].weight;
            const change = last - first;

            const indicator = document.getElementById('weightChangeIndicator');
            if (change < 0) {
                indicator.textContent = `${change.toFixed(1)} kg (30 days)`;
                indicator.style.color = '#0f0';
            } else if (change > 0) {
                indicator.textContent = `+${change.toFixed(1)} kg (30 days)`;
                indicator.style.color = '#f90';
            } else {
                indicator.textContent = 'No change (30 days)';
                indicator.style.color = 'inherit';
            }
        }
    } catch (e) {
        console.error('Failed to load weight data:', e);
    }
}

function renderWeightChart(data) {
    const ctx = document.getElementById('weightChart')?.getContext('2d');
    if (!ctx) return;

    // Sort by date
    const sorted = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));

    const labels = sorted.map(d => d.date);
    const weights = sorted.map(d => d.weight);

    if (weightChart) {
        weightChart.destroy();
    }

    weightChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Weight (kg)',
                data: weights,
                borderColor: '#0f0',
                backgroundColor: 'rgba(0, 255, 0, 0.1)',
                fill: true,
                tension: 0.3,
                pointRadius: 3,
                pointHoverRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255,255,255,0.1)'
                    },
                    ticks: {
                        color: '#aaa',
                        maxTicksLimit: 7
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255,255,255,0.1)'
                    },
                    ticks: {
                        color: '#aaa'
                    }
                }
            }
        }
    });
}

async function loadWorkoutHistory() {
    try {
        const res = await fetch(`${API}/api/fitness/workouts/recent`);
        if (!res.ok) throw new Error('Failed to load workout history');
        const workouts = await res.json();

        const container = document.getElementById('workoutHistoryList');
        if (!workouts.length) {
            container.innerHTML = '<div style="opacity:0.5; padding:12px;">No workouts logged yet</div>';
            return;
        }

        container.innerHTML = workouts.map(w => `
            <div class="card" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; padding:12px;">
                <div>
                    <div style="font-weight:bold;">${w.workoutDate || 'No date'}</div>
                    <div style="font-size:12px; opacity:0.7;">
                        ${w.exerciseType ? w.exerciseType.replace('_', ' ') : 'Unknown'}
                        ${w.durationMinutes ? `• ${w.durationMinutes} min` : ''}
                        ${w.caloriesBurned ? `• ${w.caloriesBurned} cal` : ''}
                    </div>
                    ${w.notes ? `<div style="font-size:11px; opacity:0.5; margin-top:4px;">${w.notes}</div>` : ''}
                </div>
                <div style="display:flex; gap:8px; align-items:center;">
                    <span style="color:${w.completed ? '#0f0' : '#f90'};">${w.completed ? '✓' : '○'}</span>
                    <button class="btn" onclick="editWorkout('${w.id}')" style="padding:4px 8px; font-size:11px;">EDIT</button>
                    <button class="btn" onclick="deleteWorkout('${w.id}')" style="padding:4px 8px; font-size:11px;">DEL</button>
                </div>
            </div>
        `).join('');
    } catch (e) {
        console.error('Failed to load workout history:', e);
    }
}

async function logWorkout() {
    const date = document.getElementById('workoutDate').value;
    const type = document.getElementById('workoutType').value;
    const duration = document.getElementById('workoutDuration').value;
    const calories = document.getElementById('workoutCalories').value;
    const notes = document.getElementById('workoutNotes').value;
    const completed = document.getElementById('workoutCompleted').checked;

    if (!date || !type) {
        showToast('Please select a date and workout type', 'error');
        return;
    }

    try {
        const res = await fetch(`${API}/api/fitness/workouts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                workoutDate: date,
                exerciseType: type,
                durationMinutes: duration ? parseInt(duration) : null,
                caloriesBurned: calories ? parseInt(calories) : null,
                notes: notes || null,
                completed: completed
            })
        });

        if (!res.ok) throw new Error('Failed to log workout');

        showToast('Workout logged successfully', 'success');

        // Clear form
        document.getElementById('workoutDuration').value = '';
        document.getElementById('workoutCalories').value = '';
        document.getElementById('workoutNotes').value = '';
        document.getElementById('workoutCompleted').checked = true;

        // Reload data
        await Promise.all([
            loadFitnessStats(),
            loadWeeklyWorkouts(),
            loadWorkoutHistory()
        ]);
    } catch (e) {
        console.error('Failed to log workout:', e);
        showToast('Failed to log workout', 'error');
    }
}

async function logWeight() {
    const date = document.getElementById('weightDate').value;
    const weight = document.getElementById('weightValue').value;
    const notes = document.getElementById('weightNotes').value;

    if (!date || !weight) {
        showToast('Please enter date and weight', 'error');
        return;
    }

    try {
        const res = await fetch(`${API}/api/fitness/weight`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                date: date,
                weight: parseFloat(weight),
                notes: notes || null
            })
        });

        if (!res.ok) throw new Error('Failed to log weight');

        showToast('Weight logged successfully', 'success');

        // Clear form
        document.getElementById('weightValue').value = '';
        document.getElementById('weightNotes').value = '';

        // Reload weight data
        await loadWeightData();
    } catch (e) {
        console.error('Failed to log weight:', e);
        showToast('Failed to log weight', 'error');
    }
}

async function editWorkout(id) {
    try {
        const res = await fetch(`${API}/api/fitness/workouts/${id}`);
        if (!res.ok) throw new Error('Failed to fetch workout');
        const workout = await res.json();

        document.getElementById('editWorkoutId').value = workout.id;
        document.getElementById('editWorkoutDate').value = workout.workoutDate || '';
        document.getElementById('editWorkoutType').value = workout.exerciseType || 'PUSH';
        document.getElementById('editWorkoutDuration').value = workout.durationMinutes || '';
        document.getElementById('editWorkoutCalories').value = workout.caloriesBurned || '';
        document.getElementById('editWorkoutNotes').value = workout.notes || '';
        document.getElementById('editWorkoutCompleted').checked = workout.completed;

        openModal('workoutEditModal');
    } catch (e) {
        console.error('Failed to load workout for edit:', e);
        showToast('Failed to load workout', 'error');
    }
}

async function saveWorkoutEdit() {
    const id = document.getElementById('editWorkoutId').value;
    const date = document.getElementById('editWorkoutDate').value;
    const type = document.getElementById('editWorkoutType').value;
    const duration = document.getElementById('editWorkoutDuration').value;
    const calories = document.getElementById('editWorkoutCalories').value;
    const notes = document.getElementById('editWorkoutNotes').value;
    const completed = document.getElementById('editWorkoutCompleted').checked;

    try {
        const res = await fetch(`${API}/api/fitness/workouts/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                workoutDate: date,
                exerciseType: type,
                durationMinutes: duration ? parseInt(duration) : null,
                caloriesBurned: calories ? parseInt(calories) : null,
                notes: notes || null,
                completed: completed
            })
        });

        if (!res.ok) throw new Error('Failed to update workout');

        closeModal('workoutEditModal');
        showToast('Workout updated successfully', 'success');

        await Promise.all([
            loadFitnessStats(),
            loadWeeklyWorkouts(),
            loadWorkoutHistory()
        ]);
    } catch (e) {
        console.error('Failed to update workout:', e);
        showToast('Failed to update workout', 'error');
    }
}

async function deleteWorkout(id) {
    if (!confirm('Delete this workout?')) return;

    try {
        const res = await fetch(`${API}/api/fitness/workouts/${id}`, {
            method: 'DELETE'
        });

        if (!res.ok) throw new Error('Failed to delete workout');

        showToast('Workout deleted', 'success');

        await Promise.all([
            loadFitnessStats(),
            loadWeeklyWorkouts(),
            loadWorkoutHistory()
        ]);
    } catch (e) {
        console.error('Failed to delete workout:', e);
        showToast('Failed to delete workout', 'error');
    }
}

/* ===========================================================
   FITNESS TEMPLATES
=============================================================*/

let templatesCache = [];

async function loadTemplates() {
    try {
        const res = await fetch(`${API}/api/fitness/templates`);
        if (!res.ok) throw new Error('Failed to load templates');
        templatesCache = await res.json();

        const container = document.getElementById('templatesList');
        if (!templatesCache.length) {
            container.innerHTML = '<div style="opacity:0.5; padding:12px;">No templates yet. Create one to get started.</div>';
            return;
        }

        container.innerHTML = templatesCache.map(t => `
            <div class="card" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; padding:12px;">
                <div>
                    <div style="font-weight:bold;">${t.name}</div>
                    <div style="font-size:12px; opacity:0.7;">
                        ${t.exerciseType ? t.exerciseType.replace('_', ' ') : 'Unknown'}
                        ${t.estimatedDuration ? `• ${t.estimatedDuration} min` : ''}
                    </div>
                </div>
                <div style="display:flex; gap:8px;">
                    <button class="btn" onclick="quickLogFromTemplate('${t.id}')" style="padding:4px 8px; font-size:11px;">LOG TODAY</button>
                    <button class="btn" onclick="editTemplate('${t.id}')" style="padding:4px 8px; font-size:11px;">EDIT</button>
                    <button class="btn" onclick="deleteTemplate('${t.id}')" style="padding:4px 8px; font-size:11px;">DEL</button>
                </div>
            </div>
        `).join('');

        // Update plan dropdowns
        updatePlanTemplateDropdowns();
    } catch (e) {
        console.error('Failed to load templates:', e);
    }
}

function updatePlanTemplateDropdowns() {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    days.forEach(day => {
        const select = document.getElementById(`plan${day}`);
        if (select) {
            const currentVal = select.value;
            select.innerHTML = '<option value="">Rest</option>' +
                templatesCache.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
            select.value = currentVal;
        }
    });
}

function showAddTemplateModal() {
    document.getElementById('templateModalTitle').textContent = 'Add Template';
    document.getElementById('editTemplateId').value = '';
    document.getElementById('templateName').value = '';
    document.getElementById('templateType').value = 'PUSH';
    document.getElementById('templateDuration').value = '';
    document.getElementById('templateNotes').value = '';
    openModal('templateModal');
}

async function editTemplate(id) {
    try {
        const res = await fetch(`${API}/api/fitness/templates/${id}`);
        if (!res.ok) throw new Error('Failed to fetch template');
        const template = await res.json();

        document.getElementById('templateModalTitle').textContent = 'Edit Template';
        document.getElementById('editTemplateId').value = template.id;
        document.getElementById('templateName').value = template.name || '';
        document.getElementById('templateType').value = template.exerciseType || 'PUSH';
        document.getElementById('templateDuration').value = template.estimatedDuration || '';
        document.getElementById('templateNotes').value = template.notes || '';

        openModal('templateModal');
    } catch (e) {
        console.error('Failed to load template:', e);
        showToast('Failed to load template', 'error');
    }
}

async function saveTemplate() {
    const id = document.getElementById('editTemplateId').value;
    const name = document.getElementById('templateName').value;
    const exerciseType = document.getElementById('templateType').value;
    const duration = document.getElementById('templateDuration').value;
    const notes = document.getElementById('templateNotes').value;

    if (!name) {
        showToast('Please enter a template name', 'error');
        return;
    }

    try {
        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API}/api/fitness/templates/${id}` : `${API}/api/fitness/templates`;

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                exerciseType,
                estimatedDuration: duration ? parseInt(duration) : null,
                notes: notes || null
            })
        });

        if (!res.ok) throw new Error('Failed to save template');

        closeModal('templateModal');
        showToast(id ? 'Template updated' : 'Template created', 'success');
        await loadTemplates();
    } catch (e) {
        console.error('Failed to save template:', e);
        showToast('Failed to save template', 'error');
    }
}

async function deleteTemplate(id) {
    if (!confirm('Delete this template?')) return;

    try {
        const res = await fetch(`${API}/api/fitness/templates/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete template');

        showToast('Template deleted', 'success');
        await loadTemplates();
    } catch (e) {
        console.error('Failed to delete template:', e);
        showToast('Failed to delete template', 'error');
    }
}

async function quickLogFromTemplate(templateId) {
    try {
        const res = await fetch(`${API}/api/fitness/workouts/from-template/${templateId}`, {
            method: 'POST'
        });

        if (!res.ok) throw new Error('Failed to log workout');

        showToast('Workout logged from template', 'success');

        await Promise.all([
            loadFitnessStats(),
            loadWeeklyWorkouts(),
            loadWorkoutHistory()
        ]);
    } catch (e) {
        console.error('Failed to log from template:', e);
        showToast('Failed to log workout', 'error');
    }
}

/* ===========================================================
   FITNESS PLANS
=============================================================*/

async function loadPlans() {
    try {
        const res = await fetch(`${API}/api/fitness/plans`);
        if (!res.ok) throw new Error('Failed to load plans');
        const plans = await res.json();

        // Show active plan
        const activeDisplay = document.getElementById('activePlanDisplay');
        const activePlan = plans.find(p => p.active);
        if (activePlan) {
            const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
            const schedule = days.map(day => {
                const templateId = activePlan.schedule[day];
                const template = templatesCache.find(t => t.id === templateId);
                return template ? template.name : 'Rest';
            });
            activeDisplay.innerHTML = `
                <div style="border:1px solid #0f0; padding:12px; background:rgba(0,255,0,0.05);">
                    <div style="font-weight:bold; color:#0f0; margin-bottom:8px;">Active: ${activePlan.name}</div>
                    <div style="display:grid; grid-template-columns:repeat(7, 1fr); gap:4px; font-size:11px; text-align:center;">
                        ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) =>
                            `<div><div style="opacity:0.7;">${d}</div><div>${schedule[i]}</div></div>`
                        ).join('')}
                    </div>
                </div>
            `;
        } else {
            activeDisplay.innerHTML = '<div style="opacity:0.5; font-size:12px;">No active plan. Create and activate a plan.</div>';
        }

        // Show all plans
        const container = document.getElementById('plansList');
        if (!plans.length) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = plans.map(p => `
            <div class="card" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; padding:12px;">
                <div>
                    <div style="font-weight:bold;">${p.name} ${p.active ? '<span style="color:#0f0;">(Active)</span>' : ''}</div>
                </div>
                <div style="display:flex; gap:8px;">
                    ${!p.active ? `<button class="btn" onclick="activatePlan('${p.id}')" style="padding:4px 8px; font-size:11px;">ACTIVATE</button>` : ''}
                    <button class="btn" onclick="editPlan('${p.id}')" style="padding:4px 8px; font-size:11px;">EDIT</button>
                    <button class="btn" onclick="deletePlan('${p.id}')" style="padding:4px 8px; font-size:11px;">DEL</button>
                </div>
            </div>
        `).join('');
    } catch (e) {
        console.error('Failed to load plans:', e);
    }
}

function showAddPlanModal() {
    document.getElementById('planModalTitle').textContent = 'Add Plan';
    document.getElementById('editPlanId').value = '';
    document.getElementById('planName').value = '';
    document.getElementById('planActive').checked = false;
    document.getElementById('planNotes').value = '';

    // Reset dropdowns
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    days.forEach(day => {
        const select = document.getElementById(`plan${day}`);
        if (select) select.value = '';
    });

    updatePlanTemplateDropdowns();
    openModal('planModal');
}

async function editPlan(id) {
    try {
        const res = await fetch(`${API}/api/fitness/plans/${id}`);
        if (!res.ok) throw new Error('Failed to fetch plan');
        const plan = await res.json();

        document.getElementById('planModalTitle').textContent = 'Edit Plan';
        document.getElementById('editPlanId').value = plan.id;
        document.getElementById('planName').value = plan.name || '';
        document.getElementById('planActive').checked = plan.active;
        document.getElementById('planNotes').value = plan.notes || '';

        updatePlanTemplateDropdowns();

        // Set schedule
        const dayMap = {
            'MONDAY': 'Monday', 'TUESDAY': 'Tuesday', 'WEDNESDAY': 'Wednesday',
            'THURSDAY': 'Thursday', 'FRIDAY': 'Friday', 'SATURDAY': 'Saturday', 'SUNDAY': 'Sunday'
        };
        Object.entries(plan.schedule || {}).forEach(([day, templateId]) => {
            const select = document.getElementById(`plan${dayMap[day]}`);
            if (select) select.value = templateId || '';
        });

        openModal('planModal');
    } catch (e) {
        console.error('Failed to load plan:', e);
        showToast('Failed to load plan', 'error');
    }
}

async function savePlan() {
    const id = document.getElementById('editPlanId').value;
    const name = document.getElementById('planName').value;
    const active = document.getElementById('planActive').checked;
    const notes = document.getElementById('planNotes').value;

    if (!name) {
        showToast('Please enter a plan name', 'error');
        return;
    }

    // Build schedule
    const schedule = {};
    const dayMap = {
        'Monday': 'MONDAY', 'Tuesday': 'TUESDAY', 'Wednesday': 'WEDNESDAY',
        'Thursday': 'THURSDAY', 'Friday': 'FRIDAY', 'Saturday': 'SATURDAY', 'Sunday': 'SUNDAY'
    };
    Object.entries(dayMap).forEach(([jsDay, javaDay]) => {
        const select = document.getElementById(`plan${jsDay}`);
        if (select && select.value) {
            schedule[javaDay] = select.value;
        }
    });

    try {
        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API}/api/fitness/plans/${id}` : `${API}/api/fitness/plans`;

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, schedule, active, notes: notes || null })
        });

        if (!res.ok) throw new Error('Failed to save plan');

        closeModal('planModal');
        showToast(id ? 'Plan updated' : 'Plan created', 'success');
        await loadPlans();
    } catch (e) {
        console.error('Failed to save plan:', e);
        showToast('Failed to save plan', 'error');
    }
}

async function activatePlan(id) {
    try {
        const res = await fetch(`${API}/api/fitness/plans/${id}/activate`, { method: 'PUT' });
        if (!res.ok) throw new Error('Failed to activate plan');

        showToast('Plan activated', 'success');
        await loadPlans();
    } catch (e) {
        console.error('Failed to activate plan:', e);
        showToast('Failed to activate plan', 'error');
    }
}

async function deletePlan(id) {
    if (!confirm('Delete this plan?')) return;

    try {
        const res = await fetch(`${API}/api/fitness/plans/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete plan');

        showToast('Plan deleted', 'success');
        await loadPlans();
    } catch (e) {
        console.error('Failed to delete plan:', e);
        showToast('Failed to delete plan', 'error');
    }
}

/* ===========================================================
   FITNESS ANALYTICS
=============================================================*/

let workoutTypeChart = null;
let weeklyVolumeChart = null;

async function loadFitnessAnalytics() {
    try {
        const res = await fetch(`${API}/api/fitness/analytics?weeks=12`);
        if (!res.ok) throw new Error('Failed to load analytics');
        const analytics = await res.json();

        // Update consistency score
        document.getElementById('consistencyScore').textContent = analytics.consistencyScore + '%';
        document.getElementById('avgWorkoutsPerWeek').textContent = analytics.averageWorkoutsPerWeek.toFixed(1);

        // Render charts
        renderWorkoutTypeChart(analytics.workoutsByType);
        renderWeeklyVolumeChart(analytics.weeklyVolume);
    } catch (e) {
        console.error('Failed to load fitness analytics:', e);
    }
}

function renderWorkoutTypeChart(data) {
    const ctx = document.getElementById('workoutTypeChart')?.getContext('2d');
    if (!ctx) return;

    const labels = Object.keys(data).map(k => k.replace('_', ' '));
    const values = Object.values(data);
    const colors = ['#0f0', '#39f', '#f90', '#f33', '#90f', '#0ff', '#ff0'];

    if (workoutTypeChart) {
        workoutTypeChart.destroy();
    }

    workoutTypeChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors.slice(0, labels.length),
                borderColor: '#000',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#fff',
                        font: { size: 10 }
                    }
                }
            }
        }
    });
}

function renderWeeklyVolumeChart(data) {
    const ctx = document.getElementById('weeklyVolumeChart')?.getContext('2d');
    if (!ctx) return;

    const labels = data.map(d => d.weekLabel.split('-W')[1] ? 'W' + d.weekLabel.split('-W')[1] : d.weekLabel);
    const workouts = data.map(d => d.workoutCount);
    const minutes = data.map(d => d.totalMinutes);

    if (weeklyVolumeChart) {
        weeklyVolumeChart.destroy();
    }

    weeklyVolumeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Workouts',
                data: workouts,
                backgroundColor: '#0f0',
                borderColor: '#0f0',
                borderWidth: 1,
                yAxisID: 'y'
            }, {
                label: 'Minutes',
                data: minutes,
                backgroundColor: 'rgba(57, 159, 255, 0.5)',
                borderColor: '#39f',
                borderWidth: 1,
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#fff',
                        font: { size: 10 }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: '#aaa', font: { size: 9 } }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: '#0f0', stepSize: 1 },
                    title: { display: true, text: 'Workouts', color: '#0f0' }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    ticks: { color: '#39f' },
                    title: { display: true, text: 'Minutes', color: '#39f' }
                }
            }
        }
    });
}