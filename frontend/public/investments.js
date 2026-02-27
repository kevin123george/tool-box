/* ===========================================================
   INVESTMENTS PAGE - Combined JS
   Stocks, Stock History, Research, Fundamentals, DCF, Screener
=============================================================*/

let editingHoldingId = null;
let editingWatchlistId = null;
let stocksRefreshInterval = null;
let historyRefreshInterval = null;
let countdownInterval = null;
let countdownSecs = 5;

function startCountdown() {
    countdownSecs = 5;
    const el = document.getElementById('priceCountdown');
    if (el) el.textContent = `next update in ${countdownSecs}s`;
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
        countdownSecs--;
        const el = document.getElementById('priceCountdown');
        if (el) el.textContent = countdownSecs > 0 ? `next update in ${countdownSecs}s` : 'updating…';
        if (countdownSecs <= 0) countdownSecs = 5;
    }, 1000);
}

function stopCountdown() {
    if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
    const el = document.getElementById('priceCountdown');
    if (el) el.textContent = '';
}

// Stock history state
let historyChart = null;
let currentChartType = 'line';
let isFullscreen = false;

// Features state
let dividends = [];
let priceAlerts = [];
let allocationChart = null;
let portfolioValueChart = null;
let pvRange = '3M';

/* ===========================================================
   SUB-TAB SWITCHING
=============================================================*/

function switchInvestmentTab(which) {
    localStorage.setItem('investments_active_tab', which);

    const tabs = ['stocks', 'stockhistory', 'research', 'fundamentals', 'dcf', 'screener'];
    tabs.forEach(t => {
        const btn = document.getElementById('sub' + t.charAt(0).toUpperCase() + t.slice(1));
        if (btn) {
            btn.classList.toggle('tab-active', t === which);
            btn.setAttribute('aria-selected', t === which);
        }
    });

    // Fix specific IDs
    document.getElementById('subStocks')?.classList.toggle('tab-active', which === 'stocks');
    document.getElementById('subStockhistory')?.classList.toggle('tab-active', which === 'stockhistory');
    document.getElementById('subResearch')?.classList.toggle('tab-active', which === 'research');
    document.getElementById('subFundamentals')?.classList.toggle('tab-active', which === 'fundamentals');
    document.getElementById('subDcf')?.classList.toggle('tab-active', which === 'dcf');
    document.getElementById('subScreener')?.classList.toggle('tab-active', which === 'screener');

    // Toggle content visibility
    document.getElementById('stocksTabContent')?.classList.toggle('hidden', which !== 'stocks');
    document.getElementById('stockHistoryTabContent')?.classList.toggle('hidden', which !== 'stockhistory');
    document.getElementById('researchTabContent')?.classList.toggle('hidden', which !== 'research');
    document.getElementById('fundamentalsTabContent')?.classList.toggle('hidden', which !== 'fundamentals');
    document.getElementById('dcfTabContent')?.classList.toggle('hidden', which !== 'dcf');
    document.getElementById('screenerTabContent')?.classList.toggle('hidden', which !== 'screener');

    // Clean up intervals when leaving tabs
    if (which !== 'stocks' && stocksRefreshInterval) {
        clearInterval(stocksRefreshInterval);
        stocksRefreshInterval = null;
    }

    // Load data for selected tab
    if (which === 'stocks') {
        loadStocks();
        loadDividends();
        loadPriceAlerts();
        loadCapitalGains();
        loadPortfolioAllocation();
        if (!stocksRefreshInterval) {
            stocksRefreshInterval = setInterval(() => { loadStocks(); startCountdown(); }, 5000);
        }
        startCountdown();
    } else if (which === 'stockhistory') {
        if (typeof window.onStockHistoryTabShown === 'function') {
            window.onStockHistoryTabShown();
        } else {
            loadStockHistory();
        }
    } else if (which === 'research') {
        loadLatestResearch();
    } else if (which === 'fundamentals') {
        if (typeof onFundamentalsTabShown === 'function') onFundamentalsTabShown();
    } else if (which === 'dcf') {
        if (typeof onDCFTabShown === 'function') onDCFTabShown();
    } else if (which === 'screener') {
        if (typeof onScreenerTabShown === 'function') onScreenerTabShown();
    }
}

/* ===========================================================
   CSV EXPORT
=============================================================*/

