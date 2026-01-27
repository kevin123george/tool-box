// ============================================
// ADVANCED STOCK CHART - Lightweight Charts Implementation
// Features: Candlesticks, Volume, Technical Indicators,
// Performance Metrics, Buy Point Markers, Interactive Crosshair
// ============================================

const API = '';

// Chart instances
let mainChart = null;
let candlestickSeries = null;
let volumeSeries = null;
let rsiChart = null;
let rsiSeries = null;
let macdChart = null;
let macdLineSeries = null;
let macdSignalSeries = null;
let macdHistogramSeries = null;

// Indicator series
let smaSeries = null;
let emaSeries = null;
let bbUpperSeries = null;
let bbLowerSeries = null;
let bbMiddleSeries = null;

// Buy point markers
let buyPointMarkers = [];

// Current data
let currentOHLCData = [];
let currentSymbol = '';
let currentRange = '1m';

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

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initializeAdvancedChart();
    loadSymbolsForFilter();
    setupRangeButtons();
});

async function initializeAdvancedChart() {
    const isDark = !document.body.classList.contains('light');
    const chartOptions = getChartOptions(isDark);

    // Initialize main candlestick chart
    const candlestickContainer = document.getElementById('candlestickChart');
    if (candlestickContainer) {
        mainChart = LightweightCharts.createChart(candlestickContainer, {
            ...chartOptions,
            height: 400
        });

        candlestickSeries = mainChart.addCandlestickSeries({
            upColor: '#00ff88',
            downColor: '#ff4444',
            borderUpColor: '#00ff88',
            borderDownColor: '#ff4444',
            wickUpColor: '#00ff88',
            wickDownColor: '#ff4444'
        });

        // Setup crosshair move handler
        mainChart.subscribeCrosshairMove(handleCrosshairMove);
    }

    // Initialize volume chart
    const volumeContainer = document.getElementById('volumeChart');
    if (volumeContainer) {
        const volumeChartInstance = LightweightCharts.createChart(volumeContainer, {
            ...chartOptions,
            height: 100
        });

        volumeSeries = volumeChartInstance.addHistogramSeries({
            color: '#26a69a',
            priceFormat: {
                type: 'volume'
            },
            priceScaleId: ''
        });

        // Sync time scale with main chart
        mainChart.timeScale().subscribeVisibleTimeRangeChange(() => {
            const range = mainChart.timeScale().getVisibleRange();
            if (range) {
                volumeChartInstance.timeScale().setVisibleRange(range);
            }
        });
    }
}

function getChartOptions(isDark) {
    return {
        layout: {
            background: { type: 'solid', color: isDark ? '#0a0a0a' : '#ffffff' },
            textColor: isDark ? '#d1d4dc' : '#191919'
        },
        grid: {
            vertLines: { color: isDark ? '#1a1a1a' : '#e1e1e1' },
            horzLines: { color: isDark ? '#1a1a1a' : '#e1e1e1' }
        },
        crosshair: {
            mode: LightweightCharts.CrosshairMode.Normal,
            vertLine: {
                width: 1,
                color: isDark ? '#505050' : '#9B9B9B',
                style: LightweightCharts.LineStyle.Dashed
            },
            horzLine: {
                width: 1,
                color: isDark ? '#505050' : '#9B9B9B',
                style: LightweightCharts.LineStyle.Dashed
            }
        },
        timeScale: {
            borderColor: isDark ? '#333' : '#ccc',
            timeVisible: true,
            secondsVisible: false
        },
        rightPriceScale: {
            borderColor: isDark ? '#333' : '#ccc'
        }
    };
}

// ============================================
// DATA LOADING
// ============================================

async function loadSymbolsForFilter() {
    try {
        const res = await fetch(`${API}/api/hist/stats`);
        const data = await res.json();

        const select = document.getElementById('histStockFilter');
        if (select && data.symbols) {
            select.innerHTML = '<option value="">Select Stock</option>';
            data.symbols.forEach(symbol => {
                const opt = document.createElement('option');
                opt.value = symbol;
                opt.textContent = symbol;
                select.appendChild(opt);
            });

            // Auto-select first symbol if available
            if (data.symbols.length > 0) {
                select.value = data.symbols[0];
                loadAdvancedChart();
            }
        }
    } catch (e) {
        console.warn('Could not load symbols:', e);
    }
}

