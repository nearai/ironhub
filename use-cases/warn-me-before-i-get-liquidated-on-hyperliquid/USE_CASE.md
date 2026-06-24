### 1. Title

Warn me before I get liquidated on Hyperliquid

### 2. Example prompt

"Watch my Hyperliquid and margin positions. Alert me if my liquidation price gets too close."

### 3. What the agent does

Reads the user's public wallet positions on Hyperliquid using a read-only scanner — no private keys required. It monitors open perp positions, tracks the current mark price against each position's liquidation price, and calculates the margin ratio in real time. When any position's margin ratio falls below a configurable warning threshold (e.g. within 10% of liquidation), it fires an alert with the affected position, current price, liquidation price, and estimated time to liquidation at current trend. It can also suggest safer options (reduce size, add margin) but any transaction requires explicit user approval.

### 4. Skills & tools used

- Wallet Read-only Scanner — reads public wallet positions and open perp positions on Hyperliquid without requiring private keys
- Hyperliquid Position Monitor skill — tracks margin ratio, leverage, liquidation price, and unrealized PnL across all open positions; triggers alerts at configurable risk thresholds
- Price Data API — fetches live mark prices and funding rates to keep margin calculations current
- Alert tool — sends an urgent plain-language warning with position details, liquidation price, current margin ratio, and suggested actions

### 5. Categories

- [ ] Personal assistant
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

Halfblood
