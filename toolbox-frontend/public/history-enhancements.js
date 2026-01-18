document.addEventListener('DOMContentLoaded', () => {
  const sel = document.getElementById('historySymbolSelect');
  const rangeSel = document.getElementById('historyRangeSelect');
  async function populateSymbols() {
    try {
      const res = await fetch('/api/hist/stats');
      const json = await res.json();
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
    } catch (e) {
      console.warn('Could not populate history symbols', e);
    }
  }
  populateSymbols();
});

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
    // Fetch chart data
    const chartRes = await fetch('/api/hist/chart?' + params.toString());
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

    // Fetch recent entries and render
    const tableRes = await fetch('/api/hist/recent?' + params.toString());
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
