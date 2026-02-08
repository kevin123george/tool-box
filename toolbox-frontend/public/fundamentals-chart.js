// ============================================
// FUNDAMENTALS PRICE CHART - TradingView Lightweight Charts
// Separate instance for the Fundamentals tab
// ============================================

// Chart instances (prefixed with fund to avoid collisions)
let fundMainChart = null;
let fundCandlestickSeries = null;
let fundVolumeChart = null;
let fundVolumeSeries = null;
let fundChartsInitialized = false;

// Current state
let fundOHLCData = [];
let fundCurrentSymbol = '';
let fundCurrentPeriod = '6mo';
let fundCurrentInterval = '1d';

// Indicator states
const fundIndicatorStates = { sma: false, ema: false, bb: false };

// Indicator series
let fundSmaSeries = null;
let fundEmaSeries = null;
let fundBbUpperSeries = null;
let fundBbLowerSeries = null;
let fundBbMiddleSeries = null;

// ============================================
// INITIALIZATION
// ============================================

function initFundCharts() {
    if (typeof LightweightCharts === 'undefined') {
        console.error('[FundChart] LightweightCharts not loaded');
        return;
    }

    const container = document.getElementById('fundCandlestickChart');
    if (!container) return;

    // Destroy existing charts
    if (fundMainChart) { fundMainChart.remove(); fundMainChart = null; }
    if (fundVolumeChart) { fundVolumeChart.remove(); fundVolumeChart = null; }

    const isDark = isDarkTheme();

    const chartWidth = container.clientWidth > 50 ? container.clientWidth : 800;

    fundMainChart = LightweightCharts.createChart(container, {
        width: chartWidth,
        height: 350,
        layout: {
            background: { type: 'solid', color: isDark ? '#0a0a0a' : '#ffffff' },
            textColor: isDark ? '#d1d4dc' : '#191919'
        },
        grid: {
            vertLines: { color: isDark ? '#1a1a1a' : '#e1e1e1' },
            horzLines: { color: isDark ? '#1a1a1a' : '#e1e1e1' }
        },
        crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
        timeScale: { timeVisible: fundCurrentInterval !== '1d' && fundCurrentInterval !== '1wk', secondsVisible: false },
        rightPriceScale: { borderColor: isDark ? '#1a1a1a' : '#e1e1e1' }
    });

    fundCandlestickSeries = fundMainChart.addCandlestickSeries({
        upColor: '#00ff88',
        downColor: '#ff4444',
        borderUpColor: '#00ff88',
        borderDownColor: '#ff4444',
        wickUpColor: '#00ff88',
        wickDownColor: '#ff4444'
    });

    fundMainChart.subscribeCrosshairMove(handleFundCrosshairMove);

    // Volume chart
    const volContainer = document.getElementById('fundVolumeChart');
    if (volContainer) {
        fundVolumeChart = LightweightCharts.createChart(volContainer, {
            width: volContainer.clientWidth || chartWidth,
            height: 80,
            layout: {
                background: { type: 'solid', color: isDark ? '#0a0a0a' : '#ffffff' },
                textColor: isDark ? '#d1d4dc' : '#191919'
            },
            grid: {
                vertLines: { color: isDark ? '#1a1a1a' : '#e1e1e1' },
                horzLines: { color: isDark ? '#1a1a1a' : '#e1e1e1' }
            },
            rightPriceScale: { borderColor: isDark ? '#1a1a1a' : '#e1e1e1' }
        });

        fundVolumeSeries = fundVolumeChart.addHistogramSeries({
            color: '#26a69a',
            priceFormat: { type: 'volume' }
        });

        // Sync time scales
        fundMainChart.timeScale().subscribeVisibleTimeRangeChange(() => {
            try {
                const range = fundMainChart.timeScale().getVisibleRange();
                if (range && range.from && range.to && fundVolumeChart) {
                    fundVolumeChart.timeScale().setVisibleRange(range);
                }
            } catch (e) { /* ignore sync errors */ }
        });
    }

    fundChartsInitialized = true;
    setupFundRangeButtons();

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
        if (fundMainChart && container.clientWidth > 50) {
            fundMainChart.applyOptions({ width: container.clientWidth });
        }
        if (fundVolumeChart && volContainer && volContainer.clientWidth > 50) {
            fundVolumeChart.applyOptions({ width: volContainer.clientWidth });
        }
    });
    resizeObserver.observe(container);
}

