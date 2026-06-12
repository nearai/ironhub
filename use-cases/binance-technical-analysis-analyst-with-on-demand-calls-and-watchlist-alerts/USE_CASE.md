### 1. Title

Binance technical-analysis analyst with on-demand calls and watchlist alerts

### 2. Example prompt

Give me a clean TA read on BTC (or any symbol I ask) with entry, stop loss, and take-profit — on demand or pushed to me when a strong setup appears on my watchlist.

### 3. What the agent does

On first run it asks the user which symbols to track in their watchlist (default BTC, user can add ETH, NEAR, etc.), which mode they want (on-demand only, scheduled alerts only, or both), and what alert threshold they care about (e.g. only STRONG BUY / STRONG SELL, or any non-neutral verdict). It stores those preferences. In on-demand mode, the user can ping the agent with any symbol and timeframe and gets a weighted multi-timeframe technical analysis with a clear verdict, suggested entry, stop loss, and take-profit, plus the indicators that drove the call. In scheduled mode, the agent runs on a routine, scans the user's watchlist, and pushes a short alert to the user's default output channel whenever a verdict crosses the configured threshold.

The output is written so a trader can act on it in under a minute.

### 4. Skills & tools used

- binance-ta-expert-v2 — run the multi-timeframe TA engine and produce entry / SL / TP and a verdict
- ta-engine-tool — fetch Binance Spot klines and compute indicators (the deterministic math behind the expert)
- routine-advisor — schedule the watchlist scan at the user's chosen cadence
- message — deliver on-demand reads and scheduled alerts to the user's default channel

### 5. Categories

- [ ] Personal assistant
- [x] Web 3 / Crypto
- [ ] Coding / dev workflow
- [x] Research
- [ ] Marketing / content
- [ ] Business ops
- [ ] Sales / CRM
- [ ] Files / knowledge
- [x] Automation
- [ ] Design / media
- [ ] Skill creation

### 6. Source (optional)

Inspired by Kent's request to turn the already-installed `binance-ta-expert-v2` skill into a concrete, reusable use case for the IronHub library.

### 7. Author (optional)

kent
