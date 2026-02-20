/* ===========================================================
   FUNDAMENTALS, DCF & SCREENER
   =============================================================*/

// Chart instances
let revenueChartInstance = null;
let epsChartInstance = null;
let fcfChartInstance = null;
let marginsChartInstance = null;
let dcfProjectionChartInstance = null;

// State
let lastDCFResult = null;

// getChartTextColor() is now defined in shared.js

// getChartGridColor() is now defined in shared.js

function chartDefaults() {
    const color = getChartTextColor();
    const grid = getChartGridColor();
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: { color, font: { family: 'monospace', size: 11 } }
            }
        },
        scales: {
            x: {
                ticks: { color, font: { family: 'monospace', size: 10 } },
                grid: { color: grid }
            },
            y: {
                ticks: { color, font: { family: 'monospace', size: 10 } },
                grid: { color: grid }
            }
        }
    };
}

function fmtNum(n) {
    if (n == null) return 'N/A';
    if (Math.abs(n) >= 1e12) return (n / 1e12).toFixed(2) + 'T';
    if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return typeof n === 'number' ? n.toFixed(2) : n;
}

function fmtPct(n) {
    if (n == null) return 'N/A';
    return (n * 100).toFixed(2) + '%';
}

function fmtRatio(n) {
    if (n == null) return 'N/A';
    return Number(n).toFixed(2);
}

/* ===========================================================
   TICKER SEARCH AUTOCOMPLETE (global — attaches to all [data-ticker-search] inputs)
   =============================================================*/

(function initTickerSearch() {
    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('input[data-ticker-search]').forEach(input => {
            const dropdown = input.parentElement.querySelector('.ticker-search-dropdown');
            if (!dropdown) return;

            let timer = null;
            let idx = -1;

            input.addEventListener('input', () => {
                clearTimeout(timer);
                const q = input.value.trim();
                if (q.length < 2) { dropdown.style.display = 'none'; idx = -1; return; }
                timer = setTimeout(() => _fetchTickerResults(input, dropdown, q, () => idx = -1), 300);
            });

            input.addEventListener('keydown', (e) => {
                if (dropdown.style.display === 'none') return;
                const items = dropdown.querySelectorAll('.ticker-item');
                if (!items.length) return;

                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    idx = Math.min(idx + 1, items.length - 1);
                    items.forEach((el, i) => el.classList.toggle('active', i === idx));
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    idx = Math.max(idx - 1, 0);
                    items.forEach((el, i) => el.classList.toggle('active', i === idx));
                } else if (e.key === 'Enter' && idx >= 0) {
                    e.preventDefault();
                    items[idx].click();
                } else if (e.key === 'Escape') {
                    dropdown.style.display = 'none';
                    idx = -1;
                }
            });

            document.addEventListener('click', (e) => {
                if (!input.contains(e.target) && !dropdown.contains(e.target)) {
                    dropdown.style.display = 'none';
                    idx = -1;
                }
            });
        });
    });

    async function _fetchTickerResults(input, dropdown, query, resetIdx) {
        try {
            const res = await authFetch(`${API}/api/market/search?q=${encodeURIComponent(query)}`);
            const results = await res.json();
            if (!results.length) { dropdown.style.display = 'none'; return; }
            resetIdx();
            dropdown.innerHTML = results.map(r =>
                `<div class="ticker-item" data-symbol="${r.symbol}">`
                + `<span><strong style="color:#39f;">${r.symbol}</strong> <span style="opacity:0.7;">${r.name}</span></span>`
                + `<span style="opacity:0.4; font-size:10px;">${r.exchange}</span>`
                + `</div>`
            ).join('');
            dropdown.style.display = 'block';

            dropdown.querySelectorAll('.ticker-item').forEach(el => {
                el.addEventListener('click', () => {
                    input.value = el.dataset.symbol;
                    dropdown.style.display = 'none';
                    resetIdx();
                    // Auto-trigger associated action if the input has one
                    _onTickerSelected(input);
                });
            });
        } catch (e) {
            console.error('Ticker search failed:', e);
            dropdown.style.display = 'none';
        }
    }

    function _onTickerSelected(input) {
        const id = input.id;
        if (id === 'fundamentalsSymbol') loadFundamentals();
        else if (id === 'dcfSymbol') loadDCFDefaults();
        else if (id === 'screenerAddSymbol') addScreenerSymbol();
    }
})();