async function loadAdvancedChart() {
    const symbol = document.getElementById('histStockFilter')?.value;
    if (!symbol) {
        showToast('Please select a stock symbol', 'error');
        return;
    }

    currentSymbol = symbol;
    const interval = document.getElementById('chartInterval')?.value || '1h';

    showLoading('Loading chart data...');

    try {
        // Load OHLC data
        const ohlcParams = new URLSearchParams();
        ohlcParams.set('interval', interval);
        addDateRangeParams(ohlcParams);

        const ohlcRes = await fetch(`${API}/api/hist/ohlc/${symbol}?${ohlcParams}`);
        const ohlcData = await ohlcRes.json();

        if (!ohlcData || ohlcData.length === 0) {
            hideLoading();
            showToast('No data available for this symbol', 'info');
            return;
        }

        currentOHLCData = ohlcData;

        // Format data for Lightweight Charts
        const candleData = ohlcData.map(d => ({
            time: Math.floor(new Date(d.time).getTime() / 1000),
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close
        }));

        const volumeData = ohlcData.map(d => ({
            time: Math.floor(new Date(d.time).getTime() / 1000),
            value: d.volume,
            color: d.close >= d.open ? '#00ff8840' : '#ff444440'
        }));

        // Update chart series
        if (candlestickSeries) {
            candlestickSeries.setData(candleData);
        }

        if (volumeSeries && indicatorStates.volume) {
            volumeSeries.setData(volumeData);
        }

        // Calculate and display indicators
        updateIndicators(candleData);

        // Load performance metrics
        loadPerformanceMetrics(symbol);

        // Load buy points
        if (indicatorStates.buypoints) {
            loadBuyPoints(symbol);
        }

        // Load history table
        loadHistoryTable(symbol);

        // Fit content
        if (mainChart) {
            mainChart.timeScale().fitContent();
        }

        hideLoading();

    } catch (error) {
        console.error('Error loading chart:', error);
        hideLoading();
        showToast('Failed to load chart data', 'error');
    }
}

function addDateRangeParams(params) {
    const now = new Date();
    let from = new Date();

    switch (currentRange) {
        case '1d':
            from.setDate(now.getDate() - 1);
            break;
        case '1w':
            from.setDate(now.getDate() - 7);
            break;
        case '1m':
            from.setMonth(now.getMonth() - 1);
            break;
        case '3m':
            from.setMonth(now.getMonth() - 3);
            break;
        case '6m':
            from.setMonth(now.getMonth() - 6);
            break;
        case '1y':
            from.setFullYear(now.getFullYear() - 1);
            break;
        case 'all':
            from = new Date(2020, 0, 1);
            break;
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
        const metrics = await res.json();

        // Update metrics display
        updateMetricDisplay('metricTotalReturn', metrics.totalReturn, '%', true);
        updateMetricDisplay('metricCAGR', metrics.cagr, '%', true);
        updateMetricDisplay('metricVolatility', metrics.volatility, '%');
        updateMetricDisplay('metricMaxDrawdown', metrics.maxDrawdownPercent, '%', true, true);
        updateMetricDisplay('metricSharpe', metrics.sharpeRatio, '', true);
        updateMetricDisplay('metricSortino', metrics.sortinoRatio, '', true);
        updateMetricDisplay('metricBeta', metrics.beta, '');
        updateMetricDisplay('metricAlpha', metrics.alpha, '%', true);
        updateMetricDisplay('metricHigh', metrics.highestPrice, '', false, false, true);
        updateMetricDisplay('metricLow', metrics.lowestPrice, '', false, false, true);
        updateMetricDisplay('metricCurrent', metrics.currentPrice, '', false, false, true);

        const tradingDaysEl = document.getElementById('metricTradingDays');
        if (tradingDaysEl) {
            tradingDaysEl.textContent = metrics.tradingDays || '--';
        }

    } catch (error) {
        console.error('Error loading metrics:', error);
    }
}

