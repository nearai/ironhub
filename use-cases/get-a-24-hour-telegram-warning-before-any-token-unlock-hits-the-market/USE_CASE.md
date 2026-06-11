### 1. Title

Get a 24-hour Telegram warning before any token unlock hits the market

### 2. Example prompt

Here is the AVAX (Avalanche) token unlock schedule:
- June 9, 2026 — 1,670,000 AVAX — ~$11.34M — 0.23% of total supply — Team/Investor vesting
- September 9, 2026 — 1,670,000 AVAX — ~$11.34M — 0.23% of total supply — Team/Investor vesting
- December 9, 2026 — 1,670,000 AVAX — ~$11.34M — 0.23% of total supply — Team/Investor vesting
- March 9, 2027 — 1,670,000 AVAX — ~$11.34M — 0.23% of total supply — Team/Investor vesting
- June 9, 2027 — 1,670,000 AVAX — ~$11.34M — 0.23% of total supply — Team/Investor vesting

Save each event to memory, show me a clean table with price impact verdict, and set up a daily routine that automatically pings me in Telegram 24 hours before any unlock — without me having to ask every time.

<img width="514" height="585" alt="Image" src="https://github.com/user-attachments/assets/dbada2a1-e96d-4adc-855f-17ebdc9be964" />

### 3. What the agent does

You paste the token's unlock schedule (copied from any source like DeFiLlama, Messari, or tokenomist) and the agent saves every event to its persistent memory with the date, token amount, USD value, and category.

A daily routine runs every morning automatically: it reads the full schedule, checks if any unlock is within the next 24 hours, and if so sends you a Telegram alert with the token name, exact date, amount, dollar value, percentage of total supply, and a short note on likely price impact. If nothing is coming up, it stays completely silent — no spam.

You can track multiple tokens by simply pasting their schedules the same way. The agent remembers everything across sessions and will keep alerting you through the full vesting period.

<img width="472" height="337" alt="Image" src="https://github.com/user-attachments/assets/95279092-ea7a-40fa-b764-eb6d20c02faa" />

### 4. Skills & tools used

- `memory_write` / `memory_read` (built-in) — saves each unlock event (date, token amount, USD value, category) and reads them back for the daily check → https://docs.ironclaw.com/capabilities/memory/memory
- `time` (built-in) — checks today's date and calculates hours until each unlock event
- `message` / Telegram channel (built-in) — sends the 24h unlock alert → https://docs.ironclaw.com/channels
- Routines / cron (built-in) — runs the daily check automatically at 9:00 AM UTC, no manual trigger needed → https://docs.ironclaw.com/capabilities/routines/cron
- Token unlock data (manual input or wishlist tool) — user pastes the schedule from free sources like DeFiLlama (https://defillama.com/unlocks), Messari (https://messari.io), or tokenomist (https://tokenomist.ai). For automatic fetching a dedicated unlock data tool would be needed — no free public API confirmed at time of writing.

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