/* ===========================================================
   FUNDAMENTALS TAB
   =============================================================*/

function onFundamentalsTabShown() {
    loadPortfolioForFundamentals();
}

async function loadPortfolioForFundamentals() {
    try {
        const res = await authFetch(`${API}/api/stocks`);
        const stocks = await res.json();
        const select = document.getElementById('fundamentalsPortfolio');
        const existing = select.value;
        select.innerHTML = '<option value="">-- From Portfolio --</option>';
        const symbols = [...new Set(stocks.filter(s => !s.sold).map(s => s.symbol))];
        symbols.sort().forEach(sym => {
            select.innerHTML += `<option value="${sym}">${sym}</option>`;
        });
        if (existing) select.value = existing;
    } catch (e) {
        console.error('Failed to load portfolio for fundamentals:', e);
    }
}

function loadFundamentalsFromPortfolio() {
    const sym = document.getElementById('fundamentalsPortfolio').value;
    if (sym) {
        document.getElementById('fundamentalsSymbol').value = sym;
        loadFundamentals();
    }
}

async function loadFundamentals() {
    const symbol = document.getElementById('fundamentalsSymbol').value.trim().toUpperCase();
    if (!symbol) { showToast('Enter a symbol', 'warning'); return; }

    showLoading('Loading fundamentals for ' + symbol + '...');
    document.getElementById('fundamentalsOverview').style.display = 'none';
    document.getElementById('fundamentalsEmpty').style.display = 'none';

    try {
        const [overviewRes, revenueRes, epsRes, fcfRes, marginsRes, ratiosRes] = await Promise.all([
            authFetch(`${API}/api/fundamentals/${symbol}/overview`),
            authFetch(`${API}/api/fundamentals/${symbol}/revenue`),
            authFetch(`${API}/api/fundamentals/${symbol}/eps`),
            authFetch(`${API}/api/fundamentals/${symbol}/fcf`),
            authFetch(`${API}/api/fundamentals/${symbol}/margins`),
            authFetch(`${API}/api/fundamentals/${symbol}/ratios`)
        ]);

        if (!overviewRes.ok) { showToast('Symbol not found or API error', 'error'); hideLoading(); return; }

        const overview = await overviewRes.json();
        const revenue = await revenueRes.json();
        const eps = await epsRes.json();
        const fcf = await fcfRes.json();
        const margins = await marginsRes.json();
        const ratios = await ratiosRes.json();

        renderOverview(overview);
        renderKeyRatios(ratios);
        renderRevenueChart(revenue);
        renderEPSChart(eps);
        renderFCFChart(fcf);
        renderMarginsChart(margins);

        document.getElementById('fundamentalsOverview').style.display = 'block';
        document.getElementById('fundamentalsPriceChart').style.display = 'block';
        if (typeof loadFundPriceChart === 'function') loadFundPriceChart(symbol);
    } catch (e) {
        showToast('Failed to load fundamentals: ' + e.message, 'error');
        document.getElementById('fundamentalsEmpty').style.display = 'block';
        document.getElementById('fundamentalsPriceChart').style.display = 'none';
    } finally {
        hideLoading();
    }
}

