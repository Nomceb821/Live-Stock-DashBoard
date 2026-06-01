/* Terminal Pro — Live Stock Dashboard */

const API_KEY  = 'd8c8r0pr01qidic6s0k0d8c8r0pr01qidic6s0kg';
const BASE_URL = 'https://finnhub.io/api/v1';

const WATCHLIST = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'GOOGL', 'META', 'NFLX'];

const NAMES = {
  AAPL:  'Apple Inc.',
  MSFT:  'Microsoft',
  NVDA:  'NVIDIA',
  TSLA:  'Tesla',
  AMZN:  'Amazon',
  GOOGL: 'Alphabet',
  META:  'Meta',
  NFLX:  'Netflix'
};

const INDICES = [
  { valId: 'sp500val',  chgId: 'sp500chg',  sym: 'SPY' },
  { valId: 'nasdaqval', chgId: 'nasdaqchg', sym: 'QQQ' },
  { valId: 'dowval',    chgId: 'dowchg',    sym: 'DIA' }
];

let currentSym          = 'AAPL';
let currentRange        = 'D';
let chart               = null;
let chartResizeObserver = null;
let liveData            = {};

/* API Helpers */

async function fhFetch(path) {
  const res = await fetch(`${BASE_URL}${path}&token=${API_KEY}`);
  if (!res.ok) throw new Error(`Finnhub error: HTTP ${res.status}`);
  return res.json();
}

async function fetchQuote(sym) {
  try {
    return await fhFetch(`/quote?symbol=${sym}`);
  } catch (e) {
    console.warn(`Quote failed for ${sym}:`, e.message);
    return null;
  }
}


async function fetchNews(sym) {
  const to   = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  try {
    const data = await fhFetch(`/company-news?symbol=${sym}&from=${from}&to=${to}`);
    return Array.isArray(data) ? data.slice(0, 6) : [];
  } catch (e) {
    console.warn(`News fetch failed for ${sym}:`, e.message);
    return [];
  }
}

/* Formatting Utilities */

function fmt(n)    { return n != null ? '$' + Number(n).toFixed(2) : '--'; }
function pctClass(v) { return v > 0 ? 'up' : v < 0 ? 'down' : 'neutral'; }

function pctStr(v) {
  if (v == null) return '--';
  return (v > 0 ? '▲ +' : v < 0 ? '▼ ' : '') + Math.abs(v).toFixed(2) + '%';
}

/* Clock & Market Status */

function updateClock() {
  const now    = new Date();
  const timeNY = now.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour12: false });
  document.getElementById('clock').textContent = timeNY + ' EST';

  const dayNY  = now.toLocaleString('en-US', { timeZone: 'America/New_York', weekday: 'short' });
  const hourNY = parseInt(now.toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }));

  const isWeekend = dayNY === 'Sat' || dayNY === 'Sun';
  const isOpen    = !isWeekend && hourNY >= 9 && hourNY < 16;

  const badge = document.getElementById('mktStatus');
  badge.textContent = isOpen ? '● MARKET OPEN' : '● MARKET CLOSED';
  badge.className   = 'mkt-badge ' + (isOpen ? 'mkt-open' : 'mkt-closed');
}

/* Chart */

function buildSimulatedChart(quote, range) {
  const open  = quote.o  || quote.pc || quote.c;
  const high  = quote.h  || quote.c * 1.01;
  const low   = quote.l  || quote.c * 0.99;
  const close = quote.c;

  const config = {
    D:   { points: 28,  volatility: 0.25, labelFn: i => { const h = 9 + Math.floor(i * 7 / 28); const m = (i % 4) * 15; return `${h}:${m === 0 ? '00' : m}`; } },
    W:   { points: 35,  volatility: 0.40, labelFn: i => { const days = ['Mon','Tue','Wed','Thu','Fri']; return days[i % 5] + (i >= 5 ? ` W${Math.floor(i/5)+1}` : ''); } },
    M:   { points: 30,  volatility: 0.55, labelFn: i => `-${30 - i}d` },
    '3M':{ points: 60,  volatility: 0.70, labelFn: i => `-${90 - i * 1.5 | 0}d` },
    Y:   { points: 52,  volatility: 1.20, labelFn: i => { const d = new Date(); d.setDate(d.getDate() - (52 - i) * 7); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); } }
  };

  const { points: n, volatility, labelFn } = config[range] || config.D;
  const labels  = Array.from({ length: n }, (_, i) => labelFn(i));
  const spread  = high - low || close * 0.02;
  const seed    = range.charCodeAt(0) + Math.floor(close);

  function seededRand(i) {
    const x = Math.sin(seed + i) * 10000;
    return x - Math.floor(x);
  }

  const prices = [open];
  for (let i = 1; i < n - 1; i++) {
    const progress = i / n;
    const trend    = (close - open) * progress;
    const noise    = (seededRand(i) - 0.48) * spread * volatility;
    const clamped  = Math.min(high * 1.001, Math.max(low * 0.999, open + trend + noise));
    prices.push(parseFloat(clamped.toFixed(2)));
  }
  prices.push(close);

  renderChart(labels, prices, close >= open);
}


