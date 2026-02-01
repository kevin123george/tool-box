/* ===========================================================
   FEATURES.JS - 12 New Features for ToolBox
   ============================================================ */

const FEATURES_API = "";

/* ===========================================================
   FEATURE 1: SAVINGS GOALS
   ============================================================ */

let savingsGoals = [];

async function loadSavingsGoals() {
    try {
        const res = await fetch(`${FEATURES_API}/api/savings-goals`);
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
                        <span style="font-size:18px;">${goal.icon || '🎯'}</span>
                        <strong>${goal.name}</strong>
                    </div>
                    <div style="font-size:12px; opacity:0.7; margin-bottom:6px;">
                        €${(goal.currentAmount || 0).toFixed(2)} / €${(goal.targetAmount || 0).toFixed(2)}
                        ${daysRemaining >= 0 ? ` • ${daysRemaining} days left` : ''}
                    </div>
                    <div style="height:8px; background:#222; border:1px solid var(--border);">
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
    document.getElementById('savingsGoalIcon').value = '🎯';
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
    document.getElementById('savingsGoalIcon').value = goal.icon || '🎯';
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
        icon: document.getElementById('savingsGoalIcon').value || '🎯',
        notes: document.getElementById('savingsGoalNotes').value
    };

    try {
        const method = id ? 'PUT' : 'POST';
        const url = id ? `${FEATURES_API}/api/savings-goals/${id}` : `${FEATURES_API}/api/savings-goals`;

        const res = await fetch(url, {
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
        await fetch(`${FEATURES_API}/api/savings-goals/${id}`, { method: 'DELETE' });
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
        const res = await fetch(`${FEATURES_API}/api/savings-goals/${id}/contribute`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount })
        });

        if (res.ok) {
            showToast(`Added €${amount.toFixed(2)} to goal!`, 'success');
            closeModal('contributeModal');
            loadSavingsGoals();
        }
    } catch (e) {
        showToast('Failed to contribute: ' + e.message, 'error');
    }
}

/* ===========================================================
   FEATURE 2: NET WORTH HISTORY
   ============================================================ */

let netWorthChart = null;

async function loadNetWorthHistory() {
    try {
        const res = await fetch(`${FEATURES_API}/api/networth/history`);
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
                legend: { labels: { color: 'var(--text)' } }
            },
            scales: {
                x: { ticks: { color: 'var(--text)' }, grid: { color: 'rgba(255,255,255,0.1)' } },
                y: { ticks: { color: 'var(--text)', callback: v => '€' + v.toLocaleString() }, grid: { color: 'rgba(255,255,255,0.1)' } }
            }
        }
    });
}

async function captureNetWorthSnapshot() {
    try {
        const res = await fetch(`${FEATURES_API}/api/networth/snapshot`, { method: 'POST' });
        if (res.ok) {
            showToast('Net worth snapshot captured!', 'success');
            loadNetWorthHistory();
        }
    } catch (e) {
        showToast('Failed to capture snapshot: ' + e.message, 'error');
    }
}

/* ===========================================================
   FEATURE 3: SAVINGS RATE TRACKER
   ============================================================ */

let savingsRateChart = null;

async function loadSavingsRateHistory() {
    try {
        const res = await fetch(`${FEATURES_API}/api/budget/savings-rate?months=12`);
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
                legend: { labels: { color: 'var(--text)' } }
            },
            scales: {
                x: { ticks: { color: 'var(--text)' }, grid: { color: 'rgba(255,255,255,0.1)' } },
                y: { ticks: { color: 'var(--text)', callback: v => v + '%' }, grid: { color: 'rgba(255,255,255,0.1)' }, min: 0, max: 100 }
            }
        }
    });
}

/* ===========================================================
   FEATURE 4: DIVIDEND TRACKER
   ============================================================ */

let dividends = [];

async function loadDividends() {
    try {
        const [divRes, summaryRes] = await Promise.all([
            fetch(`${FEATURES_API}/api/dividends`),
            fetch(`${FEATURES_API}/api/dividends/summary`)
        ]);

        if (divRes.ok) {
            dividends = await divRes.json();
            renderDividendsList();
        }

        if (summaryRes.ok) {
            const summary = await summaryRes.json();
            renderDividendSummary(summary);
        }
    } catch (e) {
        console.error("Failed to load dividends:", e);
    }
}