function renderOverview(o) {
    if (!o) return;
    document.getElementById('companyName').textContent = `${o.name} (${o.symbol})`;
    document.getElementById('companyMeta').textContent = `${o.exchange || ''} | ${o.sector || ''} | ${o.industry || ''}`;

    const cards = document.getElementById('overviewCards');
    cards.innerHTML = `
        <div class="stat-card"><div class="stat-label">Market Cap</div><div class="stat-value">\u20AC${fmtNum(o.marketCap)}</div></div>
        <div class="stat-card"><div class="stat-label">P/E Ratio</div><div class="stat-value">${fmtRatio(o.peRatio)}</div></div>
        <div class="stat-card"><div class="stat-label">EPS</div><div class="stat-value">\u20AC${fmtRatio(o.eps)}</div></div>
        <div class="stat-card"><div class="stat-label">Dividend Yield</div><div class="stat-value">${o.dividendYield != null ? (o.dividendYield * 100).toFixed(2) + '%' : 'N/A'}</div></div>
        <div class="stat-card"><div class="stat-label">52W High</div><div class="stat-value">\u20AC${fmtRatio(o.weekHigh52)}</div></div>
        <div class="stat-card"><div class="stat-label">52W Low</div><div class="stat-value">\u20AC${fmtRatio(o.weekLow52)}</div></div>
        <div class="stat-card"><div class="stat-label">Beta</div><div class="stat-value">${fmtRatio(o.beta)}</div></div>
        <div class="stat-card"><div class="stat-label">Analyst Target</div><div class="stat-value">\u20AC${fmtRatio(o.analystTargetPrice)}</div></div>
    `;
}

function renderKeyRatios(ratios) {
    const grid = document.getElementById('keyRatiosGrid');
    grid.innerHTML = `
        <div class="stat-card"><div class="stat-label">P/E</div><div class="stat-value">${fmtRatio(ratios.peRatio)}</div></div>
        <div class="stat-card"><div class="stat-label">PEG</div><div class="stat-value">${fmtRatio(ratios.pegRatio)}</div></div>
        <div class="stat-card"><div class="stat-label">P/B</div><div class="stat-value">${fmtRatio(ratios.pbRatio)}</div></div>
        <div class="stat-card"><div class="stat-label">P/S</div><div class="stat-value">${fmtRatio(ratios.psRatio)}</div></div>
        <div class="stat-card"><div class="stat-label">EV/EBITDA</div><div class="stat-value">${fmtRatio(ratios.evToEbitda)}</div></div>
        <div class="stat-card"><div class="stat-label">ROE</div><div class="stat-value">${fmtPct(ratios.roe)}</div></div>
        <div class="stat-card"><div class="stat-label">ROA</div><div class="stat-value">${fmtPct(ratios.roa)}</div></div>
        <div class="stat-card"><div class="stat-label">Profit Margin</div><div class="stat-value">${fmtPct(ratios.profitMargin)}</div></div>
        <div class="stat-card"><div class="stat-label">Op. Margin</div><div class="stat-value">${fmtPct(ratios.operatingMargin)}</div></div>
        <div class="stat-card"><div class="stat-label">D/E Ratio</div><div class="stat-value">${fmtRatio(ratios.debtToEquity)}</div></div>
        <div class="stat-card"><div class="stat-label">Current Ratio</div><div class="stat-value">${fmtRatio(ratios.currentRatio)}</div></div>
        <div class="stat-card"><div class="stat-label">Div Yield</div><div class="stat-value">${ratios.dividendYield != null ? (ratios.dividendYield * 100).toFixed(2) + '%' : 'N/A'}</div></div>
    `;
}

function renderRevenueChart(data) {
    const ctx = document.getElementById('revenueChart')?.getContext('2d');
    if (!ctx) return;
    if (revenueChartInstance) revenueChartInstance.destroy();

    const labels = data.map(d => d.date?.substring(0, 4) || '');
    revenueChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: 'Revenue', data: data.map(d => d.totalRevenue), backgroundColor: '#39f', borderColor: '#39f', borderWidth: 1 },
                { label: 'Net Income', data: data.map(d => d.netIncome), backgroundColor: '#0f0', borderColor: '#0f0', borderWidth: 1 }
            ]
        },
        options: {
            ...chartDefaults(),
            scales: {
                ...chartDefaults().scales,
                y: { ...chartDefaults().scales.y, ticks: { ...chartDefaults().scales.y.ticks, callback: v => '\u20AC' + fmtNum(v) } }
            }
        }
    });
}

