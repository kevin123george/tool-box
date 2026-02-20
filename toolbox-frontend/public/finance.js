/* ===========================================================
   FINANCE.JS - Finance page (Accounts, Budget, Subscriptions,
   Calendar, Analytics)
   ============================================================ */

let currentGoalId = null;
let editingFinanceId = null;
let financePage = { current: 0, total: 1, size: 10, totalElements: 0 };

/* ===========================================================
   SUB-TAB SWITCHING
   ============================================================ */

function switchFinanceTab(tab) {
    localStorage.setItem('finance_active_tab', tab);
    const tabs = ['accounts', 'budget', 'subscriptions', 'calendar', 'analytics'];
    tabs.forEach(t => {
        const el = document.getElementById('finance' + t.charAt(0).toUpperCase() + t.slice(1) + 'Content');
        if (el) el.classList.toggle('hidden', t !== tab);
    });
    document.querySelectorAll('.tabs .tab').forEach(el => {
        el.classList.toggle('tab-active', el.textContent.toLowerCase() === tab);
    });
    // Load data for the active sub-tab
    if (tab === 'accounts') { loadFinance(); loadGoalList(); loadSavingsGoals(); loadNetWorthHistory(); loadSavingsRateHistory(); }
    else if (tab === 'budget') { goToCurrentMonth(); loadRecurringTransactions(); }
    else if (tab === 'subscriptions') { loadSubscriptions(); }
    else if (tab === 'calendar') { loadCalendar(); }
    else if (tab === 'analytics') { loadAnalytics(); }
}

/* ===========================================================
   FINANCE ACCOUNTS CRUD (from app.js)
   ============================================================ */

async function loadFinanceSummary() {
    const res = await authFetch(`${API}/api/finance/summary`);
    const s = await res.json();

    sumTotal.textContent = "\u20AC" + s.totalBalance.toFixed(2);

    sumByModeList.innerHTML = "";
    Object.entries(s.totalByMode).forEach(([mode, value]) => {
        const li = document.createElement("li");
        li.textContent = `${mode}: \u20AC ${value.toFixed(2)}`;
        sumByModeList.appendChild(li);
    });

    sumByBankList.innerHTML = "";
    Object.entries(s.totalByBank).forEach(([bank, value]) => {
        const li = document.createElement("li");
        li.textContent = `${bank}: \u20AC ${value.toFixed(2)}`;
        sumByBankList.appendChild(li);
    });
}

