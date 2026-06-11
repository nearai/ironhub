### 1. Title

Daily Crypto Briefing — NEAR price, portfolio P&L and Reddit news every morning

### 2. Example prompt

You are my daily crypto briefing agent. Every morning at 9 AM UTC send me a Telegram digest.

Do the following steps:

1. Fetch NEAR price from CoinCap:
https://api.coincap.io/v2/assets/near-protocol
Extract: current price, 24h change %, 24h volume

2. Fetch prices for my other positions:
https://api.coincap.io/v2/assets/hyperliquid
https://api.coincap.io/v2/assets/zcash

3. Read my portfolio from memory at defi/portfolio.md using memory_read.
If file does not exist, create it with:
# My Portfolio
- NEAR: 1000 tokens, entry price $2.00
- HYPE: 50 tokens, entry price $50.00
- ZEC: 1 token, entry price $400.00

4. Fetch latest NEAR news from Reddit RSS:
https://www.reddit.com/r/nearprotocol/new.rss
Extract top 3 post titles.

5. Calculate P&L for each position:
- Current Value = holdings * current price
- P&L % = (current price - entry price) / entry price * 100

6. Send Telegram message in this format:

"🌅 Daily Crypto Briefing — [Date]

═══════════════════════════════════

📊 NEAR/USDT PRICE
NEAR: $[price] ([24h change]%)
24h Volume: $[volume]

═══════════════════════════════════

📰 TOP 3 NEAR NEWS (Reddit)
1. [title]
2. [title]
3. [title]

═══════════════════════════════════

💼 YOUR POSITIONS
Token | Entry | Current | Value | P&L
NEAR  | $2.00 | $[x]   | $[x]  | [x]%
HYPE  | $50   | $[x]   | $[x]  | [x]%
ZEC   | $400  | $[x]   | $[x]  | [x]%

📈 Total Invested: $[x]
📈 Current Value: $[x]
📈 Total P&L: $[x] ([x]%)

═══════════════════════════════════
🔔 Next briefing: Tomorrow 9 AM UTC"

Create a routine that runs every day at 9:00 AM UTC and executes this entire briefing automatically.

### 3. What the agent does

Every morning at 9 AM the agent fetches live prices for NEAR, HYPE, and ZEC from CoinCap (free, no API key), reads your portfolio positions from memory, and pulls the latest 3 posts from r/nearprotocol via RSS. It calculates real-time P&L for each position based on your entry prices, then sends a clean Telegram digest with price data, news headlines, and full portfolio performance. Your positions and entry prices are stored in persistent memory so you only set them up once.

<img width="457" height="406" alt="Image" src="https://github.com/user-attachments/assets/8b6546d8-56d9-4962-a696-5ff818c59661" />

### 4. Skills & tools used

- http — fetches live prices from CoinCap API at https://api.coincap.io/v2/assets/ (free, no API key required) and NEAR news from Reddit RSS at https://www.reddit.com/r/nearprotocol/new.rss (public, no auth required)
- memory_read — reads portfolio positions and entry prices from defi/portfolio.md
- memory_write — creates portfolio file on first run
- message — sends daily briefing to Telegram
- routine/cron — runs automatically every day at 9:00 AM UTC

### 5. Categories

- [x] Personal assistant
- [x] Web 3 / Crypto
- [ ] Coding / dev workflow
- [ ] Research
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
