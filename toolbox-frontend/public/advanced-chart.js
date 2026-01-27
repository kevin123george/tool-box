// ============================================
// ADVANCED STOCK CHART - Lightweight Charts Implementation
// ============================================

const API = '';

// Chart instances
let mainChart = null;
let candlestickSeries = null;
let volumeChart = null;
let volumeSeries = null;

// Current state
let currentOHLCData = [];
let currentSymbol = '';
let currentRange = '1m';
let chartsInitialized = false;

// Indicator states
const indicatorStates = {
    sma: false,
    ema: false,
    bb: false,
    rsi: false,
    macd: false,
    volume: true,
    buypoints: true
};

// Indicator series
let smaSeries = null;
let emaSeries = null;
let bbUpperSeries = null;
let bbLowerSeries = null;
let bbMiddleSeries = null;

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('[AdvChart] DOMContentLoaded');

    // Add visible debug info to the page
    const debugInfo = document.createElement('div');
    debugInfo.id = 'chartDebug';
    debugInfo.style.cssText = 'position:fixed;bottom:10px;right:10px;background:#333;color:#0f0;padding:10px;font-size:11px;z-index:9999;max-width:300px;font-family:monospace;';
    debugInfo.innerHTML = 'Chart Debug: Loading...';
    document.body.appendChild(debugInfo);

    loadSymbolsForFilter();
    setupRangeButtons();
});

function updateDebug(msg) {
    const el = document.getElementById('chartDebug');
    if (el) el.innerHTML = 'Chart Debug:<br>' + msg;
    console.log('[AdvChart]', msg);
}

// Called when Stock History tab becomes visible
window.onStockHistoryTabShown = function() {
    console.log('[AdvChart] Tab shown');

    // Show loading message in chart container
    const chartDiv = document.getElementById('candlestickChart');
    if (chartDiv && !chartsInitialized) {
        chartDiv.innerHTML = '<div style="padding:20px;text-align:center;">Initializing chart...</div>';
    }

    // Small delay to ensure tab is fully visible
    setTimeout(() => {
        if (!chartsInitialized) {
            initializeCharts();
        }

        // Load data
        const symbol = document.getElementById('histStockFilter')?.value;
        console.log('[AdvChart] Current symbol in dropdown:', symbol);
        if (symbol) {
            loadAdvancedChart();
        } else {
            // Try to load symbols again if not loaded
            loadSymbolsForFilter().then(() => {
                const newSymbol = document.getElementById('histStockFilter')?.value;
                if (newSymbol) {
                    loadAdvancedChart();
                }
            });
        }
    }, 200);
};

