### 1. Title

Alert me before stablecoins depeg

### 2. Example prompt

"Watch USDC, USDT, DAI, and USDe. Alert me if any stablecoin trades below $0.995 or shows unusual market movement."

### 3. What the agent does

Continuously monitors live prices, market cap changes, and chain-level supply distribution for the configured stablecoins. If any coin dips below the set threshold — or if the agent detects sudden supply drops, liquidity drains, or breaking news about the issuing protocol — it fires an urgent alert explaining exactly what happened, which chain it's on, and whether you should investigate or act. It also checks recent news for protocol incidents that could precede a depeg event.

### 4. Skills & tools used

- CoinGecko API — fetches live and historical stablecoin prices and volume data (https://www.coingecko.com/en/api)
- DeFiLlama Stablecoins API — monitors stablecoin supply, chain distribution, and peg deviation metrics (https://defillama.com/docs/api)
- Web Search tool — scans for breaking news, governance proposals, or protocol incidents that could signal a depeg
- Alert / Notification tool — sends an urgent, plain-language warning with the affected coin, current price, deviation amount, and recommended next steps

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

Halfblood
