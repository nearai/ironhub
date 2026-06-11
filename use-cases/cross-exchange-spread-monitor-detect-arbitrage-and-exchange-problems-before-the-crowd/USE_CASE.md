### 1. Title

Cross-Exchange Spread Monitor — Detect arbitrage and exchange problems before the crowd

### 2. Example prompt

You are my cross-exchange spread monitor for NEAR. Alert me when price differences between exchanges exceed 1.5% — this signals either an arbitrage opportunity or problems on one of the exchanges.

Create a routine that runs every 2 hours:

1. Fetch NEAR price from 3 exchanges:

Binance:
https://api.binance.com/api/v3/ticker/price?symbol=NEARUSDT

Bybit:
https://api.bybit.com/v5/market/tickers?category=spot&symbol=NEARUSDT

Coinbase:
https://api.coinbase.com/v2/prices/NEAR-USD/spot

2. Calculate spread between every pair:
- Binance vs Bybit
- Binance vs Coinbase
- Bybit vs Coinbase

Spread % = (higher price - lower price) / lower price * 100

3. Read memory at spreads/history.md using memory_read.
If file does not exist, create it with today's first snapshot as baseline.

Append current snapshot:
- Timestamp
- All 3 prices
- Max spread % and which pair

4. If ANY spread >= 1.5%: send Telegram alert:

"⚡ NEAR Cross-Exchange Spread Alert

[EXCHANGE A]: $[price]
[EXCHANGE B]: $[price]
Spread: [X]%

[If one exchange is significantly higher:]
💡 [Exchange] premium — demand surge on that exchange OR withdrawal issues on the cheaper one. If withdrawals are paused somewhere, the price gap cannot be arbitraged away — that's why it persists. Check exchange status before trading.

[Arbitrage angle:]
💰 Theoretical arb: buy on [cheaper exchange] at $[X], sell on [expensive exchange] at $[X] = [X]% before fees

⏰ [timestamp]
Normal spread for NEAR: <0.5%"

5. Write updated snapshot to spreads/history.md using memory_write.

If all spreads < 1.5%: reply HEARTBEAT_OK and stop.

### 3. What the agent does

Every 2 hours the agent fetches the NEAR price simultaneously from Binance, Bybit, and Coinbase, and calculates the spread between every pair of exchanges. In a healthy market these prices stay within 0.5% of each other — arbitrage bots keep them aligned. When the spread exceeds 1.5%, something real is happening, and the agent alerts you in Telegram with two possible readings.

First reading: arbitrage opportunity — buy on the cheap exchange, sell on the expensive one, pocket the difference.

Second reading — and this is the more valuable one: a persistent spread often means withdrawals are paused or liquidity is broken on one of the exchanges. Arbitrageurs physically can't close the gap if they can't move funds. Historically, abnormal spreads appeared hours before public announcements of exchange problems (FTX, and several smaller exchanges showed exactly this pattern). The agent essentially gives you an early warning system for exchange failures — built from nothing but free public price feeds.

The agent also logs every snapshot to memory, building a spread history over time, so you can distinguish a one-time anomaly from a developing pattern. A chatbot can quote you three prices once; only an agent can watch them around the clock and know what "normal" looks like.

<img width="627" height="467" alt="Image" src="https://github.com/user-attachments/assets/1c8717c9-da75-426b-8d4e-a8c42b8b8b93" />

### 4. Skills & tools used

- http — fetches NEAR spot prices from 3 public exchange APIs: Binance at https://api.binance.com/api/v3/ticker/price, Bybit at https://api.bybit.com/v5/market/tickers, Coinbase at https://api.coinbase.com/v2/prices/NEAR-USD/spot (all free, no API keys required)
- memory_read — reads spread history from spreads/history.md
- memory_write — appends timestamped snapshots to build spread baseline over time
- message — sends Telegram alert only when spread exceeds 1.5%
- routine/cron — runs the check automatically every 2 hours

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

_No response_

### 7. Author (optional)

Evgeny