// ============================================
// RANGE BUTTONS
// ============================================

function setupFundRangeButtons() {
    document.querySelectorAll('.fund-range-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.fund-range-btn').forEach(b => {
                b.style.background = '';
                b.style.color = '';
                b.classList.remove('active');
            });
            btn.style.background = '#39f';
            btn.style.color = '#000';
            btn.classList.add('active');

            fundCurrentPeriod = btn.dataset.period;
            fundCurrentInterval = btn.dataset.interval;

            if (fundCurrentSymbol) {
                loadFundPriceChart(fundCurrentSymbol);
            }
        });
    });
}

// ============================================
// DATA LOADING
// ============================================

async function loadFundPriceChart(symbol) {
    if (!symbol) return;
    fundCurrentSymbol = symbol.toUpperCase();

    if (!fundChartsInitialized) {
        initFundCharts();
    }
    if (!fundCandlestickSeries) return;

    // Update time visibility for intraday
    if (fundMainChart) {
        const timeVisible = fundCurrentInterval !== '1d' && fundCurrentInterval !== '1wk';
        fundMainChart.applyOptions({ timeScale: { timeVisible, secondsVisible: false } });
    }

    try {
        const url = `${API}/api/market/ohlc/${fundCurrentSymbol}?period=${fundCurrentPeriod}&interval=${fundCurrentInterval}`;
        const res = await fetch(url);
        if (!res.ok) {
            console.error('[FundChart] API error:', res.status);
            return;
        }

        const ohlcData = await res.json();
        if (!ohlcData || ohlcData.length === 0) {
            console.warn('[FundChart] No data for', fundCurrentSymbol);
            return;
        }

        fundOHLCData = ohlcData;

        // Format for Lightweight Charts
        const candleData = ohlcData
            .map(d => {
                let ts;
                if (d.time && d.time.includes('T')) {
                    // Intraday: use unix timestamp in seconds
                    ts = Math.floor(new Date(d.time).getTime() / 1000);
                } else {
                    // Daily: use date string directly (YYYY-MM-DD)
                    ts = d.time;
                }
                return {
                    time: ts,
                    open: d.open,
                    high: d.high,
                    low: d.low,
                    close: d.close
                };
            })
            .sort((a, b) => {
                if (typeof a.time === 'string') return a.time.localeCompare(b.time);
                return a.time - b.time;
            });

        fundCandlestickSeries.setData(candleData);

        // Volume
        if (fundVolumeSeries) {
            const volData = ohlcData
                .map(d => {
                    let ts;
                    if (d.time && d.time.includes('T')) {
                        ts = Math.floor(new Date(d.time).getTime() / 1000);
                    } else {
                        ts = d.time;
                    }
                    return {
                        time: ts,
                        value: d.volume || 0,
                        color: d.close >= d.open ? 'rgba(0,255,136,0.5)' : 'rgba(255,68,68,0.5)'
                    };
                })
                .sort((a, b) => {
                    if (typeof a.time === 'string') return a.time.localeCompare(b.time);
                    return a.time - b.time;
                });
            fundVolumeSeries.setData(volData);
        }

        // Update indicators
        updateFundIndicators(candleData);

        // Fit
        fundMainChart.timeScale().fitContent();
        if (fundVolumeChart) fundVolumeChart.timeScale().fitContent();

    } catch (e) {
        console.error('[FundChart] Error loading chart:', e);
    }
}

// ============================================
// CROSSHAIR
// ============================================

function handleFundCrosshairMove(param) {
    const infoEl = document.getElementById('fundCrosshairInfo');
    if (!infoEl) return;

    if (!param.time || !param.seriesData) {
        infoEl.textContent = '';
        return;
    }

    const data = param.seriesData.get(fundCandlestickSeries);
    if (!data) return;

    let dateStr;
    if (typeof param.time === 'object') {
        dateStr = `${param.time.year}-${String(param.time.month).padStart(2,'0')}-${String(param.time.day).padStart(2,'0')}`;
    } else {
        dateStr = new Date(param.time * 1000).toLocaleString();
    }

    const change = data.close - data.open;
    const changePct = ((change / data.open) * 100).toFixed(2);
    const changeColor = change >= 0 ? '#00ff88' : '#ff4444';
    const sign = change >= 0 ? '+' : '';

    infoEl.innerHTML = `${dateStr} | O: \u20AC${data.open.toFixed(2)} H: \u20AC${data.high.toFixed(2)} L: \u20AC${data.low.toFixed(2)} C: <span style="color:${changeColor}">\u20AC${data.close.toFixed(2)} (${sign}${changePct}%)</span>`;
}

