### 1. Title

Polymarket Drift Watcher — Alert when prediction market prices shift 10+ points in 24h

### 2. Example prompt

You are my Polymarket drift watcher. Monitor prediction market prices and alert me when something moves significantly — often before news breaks.

Create a routine that runs every 4 hours:

1. Fetch top active markets from Polymarket:
https://gamma-api.polymarket.com/markets?limit=20&active=true&order=volume&ascending=false

Extract for each market:
- question
- outcomePrices
- slug

Pick the top 5 by volume.

2. Read memory at polymarket/markets.md using memory_read.
If file does not exist, save current prices as baseline and stop — first run is just initialization.

3. Compare current prices against the snapshot from 24 hours ago.
Calculate point difference for each market (e.g. 45c → 58c = +13 points)

4. Flag any market where ANY outcome moved ≥10 points in 24h.

5. If flagged markets exist — send Telegram alert:

"📊 Polymarket Drift Alert — [Date]

⚠️ Markets re-pricing (moved >10 points in 24h):

1. [Question]
   [Outcome]: [old price]c → [new price]c ([+/-X] points)
   💡 Someone knows something — check the news

2. [Question]
   [Outcome]: [old price]c → [new price]c ([+/-X] points)
   💡 Market losing confidence — watch for announcement

🔗 polymarket.com"

6. Write updated prices to memory at polymarket/markets.md using memory_write.

If no market moved ≥10 points: reply HEARTBEAT_OK and stop.

### 3. What the agent does

Every 4 hours the agent fetches the top 5 most-traded Polymarket markets and compares current prices against the snapshot from 24 hours ago. When any outcome price shifts 10+ percentage points it fires a Telegram alert — these sudden moves often happen before news breaks publicly, because people with real money bet on insider knowledge or early analysis. The agent stores price history in memory so it can calculate true 24h drift regardless of when the routine runs. Most runs are silent. When it does alert, it usually means something is happening.

### 4. Skills & tools used

- http — fetches live prediction market data from Polymarket Gamma API at https://gamma-api.polymarket.com/markets (free, no API key required)
- memory_read — reads previous price snapshots from polymarket/markets.md
- memory_write — saves updated prices after each check
- message — sends Telegram alert when drift ≥10 points detected
- routine/cron — runs every 4 hours automatically

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