function renderChart(labels, prices, isUp) {
  const canvas    = document.getElementById('mainChart');
  const wrap      = canvas.parentElement;
  const ctx       = canvas.getContext('2d');
  const lineColor = isUp ? '#22c55e' : '#ef4444';

  if (chart) {
    chart.destroy();
    chart = null;
  }

  if (chartResizeObserver) {
    chartResizeObserver.disconnect();
    chartResizeObserver = null;
  }

  const wrapH = wrap.clientHeight || 220;
  const grad  = ctx.createLinearGradient(0, 0, 0, wrapH);
  grad.addColorStop(0, isUp ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: prices,
        borderColor: lineColor,
        borderWidth: 1.5,
        backgroundColor: grad,
        fill: true,
        pointRadius: 0,
        tension: 0.2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 300 },
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: '#0f172a',
          borderColor: '#1e2d40',
          borderWidth: 1,
          titleColor: '#94a3b8',
          bodyColor: '#e2e8f0',
          callbacks: { label: c => '$' + Number(c.raw).toFixed(2) }
        }
      },
      scales: {
        x: {
          ticks: { color: '#334155', font: { size: 10, family: 'Courier New' }, maxTicksLimit: 8, autoSkip: true },
          grid:  { color: '#0f1a2a' }
        },
        y: {
          ticks: { color: '#334155', font: { size: 10, family: 'Courier New' }, callback: v => '$' + Number(v).toFixed(0) },
          grid:  { color: '#0f1a2a' }
        }
      }
    }
  });

  chartResizeObserver = new ResizeObserver(() => {
    if (chart) chart.resize();
  });
  chartResizeObserver.observe(wrap);
}

/* Main Panel */

function updateMainPanel(sym) {
  const q = liveData[sym];
  if (!q || !q.c) return;

  const change = q.c - q.pc;
  const pct    = q.pc ? (change / q.pc * 100) : 0;
  const isUp   = change >= 0;

  document.getElementById('mainPrice').textContent = fmt(q.c);

  const chgEl         = document.getElementById('mainChange');
  chgEl.textContent   = (isUp ? '▲ +' : '▼ ') + Math.abs(change).toFixed(2) + ' (' + (isUp ? '+' : '') + pct.toFixed(2) + '%)';
  chgEl.className     = 'price-change ' + (isUp ? 'up' : 'down');

  document.getElementById('statOpen').textContent = fmt(q.o);
  document.getElementById('statHigh').textContent = fmt(q.h);
  document.getElementById('statLow').textContent  = fmt(q.l);
  document.getElementById('statPrev').textContent = fmt(q.pc);
  document.getElementById('stat52h').textContent  = q.hY ? fmt(q.hY) : '--';
  document.getElementById('stat52l').textContent  = q.lY ? fmt(q.lY) : '--';
}

async function loadMainChart(sym, range) {
  document.getElementById('mainPrice').textContent  = 'Loading...';
  document.getElementById('mainChange').textContent = '';

  let q = liveData[sym];
  if (!q || !q.c) {
    q = await fetchQuote(sym);
    if (q && q.c) liveData[sym] = q;
  }

  if (q && q.c) {
    buildSimulatedChart(q, range);
  } else {
    document.getElementById('mainPrice').textContent  = '--';
    document.getElementById('mainChange').textContent = 'Data unavailable';
  }

  updateMainPanel(sym);
}

/* Watchlist */