function initializeCharts() {
    updateDebug('Initializing charts...');

    if (typeof LightweightCharts === 'undefined') {
        updateDebug('ERROR: LightweightCharts library not loaded!');
        const chartDiv = document.getElementById('candlestickChart');
        if (chartDiv) {
            chartDiv.innerHTML = '<div style="padding:20px;color:red;">Chart library failed to load. Please refresh.</div>';
        }
        return;
    }

    updateDebug('LightweightCharts version: ' + (LightweightCharts.version || 'unknown'));

    const container = document.getElementById('candlestickChart');
    if (!container) {
        updateDebug('ERROR: candlestickChart container not found!');
        return;
    }

    const isDark = !document.body.classList.contains('light');

    // Create main chart
    try {
        const chartWidth = container.clientWidth > 50 ? container.clientWidth : 800;
        updateDebug('Creating chart, width: ' + chartWidth);

        mainChart = LightweightCharts.createChart(container, {
            width: chartWidth,
            height: 400,
            layout: {
                background: { type: 'solid', color: isDark ? '#0a0a0a' : '#ffffff' },
                textColor: isDark ? '#d1d4dc' : '#191919'
            },
            grid: {
                vertLines: { color: isDark ? '#1a1a1a' : '#e1e1e1' },
                horzLines: { color: isDark ? '#1a1a1a' : '#e1e1e1' }
            },
            crosshair: {
                mode: LightweightCharts.CrosshairMode.Normal
            },
            timeScale: {
                timeVisible: true,
                secondsVisible: false
            }
        });

        candlestickSeries = mainChart.addCandlestickSeries({
            upColor: '#00ff88',
            downColor: '#ff4444',
            borderUpColor: '#00ff88',
            borderDownColor: '#ff4444',
            wickUpColor: '#00ff88',
            wickDownColor: '#ff4444'
        });

        // Crosshair handler
        mainChart.subscribeCrosshairMove(handleCrosshairMove);

        updateDebug('Main chart created successfully!');
        chartsInitialized = true;

    } catch (e) {
        updateDebug('ERROR creating chart: ' + e.message);
        container.innerHTML = '<div style="padding:20px;color:red;">Error creating chart: ' + e.message + '</div>';
    }

    // Create volume chart
    const volContainer = document.getElementById('volumeChart');
    if (volContainer && mainChart) {
        try {
            volumeChart = LightweightCharts.createChart(volContainer, {
                width: volContainer.clientWidth || 800,
                height: 100,
                layout: {
                    background: { type: 'solid', color: isDark ? '#0a0a0a' : '#ffffff' },
                    textColor: isDark ? '#d1d4dc' : '#191919'
                },
                grid: {
                    vertLines: { color: isDark ? '#1a1a1a' : '#e1e1e1' },
                    horzLines: { color: isDark ? '#1a1a1a' : '#e1e1e1' }
                }
            });

            volumeSeries = volumeChart.addHistogramSeries({
                color: '#26a69a',
                priceFormat: { type: 'volume' }
            });

            // Sync time scales
            mainChart.timeScale().subscribeVisibleTimeRangeChange(() => {
                const range = mainChart.timeScale().getVisibleRange();
                if (range && volumeChart) {
                    volumeChart.timeScale().setVisibleRange(range);
                }
            });

            console.log('[AdvChart] Volume chart created');
        } catch (e) {
            console.error('[AdvChart] Error creating volume chart:', e);
        }
    }
}

// ============================================
// DATA LOADING
// ============================================

async function loadSymbolsForFilter() {
    updateDebug('Loading symbols from API...');
    try {
        const res = await fetch(`${API}/api/hist/stats`);
        updateDebug('Stats response: ' + res.status);

        if (!res.ok) {
            updateDebug('ERROR: API returned ' + res.status);
            return;
        }

        const data = await res.json();
        updateDebug('Got data: ' + JSON.stringify(data).substring(0, 100));

        const select = document.getElementById('histStockFilter');
        if (!select) {
            updateDebug('ERROR: histStockFilter not found!');
            return;
        }

        if (!data.symbols) {
            updateDebug('ERROR: No symbols in response');
            return;
        }

        select.innerHTML = '<option value="">Select Stock</option>';

        // Convert to array
        let symbols;
        if (Array.isArray(data.symbols)) {
            symbols = data.symbols;
        } else if (typeof data.symbols === 'object') {
            symbols = Object.values(data.symbols);
        } else {
            symbols = [];
        }

        updateDebug('Found ' + symbols.length + ' symbols: ' + symbols.join(', '));

        symbols.forEach(symbol => {
            const opt = document.createElement('option');
            opt.value = symbol;
            opt.textContent = symbol;
            select.appendChild(opt);
        });

        if (symbols.length > 0) {
            select.value = symbols[0];
            currentSymbol = symbols[0];
            updateDebug('Selected: ' + symbols[0]);
        } else {
            updateDebug('No symbols available');
        }
    } catch (e) {
        updateDebug('ERROR: ' + e.message);
        console.error('[AdvChart] Error:', e);
    }
}