function renderEPSChart(data) {
    const ctx = document.getElementById('epsChart')?.getContext('2d');
    if (!ctx) return;
    if (epsChartInstance) epsChartInstance.destroy();

    const labels = data.map(d => d.date || '');
    const reported = data.map(d => d.reportedEPS);
    const estimated = data.map(d => d.estimatedEPS);
    const colors = data.map(d => d.beat ? '#0f0' : '#f33');

    epsChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: 'Reported EPS', data: reported, backgroundColor: colors, borderColor: colors, borderWidth: 1 },
                { label: 'Estimated EPS', data: estimated, type: 'line', borderColor: '#f90', backgroundColor: 'transparent', borderWidth: 2, pointRadius: 3, pointBackgroundColor: '#f90' }
            ]
        },
        options: {
            ...chartDefaults(),
            scales: {
                ...chartDefaults().scales,
                y: { ...chartDefaults().scales.y, ticks: { ...chartDefaults().scales.y.ticks, callback: v => '\u20AC' + v.toFixed(2) } }
            }
        }
    });
}

function renderFCFChart(data) {
    const ctx = document.getElementById('fcfChart')?.getContext('2d');
    if (!ctx) return;
    if (fcfChartInstance) fcfChartInstance.destroy();

    const labels = data.map(d => d.date?.substring(0, 4) || '');
    fcfChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: 'Free Cash Flow', data: data.map(d => d.freeCashFlow), backgroundColor: data.map(d => (d.freeCashFlow || 0) >= 0 ? '#0f0' : '#f33'), borderWidth: 1 },
                { label: 'Operating CF', data: data.map(d => d.operatingCashflow), type: 'line', borderColor: '#39f', backgroundColor: 'transparent', borderWidth: 2, pointRadius: 3 }
            ]
        },
        options: {
            ...chartDefaults(),
            scales: {
                ...chartDefaults().scales,
                y: { ...chartDefaults().scales.y, ticks: { ...chartDefaults().scales.y.ticks, callback: v => '\u20AC' + fmtNum(v) } }
            }
        }
    });
}

function renderMarginsChart(data) {
    const ctx = document.getElementById('marginsChart')?.getContext('2d');
    if (!ctx) return;
    if (marginsChartInstance) marginsChartInstance.destroy();

    const history = data.history || [];
    const labels = history.map(d => d.date?.substring(0, 4) || '');

    marginsChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                { label: 'Gross Margin', data: history.map(d => d.grossMargin != null ? d.grossMargin * 100 : null), borderColor: '#39f', backgroundColor: 'transparent', borderWidth: 2, pointRadius: 3 },
                { label: 'Operating Margin', data: history.map(d => d.operatingMargin != null ? d.operatingMargin * 100 : null), borderColor: '#f90', backgroundColor: 'transparent', borderWidth: 2, pointRadius: 3 },
                { label: 'Net Margin', data: history.map(d => d.netMargin != null ? d.netMargin * 100 : null), borderColor: '#0f0', backgroundColor: 'transparent', borderWidth: 2, pointRadius: 3 }
            ]
        },
        options: {
            ...chartDefaults(),
            scales: {
                ...chartDefaults().scales,
                y: { ...chartDefaults().scales.y, ticks: { ...chartDefaults().scales.y.ticks, callback: v => v.toFixed(1) + '%' } }
            }
        }
    });
}

/* ===========================================================
   DCF TAB
   =============================================================*/

function onDCFTabShown() {
    // No auto-load needed
}