function renderDividendsList() {
    const container = document.getElementById('dividendsList');
    if (!container) return;

    if (dividends.length === 0) {
        container.innerHTML = '<div style="opacity:0.5; text-align:center; padding:20px;">No dividend records yet.</div>';
        return;
    }

    container.innerHTML = `
        <div class="stock-row stock-header">
            <div>Symbol</div>
            <div>Amount</div>
            <div>Date</div>
            <div>Frequency</div>
            <div>Actions</div>
        </div>
        ${dividends.slice(0, 10).map(d => `
            <div class="stock-row">
                <div><strong>${d.stockSymbol}</strong></div>
                <div>€${(d.amount || 0).toFixed(2)}</div>
                <div>${d.paymentDate || '-'}</div>
                <div>${d.frequency || '-'}</div>
                <div>
                    <button class="btn" onclick="editDividend('${d.id}')" style="padding:2px 6px;">EDIT</button>
                    <button class="btn" onclick="deleteDividend('${d.id}')" style="padding:2px 6px;">DEL</button>
                </div>
            </div>
        `).join('')}
    `;
}

function renderDividendSummary(summary) {
    const totalEl = document.getElementById('dividendTotal');
    const projectionEl = document.getElementById('dividendProjection');

    if (totalEl) totalEl.textContent = '€' + (summary.totalReceived || 0).toFixed(2);
    if (projectionEl) projectionEl.textContent = '€' + (summary.annualProjection || 0).toFixed(2);
}

function showAddDividendModal() {
    document.getElementById('dividendModalTitle').textContent = 'Add Dividend';
    document.getElementById('dividendId').value = '';
    document.getElementById('dividendSymbol').value = '';
    document.getElementById('dividendAmount').value = '';
    document.getElementById('dividendPaymentDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('dividendFrequency').value = 'QUARTERLY';
    document.getElementById('dividendNotes').value = '';
    openModal('dividendModal');
}

function editDividend(id) {
    const div = dividends.find(d => d.id === id);
    if (!div) return;

    document.getElementById('dividendModalTitle').textContent = 'Edit Dividend';
    document.getElementById('dividendId').value = div.id;
    document.getElementById('dividendSymbol').value = div.stockSymbol || '';
    document.getElementById('dividendAmount').value = div.amount || '';
    document.getElementById('dividendPaymentDate').value = div.paymentDate || '';
    document.getElementById('dividendFrequency').value = div.frequency || 'QUARTERLY';
    document.getElementById('dividendNotes').value = div.notes || '';
    openModal('dividendModal');
}

async function saveDividend() {
    const id = document.getElementById('dividendId').value;
    const dividend = {
        stockSymbol: document.getElementById('dividendSymbol').value.toUpperCase(),
        amount: parseFloat(document.getElementById('dividendAmount').value) || 0,
        paymentDate: document.getElementById('dividendPaymentDate').value || null,
        frequency: document.getElementById('dividendFrequency').value,
        notes: document.getElementById('dividendNotes').value
    };

    try {
        const method = id ? 'PUT' : 'POST';
        const url = id ? `${FEATURES_API}/api/dividends/${id}` : `${FEATURES_API}/api/dividends`;

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dividend)
        });

        if (res.ok) {
            showToast('Dividend saved!', 'success');
            closeModal('dividendModal');
            loadDividends();
        }
    } catch (e) {
        showToast('Failed to save: ' + e.message, 'error');
    }
}

async function deleteDividend(id) {
    if (!confirm('Delete this dividend record?')) return;

    try {
        await fetch(`${FEATURES_API}/api/dividends/${id}`, { method: 'DELETE' });
        showToast('Dividend deleted', 'success');
        loadDividends();
    } catch (e) {
        showToast('Failed to delete: ' + e.message, 'error');
    }
}

/* ===========================================================
   FEATURE 5: PRICE ALERTS
   ============================================================ */

let priceAlerts = [];

async function loadPriceAlerts() {
    try {
        const res = await fetch(`${FEATURES_API}/api/alerts`);
        if (res.ok) {
            priceAlerts = await res.json();
            renderPriceAlerts();
        }
    } catch (e) {
        console.error("Failed to load price alerts:", e);
    }
}