function renderGoalChart(projectionText) {
    const lines = projectionText.split("\n").filter(l => l.includes("Age"));
    const ages = [];
    const values = [];

    lines.forEach(line => {
        const m = line.match(/Age (\d+): \u20AC([\d\.]+)/);
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

    const res = await authFetch(`/api/goal/${goalId}`);
    const g = await res.json();
    currentGoalId = g.id;

    goalTargetIncome.textContent = "\u20AC" + g.targetYearlyIncome.toFixed(2);
    goalRequiredCorpus.textContent = "\u20AC" + g.requiredCorpus.toFixed(2);
    goalCurrentCorpus.textContent = "\u20AC" + g.currentCorpus.toFixed(2);
    goalAchieved.textContent = g.goalAchieved ? "YES" : "NO";

    goalTargetIncomeInput.value = g.targetYearlyIncome;
    goalTaxRateInput.value = g.taxRate;
    goalReturnRateInput.value = g.expectedReturnRate;
    goalContributionInput.value = g.yearlyContribution;
    goalAgeInput.value = g.currentAge;

    const projText = await authFetch(`/api/goal/${goalId}/projection`).then(r => r.text());
    const match = projText.match(/Age (\d+)/);
    goalFireAge.textContent = match ? match[1] : (g.goalAchievedAge || "\u2014");

    goalYearsToGoal.textContent = g.yearsToGoal ?? "\u2014";
    goalAge.textContent = g.goalAchievedAge ?? "\u2014";

    const remaining = g.requiredCorpus - g.currentCorpus;
    goalRemainingCorpus.textContent = "\u20AC" + remaining.toFixed(2);

    let progress = (g.currentCorpus / g.requiredCorpus) * 100;
    if (progress > 100) progress = 100;

    goalProgress.textContent = progress.toFixed(1) + "%";
    const progressBar = document.getElementById("goalProgressBar");
    if (progressBar) progressBar.value = progress;

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
    goalStatus.textContent = "Creating new goal\u2026";
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

    goalStatus.textContent = "Saving\u2026";

    const res = await authFetch(`/api/goal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    const saved = await res.json();
    currentGoalId = saved.id;

    await loadGoalList(saved.id);
    goalStatus.textContent = "Saved";
}

async function deleteGoal() {
    if (!currentGoalId) {
        goalStatus.textContent = "No goal selected to delete.";
        return;
    }

    goalStatus.textContent = "Deleting\u2026";

    await authFetch(`/api/goal/${currentGoalId}`, { method: "DELETE" });

    currentGoalId = null;
    goalSelect.value = "";
    clearGoalDisplay();
    await loadGoalList();
    newGoalForm();
    goalStatus.textContent = "Deleted.";
}

async function loadFinance(page = 0) {
    const size = parseInt(document.getElementById('financePageSize').value) || 10;
    const res = await authFetch(`${API}/api/finance?page=${page}&size=${size}`);
    const response = await res.json();
    const data = response.content;

    financePage = {
        current: response.number,
        total: response.totalPages,
        size: response.size,
        totalElements: response.totalElements
    };

    updatePaginationControls('finance', financePage);

    let html = '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">';

    data.forEach(acc => {
        const modified = acc.lastModified ? new Date(acc.lastModified).toLocaleString() : "\u2014";
        const modeColor = acc.mode === 'Savings' ? 'badge-success' : acc.mode === 'Credit' ? 'badge-warning' : 'badge-ghost';

        html += `
        <div class="card bg-base-200 shadow-sm">
            <div class="card-body p-4 gap-2">
                <div class="flex items-center justify-between">
                    <h3 class="font-bold text-base">${acc.bank}</h3>
                    <span class="badge ${modeColor} badge-sm">${acc.mode || 'Unknown'}</span>
                </div>
                <div class="text-2xl font-bold tabular-nums">\u20AC${acc.balance.toFixed(2)}</div>
                <div class="text-xs opacity-40">${modified}</div>
                <div class="card-actions justify-end mt-1">
                    <button class="btn btn-ghost btn-xs" onclick="viewFinance('${acc.id}')">View</button>
                    <button class="btn btn-ghost btn-xs" onclick="showEditFinance('${acc.id}')">Edit</button>
                    <button class="btn btn-ghost btn-xs text-error" onclick="delFinance('${acc.id}')">Delete</button>
                </div>
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

    await authFetch(`${API}/api/finance`, {
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
    const res = await authFetch(`${API}/api/finance/${id}`);
    const acc = await res.json();

    viewFinanceBank.textContent = acc.bank;
    viewMode.textContent = acc.mode || "Unknown";
    viewFinanceBalance.textContent = "\u20AC" + acc.balance.toFixed(2);

    openModal("financeViewModal");
}

function closeFinanceViewModal() { closeModal("financeViewModal"); }

async function showEditFinance(id) {
    editingFinanceId = id;

    const res = await authFetch(`${API}/api/finance/${id}`);
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

    await authFetch(`${API}/api/finance/${editingFinanceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
    });

    closeFinanceModal();
    loadFinance(financePage.current);
}

async function delFinance(id) {
    await authFetch(`${API}/api/finance/${id}`, { method: "DELETE" });
    loadFinance(financePage.current);
}

async function loadGoalList(selectedId) {
    const res = await authFetch(`/api/goal`);
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
   SAVINGS GOALS (from features.js)
   ============================================================ */

let savingsGoals = [];

async function loadSavingsGoals() {
    try {
        const res = await authFetch(`${API}/api/savings-goals`);
        if (res.ok) {
            savingsGoals = await res.json();
            renderSavingsGoals();
        }
    } catch (e) {
        console.error("Failed to load savings goals:", e);
    }
}

function renderSavingsGoals() {
    const container = document.getElementById('savingsGoalsList');
    if (!container) return;

    if (savingsGoals.length === 0) {
        container.innerHTML = '<div style="opacity:0.5; text-align:center; padding:20px;">No savings goals yet. Create one!</div>';
        return;
    }

    container.innerHTML = savingsGoals.map(goal => {
        const progress = goal.progressPercentage || 0;
        const daysRemaining = goal.daysRemaining;
        const progressColor = progress >= 100 ? '#0f0' : (progress >= 50 ? '#ff0' : '#39f');

        return `
            <div class="card" style="margin-bottom:8px;">
                <div class="card-main">
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                        <span style="font-size:18px;">${goal.icon || ''}</span>
                        <strong>${goal.name}</strong>
                    </div>
                    <div style="font-size:12px; opacity:0.7; margin-bottom:6px;">
                        \u20AC${(goal.currentAmount || 0).toFixed(2)} / \u20AC${(goal.targetAmount || 0).toFixed(2)}
                        ${daysRemaining >= 0 ? ` \u2022 ${daysRemaining} days left` : ''}
                    </div>
                    <div style="height:8px; background:#222; border:1px solid oklch(var(--b3));">
                        <div style="height:100%; width:${Math.min(progress, 100)}%; background:${progressColor};"></div>
                    </div>
                    <div style="font-size:11px; text-align:right; margin-top:2px;">${progress.toFixed(1)}%</div>
                </div>
                <div class="card-actions">
                    <button class="btn" onclick="showContributeModal('${goal.id}')">+</button>
                    <button class="btn" onclick="editSavingsGoal('${goal.id}')">EDIT</button>
                    <button class="btn" onclick="deleteSavingsGoal('${goal.id}')">DEL</button>
                </div>
            </div>
        `;
    }).join('');
}

function showAddSavingsGoalModal() {
    document.getElementById('savingsGoalModalTitle').textContent = 'Add Savings Goal';
    document.getElementById('savingsGoalId').value = '';
    document.getElementById('savingsGoalName').value = '';
    document.getElementById('savingsGoalTarget').value = '';
    document.getElementById('savingsGoalCurrent').value = '0';
    document.getElementById('savingsGoalDeadline').value = '';
    document.getElementById('savingsGoalIcon').value = '';
    document.getElementById('savingsGoalNotes').value = '';
    openModal('savingsGoalModal');
}

function editSavingsGoal(id) {
    const goal = savingsGoals.find(g => g.id === id);
    if (!goal) return;

    document.getElementById('savingsGoalModalTitle').textContent = 'Edit Savings Goal';
    document.getElementById('savingsGoalId').value = goal.id;
    document.getElementById('savingsGoalName').value = goal.name || '';
    document.getElementById('savingsGoalTarget').value = goal.targetAmount || '';
    document.getElementById('savingsGoalCurrent').value = goal.currentAmount || '0';
    document.getElementById('savingsGoalDeadline').value = goal.deadline || '';
    document.getElementById('savingsGoalIcon').value = goal.icon || '';
    document.getElementById('savingsGoalNotes').value = goal.notes || '';
    openModal('savingsGoalModal');
}

async function saveSavingsGoal() {
    const id = document.getElementById('savingsGoalId').value;
    const goal = {
        name: document.getElementById('savingsGoalName').value,
        targetAmount: parseFloat(document.getElementById('savingsGoalTarget').value) || 0,
        currentAmount: parseFloat(document.getElementById('savingsGoalCurrent').value) || 0,
        deadline: document.getElementById('savingsGoalDeadline').value || null,
        icon: document.getElementById('savingsGoalIcon').value || '',
        notes: document.getElementById('savingsGoalNotes').value
    };

    try {
        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API}/api/savings-goals/${id}` : `${API}/api/savings-goals`;

        const res = await authFetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(goal)
        });

        if (res.ok) {
            showToast('Savings goal saved!', 'success');
            closeModal('savingsGoalModal');
            loadSavingsGoals();
        }
    } catch (e) {
        showToast('Failed to save goal: ' + e.message, 'error');
    }
}

async function deleteSavingsGoal(id) {
    if (!confirm('Delete this savings goal?')) return;

    try {
        await authFetch(`${API}/api/savings-goals/${id}`, { method: 'DELETE' });
        showToast('Goal deleted', 'success');
        loadSavingsGoals();
    } catch (e) {
        showToast('Failed to delete: ' + e.message, 'error');
    }
}

function showContributeModal(id) {
    document.getElementById('contributeGoalId').value = id;
    document.getElementById('contributeAmount').value = '';
    openModal('contributeModal');
}

async function contributeToGoal() {
    const id = document.getElementById('contributeGoalId').value;
    const amount = parseFloat(document.getElementById('contributeAmount').value) || 0;

    try {
        const res = await authFetch(`${API}/api/savings-goals/${id}/contribute`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount })
        });

        if (res.ok) {
            showToast(`Added \u20AC${amount.toFixed(2)} to goal!`, 'success');
            closeModal('contributeModal');
            loadSavingsGoals();
        }
    } catch (e) {
        showToast('Failed to contribute: ' + e.message, 'error');
    }
}