async function exportPortfolioCsv() {
    try {
        showLoading('Exporting CSV...');
        const res = await authFetch(`${API}/api/stocks/export`);

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
   STOCKS / PORTFOLIO
=============================================================*/

async function loadStocks() {
    await loadStockStats();
    await loadHoldings();
    await loadSoldHoldings();
    await loadWatchlist();
    loadPortfolioValueChart();
}

async function loadStockStats() {
    try {
        const res = await authFetch(`${API}/api/stocks/stats`);
        const stats = await res.json();

        document.getElementById('statInvested').textContent = "€" + stats.totalInvested.toFixed(2);
        document.getElementById('statValue').textContent = "€" + stats.currentValue.toFixed(2);

        const profit = stats.totalProfit;
        const profitPercent = (profit / stats.totalInvested * 100) || 0;

        const profitEl = document.getElementById('statProfit');
        profitEl.textContent = "€" + profit.toFixed(2);
        profitEl.className = "stat-value " + (profit >= 0 ? "positive" : "negative");

        const returnEl = document.getElementById('statReturn');
        returnEl.textContent = profitPercent.toFixed(2) + "%";
        returnEl.className = "stat-value " + (profit >= 0 ? "positive" : "negative");
    } catch (e) {
        console.error("Failed to load stats:", e);
    }
}

async function loadHoldings() {
    try {
        const res = await authFetch(`${API}/api/stocks`);
        const holdings = await res.json();
        const holdingsList = document.getElementById('holdingsList');

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
            <div>Buy</div>
            <div>Current</div>
            <div>Day</div>
            <div>P/L</div>
            <div>P/L %</div>
        </div>`;

        holdings.forEach(h => {
            const pl = (h.currentPrice - h.buyPrice) * h.quantity;
            const plPercent = ((h.currentPrice - h.buyPrice) / h.buyPrice * 100) || 0;
            const plClass = pl >= 0 ? "positive" : "negative";
            const cur = h.currency || 'EUR';
            const buyDateStr = h.buyDate
                ? (Array.isArray(h.buyDate)
                    ? `${h.buyDate[0]}-${String(h.buyDate[1]).padStart(2,'0')}-${String(h.buyDate[2]).padStart(2,'0')}`
                    : String(h.buyDate).substring(0, 10))
                : '';

            const dayChange = h.previousClose > 0 ? h.currentPrice - h.previousClose : null;
            const dayPct    = dayChange !== null && h.previousClose > 0 ? (dayChange / h.previousClose * 100) : null;
            const dayClass  = dayChange === null ? '' : dayChange >= 0 ? 'positive' : 'negative';
            const dayHtml   = dayChange === null
                ? '<span class="opacity-30">—</span>'
                : `${dayChange >= 0 ? '+' : ''}${dayChange.toFixed(2)}<br><span class="text-xs opacity-70">${dayPct >= 0 ? '+' : ''}${dayPct.toFixed(2)}%</span>`;

            html += `
            <div class="stock-row">
                <div><strong>${h.symbol}</strong> <span class="badge badge-ghost badge-xs opacity-60">${cur}</span></div>
                <div>${h.quantity}</div>
                <div>${h.buyPrice.toFixed(2)}</div>
                <div>${h.currentPrice.toFixed(2)}</div>
                <div class="${dayClass}">${dayHtml}</div>
                <div class="${plClass}">${pl >= 0 ? '+' : ''}${pl.toFixed(2)}</div>
                <div class="${plClass}">${plPercent >= 0 ? '+' : ''}${plPercent.toFixed(2)}%</div>
            </div>
            <div style="padding:0 8px 8px 8px;">
                <div class="profit-bar">
                    <div class="profit-bar-fill ${plClass}" style="width:${Math.min(Math.abs(plPercent), 100)}%; background:${pl >= 0 ? '#0f0' : '#f33'};"></div>
                </div>
                <div style="text-align:right; margin-top:4px;">
                    <button class="btn btn-sm btn-error" onclick="showSellHolding('${h.id}', '${h.symbol}', ${h.currentPrice})" aria-label="Sell ${h.symbol}">SELL</button>
                    <button class="btn btn-sm" onclick="showEditHolding('${h.id}', '${h.symbol}', ${h.quantity}, ${h.buyPrice}, '${buyDateStr}', '${cur}')" aria-label="Edit ${h.symbol}">EDIT</button>
                    <button class="btn btn-sm" onclick="delHolding('${h.id}', '${h.symbol}')" aria-label="Delete ${h.symbol}">DEL</button>
                </div>
            </div>`;
        });

        holdingsList.innerHTML = html;
    } catch (e) {
        console.error("Failed to load holdings:", e);
        showToast("Failed to load holdings", "error");
    }
}

async function loadSoldHoldings() {
    try {
        const res = await authFetch(`${API}/api/stocks/sold`);
        const holdings = await res.json();
        const list = document.getElementById('soldHoldingsList');
        const countEl = document.getElementById('soldHoldingsCount');
        if (!list) return;

        if (!holdings || holdings.length === 0) {
            if (countEl) countEl.textContent = '0';
            list.innerHTML = `<div class="text-center text-sm opacity-40 py-4">No sold holdings recorded.</div>`;
            return;
        }

        if (countEl) countEl.textContent = holdings.length;

        let totalRealised = 0;
        let html = `
        <div class="stock-row stock-header">
            <div>Symbol</div>
            <div>Qty</div>
            <div>Buy</div>
            <div>Sell</div>
            <div>Realised P/L</div>
            <div>Return %</div>
        </div>`;

        holdings.forEach(h => {
            const pl = (h.currentPrice - h.buyPrice) * h.quantity;
            const plPct = h.buyPrice > 0 ? ((h.currentPrice - h.buyPrice) / h.buyPrice * 100) : 0;
            const plClass = pl >= 0 ? 'positive' : 'negative';
            const cur = h.currency || 'EUR';
            const buyDateStr = h.buyDate
                ? (Array.isArray(h.buyDate)
                    ? `${h.buyDate[0]}-${String(h.buyDate[1]).padStart(2,'0')}-${String(h.buyDate[2]).padStart(2,'0')}`
                    : String(h.buyDate).substring(0, 10))
                : '';
            totalRealised += pl;

            html += `
            <div class="stock-row" style="opacity:0.75;">
                <div><strong>${h.symbol}</strong> <span class="badge badge-ghost badge-xs opacity-60">${cur}</span></div>
                <div>${h.quantity}</div>
                <div>${h.buyPrice.toFixed(2)}</div>
                <div>${h.currentPrice.toFixed(2)}</div>
                <div class="${plClass}">${pl >= 0 ? '+' : ''}${pl.toFixed(2)}</div>
                <div class="${plClass}">${plPct >= 0 ? '+' : ''}${plPct.toFixed(2)}%</div>
            </div>
            <div style="padding:0 8px 8px 8px;">
                <div class="profit-bar">
                    <div class="profit-bar-fill ${plClass}" style="width:${Math.min(Math.abs(plPct), 100)}%; background:${pl >= 0 ? '#0f0' : '#f33'};"></div>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
                    <span class="text-xs opacity-40">${buyDateStr ? 'Bought ' + buyDateStr : ''}</span>
                    <div>
                        <button class="btn btn-sm" onclick="showEditHolding('${h.id}','${h.symbol}',${h.quantity},${h.buyPrice},'${buyDateStr}','${cur}')" aria-label="Edit ${h.symbol}">EDIT</button>
                        <button class="btn btn-sm" onclick="delHolding('${h.id}','${h.symbol}')" aria-label="Delete ${h.symbol}">DEL</button>
                    </div>
                </div>
            </div>`;
        });

        // summary footer
        const totalClass = totalRealised >= 0 ? 'positive' : 'negative';
        html += `
        <div class="flex justify-end px-2 pt-2 pb-1 text-sm font-semibold">
            Total Realised: <span class="${totalClass} ml-2 tabular-nums">${totalRealised >= 0 ? '+' : ''}€${totalRealised.toFixed(2)}</span>
        </div>`;

        list.innerHTML = html;
    } catch (e) {
        console.error('Failed to load sold holdings:', e);
    }
}

async function loadWatchlist() {
    try {
        const res = await authFetch(`${API}/api/stocks-watch`);
        const watchlist = await res.json();
        const watchlistList = document.getElementById('watchlistList');

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

async function fetchAllHistory() {
    try {
        const res = await authFetch(`${API}/api/stocks/backfill-history`, { method: 'POST' });
        if (!res || !res.ok) throw new Error();
        showToast('Fetching history in background — refresh the chart in ~30s', 'info');
        // Reload symbols after delay to pick up newly created records
        setTimeout(() => {
            if (typeof loadSymbolsForFilter === 'function') loadSymbolsForFilter();
        }, 35000);
    } catch {
        showToast('Failed to start history fetch', 'error');
    }
}

function showAddHolding() {
    editingHoldingId = null;
    document.getElementById('stockHoldingModalTitle').textContent = "Add Holding";
    document.getElementById('stockSymbol').value = "";
    document.getElementById('stockCurrency').value = "EUR";
    document.getElementById('stockQuantity').value = "";
    document.getElementById('stockBuyPrice').value = "";
    openModal("stockHoldingModal");
}

function showEditHolding(id, symbol, quantity, buyPrice, buyDate, currency) {
    editingHoldingId = id;
    document.getElementById('stockHoldingModalTitle').textContent = "Edit Holding";
    document.getElementById('stockSymbol').value = symbol;
    document.getElementById('stockCurrency').value = currency || "EUR";
    document.getElementById('stockQuantity').value = quantity;
    document.getElementById('stockBuyPrice').value = buyPrice;
    openModal("stockHoldingModal");
}

function closeStockHoldingModal() {
    editingHoldingId = null;
    closeModal("stockHoldingModal");
}

async function saveStockHolding() {
    const symbol   = document.getElementById('stockSymbol').value.toUpperCase().trim();
    const currency = document.getElementById('stockCurrency').value || 'EUR';
    const quantity = parseFloat(document.getElementById('stockQuantity').value);
    const buyPrice = parseFloat(document.getElementById('stockBuyPrice').value);

    if (!symbol)         { showToast('Enter a stock symbol', 'warning'); return; }
    if (!quantity || quantity <= 0) { showToast('Enter a valid quantity', 'warning'); return; }
    if (!buyPrice || buyPrice <= 0) { showToast('Enter a valid buy price', 'warning'); return; }

    const data = { symbol, currency, quantity, buyPrice };

    try {
        if (editingHoldingId) {
            await authFetch(`${API}/api/stocks/${editingHoldingId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
            closeStockHoldingModal();
            loadStocks();
            showToast(`${symbol} updated`, 'success');
        } else {
            showLoading(`Fetching live price for ${symbol}…`);
            const res = await authFetch(`${API}/api/stocks`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
            const saved = await res.json();
            closeStockHoldingModal();
            loadStocks();
            const priceStr = saved.currentPrice > 0 ? ` · €${saved.currentPrice.toFixed(2)}` : '';
            showToast(`${symbol} added${priceStr}`, 'success');
        }
    } catch (e) {
        showToast(`Could not save ${symbol}: ${e.message}`, 'error');
    } finally {
        hideLoading();
    }
}

async function delHolding(id, symbol) {
    if (!confirm(`Remove ${symbol || 'this holding'} from your portfolio?`)) return;

    try {
        await authFetch(`${API}/api/stocks/${id}`, { method: "DELETE" });
        loadStocks();
        showToast(`${symbol || 'Holding'} removed from portfolio`, 'success');
    } catch (e) {
        showToast(`Could not remove ${symbol || 'holding'}`, 'error');
    }
}

function showSellHolding(id, symbol, currentPrice) {
    document.getElementById('sellHoldingId').value = id;
    document.getElementById('sellModalSymbol').textContent = symbol;
    document.getElementById('sellPrice').value = currentPrice > 0 ? currentPrice.toFixed(2) : '';
    openModal('sellHoldingModal');
}

async function confirmSell() {
    const id = document.getElementById('sellHoldingId').value;
    const sellPrice = parseFloat(document.getElementById('sellPrice').value);
    if (!sellPrice || sellPrice <= 0) { showToast('Enter a valid sell price', 'warning'); return; }

    try {
        await authFetch(`${API}/api/stocks/${id}/sell`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sellPrice })
        });
        closeModal('sellHoldingModal');
        loadStocks();
        showToast('Position marked as sold', 'success');
    } catch (e) {
        showToast('Could not mark as sold: ' + e.message, 'error');
    }
}