function renderPriceAlerts() {
    const container = document.getElementById('priceAlertsList');
    if (!container) return;

    if (priceAlerts.length === 0) {
        container.innerHTML = '<div style="opacity:0.5; text-align:center; padding:20px;">No price alerts set.</div>';
        return;
    }

    container.innerHTML = priceAlerts.map(alert => {
        const statusClass = alert.triggered ? 'negative' : (alert.active ? 'positive' : '');
        const statusText = alert.triggered ? 'TRIGGERED' : (alert.active ? 'ACTIVE' : 'INACTIVE');

        return `
            <div class="card" style="margin-bottom:8px;">
                <div class="card-main">
                    <strong>${alert.symbol}</strong>
                    <span style="margin-left:10px;">
                        ${alert.direction === 'ABOVE' ? '↑' : '↓'} €${(alert.targetPrice || 0).toFixed(2)}
                    </span>
                    <span class="${statusClass}" style="margin-left:10px; font-size:11px;">${statusText}</span>
                </div>
                <div class="card-actions">
                    <button class="btn" onclick="deletePriceAlert('${alert.id}')">DEL</button>
                </div>
            </div>
        `;
    }).join('');
}

function showAddPriceAlertModal() {
    document.getElementById('alertSymbol').value = '';
    document.getElementById('alertTargetPrice').value = '';
    document.getElementById('alertDirection').value = 'ABOVE';
    openModal('priceAlertModal');
}