/* ===========================================================
   NET WORTH HISTORY (from features.js)
   ============================================================ */

let netWorthChart = null;

async function loadNetWorthHistory() {
    try {
        const res = await authFetch(`${API}/api/networth/history`);
        if (res.ok) {
            const data = await res.json();
            renderNetWorthChart(data);
        }
    } catch (e) {
        console.error("Failed to load net worth history:", e);
    }
}

function renderNetWorthChart(data) {
    const canvas = document.getElementById('netWorthChart');
    if (!canvas) return;

    if (netWorthChart) {
        netWorthChart.destroy();
    }

    const ctx = canvas.getContext('2d');
    netWorthChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.date),
            datasets: [{
                label: 'Net Worth',
                data: data.map(d => d.netWorth),
                borderColor: '#0f0',
                backgroundColor: 'rgba(0,255,0,0.1)',
                fill: true,
                tension: 0.3
            }, {
                label: 'Cash',
                data: data.map(d => d.totalCash),
                borderColor: '#39f',
                borderDash: [5, 5],
                fill: false
            }, {
                label: 'Portfolio',
                data: data.map(d => d.portfolioValue),
                borderColor: '#f90',
                borderDash: [5, 5],
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: getChartTextColor() } }
            },
            scales: {
                x: { ticks: { color: getChartTextColor() }, grid: { color: 'rgba(255,255,255,0.1)' } },
                y: { ticks: { color: getChartTextColor(), callback: v => '\u20AC' + v.toLocaleString() }, grid: { color: 'rgba(255,255,255,0.1)' } }
            }
        }
    });
}

async function captureNetWorthSnapshot() {
    try {
        const res = await authFetch(`${API}/api/networth/snapshot`, { method: 'POST' });
        if (res.ok) {
            showToast('Net worth snapshot captured!', 'success');
            loadNetWorthHistory();
        }
    } catch (e) {
        showToast('Failed to capture snapshot: ' + e.message, 'error');
    }
}

/* ===========================================================
   SAVINGS RATE TRACKER (from features.js)
   ============================================================ */

let savingsRateChart = null;

async function loadSavingsRateHistory() {
    try {
        const res = await authFetch(`${API}/api/budget/savings-rate?months=12`);
        if (res.ok) {
            const data = await res.json();
            renderSavingsRateChart(data);
        }
    } catch (e) {
        console.error("Failed to load savings rate:", e);
    }
}

function renderSavingsRateChart(data) {
    const canvas = document.getElementById('savingsRateChart');
    if (!canvas) return;

    if (savingsRateChart) {
        savingsRateChart.destroy();
    }

    const ctx = canvas.getContext('2d');
    savingsRateChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.month),
            datasets: [{
                label: 'Savings Rate %',
                data: data.map(d => d.savingsRate),
                borderColor: '#0f0',
                backgroundColor: 'rgba(0,255,0,0.1)',
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: getChartTextColor() } }
            },
            scales: {
                x: { ticks: { color: getChartTextColor() }, grid: { color: 'rgba(255,255,255,0.1)' } },
                y: { ticks: { color: getChartTextColor(), callback: v => v + '%' }, grid: { color: 'rgba(255,255,255,0.1)' }, min: 0, max: 100 }
            }
        }
    });
}