async function loadWatchlist() {
  const container = document.getElementById('watchlistItems');
  container.innerHTML = '<div class="loading-row">Fetching live prices...</div>';

  const quotes = await Promise.all(WATCHLIST.map(s => fetchQuote(s)));

  container.innerHTML = '';

  WATCHLIST.forEach((sym, i) => {
    const q = quotes[i];
    if (!q || !q.c) return;

    liveData[sym] = q;

    const pct  = q.pc ? ((q.c - q.pc) / q.pc * 100) : 0;
    const isUp = q.c >= q.pc;

    const div       = document.createElement('div');
    div.className   = 'wl-item';
    div.innerHTML   = `
      <div>
        <div class="wl-sym">${sym}</div>
        <div class="wl-name">${NAMES[sym] || sym}</div>
      </div>
      <div>
        <div class="wl-price ${isUp ? 'up' : 'down'}">${fmt(q.c)}</div>
        <div class="wl-chg  ${isUp ? 'up' : 'down'}">${isUp ? '▲ +' : '▼ '}${Math.abs(pct).toFixed(2)}%</div>
      </div>`;

    div.addEventListener('click', () => {
      currentSym = sym;
      document.querySelectorAll('#symTabs .tab').forEach(t => t.classList.toggle('active', t.dataset.sym === sym));
      updateMainPanel(sym);
      loadMainChart(sym, currentRange);
      loadNews(sym);
    });

    container.appendChild(div);
  });

  document.getElementById('lastUpdated').textContent = new Date().toLocaleTimeString();
}

/* Indices */

async function loadIndices() {
  for (const idx of INDICES) {
    const q = await fetchQuote(idx.sym);
    if (!q || !q.c) continue;

    const pct  = q.pc ? ((q.c - q.pc) / q.pc * 100) : 0;
    const isUp = pct >= 0;

    const valEl       = document.getElementById(idx.valId);
    valEl.textContent = fmt(q.c);
    valEl.className   = 'value ' + (isUp ? 'up' : 'down');

    const chgEl       = document.getElementById(idx.chgId);
    chgEl.textContent = pctStr(pct);
    chgEl.className   = 'change ' + pctClass(pct);
  }
}

/* Ticker Tape */

function buildTicker() {
  const syms = Object.keys(liveData);
  if (!syms.length) return;

  const items = syms.map(sym => {
    const q    = liveData[sym];
    const pct  = q.pc ? ((q.c - q.pc) / q.pc * 100) : 0;
    const isUp = pct >= 0;
    return `<span class="ticker-item">
      <span class="sym">${sym}</span>
      <span class="price">${fmt(q.c)}</span>
      <span class="${isUp ? 'up' : 'down'}">${isUp ? '▲' : '▼'}${Math.abs(pct).toFixed(2)}%</span>
    </span>`;
  }).join('');

  const el    = document.getElementById('ticker');
  el.innerHTML = items + items;
}

/* News Feed */

async function loadNews(sym) {
  const feed  = document.getElementById('newsFeed');
  feed.innerHTML = '<div class="loading-row">Fetching news...</div>';

  const news = await fetchNews(sym);
  feed.innerHTML = '';

  if (!news.length) {
    feed.innerHTML = '<div class="loading-row">No recent news found.</div>';
    return;
  }

  news.forEach(n => {
    const hoursAgo = Math.round((Date.now() / 1000 - n.datetime) / 3600);
    const timeStr  = hoursAgo < 1 ? 'just now'
                   : hoursAgo < 24 ? `${hoursAgo}h ago`
                   : `${Math.round(hoursAgo / 24)}d ago`;

    const headline = n.headline.length > 110 ? n.headline.slice(0, 110) + '...' : n.headline;

    const div     = document.createElement('div');
    div.className = 'news-item';
    div.innerHTML = `<span class="news-tag">${n.related || sym}</span>${headline}<span class="news-time">${timeStr}</span>`;
    div.addEventListener('click', () => window.open(n.url, '_blank'));
    feed.appendChild(div);
  });
}

/* Event Listeners */

document.querySelectorAll('#symTabs .tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#symTabs .tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    currentSym = btn.dataset.sym;
    updateMainPanel(currentSym);
    loadMainChart(currentSym, currentRange);
    loadNews(currentSym);
  });
});

document.querySelectorAll('#rangeTabs .range-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#rangeTabs .range-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    currentRange = btn.dataset.range;
    loadMainChart(currentSym, currentRange);
  });
});

document.getElementById('refreshBtn').addEventListener('click', async () => {
  await loadWatchlist();
  buildTicker();
  await loadIndices();
  await loadMainChart(currentSym, currentRange);
  await loadNews(currentSym);
});

/* Init */

async function init() {
  updateClock();
  setInterval(updateClock, 1000);

  await loadWatchlist();
  buildTicker();
  await loadIndices();
  await loadMainChart(currentSym, currentRange);
  await loadNews(currentSym);

  // Auto-refresh every 30 seconds
  setInterval(async () => {
    await loadWatchlist();
    buildTicker();
    updateMainPanel(currentSym);
    await loadIndices();
  }, 30000);
}

init();
