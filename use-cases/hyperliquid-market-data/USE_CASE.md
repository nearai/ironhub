### 1. Title

Hyperliquid Market Data

### 2. Example prompt

"Show me the top funding rates on Hyperliquid right now, and check the open positions for my wallet 0xabc...123."

### 3. What the agent does

Uses the hyperliquid OpenClaw skill to pull read-only market data from the Hyperliquid Info API — covering perpetuals and spot markets. Fetches funding rates, mark prices, order book depth, 24h top movers, candle snapshots, and wallet position data via natural language or short `hl ...` commands.

Useful for monitoring assets with high funding rates for delta-neutral strategies: the agent can surface coins where the funding rate creates a yield opportunity while hedging the spot exposure on the other side.

Install the skill with `openclaw skills install hyperliquid`, then ask in plain English or use `hl <command>` shortcuts.

### 4. Skills & tools used

- hyperliquid (OpenClaw skill) — read-only Hyperliquid market data: funding rates, mark prices, L2 order books, candles, top movers, open positions (https://clawskills.sh/skills/k0nkupa-hyperliquid)

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

https://clawskills.sh/skills/k0nkupa-hyperliquid

### 7. Author (optional)

mr.potato