function updateMetricDisplay(elementId, value, suffix = '', colorize = false, invertColor = false, isCurrency = false) {
    const el = document.getElementById(elementId);
    if (!el) return;

    if (value === undefined || value === null || isNaN(value)) {
        el.textContent = '--';
        el.classList.remove('positive', 'negative');
        return;
    }

    let displayValue = isCurrency
        ? '$' + value.toFixed(2)
        : value.toFixed(2) + suffix;

    el.textContent = displayValue;

    if (colorize) {
        el.classList.remove('positive', 'negative');
        if (invertColor) {
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
    const closes = candleData.map(d => d.close);

    // SMA
    if (indicatorStates.sma) {
        const smaData = calculateSMA(candleData, 20);
        if (!smaSeries && mainChart) {
            smaSeries = mainChart.addLineSeries({
                color: '#2196F3',
                lineWidth: 2,
                title: 'SMA(20)'
            });
        }
        if (smaSeries) smaSeries.setData(smaData);
    } else if (smaSeries) {
        mainChart.removeSeries(smaSeries);
        smaSeries = null;
    }

    // EMA
    if (indicatorStates.ema) {
        const emaData = calculateEMA(candleData, 20);
        if (!emaSeries && mainChart) {
            emaSeries = mainChart.addLineSeries({
                color: '#FF9800',
                lineWidth: 2,
                title: 'EMA(20)'
            });
        }
        if (emaSeries) emaSeries.setData(emaData);
    } else if (emaSeries) {
        mainChart.removeSeries(emaSeries);
        emaSeries = null;
    }

    // Bollinger Bands
    if (indicatorStates.bb) {
        const bbData = calculateBollingerBands(candleData, 20, 2);

        if (!bbUpperSeries && mainChart) {
            bbUpperSeries = mainChart.addLineSeries({
                color: '#9C27B0',
                lineWidth: 1,
                lineStyle: LightweightCharts.LineStyle.Dashed
            });
            bbLowerSeries = mainChart.addLineSeries({
                color: '#9C27B0',
                lineWidth: 1,
                lineStyle: LightweightCharts.LineStyle.Dashed
            });
            bbMiddleSeries = mainChart.addLineSeries({
                color: '#9C27B0',
                lineWidth: 1
            });
        }

        if (bbUpperSeries) bbUpperSeries.setData(bbData.upper);
        if (bbLowerSeries) bbLowerSeries.setData(bbData.lower);
        if (bbMiddleSeries) bbMiddleSeries.setData(bbData.middle);
    } else {
        if (bbUpperSeries) { mainChart.removeSeries(bbUpperSeries); bbUpperSeries = null; }
        if (bbLowerSeries) { mainChart.removeSeries(bbLowerSeries); bbLowerSeries = null; }
        if (bbMiddleSeries) { mainChart.removeSeries(bbMiddleSeries); bbMiddleSeries = null; }
    }

    // RSI
    updateRSIChart(candleData);

    // MACD
    updateMACDChart(candleData);
}

function calculateSMA(data, period) {
    const result = [];
    for (let i = period - 1; i < data.length; i++) {
        let sum = 0;
        for (let j = 0; j < period; j++) {
            sum += data[i - j].close;
        }
        result.push({
            time: data[i].time,
            value: sum / period
        });
    }
    return result;
}

function calculateEMA(data, period) {
    const result = [];
    const multiplier = 2 / (period + 1);

    // Start with SMA for first value
    let sum = 0;
    for (let i = 0; i < period; i++) {
        sum += data[i].close;
    }
    let ema = sum / period;
    result.push({ time: data[period - 1].time, value: ema });

    // Calculate EMA for remaining values
    for (let i = period; i < data.length; i++) {
        ema = (data[i].close - ema) * multiplier + ema;
        result.push({ time: data[i].time, value: ema });
    }

    return result;
}

function calculateBollingerBands(data, period, stdDev) {
    const upper = [];
    const lower = [];
    const middle = [];

    for (let i = period - 1; i < data.length; i++) {
        let sum = 0;
        const values = [];
        for (let j = 0; j < period; j++) {
            sum += data[i - j].close;
            values.push(data[i - j].close);
        }
        const sma = sum / period;

        // Calculate standard deviation
        let sqSum = 0;
        for (const val of values) {
            sqSum += Math.pow(val - sma, 2);
        }
        const std = Math.sqrt(sqSum / period);

        middle.push({ time: data[i].time, value: sma });
        upper.push({ time: data[i].time, value: sma + stdDev * std });
        lower.push({ time: data[i].time, value: sma - stdDev * std });
    }

    return { upper, lower, middle };
}

function calculateRSI(data, period = 14) {
    const result = [];
    let gains = 0;
    let losses = 0;

    // Calculate initial average gain/loss
    for (let i = 1; i <= period; i++) {
        const change = data[i].close - data[i - 1].close;
        if (change > 0) gains += change;
        else losses -= change;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    // First RSI value
    let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    let rsi = 100 - (100 / (1 + rs));
    result.push({ time: data[period].time, value: rsi });

    // Calculate remaining RSI values
    for (let i = period + 1; i < data.length; i++) {
        const change = data[i].close - data[i - 1].close;
        let gain = change > 0 ? change : 0;
        let loss = change < 0 ? -change : 0;

        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;

        rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        rsi = 100 - (100 / (1 + rs));
        result.push({ time: data[i].time, value: rsi });
    }

    return result;
}

function calculateMACD(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    const fastEMA = calculateEMA(data, fastPeriod);
    const slowEMA = calculateEMA(data, slowPeriod);

    // Align the two EMAs
    const startIndex = slowPeriod - fastPeriod;
    const macdLine = [];

    for (let i = 0; i < slowEMA.length; i++) {
        const fastValue = fastEMA[i + startIndex]?.value;
        const slowValue = slowEMA[i]?.value;
        if (fastValue !== undefined && slowValue !== undefined) {
            macdLine.push({
                time: slowEMA[i].time,
                value: fastValue - slowValue,
                close: fastValue - slowValue
            });
        }
    }

    // Signal line (EMA of MACD)
    const signalLine = calculateEMA(macdLine, signalPeriod);

    // Histogram
    const histogram = [];
    const signalStartIndex = signalPeriod - 1;
    for (let i = 0; i < signalLine.length; i++) {
        const macdValue = macdLine[i + signalStartIndex]?.value;
        const signalValue = signalLine[i]?.value;
        if (macdValue !== undefined && signalValue !== undefined) {
            const diff = macdValue - signalValue;
            histogram.push({
                time: signalLine[i].time,
                value: diff,
                color: diff >= 0 ? '#00ff8880' : '#ff444480'
            });
        }
    }

    return {
        macd: macdLine.slice(signalStartIndex),
        signal: signalLine,
        histogram
    };
}

function updateRSIChart(candleData) {
    const rsiContainer = document.getElementById('rsiChart');
    if (!rsiContainer) return;

    if (indicatorStates.rsi) {
        rsiContainer.style.display = 'block';

        if (!rsiChart) {
            const isDark = !document.body.classList.contains('light');
            rsiChart = LightweightCharts.createChart(rsiContainer, {
                ...getChartOptions(isDark),
                height: 100
            });

            rsiSeries = rsiChart.addLineSeries({
                color: '#E91E63',
                lineWidth: 2,
                priceFormat: { type: 'price', precision: 2 }
            });

            // Add overbought/oversold lines
            rsiChart.addLineSeries({
                color: '#ff444440',
                lineWidth: 1,
                lineStyle: LightweightCharts.LineStyle.Dashed
            }).setData(candleData.map(d => ({ time: d.time, value: 70 })));

            rsiChart.addLineSeries({
                color: '#00ff8840',
                lineWidth: 1,
                lineStyle: LightweightCharts.LineStyle.Dashed
            }).setData(candleData.map(d => ({ time: d.time, value: 30 })));

            // Sync time scale
            mainChart.timeScale().subscribeVisibleTimeRangeChange(() => {
                const range = mainChart.timeScale().getVisibleRange();
                if (range && rsiChart) {
                    rsiChart.timeScale().setVisibleRange(range);
                }
            });
        }

        const rsiData = calculateRSI(candleData);
        if (rsiSeries) rsiSeries.setData(rsiData);

    } else {
        rsiContainer.style.display = 'none';
        if (rsiChart) {
            rsiChart.remove();
            rsiChart = null;
            rsiSeries = null;
        }
    }
}

function updateMACDChart(candleData) {
    const macdContainer = document.getElementById('macdChart');
    if (!macdContainer) return;

    if (indicatorStates.macd) {
        macdContainer.style.display = 'block';

        if (!macdChart) {
            const isDark = !document.body.classList.contains('light');
            macdChart = LightweightCharts.createChart(macdContainer, {
                ...getChartOptions(isDark),
                height: 100
            });

            macdHistogramSeries = macdChart.addHistogramSeries({
                priceFormat: { type: 'price', precision: 4 }
            });

            macdLineSeries = macdChart.addLineSeries({
                color: '#2196F3',
                lineWidth: 2
            });

            macdSignalSeries = macdChart.addLineSeries({
                color: '#FF9800',
                lineWidth: 2
            });

            // Sync time scale
            mainChart.timeScale().subscribeVisibleTimeRangeChange(() => {
                const range = mainChart.timeScale().getVisibleRange();
                if (range && macdChart) {
                    macdChart.timeScale().setVisibleRange(range);
                }
            });
        }

        const macdData = calculateMACD(candleData);
        if (macdLineSeries) macdLineSeries.setData(macdData.macd);
        if (macdSignalSeries) macdSignalSeries.setData(macdData.signal);
        if (macdHistogramSeries) macdHistogramSeries.setData(macdData.histogram);

    } else {
        macdContainer.style.display = 'none';
        if (macdChart) {
            macdChart.remove();
            macdChart = null;
            macdLineSeries = null;
            macdSignalSeries = null;
            macdHistogramSeries = null;
        }
    }
}

// ============================================
// BUY POINTS
// ============================================

async function loadBuyPoints(symbol) {
    try {
        const res = await fetch(`${API}/api/hist/buypoints/${symbol}`);
        const buyPoints = await res.json();

        // Clear existing markers
        buyPointMarkers.forEach(marker => marker.remove());
        buyPointMarkers = [];

        if (!indicatorStates.buypoints || !candlestickSeries) return;

        // Add markers to chart
        const markers = buyPoints.map(bp => ({
            time: Math.floor(new Date(bp.date).getTime() / 1000),
            position: 'belowBar',
            color: '#00ff88',
            shape: 'arrowUp',
            text: `Buy @ $${bp.price.toFixed(2)}`
        }));

        if (markers.length > 0) {
            candlestickSeries.setMarkers(markers);
        }

    } catch (error) {
        console.error('Error loading buy points:', error);
    }
}

// ============================================
// CROSSHAIR HANDLER
// ============================================

function handleCrosshairMove(param) {
    if (!param.time || !param.seriesData) {
        return;
    }

    const data = param.seriesData.get(candlestickSeries);
    if (!data) return;

    const dateEl = document.getElementById('crosshairDate');
    const openEl = document.getElementById('crosshairOpen');
    const highEl = document.getElementById('crosshairHigh');
    const lowEl = document.getElementById('crosshairLow');
    const closeEl = document.getElementById('crosshairClose');
    const volumeEl = document.getElementById('crosshairVolume');

    // Format date
    const date = new Date(param.time * 1000);
    if (dateEl) {
        dateEl.textContent = date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    if (openEl) openEl.textContent = '$' + data.open.toFixed(2);
    if (highEl) highEl.textContent = '$' + data.high.toFixed(2);
    if (lowEl) lowEl.textContent = '$' + data.low.toFixed(2);
    if (closeEl) {
        closeEl.textContent = '$' + data.close.toFixed(2);
        closeEl.style.color = data.close >= data.open ? '#00ff88' : '#ff4444';
    }

    // Find volume for this time
    const volumeData = currentOHLCData.find(d =>
        Math.floor(new Date(d.time).getTime() / 1000) === param.time
    );
    if (volumeEl && volumeData) {
        volumeEl.textContent = volumeData.volume.toFixed(0);
    }
}

// ============================================
// HISTORY TABLE
// ============================================

async function loadHistoryTable(symbol) {
    try {
        const params = new URLSearchParams();
        params.set('symbol', symbol);
        params.set('limit', '20');

        const res = await fetch(`${API}/api/hist/recent?${params}`);
        const data = await res.json();

        const container = document.getElementById('historyTable');
        if (!container) return;

        if (!data || data.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No history data available</p></div>';
            return;
        }

        let html = `
            <table style="width:100%; border-collapse:collapse; font-size:12px;">
                <thead>
                    <tr style="border-bottom:1px solid var(--border);">
                        <th style="text-align:left; padding:8px;">Date</th>
                        <th style="text-align:right; padding:8px;">Buy Price</th>
                        <th style="text-align:right; padding:8px;">Current</th>
                        <th style="text-align:right; padding:8px;">Change</th>
                        <th style="text-align:right; padding:8px;">%</th>
                    </tr>
                </thead>
                <tbody>
        `;

        data.forEach(record => {
            const change = record.currentPrice - record.buyPrice;
            const changePct = ((change / record.buyPrice) * 100).toFixed(2);
            const colorClass = change >= 0 ? 'positive' : 'negative';

            html += `
                <tr style="border-bottom:1px solid var(--border);">
                    <td style="padding:8px;">${new Date(record.updatedAt).toLocaleDateString()}</td>
                    <td style="text-align:right; padding:8px;">$${record.buyPrice.toFixed(2)}</td>
                    <td style="text-align:right; padding:8px;">$${record.currentPrice.toFixed(2)}</td>
                    <td style="text-align:right; padding:8px;" class="${colorClass}">$${change.toFixed(2)}</td>
                    <td style="text-align:right; padding:8px;" class="${colorClass}">${changePct}%</td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        container.innerHTML = html;

    } catch (error) {
        console.error('Error loading history table:', error);
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

    // Toggle volume chart visibility
    if (indicator === 'volume') {
        const volumeContainer = document.getElementById('volumeChart');
        if (volumeContainer) {
            volumeContainer.style.display = indicatorStates.volume ? 'block' : 'none';
        }
    }

    // Reload chart with updated indicators
    if (currentOHLCData.length > 0) {
        const candleData = currentOHLCData.map(d => ({
            time: Math.floor(new Date(d.time).getTime() / 1000),
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close
        }));
        updateIndicators(candleData);

        if (indicator === 'buypoints' && currentSymbol) {
            if (indicatorStates.buypoints) {
                loadBuyPoints(currentSymbol);
            } else {
                candlestickSeries?.setMarkers([]);
            }
        }
    }
}

function toggleFullscreen() {
    const container = document.getElementById('chartContainer');
    if (!container) return;

    container.classList.toggle('fullscreen');

    // Resize charts
    setTimeout(() => {
        if (mainChart) mainChart.applyOptions({ width: container.clientWidth - 40 });
    }, 100);
}

function exportChartImage() {
    if (!mainChart) return;

    // Use Lightweight Charts screenshot
    const canvas = document.querySelector('#candlestickChart canvas');
    if (canvas) {
        const link = document.createElement('a');
        link.download = `${currentSymbol}_chart_${new Date().toISOString().split('T')[0]}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        showToast('Chart exported successfully', 'success');
    }
}

// ============================================
// LEGACY COMPATIBILITY
// ============================================

// Keep these for backward compatibility with existing code
function loadStockHistory() {
    loadAdvancedChart();
}

function clearDateFilter() {
    currentRange = 'all';
    document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.range-btn[data-range="all"]')?.classList.add('active');
    loadAdvancedChart();
}

function changeChartType() {
    // Candlestick is the only type now
}

function setChartTimeRange(range) {
    currentRange = range;
    document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.range-btn[data-range="${range}"]`)?.classList.add('active');
    loadAdvancedChart();
}

// Refresh on theme change
const originalToggleMode = window.toggleMode;
window.toggleMode = function() {
    if (originalToggleMode) originalToggleMode();

    // Reinitialize charts with new theme
    setTimeout(() => {
        const isDark = !document.body.classList.contains('light');
        if (mainChart) {
            mainChart.applyOptions(getChartOptions(isDark));
        }
        if (rsiChart) {
            rsiChart.applyOptions(getChartOptions(isDark));
        }
        if (macdChart) {
            macdChart.applyOptions(getChartOptions(isDark));
        }
    }, 100);
};

// Export functions for global access
window.loadAdvancedChart = loadAdvancedChart;
window.toggleIndicator = toggleIndicator;
window.toggleFullscreen = toggleFullscreen;
window.exportChartImage = exportChartImage;
window.loadStockHistory = loadStockHistory;
window.clearDateFilter = clearDateFilter;
window.changeChartType = changeChartType;
window.setChartTimeRange = setChartTimeRange;