/* ===========================================================
   BUDGET TRACKER (from app.js)
   ============================================================ */

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
        const res = await authFetch(`${API}/api/budget/${year}/${month}`);

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
    document.getElementById('summaryPlannedIncome').textContent = '\u20AC' + (p.totalPlannedIncome || 0).toFixed(2);
    document.getElementById('summaryActualIncome').textContent = '\u20AC' + (p.totalIncome || 0).toFixed(2);
    document.getElementById('summaryPlannedExpenses').textContent = '\u20AC' + (p.totalPlannedExpenses || 0).toFixed(2);
    document.getElementById('summaryActualExpenses').textContent = '\u20AC' + (p.totalExpenses || 0).toFixed(2);
    document.getElementById('summarySavings').textContent = '\u20AC' + (p.remaining || 0).toFixed(2);
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
        <div class="card bg-base-300 shadow-sm mb-2">
            <div class="card-body p-3 flex-row items-center justify-between gap-3">
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                        <span class="font-semibold text-sm">${rec.category}</span>
                        <span class="badge badge-sm badge-success tabular-nums">\u20AC${rec.amount.toFixed(2)}</span>
                    </div>
                    ${rec.description ? `<div class="text-xs opacity-50 mt-0.5 truncate">${rec.description}</div>` : ''}
                    <div class="text-xs opacity-35 mt-0.5">${date}</div>
                </div>
                <button class="btn btn-ghost btn-xs text-error shrink-0" onclick="deleteIncomeRecord(${idx})">Del</button>
            </div>
        </div>`;
    });

    document.getElementById('incomeRecordsList').innerHTML = html || '<p class="text-xs opacity-40 py-2">No income records yet</p>';
}

function displayExpenseRecords(records) {
    let html = '';

    records.forEach((rec, idx) => {
        const date = new Date(rec.recordDate).toLocaleDateString();
        html += `
        <div class="card bg-base-300 shadow-sm mb-2">
            <div class="card-body p-3 flex-row items-center justify-between gap-3">
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                        <span class="font-semibold text-sm">${rec.category}</span>
                        <span class="badge badge-sm badge-error tabular-nums">\u20AC${rec.amount.toFixed(2)}</span>
                    </div>
                    ${rec.description ? `<div class="text-xs opacity-50 mt-0.5 truncate">${rec.description}</div>` : ''}
                    <div class="text-xs opacity-35 mt-0.5">${date}</div>
                </div>
                <button class="btn btn-ghost btn-xs text-error shrink-0" onclick="deleteExpenseRecord(${idx})">Del</button>
            </div>
        </div>`;
    });

    document.getElementById('expenseRecordsList').innerHTML = html || '<p class="text-xs opacity-40 py-2">No expense records yet</p>';
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

    await authFetch(`${API}/api/budget/${currentBudgetMonth.year}/${currentBudgetMonth.month}/planned`, {
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
        await authFetch(`${API}/api/budget/${currentBudgetMonth.year}/${currentBudgetMonth.month}/income`, {
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
        await authFetch(`${API}/api/budget/${currentBudgetMonth.year}/${currentBudgetMonth.month}/expenses`, {
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

    await authFetch(`${API}/api/budget/${currentBudgetMonth.year}/${currentBudgetMonth.month}/income/${index}`, {
        method: 'DELETE'
    });

    loadBudgetForSelectedMonth();
}

async function deleteExpenseRecord(index) {
    if (!currentBudgetMonth || !confirm('Delete this expense record?')) return;

    await authFetch(`${API}/api/budget/${currentBudgetMonth.year}/${currentBudgetMonth.month}/expenses/${index}`, {
        method: 'DELETE'
    });

    loadBudgetForSelectedMonth();
}

/* ===========================================================
   BUDGET COMPARISON (from app.js)
   ============================================================ */

let comparisonChart = null;

async function loadBudgetComparison() {
    const months = document.getElementById('comparisonMonths')?.value || 6;

    try {
        const res = await authFetch(`${API}/api/budget/compare?months=${months}`);
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
                        color: getChartTextColor(),
                        font: { family: 'monospace', size: 11 }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: getChartTextColor(),
                        font: { family: 'monospace', size: 10 }
                    },
                    grid: {
                        color: 'rgba(255,255,255,0.1)'
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: getChartTextColor(),
                        font: { family: 'monospace', size: 10 },
                        callback: value => '\u20AC' + value.toFixed(0)
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
            <div>\u20AC${d.income.toFixed(2)}</div>
            <div>\u20AC${d.expenses.toFixed(2)}</div>
            <div class="${savingsClass}">\u20AC${d.savings.toFixed(2)}</div>
            <div class="${savingsClass}">${d.savingsRate.toFixed(1)}%</div>
            <div class="${adherenceClass}">${d.budgetAdherence.toFixed(1)}%</div>
        </div>`;
    });

    container.innerHTML = html;
}

/* ===========================================================
   RECURRING TRANSACTIONS (from features.js)
   ============================================================ */

let recurringTransactions = [];

async function loadRecurringTransactions() {
    try {
        const [transRes, summaryRes] = await Promise.all([
            authFetch(`${API}/api/recurring`),
            authFetch(`${API}/api/recurring/summary`)
        ]);

        if (transRes.ok) {
            recurringTransactions = await transRes.json();
            renderRecurringTransactions();
        }

        if (summaryRes.ok) {
            const summary = await summaryRes.json();
            const costEl = document.getElementById('recurringMonthlyCost');
            const incomeEl = document.getElementById('recurringMonthlyIncome');
            if (costEl) costEl.textContent = '\u20AC' + (summary.monthlyRecurringCost || 0).toFixed(2);
            if (incomeEl) incomeEl.textContent = '\u20AC' + (summary.monthlyRecurringIncome || 0).toFixed(2);
        }
    } catch (e) {
        console.error("Failed to load recurring transactions:", e);
    }
}

