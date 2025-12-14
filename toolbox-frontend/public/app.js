const API = "";
let currentGoalId = null;
let editingHoldingId = null;
let editingWatchlistId = null;
let stocksRefreshInterval = null;

// Pagination state
let memoPage = { current: 0, total: 1, size: 10, totalElements: 0 };
let financePage = { current: 0, total: 1, size: 10, totalElements: 0 };

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
    document.getElementById("tabMemo").classList.toggle("active", which === "memo");
    document.getElementById("tabFinance").classList.toggle("active", which === "finance");
    document.getElementById("tabStocks").classList.toggle("active", which === "stocks");

    memoTabContent.classList.toggle("hidden", which !== "memo");
    financeTabContent.classList.toggle("hidden", which !== "finance");
    stocksTabContent.classList.toggle("hidden", which !== "stocks");

    if (which === "finance") {
        loadFinance();
        loadGoalList();
    } else if (which === "stocks") {
        loadStocks();
        if (!stocksRefreshInterval) {
            stocksRefreshInterval = setInterval(loadStocks, 30000);
        }
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
    const res = await fetch(`${API}/api/memos/${id}`);
    const m = await res.json();
    const temp=document.createElement("div");
    temp.innerHTML=m.title+" - "+(m.content||"");
    await navigator.clipboard.writeText(temp.innerText);
    alert("Copied!");
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

    sumTotal.textContent = "€ " + s.totalBalance.toFixed(2);

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

    goalTargetIncome.textContent = "€ " + g.targetYearlyIncome.toFixed(2);
    goalRequiredCorpus.textContent = "€ " + g.requiredCorpus.toFixed(2);
    goalCurrentCorpus.textContent = "€ " + g.currentCorpus.toFixed(2);
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
    goalRemainingCorpus.textContent = "€ " + remaining.toFixed(2);

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
    viewFinanceBalance.textContent = "€ " + acc.balance.toFixed(2);

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
                    <button class="btn" onclick="showEditHolding('${h.id}', '${h.symbol}', ${h.quantity}, ${h.buyPrice})">EDIT</button>
                    <button class="btn" onclick="delHolding('${h.id}')">DEL</button>
                </div>
            </div>`;
        });

        holdingsList.innerHTML = html;
    } catch (e) {
        console.error("Failed to load holdings:", e);
    }
}

async function loadWatchlist() {
    try {
        const res = await fetch(`${API}/api/stocks-watch`);
        const watchlist = await res.json();

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
                    <button class="btn" onclick="delWatchlist('${w.symbol}')">DEL</button>
                </div>
            </div>`;
        });

        watchlistList.innerHTML = html;
    } catch (e) {
        console.error("Failed to load watchlist:", e);
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
        alert("Please fill all fields");
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
    } catch (e) {
        alert("Error saving holding: " + e.message);
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
        alert("Please fill all fields");
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
    } catch (e) {
        alert("Error saving watchlist item: " + e.message);
    }
}

async function delWatchlist(id) {
    if (!confirm("Remove from watchlist?")) return;

    await fetch(`${API}/api/stocks-watch/${id}`, { method: "DELETE" });
    loadStocks();
}

loadMemos();