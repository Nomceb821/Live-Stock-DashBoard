# 📈 Terminal Pro — Live Stock Dashboard

A Bloomberg-style dark/neon stock market dashboard built with vanilla HTML, CSS, and JavaScript. Powered by the [Finnhub API](https://finnhub.io) for real-time quotes, candle charts, and company news.

![Dashboard Preview](preview.png)

---

## 🚀 Features

- **Live stock quotes** — real-time prices fetched from Finnhub and auto-refreshed every 30 seconds
- **Candlestick chart** — real OHLC data across 1D / 1W / 1M / 3M / 1Y ranges
- **Ticker tape** — scrolling live prices for all watchlist symbols
- **Market indices** — S&P 500, NASDAQ, and DOW JONES via ETF proxies (SPY, QQQ, DIA)
- **Watchlist** — 8 symbols with live price and % change; click any to load its chart
- **Market stats panel** — Open, High, Low, Prev Close, 52W High/Low
- **Live news feed** — latest company headlines from Finnhub, clickable to full articles
- **Market open/closed badge** — based on NYSE hours in EST
- **Responsive layout** — works on desktop and mobile

---

## 🛠️ Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Markup     | HTML5                               |
| Styling    | CSS3 (custom, no frameworks)        |
| Logic      | Vanilla JavaScript (ES6+)           |
| Charts     | [Chart.js 4.4.1](https://www.chartjs.org/) |
| Market Data| [Finnhub REST API](https://finnhub.io/docs/api) |

---

## 📁 Project Structure

```
stock-dashboard/
├── index.html   # Markup and layout
├── style.css    # All styles, dark theme, responsive rules
├── app.js       # API calls, chart logic, event handlers
└── README.md    # This file
```

---

## ⚙️ Setup & Usage

### 1. Clone the repository

```bash
git clone https://github.com/your-username/stock-dashboard.git
cd stock-dashboard
```

### 2. Get a free Finnhub API key

1. Go to [https://finnhub.io](https://finnhub.io) and sign up for free
2. Copy your API key from the dashboard

### 3. Add your API key

Open `app.js` and replace the key on line 7:

```js
const API_KEY = 'your_finnhub_api_key_here';
```

### 4. Open in browser

No build step needed — just open `index.html` directly:

```bash
open index.html
# or drag and drop into your browser
```

> For best results, serve it with a local server to avoid CORS issues:
> ```bash
> npx serve .
> # or
> python -m http.server 8080
> ```

---

## 📊 Tracked Symbols

| Symbol | Company      |
|--------|--------------|
| AAPL   | Apple Inc.   |
| MSFT   | Microsoft    |
| NVDA   | NVIDIA       |
| TSLA   | Tesla        |
| AMZN   | Amazon       |
| GOOGL  | Alphabet     |
| META   | Meta         |
| NFLX   | Netflix      |

To add or change symbols, edit the `WATCHLIST` array in `app.js`:

```js
const WATCHLIST = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'GOOGL', 'META', 'NFLX'];
```

---

## 🔑 Finnhub Free Tier Limits

| Endpoint        | Free Limit       |
|-----------------|------------------|
| Quote           | 60 calls/minute  |
| Candles         | 60 calls/minute  |
| Company News    | 60 calls/minute  |
| WebSocket       | Not included     |

> **Note:** Intraday (1D) candle data may be unavailable on the free tier. The dashboard automatically falls back to a simulated chart anchored to real open/high/low/close values from the quote endpoint.

---

## 🧩 Possible Enhancements

- [ ] Add WebSocket support for true real-time streaming (Finnhub paid tier)
- [ ] Add crypto prices (BTC, ETH) via Finnhub crypto endpoint
- [ ] Portfolio tracker with buy/sell entries and P&L calculation
- [ ] Dark/light theme toggle
- [ ] Export chart as PNG
- [ ] Search bar to look up any ticker symbol
- [ ] Earnings calendar integration

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

## 🙌 Acknowledgements

- [Finnhub](https://finnhub.io) for the free market data API
- [Chart.js](https://www.chartjs.org) for the charting library
- Inspired by Bloomberg Terminal UI design