function renderRecurringTransactions() {
    const container = document.getElementById('recurringTransactionsList');
    if (!container) return;

    if (recurringTransactions.length === 0) {
        container.innerHTML = '<div style="opacity:0.5; text-align:center; padding:20px;">No recurring transactions.</div>';
        return;
    }

    container.innerHTML = recurringTransactions.map(t => {
        const typeColor = t.category === 'INCOME' ? '#0f0' : '#f33';
        const activeStatus = t.active ? 'ACTIVE' : 'PAUSED';

        return `
            <div class="card" style="margin-bottom:8px;">
                <div class="card-main">
                    <strong>${t.name}</strong>
                    <span style="color:${typeColor}; margin-left:10px;">\u20AC${(t.amount || 0).toFixed(2)}</span>
                    <span style="margin-left:10px; font-size:11px; opacity:0.7;">${t.frequency} \u2022 ${t.categoryType}</span>
                    <span style="margin-left:10px; font-size:11px;">${activeStatus}</span>
                </div>
                <div class="card-actions">
                    <button class="btn" onclick="editRecurringTransaction('${t.id}')">EDIT</button>
                    <button class="btn" onclick="deleteRecurringTransaction('${t.id}')">DEL</button>
                </div>
            </div>
        `;
    }).join('');
}

function showAddRecurringModal() {
    document.getElementById('recurringModalTitle').textContent = 'Add Recurring Transaction';
    document.getElementById('recurringId').value = '';
    document.getElementById('recurringName').value = '';
    document.getElementById('recurringAmount').value = '';
    document.getElementById('recurringCategory').value = 'EXPENSE';
    document.getElementById('recurringCategoryType').value = 'OTHER';
    document.getElementById('recurringFrequency').value = 'MONTHLY';
    document.getElementById('recurringNextDue').value = '';
    document.getElementById('recurringActive').checked = true;
    openModal('recurringModal');
}

function editRecurringTransaction(id) {
    const t = recurringTransactions.find(r => r.id === id);
    if (!t) return;

    document.getElementById('recurringModalTitle').textContent = 'Edit Recurring Transaction';
    document.getElementById('recurringId').value = t.id;
    document.getElementById('recurringName').value = t.name || '';
    document.getElementById('recurringAmount').value = t.amount || '';
    document.getElementById('recurringCategory').value = t.category || 'EXPENSE';
    document.getElementById('recurringCategoryType').value = t.categoryType || 'OTHER';
    document.getElementById('recurringFrequency').value = t.frequency || 'MONTHLY';
    document.getElementById('recurringNextDue').value = t.nextDueDate || '';
    document.getElementById('recurringActive').checked = t.active !== false;
    openModal('recurringModal');
}

async function saveRecurringTransaction() {
    const id = document.getElementById('recurringId').value;
    const transaction = {
        name: document.getElementById('recurringName').value,
        amount: parseFloat(document.getElementById('recurringAmount').value) || 0,
        category: document.getElementById('recurringCategory').value,
        categoryType: document.getElementById('recurringCategoryType').value,
        frequency: document.getElementById('recurringFrequency').value,
        nextDueDate: document.getElementById('recurringNextDue').value || null,
        active: document.getElementById('recurringActive').checked
    };

    try {
        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API}/api/recurring/${id}` : `${API}/api/recurring`;

        const res = await authFetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transaction)
        });

        if (res.ok) {
            showToast('Recurring transaction saved!', 'success');
            closeModal('recurringModal');
            loadRecurringTransactions();
        }
    } catch (e) {
        showToast('Failed to save: ' + e.message, 'error');
    }
}

async function deleteRecurringTransaction(id) {
    if (!confirm('Delete this recurring transaction?')) return;

    try {
        await authFetch(`${API}/api/recurring/${id}`, { method: 'DELETE' });
        showToast('Deleted', 'success');
        loadRecurringTransactions();
    } catch (e) {
        showToast('Failed to delete: ' + e.message, 'error');
    }
}

/* ===========================================================
   SUBSCRIPTION MANAGER (from features.js)
   ============================================================ */

let subscriptions = [];

async function loadSubscriptions() {
    try {
        const [subsRes, summaryRes] = await Promise.all([
            authFetch(`${API}/api/subscriptions`),
            authFetch(`${API}/api/subscriptions/summary`)
        ]);

        if (subsRes.ok) {
            subscriptions = await subsRes.json();
            renderSubscriptions();
        }

        if (summaryRes.ok) {
            const summary = await summaryRes.json();
            renderSubscriptionSummary(summary);
        }
    } catch (e) {
        console.error("Failed to load subscriptions:", e);
    }
}

function renderSubscriptionSummary(summary) {
    const monthlyEl = document.getElementById('subsTotalMonthly');
    const annualEl = document.getElementById('subsTotalAnnual');
    const countEl = document.getElementById('subsActiveCount');

    if (monthlyEl) monthlyEl.textContent = '\u20AC' + (summary.totalMonthly || 0).toFixed(2);
    if (annualEl) annualEl.textContent = '\u20AC' + (summary.totalAnnual || 0).toFixed(2);
    if (countEl) countEl.textContent = summary.activeCount || 0;
}

function renderSubscriptions() {
    const container = document.getElementById('subscriptionsList');
    if (!container) return;

    if (subscriptions.length === 0) {
        container.innerHTML = '<div class="text-center opacity-50 py-8">No subscriptions tracked.</div>';
        return;
    }

    container.innerHTML = '<div class="flex flex-col gap-2">' + subscriptions.map(sub => {
        const statusBadge = sub.active
            ? 'badge-success'
            : 'badge-error';
        const status = sub.active ? 'Active' : 'Cancelled';
        const cycleLabel = { MONTHLY: '/mo', YEARLY: '/yr', WEEKLY: '/wk', QUARTERLY: '/qtr' }[sub.billingCycle] || `/${sub.billingCycle}`;

        return `
            <div class="card bg-base-200 shadow-sm">
                <div class="card-body p-3 flex-row items-center gap-3">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="font-semibold">${sub.name}</span>
                            ${sub.provider ? `<span class="text-xs opacity-50">${sub.provider}</span>` : ''}
                            <span class="badge ${statusBadge} badge-xs">${status}</span>
                        </div>
                        <div class="text-sm opacity-60 mt-0.5">
                            <span class="font-medium text-base-content">\u20AC${(sub.amount || 0).toFixed(2)}${cycleLabel}</span>
                            ${sub.nextBillingDate ? `<span class="mx-2">\u00B7</span>Next: ${sub.nextBillingDate}` : ''}
                            ${sub.category ? `<span class="mx-2">\u00B7</span>${sub.category}` : ''}
                        </div>
                    </div>
                    <div class="flex gap-1 shrink-0">
                        <button class="btn btn-ghost btn-xs" onclick="editSubscription('${sub.id}')">Edit</button>
                        <button class="btn btn-ghost btn-xs text-error" onclick="deleteSubscription('${sub.id}')">Del</button>
                    </div>
                </div>
            </div>
        `;
    }).join('') + '</div>';
}

function showAddSubscriptionModal() {
    document.getElementById('subscriptionModalTitle').textContent = 'Add Subscription';
    document.getElementById('subscriptionId').value = '';
    document.getElementById('subscriptionName').value = '';
    document.getElementById('subscriptionProvider').value = '';
    document.getElementById('subscriptionAmount').value = '';
    document.getElementById('subscriptionBillingCycle').value = 'MONTHLY';
    document.getElementById('subscriptionNextBilling').value = '';
    document.getElementById('subscriptionCategory').value = '';
    document.getElementById('subscriptionActive').checked = true;
    document.getElementById('subscriptionNotes').value = '';
    openModal('subscriptionModal');
}

function editSubscription(id) {
    const sub = subscriptions.find(s => s.id === id);
    if (!sub) return;

    document.getElementById('subscriptionModalTitle').textContent = 'Edit Subscription';
    document.getElementById('subscriptionId').value = sub.id;
    document.getElementById('subscriptionName').value = sub.name || '';
    document.getElementById('subscriptionProvider').value = sub.provider || '';
    document.getElementById('subscriptionAmount').value = sub.amount || '';
    document.getElementById('subscriptionBillingCycle').value = sub.billingCycle || 'MONTHLY';
    document.getElementById('subscriptionNextBilling').value = sub.nextBillingDate || '';
    document.getElementById('subscriptionCategory').value = sub.category || '';
    document.getElementById('subscriptionActive').checked = sub.active !== false;
    document.getElementById('subscriptionNotes').value = sub.notes || '';
    openModal('subscriptionModal');
}

async function saveSubscription() {
    const id = document.getElementById('subscriptionId').value;
    const subscription = {
        name: document.getElementById('subscriptionName').value,
        provider: document.getElementById('subscriptionProvider').value,
        amount: parseFloat(document.getElementById('subscriptionAmount').value) || 0,
        billingCycle: document.getElementById('subscriptionBillingCycle').value,
        nextBillingDate: document.getElementById('subscriptionNextBilling').value || null,
        category: document.getElementById('subscriptionCategory').value,
        active: document.getElementById('subscriptionActive').checked,
        notes: document.getElementById('subscriptionNotes').value
    };

    try {
        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API}/api/subscriptions/${id}` : `${API}/api/subscriptions`;

        const res = await authFetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subscription)
        });

        if (res.ok) {
            showToast('Subscription saved!', 'success');
            closeModal('subscriptionModal');
            loadSubscriptions();
        }
    } catch (e) {
        showToast('Failed to save: ' + e.message, 'error');
    }
}