// ============================================
// INDICATORS
// ============================================

function toggleFundIndicator(type) {
    fundIndicatorStates[type] = !fundIndicatorStates[type];

    // Update button style
    const btn = document.querySelector(`.fund-indicator-btn[data-indicator="${type}"]`);
    if (btn) {
        if (fundIndicatorStates[type]) {
            btn.style.background = '#39f';
            btn.style.color = '#000';
        } else {
            btn.style.background = '';
            btn.style.color = '';
        }
    }

    if (fundOHLCData.length > 0) {
        const candleData = fundOHLCData
            .map(d => {
                let ts;
                if (d.time && d.time.includes('T')) {
                    ts = Math.floor(new Date(d.time).getTime() / 1000);
                } else {
                    ts = d.time;
                }
                return { time: ts, open: d.open, high: d.high, low: d.low, close: d.close };
            })
            .sort((a, b) => {
                if (typeof a.time === 'string') return a.time.localeCompare(b.time);
                return a.time - b.time;
            });
        updateFundIndicators(candleData);
    }
}

function updateFundIndicators(candleData) {
    if (!fundMainChart || !candleData || candleData.length === 0) return;

    // SMA 20
    if (fundIndicatorStates.sma) {
        const smaData = fundCalcSMA(candleData, 20);
        if (!fundSmaSeries) {
            fundSmaSeries = fundMainChart.addLineSeries({ color: '#ff9800', lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
        }
        fundSmaSeries.setData(smaData);
    } else {
        if (fundSmaSeries) { fundMainChart.removeSeries(fundSmaSeries); fundSmaSeries = null; }
    }

    // EMA 20
    if (fundIndicatorStates.ema) {
        const emaData = fundCalcEMA(candleData, 20);
        if (!fundEmaSeries) {
            fundEmaSeries = fundMainChart.addLineSeries({ color: '#e040fb', lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
        }
        fundEmaSeries.setData(emaData);
    } else {
        if (fundEmaSeries) { fundMainChart.removeSeries(fundEmaSeries); fundEmaSeries = null; }
    }

    // Bollinger Bands (20, 2)
    if (fundIndicatorStates.bb) {
        const bb = fundCalcBollingerBands(candleData, 20, 2);
        if (!fundBbUpperSeries) {
            fundBbUpperSeries = fundMainChart.addLineSeries({ color: 'rgba(33,150,243,0.4)', lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
            fundBbLowerSeries = fundMainChart.addLineSeries({ color: 'rgba(33,150,243,0.4)', lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
            fundBbMiddleSeries = fundMainChart.addLineSeries({ color: 'rgba(33,150,243,0.6)', lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false });
        }
        fundBbUpperSeries.setData(bb.upper);
        fundBbLowerSeries.setData(bb.lower);
        fundBbMiddleSeries.setData(bb.middle);
    } else {
        if (fundBbUpperSeries) { fundMainChart.removeSeries(fundBbUpperSeries); fundBbUpperSeries = null; }
        if (fundBbLowerSeries) { fundMainChart.removeSeries(fundBbLowerSeries); fundBbLowerSeries = null; }
        if (fundBbMiddleSeries) { fundMainChart.removeSeries(fundBbMiddleSeries); fundBbMiddleSeries = null; }
    }
}

// ============================================
// TECHNICAL CALCULATIONS
// ============================================

function fundCalcSMA(data, period) {
    const result = [];
    for (let i = period - 1; i < data.length; i++) {
        let sum = 0;
        for (let j = 0; j < period; j++) sum += data[i - j].close;
        result.push({ time: data[i].time, value: sum / period });
    }
    return result;
}

function fundCalcEMA(data, period) {
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

function fundCalcBollingerBands(data, period, stdDev) {
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