async function loadAdvancedChart() {
    const symbol = document.getElementById('histStockFilter')?.value;
    if (!symbol) {
        updateDebug('No symbol selected');
        return;
    }

    updateDebug('Loading chart for: ' + symbol);
    currentSymbol = symbol;

    // Ensure charts exist
    if (!chartsInitialized || !candlestickSeries) {
        updateDebug('Initializing charts...');
        initializeCharts();
        await new Promise(r => setTimeout(r, 100));
    }

    if (!candlestickSeries) {
        updateDebug('ERROR: Chart series not created!');
        return;
    }

    const interval = document.getElementById('chartInterval')?.value || '1h';

    try {
        showLoading('Loading chart data...');

        // Build URL with date range
        const params = new URLSearchParams();
        params.set('interval', interval);
        addDateRangeParams(params);

        const url = `${API}/api/hist/ohlc/${symbol}?${params}`;
        updateDebug('Fetching: ' + url);

        const res = await fetch(url);
        if (!res.ok) {
            updateDebug('ERROR: OHLC API returned ' + res.status);
            hideLoading();
            return;
        }

        const ohlcData = await res.json();
        updateDebug('Got ' + (ohlcData?.length || 0) + ' data points');

        if (!ohlcData || ohlcData.length === 0) {
            hideLoading();
            updateDebug('No OHLC data available for ' + symbol);
            showToast('No data available for ' + symbol, 'info');
            return;
        }

        currentOHLCData = ohlcData;

        // Format for Lightweight Charts (time must be in seconds, sorted ascending)
        const candleData = ohlcData
            .map(d => ({
                time: Math.floor(new Date(d.time).getTime() / 1000),
                open: d.open,
                high: d.high,
                low: d.low,
                close: d.close
            }))
            .sort((a, b) => a.time - b.time);

        console.log('[AdvChart] Formatted candle data sample:', candleData.slice(0, 2));

        // Set data
        candlestickSeries.setData(candleData);
        updateDebug('Chart data set! ' + candleData.length + ' candles');

        // Volume
        if (volumeSeries && indicatorStates.volume) {
            const volData = ohlcData
                .map(d => ({
                    time: Math.floor(new Date(d.time).getTime() / 1000),
                    value: d.volume || 1,
                    color: d.close >= d.open ? 'rgba(0,255,136,0.5)' : 'rgba(255,68,68,0.5)'
                }))
                .sort((a, b) => a.time - b.time);
            volumeSeries.setData(volData);
        }

        // Update indicators
        updateIndicators(candleData);

        // Fit content
        mainChart.timeScale().fitContent();
        if (volumeChart) volumeChart.timeScale().fitContent();

        // Load metrics
        loadPerformanceMetrics(symbol);

        // Load buy points
        if (indicatorStates.buypoints) {
            loadBuyPoints(symbol);
        }

        // Load table
        loadHistoryTable(symbol);

        hideLoading();
        updateDebug('SUCCESS! Chart loaded with ' + candleData.length + ' candles');

    } catch (e) {
        updateDebug('ERROR loading chart: ' + e.message);
        hideLoading();
        showToast('Failed to load chart: ' + e.message, 'error');
    }
}

function addDateRangeParams(params) {
    const now = new Date();
    let from = new Date();

    switch (currentRange) {
        case '1d': from.setDate(now.getDate() - 1); break;
        case '1w': from.setDate(now.getDate() - 7); break;
        case '1m': from.setMonth(now.getMonth() - 1); break;
        case '3m': from.setMonth(now.getMonth() - 3); break;
        case '6m': from.setMonth(now.getMonth() - 6); break;
        case '1y': from.setFullYear(now.getFullYear() - 1); break;
        case 'all': from = new Date(2020, 0, 1); break;
    }

    params.set('from', from.toISOString());
    params.set('to', now.toISOString());
}

// ============================================
// PERFORMANCE METRICS
// ============================================