async function deleteSubscription(id) {
    if (!confirm('Delete this subscription?')) return;

    try {
        await authFetch(`${API}/api/subscriptions/${id}`, { method: 'DELETE' });
        showToast('Subscription deleted', 'success');
        loadSubscriptions();
    } catch (e) {
        showToast('Failed to delete: ' + e.message, 'error');
    }
}

/* ===========================================================
   BANK STATEMENT IMPORT (from features.js)
   ============================================================ */

let importPreviews = [];

async function previewImport() {
    const fileInput = document.getElementById('importFile');
    const formatSelect = document.getElementById('importFormat');

    if (!fileInput.files.length) {
        showToast('Please select a file', 'warning');
        return;
    }

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('format', formatSelect.value);

    try {
        showLoading('Parsing CSV...');
        const res = await authFetch(`${API}/api/budget/import/preview`, {
            method: 'POST',
            body: formData
        });

        hideLoading();

        if (res.ok) {
            importPreviews = await res.json();
            renderImportPreview();
        } else {
            showToast('Failed to parse file', 'error');
        }
    } catch (e) {
        hideLoading();
        showToast('Error: ' + e.message, 'error');
    }
}

function renderImportPreview() {
    const container = document.getElementById('importPreviewList');
    if (!container) return;

    if (importPreviews.length === 0) {
        container.innerHTML = '<div style="opacity:0.5; text-align:center; padding:20px;">No transactions found in file.</div>';
        return;
    }

    container.innerHTML = `
        <div style="max-height:300px; overflow-y:auto;">
            <table style="width:100%; font-size:12px; border-collapse:collapse;">
                <thead>
                    <tr style="background:oklch(var(--bc)); color:oklch(var(--b1));">
                        <th style="padding:6px;">Include</th>
                        <th style="padding:6px;">Date</th>
                        <th style="padding:6px;">Description</th>
                        <th style="padding:6px;">Amount</th>
                        <th style="padding:6px;">Type</th>
                        <th style="padding:6px;">Category</th>
                    </tr>
                </thead>
                <tbody>
                    ${importPreviews.map((item, idx) => `
                        <tr style="border-bottom:1px solid oklch(var(--b3));">
                            <td style="padding:6px; text-align:center;">
                                <input type="checkbox" ${item.included ? 'checked' : ''}
                                    onchange="importPreviews[${idx}].included = this.checked">
                            </td>
                            <td style="padding:6px;">${item.date || '-'}</td>
                            <td style="padding:6px;">${item.description || '-'}</td>
                            <td style="padding:6px; color:${item.type === 'INCOME' ? '#0f0' : '#f33'};">
                                \u20AC${(item.amount || 0).toFixed(2)}
                            </td>
                            <td style="padding:6px;">${item.type}</td>
                            <td style="padding:6px;">
                                <select onchange="importPreviews[${idx}].suggestedCategory = this.value" style="width:100%; padding:2px;">
                                    ${getCategoryOptions(item.type, item.suggestedCategory)}
                                </select>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function getCategoryOptions(type, selected) {
    const expenseCategories = ['RENT', 'UTILITIES', 'INTERNET', 'TRANSPORT', 'FUEL', 'GROCERIES', 'DINING_OUT', 'ENTERTAINMENT', 'SUBSCRIPTIONS', 'GYM', 'TRAVEL', 'CLOTHING', 'PERSONAL_CARE', 'EDUCATION', 'GIFTS', 'OTHER'];
    const incomeCategories = ['SALARY', 'BONUS', 'FREELANCE', 'INVESTMENT', 'DIVIDEND', 'INTEREST', 'GIFT', 'OTHER'];

    const categories = type === 'INCOME' ? incomeCategories : expenseCategories;
    return categories.map(cat =>
        `<option value="${cat}" ${cat === selected ? 'selected' : ''}>${cat}</option>`
    ).join('');
}

async function confirmImport() {
    const monthPicker = document.getElementById('budgetMonthPicker');
    if (!monthPicker.value) {
        showToast('Please select a month first', 'warning');
        return;
    }

    const [year, month] = monthPicker.value.split('-').map(Number);
    const includedItems = importPreviews.filter(item => item.included);

    if (includedItems.length === 0) {
        showToast('No items selected for import', 'warning');
        return;
    }

    try {
        showLoading('Importing transactions...');
        const res = await authFetch(`${API}/api/budget/${year}/${month}/import/confirm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(includedItems)
        });

        hideLoading();

        if (res.ok) {
            showToast(`Imported ${includedItems.length} transactions!`, 'success');
            closeModal('importModal');
            importPreviews = [];
            loadBudgetForSelectedMonth();
        }
    } catch (e) {
        hideLoading();
        showToast('Import failed: ' + e.message, 'error');
    }
}

function showImportModal() {
    document.getElementById('importFile').value = '';
    document.getElementById('importPreviewList').innerHTML = '';
    importPreviews = [];
    openModal('importModal');
}

/* ===========================================================
   FINANCIAL CALENDAR (from features.js)
   ============================================================ */

let calendarYear = new Date().getFullYear();
let calendarMonth = new Date().getMonth() + 1;
let calendarEvents = [];

async function loadCalendar() {
    try {
        const res = await authFetch(`${API}/api/calendar/${calendarYear}/${calendarMonth}`);
        if (res.ok) {
            calendarEvents = await res.json();
            renderCalendar();
        }
    } catch (e) {
        console.error("Failed to load calendar:", e);
    }
}

function renderCalendar() {
    const container = document.getElementById('calendarGrid');
    const monthLabel = document.getElementById('calendarMonthLabel');
    if (!container) return;

    // Update month label
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
    if (monthLabel) {
        monthLabel.textContent = `${monthNames[calendarMonth - 1]} ${calendarYear}`;
    }

    // Get first day of month and total days
    const firstDay = new Date(calendarYear, calendarMonth - 1, 1).getDay();
    const daysInMonth = new Date(calendarYear, calendarMonth, 0).getDate();

    // Group events by day
    const eventsByDay = {};
    calendarEvents.forEach(event => {
        if (!eventsByDay[event.day]) eventsByDay[event.day] = [];
        eventsByDay[event.day].push(event);
    });

    // Build calendar HTML
    let html = `
        <div class="calendar-header">
            <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
        </div>
        <div class="calendar-days">
    `;

    // Empty cells for days before first of month
    for (let i = 0; i < firstDay; i++) {
        html += '<div class="calendar-day empty"></div>';
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dayEvents = eventsByDay[day] || [];
        const isToday = day === new Date().getDate() &&
                        calendarMonth === new Date().getMonth() + 1 &&
                        calendarYear === new Date().getFullYear();

        html += `
            <div class="calendar-day ${isToday ? 'today' : ''}">
                <div class="calendar-day-number">${day}</div>
                <div class="calendar-events">
                    ${dayEvents.slice(0, 3).map(e => {
                        const color = getEventColor(e.type, e.completed);
                        const titleText = e.type === 'WORKOUT'
                            ? `${e.title}${e.completed ? ' \u2713' : ''} (${e.amount} min)`
                            : `${e.title}: \u20AC${e.amount.toFixed(2)}`;
                        const displayText = e.type === 'WORKOUT'
                            ? `${e.completed ? '\u2713' : '\u25CB'} ${e.title.substring(0, 8)}`
                            : e.title.substring(0, 10);
                        return `<div class="calendar-event" style="background:${color};" title="${titleText}">
                            ${displayText}
                        </div>`;
                    }).join('')}
                    ${dayEvents.length > 3 ? `<div class="calendar-event-more">+${dayEvents.length - 3} more</div>` : ''}
                </div>
            </div>
        `;
    }

    html += '</div>';
    container.innerHTML = html;
}

function getEventColor(type, completed) {
    switch (type) {
        case 'INCOME': return '#0f0';
        case 'EXPENSE': return '#f33';
        case 'SUBSCRIPTION': return '#f90';
        case 'DIVIDEND': return '#39f';
        case 'WORKOUT': return completed ? '#0f0' : '#f90';
        default: return '#888';
    }
}

function prevMonth() {
    calendarMonth--;
    if (calendarMonth < 1) {
        calendarMonth = 12;
        calendarYear--;
    }
    loadCalendar();
}

function nextMonth() {
    calendarMonth++;
    if (calendarMonth > 12) {
        calendarMonth = 1;
        calendarYear++;
    }
    loadCalendar();
}

/* ===========================================================
   EXPENSE ANALYTICS (from features.js)
   ============================================================ */

let categoryTrendsChart = null;
let monthlyComparisonChart = null;
let categoryBreakdownChart = null;

async function loadAnalytics() {
    try {
        const [trendsRes, monthlyRes, anomaliesRes] = await Promise.all([
            authFetch(`${API}/api/analytics/category-trends?months=6`),
            authFetch(`${API}/api/analytics/monthly?months=6`),
            authFetch(`${API}/api/analytics/anomalies`)
        ]);

        if (trendsRes.ok) {
            const trends = await trendsRes.json();
            renderCategoryTrendsChart(trends);
        }

        if (monthlyRes.ok) {
            const monthly = await monthlyRes.json();
            renderMonthlyComparisonChart(monthly);
            renderCategoryBreakdownChart(monthly);
        }

        if (anomaliesRes.ok) {
            const anomalies = await anomaliesRes.json();
            renderAnomalies(anomalies);
        }
    } catch (e) {
        console.error("Failed to load analytics:", e);
    }
}

function renderAnomalies(anomalies) {
    const container = document.getElementById('anomaliesList');
    if (!container) return;

    if (anomalies.length === 0) {
        container.innerHTML = '<div style="opacity:0.5; padding:10px;">No spending anomalies detected.</div>';
        return;
    }

    container.innerHTML = anomalies.map(a => `
        <div class="card" style="margin-bottom:8px; border-color:#f90;">
            <div class="card-main">
                <strong style="color:#f90;">${a.category}</strong>
                <div style="font-size:12px; margin-top:4px;">
                    \u20AC${a.currentAmount.toFixed(2)} this month (avg: \u20AC${a.averageAmount.toFixed(2)})
                    <span class="negative" style="margin-left:10px;">+${a.percentageIncrease.toFixed(0)}%</span>
                </div>
            </div>
        </div>
    `).join('');
}

function renderCategoryTrendsChart(trends) {
    const canvas = document.getElementById('categoryTrendsChart');
    if (!canvas || !trends.length) return;

    if (categoryTrendsChart) categoryTrendsChart.destroy();

    // Get all unique months
    const months = new Set();
    trends.forEach(t => Object.keys(t.monthlyAmounts || {}).forEach(m => months.add(m)));
    const sortedMonths = Array.from(months).sort();

    const colors = ['#0f0', '#39f', '#f90', '#f33', '#9f0', '#f0f', '#0ff', '#ff0'];

    const datasets = trends.map((trend, idx) => ({
        label: trend.category,
        data: sortedMonths.map(m => trend.monthlyAmounts?.[m] || 0),
        borderColor: colors[idx % colors.length],
        fill: false,
        tension: 0.3
    }));

    const ctx = canvas.getContext('2d');
    categoryTrendsChart = new Chart(ctx, {
        type: 'line',
        data: { labels: sortedMonths, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: getChartTextColor() } } },
            scales: {
                x: { ticks: { color: getChartTextColor() }, grid: { color: 'rgba(255,255,255,0.1)' } },
                y: { ticks: { color: getChartTextColor(), callback: v => '\u20AC' + v }, grid: { color: 'rgba(255,255,255,0.1)' } }
            }
        }
    });
}

function renderMonthlyComparisonChart(monthly) {
    const canvas = document.getElementById('monthlyComparisonChart');
    if (!canvas || !monthly.length) return;

    if (monthlyComparisonChart) monthlyComparisonChart.destroy();

    const ctx = canvas.getContext('2d');
    monthlyComparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: monthly.map(m => m.month),
            datasets: [
                {
                    label: 'Income',
                    data: monthly.map(m => m.totalIncome),
                    backgroundColor: '#0f0'
                },
                {
                    label: 'Expenses',
                    data: monthly.map(m => m.totalExpenses),
                    backgroundColor: '#f33'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: getChartTextColor() } } },
            scales: {
                x: { ticks: { color: getChartTextColor() }, grid: { color: 'rgba(255,255,255,0.1)' } },
                y: { ticks: { color: getChartTextColor(), callback: v => '\u20AC' + v }, grid: { color: 'rgba(255,255,255,0.1)' } }
            }
        }
    });
}

function renderCategoryBreakdownChart(monthly) {
    const canvas = document.getElementById('categoryBreakdownChart');
    if (!canvas || !monthly.length) return;

    if (categoryBreakdownChart) categoryBreakdownChart.destroy();

    // Get latest month's expenses by category
    const latest = monthly[monthly.length - 1];
    if (!latest || !latest.expensesByCategory) return;

    const categories = Object.keys(latest.expensesByCategory);
    const values = Object.values(latest.expensesByCategory);
    const colors = ['#0f0', '#39f', '#f90', '#f33', '#9f0', '#f0f', '#0ff', '#ff0', '#888', '#fff'];

    const ctx = canvas.getContext('2d');
    categoryBreakdownChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: categories,
            datasets: [{
                data: values,
                backgroundColor: colors.slice(0, categories.length),
                borderColor: getComputedStyle(document.body).backgroundColor,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: getChartTextColor() }
                }
            }
        }
    });
}

/* ===========================================================
   INITIALIZATION
   ============================================================ */

document.addEventListener('DOMContentLoaded', function() {
    requireAuth();
    const saved = localStorage.getItem('finance_active_tab') || 'accounts';
    switchFinanceTab(saved);
});