async function loadDCFDefaults() {
    const symbol = document.getElementById('dcfSymbol').value.trim().toUpperCase();
    if (!symbol) { showToast('Enter a symbol first', 'warning'); return; }

    showLoading('Loading defaults for ' + symbol + '...');
    try {
        const res = await authFetch(`${API}/api/dcf/defaults/${symbol}`);
        const defaults = await res.json();

        document.getElementById('dcfCompanyName').textContent = defaults.name || '';
        if (defaults.initialFCF != null) document.getElementById('dcfInitialFCF').value = Math.round(defaults.initialFCF);
        if (defaults.growthRate != null) document.getElementById('dcfGrowthRate').value = (defaults.growthRate * 100);
        if (defaults.discountRate != null) document.getElementById('dcfDiscountRate').value = (defaults.discountRate * 100);
        if (defaults.terminalGrowthRate != null) document.getElementById('dcfTerminalGrowth').value = (defaults.terminalGrowthRate * 100);
        if (defaults.projectionYears != null) document.getElementById('dcfYears').value = defaults.projectionYears;
        if (defaults.sharesOutstanding != null) document.getElementById('dcfShares').value = defaults.sharesOutstanding;
        if (defaults.currentPrice != null) document.getElementById('dcfCurrentPrice').value = defaults.currentPrice;

        showToast('Defaults loaded for ' + symbol, 'success');
    } catch (e) {
        showToast('Failed to load defaults: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
}

async function calculateDCF() {
    const symbol = document.getElementById('dcfSymbol').value.trim().toUpperCase();
    const initialFCF = parseFloat(document.getElementById('dcfInitialFCF').value);
    const growthRate = parseFloat(document.getElementById('dcfGrowthRate').value) / 100;
    const discountRate = parseFloat(document.getElementById('dcfDiscountRate').value) / 100;
    const terminalGrowthRate = parseFloat(document.getElementById('dcfTerminalGrowth').value) / 100;
    const projectionYears = parseInt(document.getElementById('dcfYears').value);
    const sharesOutstanding = parseInt(document.getElementById('dcfShares').value);
    const currentPrice = parseFloat(document.getElementById('dcfCurrentPrice').value) || null;

    if (!initialFCF || !growthRate || !discountRate || !projectionYears || !sharesOutstanding) {
        showToast('Please fill all required fields', 'warning');
        return;
    }

    showLoading('Calculating DCF...');
    try {
        const res = await authFetch(`${API}/api/dcf/calculate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol, initialFCF, growthRate, discountRate, terminalGrowthRate, projectionYears, sharesOutstanding, currentPrice })
        });

        const result = await res.json();
        lastDCFResult = result;
        renderDCFResult(result);
        document.getElementById('dcfResults').style.display = 'block';
        document.getElementById('dcfEmpty').style.display = 'none';
    } catch (e) {
        showToast('DCF calculation failed: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
}

function renderDCFResult(r) {
    // Verdict badge
    const verdict = document.getElementById('dcfVerdict');
    const verdictColors = { UNDERVALUED: '#0f0', FAIRLY_VALUED: '#f90', OVERVALUED: '#f33' };
    const verdictLabels = { UNDERVALUED: 'UNDERVALUED', FAIRLY_VALUED: 'FAIRLY VALUED', OVERVALUED: 'OVERVALUED' };
    verdict.textContent = verdictLabels[r.verdict] || r.verdict;
    verdict.style.color = '#000';
    verdict.style.background = verdictColors[r.verdict] || '#888';

    // Result cards
    const cards = document.getElementById('dcfResultCards');
    cards.innerHTML = `
        <div class="stat-card"><div class="stat-label">Intrinsic Value</div><div class="stat-value" style="color:#39f;">\u20AC${fmtRatio(r.intrinsicValue)}</div></div>
        <div class="stat-card"><div class="stat-label">Current Price</div><div class="stat-value">\u20AC${fmtRatio(r.currentPrice)}</div></div>
        <div class="stat-card"><div class="stat-label">Margin of Safety</div><div class="stat-value" style="color:${r.marginOfSafety > 0 ? '#0f0' : '#f33'};">${r.marginOfSafety != null ? r.marginOfSafety.toFixed(1) + '%' : 'N/A'}</div></div>
        <div class="stat-card"><div class="stat-label">Enterprise Value</div><div class="stat-value">\u20AC${fmtNum(r.enterpriseValue)}</div></div>
        <div class="stat-card"><div class="stat-label">PV of Cash Flows</div><div class="stat-value">\u20AC${fmtNum(r.totalPresentValue)}</div></div>
        <div class="stat-card"><div class="stat-label">Terminal PV</div><div class="stat-value">\u20AC${fmtNum(r.terminalPresentValue)}</div></div>
    `;

    // Projection chart
    renderDCFProjectionChart(r.projectedCashFlows || []);

    // Sensitivity table
    renderSensitivityTable(r);
}

function renderDCFProjectionChart(cashFlows) {
    const ctx = document.getElementById('dcfProjectionChart')?.getContext('2d');
    if (!ctx) return;
    if (dcfProjectionChartInstance) dcfProjectionChartInstance.destroy();

    dcfProjectionChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: cashFlows.map(cf => 'Year ' + cf.year),
            datasets: [
                { label: 'Projected FCF', data: cashFlows.map(cf => cf.projectedFCF), backgroundColor: '#39f', borderWidth: 1 },
                { label: 'Present Value', data: cashFlows.map(cf => cf.presentValue), backgroundColor: '#0f0', borderWidth: 1 }
            ]
        },
        options: {
            ...chartDefaults(),
            scales: {
                ...chartDefaults().scales,
                y: { ...chartDefaults().scales.y, ticks: { ...chartDefaults().scales.y.ticks, callback: v => '\u20AC' + fmtNum(v) } }
            }
        }
    });
}

function renderSensitivityTable(result) {
    const container = document.getElementById('dcfSensitivityTable');
    const inputs = result.inputs;
    if (!inputs) { container.innerHTML = ''; return; }

    const baseGrowth = inputs.growthRate;
    const baseDiscount = inputs.discountRate;
    const growthRates = [baseGrowth - 0.04, baseGrowth - 0.02, baseGrowth, baseGrowth + 0.02, baseGrowth + 0.04];
    const discountRates = [baseDiscount - 0.02, baseDiscount - 0.01, baseDiscount, baseDiscount + 0.01, baseDiscount + 0.02];

    let html = '<table style="width:100%; border-collapse:collapse; font-size:11px; font-family:monospace;">';
    html += '<thead><tr><th style="padding:6px; border:1px solid oklch(var(--b3));">Growth \\ WACC</th>';
    discountRates.forEach(dr => {
        html += `<th style="padding:6px; border:1px solid oklch(var(--b3)); text-align:center;">${(dr * 100).toFixed(1)}%</th>`;
    });
    html += '</tr></thead><tbody>';

    growthRates.forEach(gr => {
        html += `<tr><td style="padding:6px; border:1px solid oklch(var(--b3)); font-weight:bold;">${(gr * 100).toFixed(1)}%</td>`;
        discountRates.forEach(dr => {
            // Quick DCF recalc for sensitivity
            let fcf = inputs.initialFCF;
            let totalPV = 0;
            const years = inputs.projectionYears || 10;
            for (let y = 1; y <= years; y++) {
                fcf = fcf * (1 + gr);
                totalPV += fcf / Math.pow(1 + dr, y);
            }
            const termFCF = fcf * (1 + (inputs.terminalGrowthRate || 0.03));
            const termVal = termFCF / (dr - (inputs.terminalGrowthRate || 0.03));
            const termPV = termVal / Math.pow(1 + dr, years);
            const iv = (totalPV + termPV) / (inputs.sharesOutstanding || 1);

            const isBase = Math.abs(gr - baseGrowth) < 0.001 && Math.abs(dr - baseDiscount) < 0.001;
            const color = result.currentPrice ? (iv > result.currentPrice ? '#0f0' : '#f33') : getChartTextColor();
            html += `<td style="padding:6px; border:1px solid oklch(var(--b3)); text-align:center; color:${color}; ${isBase ? 'font-weight:bold; text-decoration:underline;' : ''}">\u20AC${iv.toFixed(2)}</td>`;
        });
        html += '</tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

/* ===========================================================
   SCREENER TAB
   =============================================================*/

let screenerPage = 0;

function onScreenerTabShown() {
    loadScreenerSectors();
    searchScreener();
}

async function loadScreenerSectors() {
    try {
        const res = await authFetch(`${API}/api/screener/sectors`);
        const sectors = await res.json();
        const select = document.getElementById('screenerSector');
        const current = select.value;
        select.innerHTML = '<option value="">All Sectors</option>';
        sectors.forEach(s => {
            select.innerHTML += `<option value="${s}">${s}</option>`;
        });
        if (current) select.value = current;
    } catch (e) {
        console.error('Failed to load sectors:', e);
    }
}

async function addScreenerSymbol() {
    const symbol = document.getElementById('screenerAddSymbol').value.trim().toUpperCase();
    if (!symbol) { showToast('Enter a symbol', 'warning'); return; }

    showLoading('Adding ' + symbol + ' to screener...');
    try {
        const res = await authFetch(`${API}/api/screener/add/${symbol}`, { method: 'POST' });
        if (!res.ok) { showToast('Failed to add symbol. It may not exist.', 'error'); return; }
        showToast(symbol + ' added to screener', 'success');
        document.getElementById('screenerAddSymbol').value = '';
        loadScreenerSectors();
        searchScreener();
    } catch (e) {
        showToast('Error adding symbol: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
}

async function searchScreener() {
    const params = new URLSearchParams();
    const sector = document.getElementById('screenerSector')?.value;
    const minPE = document.getElementById('screenerMinPE')?.value;
    const maxPE = document.getElementById('screenerMaxPE')?.value;
    const minCap = document.getElementById('screenerMinCap')?.value;
    const minDivYield = document.getElementById('screenerMinDivYield')?.value;
    const minROE = document.getElementById('screenerMinROE')?.value;
    const maxDE = document.getElementById('screenerMaxDE')?.value;
    const sortBy = document.getElementById('screenerSortBy')?.value;

    if (sector) params.set('sector', sector);
    if (minPE) params.set('minPE', minPE);
    if (maxPE) params.set('maxPE', maxPE);
    if (minCap) params.set('minMarketCap', minCap);
    if (minDivYield) params.set('minDividendYield', parseFloat(minDivYield) / 100);
    if (minROE) params.set('minROE', parseFloat(minROE) / 100);
    if (maxDE) params.set('maxDebtToEquity', maxDE);
    if (sortBy) params.set('sortBy', sortBy);
    params.set('sortDir', 'desc');
    params.set('page', screenerPage);
    params.set('size', 20);

    try {
        const res = await authFetch(`${API}/api/screener/search?${params.toString()}`);
        const data = await res.json();
        renderScreenerTable(data.content || []);
        renderScreenerPagination(data);
    } catch (e) {
        console.error('Screener search failed:', e);
    }
}

function renderScreenerTable(entries) {
    const tbody = document.getElementById('screenerTableBody');
    if (!entries.length) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:30px; opacity:0.5;">No results. Add symbols to the screener above.</td></tr>';
        return;
    }

    tbody.innerHTML = entries.map(e => `
        <tr style="border-bottom:1px solid oklch(var(--b3)); cursor:pointer;" onclick="navigateToFundamentals('${e.symbol}')">
            <td style="padding:8px 6px; font-weight:bold; color:#39f;">${e.symbol || ''}</td>
            <td style="padding:8px 6px;">${e.name ? e.name.substring(0, 25) : ''}</td>
            <td style="padding:8px 6px; font-size:11px;">${e.sector || ''}</td>
            <td style="padding:8px 6px; text-align:right;">\u20AC${fmtNum(e.marketCap)}</td>
            <td style="padding:8px 6px; text-align:right;">${fmtRatio(e.peRatio)}</td>
            <td style="padding:8px 6px; text-align:right;">\u20AC${fmtRatio(e.eps)}</td>
            <td style="padding:8px 6px; text-align:right;">${e.dividendYield != null ? (e.dividendYield * 100).toFixed(2) + '%' : 'N/A'}</td>
            <td style="padding:8px 6px; text-align:right;">${e.roe != null ? (e.roe * 100).toFixed(1) + '%' : 'N/A'}</td>
            <td style="padding:8px 6px; text-align:right;">${fmtRatio(e.debtToEquity)}</td>
            <td style="padding:8px 6px; text-align:right;">${e.profitMargin != null ? (e.profitMargin * 100).toFixed(1) + '%' : 'N/A'}</td>
        </tr>
    `).join('');
}

function renderScreenerPagination(data) {
    const container = document.getElementById('screenerPagination');
    if (!data.totalPages || data.totalPages <= 1) { container.innerHTML = ''; return; }

    let html = '';
    for (let i = 0; i < data.totalPages; i++) {
        const active = i === data.page ? 'background:oklch(var(--bc)); color:oklch(var(--b1));' : '';
        html += `<button class="btn" style="min-width:32px; ${active}" onclick="screenerPage=${i}; searchScreener();">${i + 1}</button>`;
    }
    container.innerHTML = html;
}

function navigateToFundamentals(symbol) {
    document.getElementById('fundamentalsSymbol').value = symbol;
    switchTab('fundamentals');
    loadFundamentals();
}