function showAddWatchlist() {
    editingWatchlistId = null;
    document.getElementById('watchlistModalTitle').textContent = "Add to Watchlist";
    document.getElementById('watchSymbol').value = "";
    document.getElementById('watchInitialPrice').value = "";
    openModal("watchlistModal");
}

function closeWatchlistModal() {
    editingWatchlistId = null;
    closeModal("watchlistModal");
}

async function saveWatchlist() {
    const data = {
        symbol: document.getElementById('watchSymbol').value.toUpperCase(),
        initialPrice: parseFloat(document.getElementById('watchInitialPrice').value)
    };

    if (!data.symbol)       { showToast('Enter a stock symbol', 'warning'); return; }
    if (!data.initialPrice || data.initialPrice <= 0) { showToast('Enter a valid initial price', 'warning'); return; }

    try {
        await authFetch(`${API}/api/stocks-watch`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        closeWatchlistModal();
        loadStocks();
        showToast(`${data.symbol} added to watchlist`, 'success');
    } catch (e) {
        showToast(`Could not add ${data.symbol} to watchlist`, 'error');
    }
}

async function delWatchlist(id) {
    if (!confirm("Remove from watchlist?")) return;

    await authFetch(`${API}/api/stocks-watch/${id}`, { method: "DELETE" });
    loadStocks();
}

/* ===========================================================
   DIVIDEND TRACKER
=============================================================*/

async function loadDividends() {
    try {
        const [divRes, summaryRes] = await Promise.all([
            authFetch(`${API}/api/dividends`),
            authFetch(`${API}/api/dividends/summary`)
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
        const url = id ? `${API}/api/dividends/${id}` : `${API}/api/dividends`;

        const res = await authFetch(url, {
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
        await authFetch(`${API}/api/dividends/${id}`, { method: 'DELETE' });
        showToast('Dividend deleted', 'success');
        loadDividends();
    } catch (e) {
        showToast('Failed to delete: ' + e.message, 'error');
    }
}

/* ===========================================================
   PRICE ALERTS
=============================================================*/

async function loadPriceAlerts() {
    try {
        const res = await authFetch(`${API}/api/alerts`);
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
        const res = await authFetch(`${API}/api/alerts`, {
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
        await authFetch(`${API}/api/alerts/${id}`, { method: 'DELETE' });
        showToast('Alert deleted', 'success');
        loadPriceAlerts();
    } catch (e) {
        showToast('Failed to delete: ' + e.message, 'error');
    }
}

/* ===========================================================
   CAPITAL GAINS ESTIMATOR
=============================================================*/

async function loadCapitalGains() {
    try {
        const res = await authFetch(`${API}/api/stocks/capital-gains`);
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
   PORTFOLIO ALLOCATION
=============================================================*/

async function loadPortfolioAllocation() {
    try {
        const res = await authFetch(`${API}/api/stocks/allocation`);
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
    authFetch(`${API}/api/stocks/allocation/target`)
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

        const res = await authFetch(`${API}/api/stocks/allocation/target`, {
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
   PORTFOLIO VALUE OVER TIME CHART
=============================================================*/

function setPvRange(r) {
    pvRange = r;
    document.querySelectorAll('.pvr-btn').forEach(b => {
        b.classList.remove('btn-primary');
        b.classList.add('btn-ghost');
    });
    document.querySelectorAll('.pvr-btn').forEach(b => {
        if (b.textContent.trim() === r) {
            b.classList.remove('btn-ghost');
            b.classList.add('btn-primary');
        }
    });
    loadPortfolioValueChart();
}

async function loadPortfolioValueChart() {
    try {
        const res = await authFetch(`${API}/api/hist/portfolio-value?range=${pvRange}`);
        if (!res.ok) return;
        const data = await res.json();
        renderPortfolioValueChart(data);
    } catch (e) {
        console.error('Portfolio value chart error', e);
    }
}

function renderPortfolioValueChart(data) {
    const canvas = document.getElementById('portfolioValueChart');
    const noData = document.getElementById('pvNoData');
    if (!canvas) return;

    if (!data || data.length === 0) {
        canvas.style.display = 'none';
        if (noData) noData.classList.remove('hidden');
        return;
    }
    canvas.style.display = '';
    if (noData) noData.classList.add('hidden');

    if (portfolioValueChart) portfolioValueChart.destroy();

    const labels = data.map(d => d.date);
    const values = data.map(d => d.value);
    const invested = data.map(d => d.invested);
    const profits = data.map(d => d.value - d.invested);

    const textColor = getComputedStyle(document.body).getPropertyValue('--color-base-content').trim() || '#ccc';
    const gridColor = 'rgba(128,128,128,0.08)';

    portfolioValueChart = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Portfolio Value',
                    data: values,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59,130,246,0.08)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 0,
                    borderWidth: 2,
                },
                {
                    label: 'Invested',
                    data: invested,
                    borderColor: '#f59e0b',
                    backgroundColor: 'transparent',
                    fill: false,
                    tension: 0.3,
                    pointRadius: 0,
                    borderWidth: 1.5,
                    borderDash: [5, 4],
                },
                {
                    label: 'Profit',
                    data: profits,
                    borderColor: '#22c55e',
                    backgroundColor: 'rgba(34,197,94,0.06)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 0,
                    borderWidth: 1.5,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    labels: { color: textColor, usePointStyle: true, pointStyleWidth: 10, boxHeight: 2 }
                },
                tooltip: {
                    callbacks: {
                        label: ctx => `${ctx.dataset.label}: €${ctx.raw.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: textColor, maxTicksLimit: 7, maxRotation: 0 },
                    grid: { color: gridColor }
                },
                y: {
                    ticks: {
                        color: textColor,
                        callback: v => `€${v.toLocaleString('de-DE', { maximumFractionDigits: 0 })}`
                    },
                    grid: { color: gridColor }
                }
            }
        }
    });
}

/* ===========================================================
   STOCK HISTORY (legacy Chart.js chart)
=============================================================*/

async function loadStockHistory() {
    try {
        const symbol = document.getElementById('histStockFilter').value;
        const dateFrom = document.getElementById('histDateFrom').value;
        const dateTo = document.getElementById('histDateTo').value;

        let statsParams = new URLSearchParams();
        if (symbol) statsParams.append('symbol', symbol);
        if (dateFrom) statsParams.append('from', new Date(dateFrom).toISOString());
        if (dateTo) {
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59, 999);
            statsParams.append('to', toDate.toISOString());
        }

        const statsRes = await authFetch(`${API}/api/hist/stats?${statsParams}`);
        const statsData = await statsRes.json();

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

        updatePriceStats(statsData);

        let chartParams = new URLSearchParams();
        if (symbol) chartParams.append('symbol', symbol);
        if (dateFrom) chartParams.append('from', new Date(dateFrom).toISOString());
        if (dateTo) {
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59, 999);
            chartParams.append('to', toDate.toISOString());
        }

        const chartRes = await authFetch(`${API}/api/hist/chart?${chartParams}`);
        const chartData = await chartRes.json();

        renderPriceChart(chartData.data, symbol);

        let tableParams = new URLSearchParams();
        tableParams.append('limit', '20');
        if (symbol) tableParams.append('symbol', symbol);

        const tableRes = await authFetch(`${API}/api/hist/recent?${tableParams}`);
        const tableData = await tableRes.json();

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

    if (investedEl) investedEl.textContent = `$${stats.totalInvested.toFixed(2)}`;
    if (valueEl) valueEl.textContent = `$${stats.totalValue.toFixed(2)}`;
    if (buyPriceEl) buyPriceEl.textContent = `$${stats.avgBuyPrice.toFixed(2)}`;
    if (currentPriceEl) currentPriceEl.textContent = `$${stats.currentPrice.toFixed(2)}`;
    if (priceChangeEl) priceChangeEl.textContent = `$${stats.priceChange.toFixed(2)}`;
    if (changePercentEl) changePercentEl.textContent = `${stats.changePercent.toFixed(2)}%`;

    const valueGain = stats.totalValue - stats.totalInvested;
    if (valueEl) {
        valueEl.classList.toggle('positive', valueGain >= 0);
        valueEl.classList.toggle('negative', valueGain < 0);
    }

    if (priceChangeEl) {
        priceChangeEl.classList.toggle('positive', stats.priceChange >= 0);
        priceChangeEl.classList.toggle('negative', stats.priceChange < 0);
    }
    if (changePercentEl) {
        changePercentEl.classList.toggle('positive', stats.changePercent >= 0);
        changePercentEl.classList.toggle('negative', stats.changePercent < 0);
    }
}

function renderPriceChart(dataBySymbol, selectedFilter) {
    const ctx = document.getElementById('historyChart');
    if (!ctx) return;

    if (historyChart) {
        historyChart.destroy();
    }

    const isDark = isDarkTheme();
    const textColor = isDark ? '#fff' : '#000';
    const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

    currentChartType = document.getElementById('chartType').value;

    const datasets = [];
    const colors = ['#0f0', '#0ff', '#ff0', '#f0f', '#fa0', '#0af'];
    let colorIndex = 0;

    const symbols = Object.keys(dataBySymbol);

    if (selectedFilter !== 'all' && symbols.length === 1) {
        const data = dataBySymbol[selectedFilter] || [];

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
    if (!tableEl) return;

    if (histories.length === 0) {
        tableEl.innerHTML = '<div style="padding:12px; border:1px solid oklch(var(--b3)); opacity:0.6;">No history data available</div>';
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

    const fromStr = fromDate.toISOString().split('T')[0];
    const toStr = now.toISOString().split('T')[0];

    document.getElementById('histDateFrom').value = fromStr;
    document.getElementById('histDateTo').value = toStr;
    loadStockHistory();
}

function changeChartType() {
    loadStockHistory();
}

function toggleFullscreen() {
    const container = document.getElementById('chartContainer');
    const btn = document.getElementById('fullscreenBtn');

    if (!isFullscreen) {
        if (container.requestFullscreen) {
            container.requestFullscreen().catch(() => {
                container.classList.add('fullscreen');
            });
        } else if (container.webkitRequestFullscreen) {
            container.webkitRequestFullscreen();
        } else {
            container.classList.add('fullscreen');
        }
        if (btn) btn.textContent = '⛶ EXIT FULLSCREEN';
        isFullscreen = true;

        setTimeout(() => {
            if (historyChart) historyChart.resize();
        }, 100);

        document.addEventListener('keydown', handleFullscreenEscape);
    } else {
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
    if (btn) btn.textContent = '⛶ FULLSCREEN';
    isFullscreen = false;

    if (historyChart) {
        historyChart.resize();
    }

    document.removeEventListener('keydown', handleFullscreenEscape);

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

/* ===========================================================
   STOCK RESEARCH
=============================================================*/

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
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000);

        const response = await authFetch('/api/research/generate', {
            method: 'POST',
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        clearTimeout(timeoutId);
        const report = await response.json();
        displayResearchReport(report);

    } catch (error) {
        console.error('Error generating research:', error);
        if (container) {
            container.innerHTML = `
                <div style="padding:20px;text-align:center;border:1px solid oklch(var(--b3));">
                    ERROR: ${error.message}
                </div>
            `;
        }
    } finally {
        button.disabled = false;
        button.textContent = '🔍 GENERATE RESEARCH REPORT';
    }
}

async function loadLatestResearch() {
    try {
        const response = await authFetch('/api/research/latest');

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

function displayResearchReport(report) {
    const container = document.getElementById('researchResults');
    if (!container) return;

    container.innerHTML = '';

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

    const holdingsMap = {};
    report.holdings.forEach(h => holdingsMap[h.symbol] = h);

    for (const [symbol, analysis] of Object.entries(report.analyses)) {
        const holding = holdingsMap[symbol];
        if (holding) {
            const card = createStockAnalysisCard(symbol, analysis, holding);
            container.appendChild(card);
        }
    }

    attachShowMoreListeners();
}

function createStockAnalysisCard(symbol, analysis, holding) {
    const card = document.createElement('div');
    card.className = 'card bg-base-200 shadow-sm mb-4';

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

    const sortedNews = [...analysis.news].sort(
        (a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0)
    );

    const newsHTML = sortedNews.map((n, i) => `
        <div class="news-item py-2 ${i >= 3 ? 'hidden-news-item' : ''}">
            <a href="${n.url}" target="_blank" class="text-sm hover:underline block mb-0.5">${n.title}</a>
            <div class="text-xs opacity-50">
                ${n.source || 'Unknown'} · Sentiment ${(n.tickerSentimentScore ?? 0).toFixed(3)} · Relevance ${(n.relevanceScore ?? 0).toFixed(2)}
            </div>
        </div>
    `).join('');

    const hiddenCount = Math.max(0, sortedNews.length - 3);

    card.innerHTML = `
        <div class="card-body p-4 gap-4">
            <!-- Header -->
            <div class="flex items-center justify-between flex-wrap gap-2">
                <div class="flex items-center gap-3">
                    <span class="text-xl font-bold tracking-tight">${symbol}</span>
                    <span class="badge badge-ghost badge-sm">STOCK</span>
                </div>
                <span class="text-lg font-bold tabular-nums ${gainPct >= 0 ? 'text-success' : 'text-error'}">
                    ${gainPct >= 0 ? '+' : ''}${gainPct.toFixed(2)}%
                </span>
            </div>

            <!-- Metrics stats row -->
            <div class="stats stats-horizontal shadow w-full flex-wrap">
                <div class="stat px-3 py-2">
                    <div class="stat-title text-xs">Sentiment</div>
                    <div class="stat-value text-sm ${sentimentClass}">${analysis.sentimentScore.toFixed(3)}</div>
                </div>
                <div class="stat px-3 py-2">
                    <div class="stat-title text-xs">RSI (14)</div>
                    <div class="stat-value text-sm ${rsiClass}">${rsi === null ? 'N/A' : rsi.toFixed(1)}</div>
                    <div class="stat-desc">${rsiStatus}</div>
                </div>
                <div class="stat px-3 py-2">
                    <div class="stat-title text-xs">Current Price</div>
                    <div class="stat-value text-sm">$${holding.currentPrice.toFixed(2)}</div>
                </div>
                <div class="stat px-3 py-2">
                    <div class="stat-title text-xs">Shares</div>
                    <div class="stat-value text-sm">${holding.quantity.toFixed(2)}</div>
                </div>
            </div>

            <!-- Recommendation -->
            <div class="bg-base-300 rounded-box p-3">
                <div class="text-xs font-semibold uppercase tracking-widest opacity-60 mb-1">Recommendation</div>
                <div class="text-sm leading-relaxed whitespace-pre-wrap">${analysis.recommendation}</div>
            </div>

            <!-- News -->
            <div>
                <div class="text-xs font-semibold uppercase tracking-widest opacity-60 mb-2">Recent News (${sortedNews.length})</div>
                <div class="flex flex-col divide-y divide-base-300" data-symbol="${symbol}">
                    ${newsHTML}
                    ${hiddenCount > 0 ? `<div class="show-more-news btn btn-ghost btn-xs mt-2 w-full" data-symbol="${symbol}">+ ${hiddenCount} more article${hiddenCount > 1 ? 's' : ''}</div>` : ''}
                </div>
            </div>
        </div>
    `;

    return card;
}

function attachShowMoreListeners() {
    const showMoreButtons = document.querySelectorAll('.show-more-news');

    showMoreButtons.forEach(button => {
        button.addEventListener('click', function() {
            const symbol = this.getAttribute('data-symbol');
            const newsList = document.querySelector(`.news-list[data-symbol="${symbol}"]`);
            const hiddenItems = newsList.querySelectorAll('.hidden-news-item');

            const isExpanded = this.classList.contains('expanded');

            if (isExpanded) {
                hiddenItems.forEach(item => {
                    item.style.display = 'none';
                });
                this.textContent = `+ ${hiddenItems.length} more article${hiddenItems.length > 1 ? 's' : ''}`;
                this.classList.remove('expanded');
            } else {
                hiddenItems.forEach(item => {
                    item.style.display = 'block';
                });
                this.textContent = '− SHOW LESS';
                this.classList.add('expanded');
            }
        });
    });
}

/* ===========================================================
   HISTORY ENHANCEMENTS (from history-enhancements.js)
=============================================================*/

function populateHistorySymbols() {
    const sel = document.getElementById('historySymbolSelect');
    authFetch('/api/hist/stats')
        .then(res => res.json())
        .then(json => {
            const symbols = json.symbols || [];
            if (sel && sel.options.length === 0) {
                const allOpt = document.createElement('option');
                allOpt.value = 'all';
                allOpt.textContent = 'All symbols';
                sel.appendChild(allOpt);
                symbols.forEach(s => {
                    const opt = document.createElement('option');
                    opt.value = s;
                    opt.textContent = s;
                    sel.appendChild(opt);
                });
            }
        })
        .catch(e => {
            console.warn('Could not populate history symbols', e);
        });
}

window.refreshHistoryChart = async function() {
    const symbol = (document.getElementById('historySymbolSelect') || { value: 'all' }).value;
    const days = parseInt((document.getElementById('historyRangeSelect') || { value: '30' }).value);
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - days);
    const params = new URLSearchParams();
    if (symbol && symbol !== 'all') params.set('symbol', symbol);
    params.set('from', from.toISOString());
    params.set('to', to.toISOString());

    try {
        const chartRes = await authFetch('/api/hist/chart?' + params.toString());
        const chartJson = await chartRes.json();

        const datasets = [];
        Object.keys(chartJson.data || {}).forEach((sym, idx) => {
            const color = idx % 2 === 0 ? '#3b82f6' : '#10b981';
            const dataPoints = chartJson.data[sym].map(pt => ({ x: new Date(pt.date), y: pt.currentPrice }));
            datasets.push({
                label: sym,
                data: dataPoints,
                borderColor: color,
                backgroundColor: color,
                tension: 0.2,
                pointRadius: 0
            });
        });

        const ctx = document.getElementById('historyChart').getContext('2d');
        if (window.historyChart) {
            window.historyChart.data.datasets = datasets;
            window.historyChart.update();
        } else {
            window.historyChart = new Chart(ctx, {
                type: 'line',
                data: { datasets },
                options: {
                    plugins: { legend: { position: 'bottom' }, tooltip: { mode: 'nearest' } },
                    scales: {
                        x: { type: 'time', time: { unit: 'day' } },
                        y: { beginAtZero: false }
                    }
                }
            });
        }

        const tableRes = await authFetch('/api/hist/recent?' + params.toString());
        const tableJson = await tableRes.json();
        const recentEl = document.getElementById('historyRecentEntries');
        if (recentEl) {
            let html = '<div style="display:grid; grid-template-columns:repeat(5, 1fr); gap:8px; font-weight:bold; padding:8px;">';
            html += '<div>Symbol</div><div>Date</div><div>Buy</div><div>Current</div><div>Δ</div></div>';
            tableJson.forEach(r => {
                html += `<div>${r.symbol}</div><div>${new Date(r.updatedAt).toLocaleString()}</div><div>${r.buyPrice.toFixed(2)}</div><div>${r.currentPrice.toFixed(2)}</div><div>${((r.currentPrice - r.buyPrice)).toFixed(2)}</div>`;
            });
            recentEl.innerHTML = html;
        }
    } catch (e) {
        console.error('Failed to refresh history chart', e);
    }
};

/* ===========================================================
   INITIALIZATION
=============================================================*/

(window.__pageInits = window.__pageInits || {}).investments = function () {
    requireAuth();
    populateHistorySymbols();
    // Re-initialize supporting modules (idempotent)
    if (typeof window.__advChartInit === 'function') window.__advChartInit();
    if (typeof window.__initTickerSearch === 'function') window.__initTickerSearch();
    if (typeof initPrivacy === 'function') initPrivacy();

    const savedTab = localStorage.getItem('investments_active_tab');
    const validTabs = ['stocks', 'stockhistory', 'research', 'fundamentals', 'dcf', 'screener'];
    switchInvestmentTab(validTabs.includes(savedTab) ? savedTab : 'stocks');

    // Register cleanup for when SPA-navigating away from this page
    window.__pageCleanup = function () {
        if (stocksRefreshInterval)  { clearInterval(stocksRefreshInterval);  stocksRefreshInterval  = null; }
        if (historyRefreshInterval) { clearInterval(historyRefreshInterval); historyRefreshInterval = null; }
        stopCountdown();
        if (typeof window.__advChartCleanup === 'function') window.__advChartCleanup();
        if (allocationChart)      { try { allocationChart.destroy();      } catch (_) {} allocationChart      = null; }
        if (historyChart)         { try { historyChart.destroy();         } catch (_) {} historyChart         = null; }
        if (portfolioValueChart)  { try { portfolioValueChart.destroy();  } catch (_) {} portfolioValueChart  = null; }
    };
};

// Cleanup on page leave
window.addEventListener('beforeunload', () => {
    if (stocksRefreshInterval) {
        clearInterval(stocksRefreshInterval);
    }
    if (historyRefreshInterval) {
        clearInterval(historyRefreshInterval);
    }
});