async function loadPerformanceMetrics(symbol) {
    try {
        const params = new URLSearchParams();
        addDateRangeParams(params);

        const res = await fetch(`${API}/api/hist/metrics/${symbol}?${params}`);
        const m = await res.json();

        setMetric('metricTotalReturn', m.totalReturn, '%', true);
        setMetric('metricCAGR', m.cagr, '%', true);
        setMetric('metricVolatility', m.volatility, '%');
        setMetric('metricMaxDrawdown', m.maxDrawdownPercent, '%', true, true);
        setMetric('metricSharpe', m.sharpeRatio, '', true);
        setMetric('metricSortino', m.sortinoRatio, '', true);
        setMetric('metricBeta', m.beta, '');
        setMetric('metricAlpha', m.alpha, '%', true);
        setMetric('metricHigh', m.highestPrice, '', false, false, true);
        setMetric('metricLow', m.lowestPrice, '', false, false, true);
        setMetric('metricCurrent', m.currentPrice, '', false, false, true);

        const days = document.getElementById('metricTradingDays');
        if (days) days.textContent = m.tradingDays || '--';

    } catch (e) {
        console.error('[AdvChart] Error loading metrics:', e);
    }
}

function setMetric(id, value, suffix = '', colorize = false, invert = false, currency = false) {
    const el = document.getElementById(id);
    if (!el) return;

    if (value == null || isNaN(value)) {
        el.textContent = '--';
        el.className = 'metric-value';
        return;
    }

    el.textContent = currency ? ('$' + value.toFixed(2)) : (value.toFixed(2) + suffix);

    if (colorize) {
        el.className = 'metric-value';
        if (invert) {
            el.classList.add(value < 0 ? 'negative' : (value > 0 ? 'positive' : ''));
        } else {
            el.classList.add(value > 0 ? 'positive' : (value < 0 ? 'negative' : ''));
        }
    }
}

// ============================================
// TECHNICAL INDICATORS
// ============================================

function updateIndicators(candleData) {
    if (!mainChart || candleData.length < 20) return;

    // SMA
    if (indicatorStates.sma) {
        const smaData = calculateSMA(candleData, 20);
        if (!smaSeries) {
            smaSeries = mainChart.addLineSeries({ color: '#2196F3', lineWidth: 2 });
        }
        smaSeries.setData(smaData);
    } else if (smaSeries) {
        mainChart.removeSeries(smaSeries);
        smaSeries = null;
    }

    // EMA
    if (indicatorStates.ema) {
        const emaData = calculateEMA(candleData, 20);
        if (!emaSeries) {
            emaSeries = mainChart.addLineSeries({ color: '#FF9800', lineWidth: 2 });
        }
        emaSeries.setData(emaData);
    } else if (emaSeries) {
        mainChart.removeSeries(emaSeries);
        emaSeries = null;
    }

    // Bollinger Bands
    if (indicatorStates.bb) {
        const bb = calculateBollingerBands(candleData, 20, 2);
        if (!bbUpperSeries) {
            bbUpperSeries = mainChart.addLineSeries({ color: '#9C27B0', lineWidth: 1, lineStyle: 2 });
            bbLowerSeries = mainChart.addLineSeries({ color: '#9C27B0', lineWidth: 1, lineStyle: 2 });
            bbMiddleSeries = mainChart.addLineSeries({ color: '#9C27B0', lineWidth: 1 });
        }
        bbUpperSeries.setData(bb.upper);
        bbLowerSeries.setData(bb.lower);
        bbMiddleSeries.setData(bb.middle);
    } else {
        if (bbUpperSeries) { mainChart.removeSeries(bbUpperSeries); bbUpperSeries = null; }
        if (bbLowerSeries) { mainChart.removeSeries(bbLowerSeries); bbLowerSeries = null; }
        if (bbMiddleSeries) { mainChart.removeSeries(bbMiddleSeries); bbMiddleSeries = null; }
    }
}

function calculateSMA(data, period) {
    const result = [];
    for (let i = period - 1; i < data.length; i++) {
        let sum = 0;
        for (let j = 0; j < period; j++) sum += data[i - j].close;
        result.push({ time: data[i].time, value: sum / period });
    }
    return result;
}