async function savePriceAlert() {
    const alert = {
        symbol: document.getElementById('alertSymbol').value.toUpperCase(),
        targetPrice: parseFloat(document.getElementById('alertTargetPrice').value) || 0,
        direction: document.getElementById('alertDirection').value
    };

    try {
        const res = await fetch(`${FEATURES_API}/api/alerts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(alert)
        });

        if (res.ok) {
            showToast('Price alert created!', 'success');
            closeModal('priceAlertModal');
            loadPriceAlerts();
        }
    } catch (e) {
        showToast('Failed to create alert: ' + e.message, 'error');
    }
}

async function deletePriceAlert(id) {
    if (!confirm('Delete this alert?')) return;

    try {
        await fetch(`${FEATURES_API}/api/alerts/${id}`, { method: 'DELETE' });
        showToast('Alert deleted', 'success');
        loadPriceAlerts();
    } catch (e) {
        showToast('Failed to delete: ' + e.message, 'error');
    }
}

/* ===========================================================
   FEATURE 6: CAPITAL GAINS ESTIMATOR
   ============================================================ */

async function loadCapitalGains() {
    try {
        const res = await fetch(`${FEATURES_API}/api/stocks/capital-gains`);
        if (res.ok) {
            const data = await res.json();
            renderCapitalGains(data);
        }
    } catch (e) {
        console.error("Failed to load capital gains:", e);
    }
}

function renderCapitalGains(data) {
    const container = document.getElementById('capitalGainsList');
    const summaryContainer = document.getElementById('capitalGainsSummary');

    if (summaryContainer) {
        const gainClass = data.totalUnrealizedGain >= 0 ? 'positive' : 'negative';
        summaryContainer.innerHTML = `
            <div class="stat-card">
                <div class="stat-label">Unrealized Gain</div>
                <div class="stat-value ${gainClass}">€${(data.totalUnrealizedGain || 0).toFixed(2)}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Est. Tax (26.375%)</div>
                <div class="stat-value">€${(data.totalEstimatedTax || 0).toFixed(2)}</div>
            </div>
        `;
    }

    if (container && data.holdings) {
        container.innerHTML = `
            <div class="stock-row stock-header" style="grid-template-columns:1fr 80px 80px 80px 80px 80px;">
                <div>Symbol</div>
                <div>Buy</div>
                <div>Current</div>
                <div>Gain</div>
                <div>Tax</div>
                <div>Days</div>
            </div>
            ${data.holdings.map(h => {
                const gainClass = h.unrealizedGain >= 0 ? 'positive' : 'negative';
                return `
                    <div class="stock-row" style="grid-template-columns:1fr 80px 80px 80px 80px 80px;">
                        <div><strong>${h.symbol}</strong></div>
                        <div>€${(h.buyPrice || 0).toFixed(2)}</div>
                        <div>€${(h.currentPrice || 0).toFixed(2)}</div>
                        <div class="${gainClass}">€${(h.unrealizedGain || 0).toFixed(2)}</div>
                        <div>€${(h.estimatedTax || 0).toFixed(2)}</div>
                        <div>${h.holdingPeriodDays || 0}</div>
                    </div>
                `;
            }).join('')}
        `;
    }
}

/* ===========================================================
   FEATURE 7: RECURRING TRANSACTIONS
   ============================================================ */

let recurringTransactions = [];

async function loadRecurringTransactions() {
    try {
        const [transRes, summaryRes] = await Promise.all([
            fetch(`${FEATURES_API}/api/recurring`),
            fetch(`${FEATURES_API}/api/recurring/summary`)
        ]);

        if (transRes.ok) {
            recurringTransactions = await transRes.json();
            renderRecurringTransactions();
        }

        if (summaryRes.ok) {
            const summary = await summaryRes.json();
            const costEl = document.getElementById('recurringMonthlyCost');
            const incomeEl = document.getElementById('recurringMonthlyIncome');
            if (costEl) costEl.textContent = '€' + (summary.monthlyRecurringCost || 0).toFixed(2);
            if (incomeEl) incomeEl.textContent = '€' + (summary.monthlyRecurringIncome || 0).toFixed(2);
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
                    <span style="color:${typeColor}; margin-left:10px;">€${(t.amount || 0).toFixed(2)}</span>
                    <span style="margin-left:10px; font-size:11px; opacity:0.7;">${t.frequency} • ${t.categoryType}</span>
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
        const url = id ? `${FEATURES_API}/api/recurring/${id}` : `${FEATURES_API}/api/recurring`;

        const res = await fetch(url, {
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
        await fetch(`${FEATURES_API}/api/recurring/${id}`, { method: 'DELETE' });
        showToast('Deleted', 'success');
        loadRecurringTransactions();
    } catch (e) {
        showToast('Failed to delete: ' + e.message, 'error');
    }
}

/* ===========================================================
   FEATURE 8: SUBSCRIPTION MANAGER
   ============================================================ */

let subscriptions = [];

async function loadSubscriptions() {
    try {
        const [subsRes, summaryRes] = await Promise.all([
            fetch(`${FEATURES_API}/api/subscriptions`),
            fetch(`${FEATURES_API}/api/subscriptions/summary`)
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

    if (monthlyEl) monthlyEl.textContent = '€' + (summary.totalMonthly || 0).toFixed(2);
    if (annualEl) annualEl.textContent = '€' + (summary.totalAnnual || 0).toFixed(2);
    if (countEl) countEl.textContent = summary.activeCount || 0;
}

function renderSubscriptions() {
    const container = document.getElementById('subscriptionsList');
    if (!container) return;

    if (subscriptions.length === 0) {
        container.innerHTML = '<div style="opacity:0.5; text-align:center; padding:20px;">No subscriptions tracked.</div>';
        return;
    }

    container.innerHTML = subscriptions.map(sub => {
        const statusClass = sub.active ? 'positive' : 'negative';
        const status = sub.active ? 'ACTIVE' : 'CANCELLED';

        return `
            <div class="card" style="margin-bottom:8px;">
                <div class="card-main">
                    <strong>${sub.name}</strong>
                    <span style="margin-left:8px; opacity:0.7;">${sub.provider || ''}</span>
                    <div style="font-size:12px; margin-top:4px;">
                        €${(sub.amount || 0).toFixed(2)} / ${sub.billingCycle}
                        <span style="margin-left:10px;">Next: ${sub.nextBillingDate || '-'}</span>
                        <span class="${statusClass}" style="margin-left:10px;">${status}</span>
                    </div>
                </div>
                <div class="card-actions">
                    <button class="btn" onclick="editSubscription('${sub.id}')">EDIT</button>
                    <button class="btn" onclick="deleteSubscription('${sub.id}')">DEL</button>
                </div>
            </div>
        `;
    }).join('');
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
        const url = id ? `${FEATURES_API}/api/subscriptions/${id}` : `${FEATURES_API}/api/subscriptions`;

        const res = await fetch(url, {
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
        await fetch(`${FEATURES_API}/api/subscriptions/${id}`, { method: 'DELETE' });
        showToast('Subscription deleted', 'success');
        loadSubscriptions();
    } catch (e) {
        showToast('Failed to delete: ' + e.message, 'error');
    }
}

/* ===========================================================
   FEATURE 9: PORTFOLIO ALLOCATION
   ============================================================ */

let allocationChart = null;

async function loadPortfolioAllocation() {
    try {
        const res = await fetch(`${FEATURES_API}/api/stocks/allocation`);
        if (res.ok) {
            const data = await res.json();
            renderAllocationChart(data);
            renderAllocationTable(data);
        }
    } catch (e) {
        console.error("Failed to load allocation:", e);
    }
}

function renderAllocationChart(data) {
    const canvas = document.getElementById('allocationChart');
    if (!canvas || !data.allocations) return;

    if (allocationChart) {
        allocationChart.destroy();
    }

    const colors = ['#0f0', '#39f', '#f90', '#f33', '#9f0', '#f0f', '#0ff', '#ff0'];

    const ctx = canvas.getContext('2d');
    allocationChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.allocations.map(a => a.symbol),
            datasets: [{
                data: data.allocations.map(a => a.percentage),
                backgroundColor: colors.slice(0, data.allocations.length),
                borderColor: 'var(--bg)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: 'var(--text)' }
                }
            }
        }
    });
}

function renderAllocationTable(data) {
    const container = document.getElementById('allocationTable');
    if (!container || !data.allocations) return;

    container.innerHTML = `
        <div class="stock-row stock-header" style="grid-template-columns:1fr 80px 80px 80px 80px;">
            <div>Symbol</div>
            <div>Value</div>
            <div>Current %</div>
            <div>Target %</div>
            <div>Diff</div>
        </div>
        ${data.allocations.map(a => {
            const diffClass = a.difference > 5 ? 'negative' : (a.difference < -5 ? 'positive' : '');
            return `
                <div class="stock-row" style="grid-template-columns:1fr 80px 80px 80px 80px;">
                    <div><strong>${a.symbol}</strong></div>
                    <div>€${(a.currentValue || 0).toFixed(0)}</div>
                    <div>${(a.percentage || 0).toFixed(1)}%</div>
                    <div>${(a.targetPercentage || 0).toFixed(1)}%</div>
                    <div class="${diffClass}">${a.difference > 0 ? '+' : ''}${(a.difference || 0).toFixed(1)}%</div>
                </div>
            `;
        }).join('')}
    `;

    // Render suggestions
    const suggestionsContainer = document.getElementById('rebalanceSuggestions');
    if (suggestionsContainer && data.rebalanceSuggestions) {
        const suggestions = Object.entries(data.rebalanceSuggestions);
        if (suggestions.length > 0) {
            suggestionsContainer.innerHTML = suggestions.map(([symbol, suggestion]) =>
                `<div style="padding:4px 0; font-size:12px;"><strong>${symbol}:</strong> ${suggestion}</div>`
            ).join('');
        } else {
            suggestionsContainer.innerHTML = '<div style="opacity:0.5;">Portfolio is balanced!</div>';
        }
    }
}

function showSetTargetModal() {
    // Load current targets
    fetch(`${FEATURES_API}/api/stocks/allocation/target`)
        .then(res => res.json())
        .then(data => {
            document.getElementById('targetAllocationsInput').value =
                data.allocations ? JSON.stringify(data.allocations, null, 2) : '{}';
            openModal('targetAllocationModal');
        })
        .catch(() => {
            document.getElementById('targetAllocationsInput').value = '{}';
            openModal('targetAllocationModal');
        });
}

async function saveTargetAllocation() {
    try {
        const allocations = JSON.parse(document.getElementById('targetAllocationsInput').value);

        const res = await fetch(`${FEATURES_API}/api/stocks/allocation/target`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ allocations })
        });

        if (res.ok) {
            showToast('Target allocation saved!', 'success');
            closeModal('targetAllocationModal');
            loadPortfolioAllocation();
        }
    } catch (e) {
        showToast('Invalid JSON: ' + e.message, 'error');
    }
}

/* ===========================================================
   FEATURE 10: BANK STATEMENT IMPORT
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
        const res = await fetch(`${FEATURES_API}/api/budget/import/preview`, {
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
                    <tr style="background:var(--text); color:var(--bg);">
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
                        <tr style="border-bottom:1px solid var(--border);">
                            <td style="padding:6px; text-align:center;">
                                <input type="checkbox" ${item.included ? 'checked' : ''}
                                    onchange="importPreviews[${idx}].included = this.checked">
                            </td>
                            <td style="padding:6px;">${item.date || '-'}</td>
                            <td style="padding:6px;">${item.description || '-'}</td>
                            <td style="padding:6px; color:${item.type === 'INCOME' ? '#0f0' : '#f33'};">
                                €${(item.amount || 0).toFixed(2)}
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
        const res = await fetch(`${FEATURES_API}/api/budget/${year}/${month}/import/confirm`, {
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
   FEATURE 11: FINANCIAL CALENDAR
   ============================================================ */

let calendarYear = new Date().getFullYear();
let calendarMonth = new Date().getMonth() + 1;
let calendarEvents = [];

async function loadCalendar() {
    try {
        const res = await fetch(`${FEATURES_API}/api/calendar/${calendarYear}/${calendarMonth}`);
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
                            ? `${e.title}${e.completed ? ' ✓' : ''} (${e.amount} min)`
                            : `${e.title}: €${e.amount.toFixed(2)}`;
                        const displayText = e.type === 'WORKOUT'
                            ? `${e.completed ? '✓' : '○'} ${e.title.substring(0, 8)}`
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
   FEATURE 12: EXPENSE ANALYTICS
   ============================================================ */

let categoryTrendsChart = null;
let monthlyComparisonChart = null;
let categoryBreakdownChart = null;

async function loadAnalytics() {
    try {
        const [trendsRes, monthlyRes, anomaliesRes] = await Promise.all([
            fetch(`${FEATURES_API}/api/analytics/category-trends?months=6`),
            fetch(`${FEATURES_API}/api/analytics/monthly?months=6`),
            fetch(`${FEATURES_API}/api/analytics/anomalies`)
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
                <strong style="color:#f90;">⚠ ${a.category}</strong>
                <div style="font-size:12px; margin-top:4px;">
                    €${a.currentAmount.toFixed(2)} this month (avg: €${a.averageAmount.toFixed(2)})
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
            plugins: { legend: { labels: { color: 'var(--text)' } } },
            scales: {
                x: { ticks: { color: 'var(--text)' }, grid: { color: 'rgba(255,255,255,0.1)' } },
                y: { ticks: { color: 'var(--text)', callback: v => '€' + v }, grid: { color: 'rgba(255,255,255,0.1)' } }
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
            plugins: { legend: { labels: { color: 'var(--text)' } } },
            scales: {
                x: { ticks: { color: 'var(--text)' }, grid: { color: 'rgba(255,255,255,0.1)' } },
                y: { ticks: { color: 'var(--text)', callback: v => '€' + v }, grid: { color: 'rgba(255,255,255,0.1)' } }
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
                borderColor: 'var(--bg)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: 'var(--text)' }
                }
            }
        }
    });
}

/* ===========================================================
   TAB INITIALIZATION HOOKS
   ============================================================ */

// Hook into the switchTab function to load data for new tabs
const originalSwitchTab = window.switchTab;
window.switchTab = function(which) {
    // Call original implementation
    if (originalSwitchTab) {
        originalSwitchTab(which);
    }

    // Handle new tabs
    if (which === 'subscriptions') {
        subscriptionsTabContent?.classList.remove('hidden');
        loadSubscriptions();
    } else if (which === 'calendar') {
        calendarTabContent?.classList.remove('hidden');
        loadCalendar();
    } else if (which === 'analytics') {
        analyticsTabContent?.classList.remove('hidden');
        loadAnalytics();
    } else if (which === 'dashboard') {
        // Load additional dashboard features
        loadSavingsGoals();
        loadNetWorthHistory();
        loadSavingsRateHistory();
    } else if (which === 'stocks') {
        // Load additional stocks features
        loadDividends();
        loadPriceAlerts();
        loadCapitalGains();
        loadPortfolioAllocation();
    } else if (which === 'budget') {
        // Load additional budget features
        loadRecurringTransactions();
    }

    // Hide new tabs when switching away
    if (which !== 'subscriptions') subscriptionsTabContent?.classList.add('hidden');
    if (which !== 'calendar') calendarTabContent?.classList.add('hidden');
    if (which !== 'analytics') analyticsTabContent?.classList.add('hidden');
};

// Get references to new tab content elements
const subscriptionsTabContent = document.getElementById('subscriptionsTabContent');
const calendarTabContent = document.getElementById('calendarTabContent');
const analyticsTabContent = document.getElementById('analyticsTabContent');

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Features will be loaded when switching to their respective tabs
    console.log('Features.js initialized');
});
