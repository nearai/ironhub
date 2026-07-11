### 1. Title

Alert me when an Amazon item drops below my target price

### 2. Example prompt

"Track this Amazon listing for the Sony WH-1000XM5 and message me on Telegram the second it drops below $250 — and check every couple of hours during Prime Day so I don't miss it again."

### 3. What the agent does

The agent scrapes the product page with Firecrawl on a schedule you set, pulls the live price (including any coupon or "Prime deal" price), and compares it to your target. The moment the price is at or below your threshold, it sends a Telegram alert with the current price, how big the drop is versus the item's recent average, and a direct buy link. It keeps a small price-history log between runs, so it can flag "lowest in 30 days" and avoid pinging you on fake or trivial markdowns. During sale events like Prime Day it automatically bumps up the check frequency. It never buys anything for you — it just surfaces the deal so you decide.

### 4. Skills & tools used

- firecrawl — reliably scrapes JS-heavy Amazon product pages and returns clean, structured price data; generous free tier with no credit card required (https://www.firecrawl.dev, https://github.com/firecrawl/firecrawl-mcp-server)
- scheduled-tasks — runs the price check on a cadence (daily, hourly, or every couple of hours during Prime Day)
- telegram — delivers the price-drop alert straight to the user's phone (https://core.telegram.org/bots/api)
- price-history-log — stores each check so the agent detects genuine drops (lowest/average over time) instead of reacting to noise

### 5. Categories

- [x] Personal assistant
- [ ] Web 3 / Crypto
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