function calculateEMA(data, period) {
    const result = [];
    const mult = 2 / (period + 1);

    let sum = 0;
    for (let i = 0; i < period; i++) sum += data[i].close;
    let ema = sum / period;
    result.push({ time: data[period - 1].time, value: ema });

    for (let i = period; i < data.length; i++) {
        ema = (data[i].close - ema) * mult + ema;
        result.push({ time: data[i].time, value: ema });
    }
    return result;
}

function calculateBollingerBands(data, period, stdDev) {
    const upper = [], lower = [], middle = [];

    for (let i = period - 1; i < data.length; i++) {
        let sum = 0;
        const values = [];
        for (let j = 0; j < period; j++) {
            sum += data[i - j].close;
            values.push(data[i - j].close);
        }
        const sma = sum / period;

        let sqSum = 0;
        for (const v of values) sqSum += Math.pow(v - sma, 2);
        const std = Math.sqrt(sqSum / period);

        middle.push({ time: data[i].time, value: sma });
        upper.push({ time: data[i].time, value: sma + stdDev * std });
        lower.push({ time: data[i].time, value: sma - stdDev * std });
    }
    return { upper, lower, middle };
}

// ============================================
// BUY POINTS
// ============================================

async function loadBuyPoints(symbol) {
    if (!candlestickSeries) return;

    try {
        const res = await fetch(`${API}/api/hist/buypoints/${symbol}`);
        const points = await res.json();

        if (!points || points.length === 0) {
            candlestickSeries.setMarkers([]);
            return;
        }

        const markers = points.map(p => ({
            time: Math.floor(new Date(p.date).getTime() / 1000),
            position: 'belowBar',
            color: '#00ff88',
            shape: 'arrowUp',
            text: 'Buy $' + (p.price?.toFixed(2) || '?')
        })).sort((a, b) => a.time - b.time);

        candlestickSeries.setMarkers(markers);
    } catch (e) {
        console.error('[AdvChart] Error loading buy points:', e);
    }
}

// ============================================
// CROSSHAIR
// ============================================

function handleCrosshairMove(param) {
    if (!param.time || !param.seriesData) return;

    const data = param.seriesData.get(candlestickSeries);
    if (!data) return;

    const date = new Date(param.time * 1000);

    const dateEl = document.getElementById('crosshairDate');
    if (dateEl) dateEl.textContent = date.toLocaleString();

    const openEl = document.getElementById('crosshairOpen');
    if (openEl) openEl.textContent = '$' + data.open.toFixed(2);

    const highEl = document.getElementById('crosshairHigh');
    if (highEl) highEl.textContent = '$' + data.high.toFixed(2);

    const lowEl = document.getElementById('crosshairLow');
    if (lowEl) lowEl.textContent = '$' + data.low.toFixed(2);

    const closeEl = document.getElementById('crosshairClose');
    if (closeEl) {
        closeEl.textContent = '$' + data.close.toFixed(2);
        closeEl.style.color = data.close >= data.open ? '#00ff88' : '#ff4444';
    }
}

// ============================================
// HISTORY TABLE
// ============================================

async function loadHistoryTable(symbol) {
    try {
        const res = await fetch(`${API}/api/hist/recent?symbol=${symbol}&limit=20`);
        const data = await res.json();

        const container = document.getElementById('historyTable');
        if (!container) return;

        if (!data || data.length === 0) {
            container.innerHTML = '<p style="opacity:0.5">No history data</p>';
            return;
        }

        let html = '<table style="width:100%;border-collapse:collapse;font-size:12px;">';
        html += '<tr style="border-bottom:1px solid var(--border)">';
        html += '<th style="text-align:left;padding:8px">Date</th>';
        html += '<th style="text-align:right;padding:8px">Buy</th>';
        html += '<th style="text-align:right;padding:8px">Current</th>';
        html += '<th style="text-align:right;padding:8px">Change</th>';
        html += '</tr>';

        data.forEach(r => {
            const change = r.currentPrice - r.buyPrice;
            const pct = ((change / r.buyPrice) * 100).toFixed(2);
            const cls = change >= 0 ? 'positive' : 'negative';

            html += `<tr style="border-bottom:1px solid var(--border)">`;
            html += `<td style="padding:8px">${new Date(r.updatedAt).toLocaleDateString()}</td>`;
            html += `<td style="text-align:right;padding:8px">$${r.buyPrice.toFixed(2)}</td>`;
            html += `<td style="text-align:right;padding:8px">$${r.currentPrice.toFixed(2)}</td>`;
            html += `<td style="text-align:right;padding:8px" class="${cls}">${change >= 0 ? '+' : ''}${change.toFixed(2)} (${pct}%)</td>`;
            html += `</tr>`;
        });

        html += '</table>';
        container.innerHTML = html;

    } catch (e) {
        console.error('[AdvChart] Error loading table:', e);
    }
}

// ============================================
// UI CONTROLS
// ============================================

function setupRangeButtons() {
    document.querySelectorAll('.range-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentRange = btn.dataset.range;
            loadAdvancedChart();
        });
    });
}

function toggleIndicator(indicator) {
    indicatorStates[indicator] = !indicatorStates[indicator];

    if (indicator === 'volume') {
        const vol = document.getElementById('volumeChart');
        if (vol) vol.style.display = indicatorStates.volume ? 'block' : 'none';
    }

    if (currentOHLCData.length > 0) {
        const candleData = currentOHLCData
            .map(d => ({
                time: Math.floor(new Date(d.time).getTime() / 1000),
                open: d.open, high: d.high, low: d.low, close: d.close
            }))
            .sort((a, b) => a.time - b.time);

        updateIndicators(candleData);

        if (indicator === 'buypoints') {
            if (indicatorStates.buypoints && currentSymbol) {
                loadBuyPoints(currentSymbol);
            } else if (candlestickSeries) {
                candlestickSeries.setMarkers([]);
            }
        }
    }
}

function toggleFullscreen() {
    const container = document.getElementById('chartContainer');
    if (container) {
        container.classList.toggle('fullscreen');
        setTimeout(() => {
            if (mainChart) mainChart.applyOptions({ width: container.clientWidth - 40 });
            if (volumeChart) volumeChart.applyOptions({ width: container.clientWidth - 40 });
        }, 100);
    }
}

function exportChartImage() {
    const canvas = document.querySelector('#candlestickChart canvas');
    if (canvas) {
        const link = document.createElement('a');
        link.download = `${currentSymbol}_chart.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        showToast('Chart exported', 'success');
    }
}

// ============================================
// LEGACY COMPATIBILITY
// ============================================

function loadStockHistory() {
    loadAdvancedChart();
}

function clearDateFilter() {
    currentRange = 'all';
    document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.range-btn[data-range="all"]')?.classList.add('active');
    loadAdvancedChart();
}

function setChartTimeRange(range) {
    currentRange = range;
    document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.range-btn[data-range="${range}"]`)?.classList.add('active');
    loadAdvancedChart();
}

function changeChartType() {}

// Global exports
window.loadAdvancedChart = loadAdvancedChart;
window.toggleIndicator = toggleIndicator;
window.toggleFullscreen = toggleFullscreen;
window.exportChartImage = exportChartImage;
window.loadStockHistory = loadStockHistory;
window.clearDateFilter = clearDateFilter;
window.setChartTimeRange = setChartTimeRange;
window.changeChartType = changeChartType;

// Handle window resize
window.addEventListener('resize', () => {
    if (!chartsInitialized) return;

    const container = document.getElementById('candlestickChart');
    if (container && mainChart) {
        const newWidth = container.clientWidth;
        if (newWidth > 50) {
            mainChart.applyOptions({ width: newWidth });
        }
    }

    const volContainer = document.getElementById('volumeChart');
    if (volContainer && volumeChart) {
        const newWidth = volContainer.clientWidth;
        if (newWidth > 50) {
            volumeChart.applyOptions({ width: newWidth });
        }
    }
});

console.log('[AdvChart] Script loaded');
