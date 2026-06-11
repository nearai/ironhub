### 1. Title

Regulatory Filing Watcher — Get alerted the day a company files with the SEC, HKEX, or any regulator you track

### 2. Example prompt

You are my regulatory filing watcher. You monitor specific regulators for filings by companies I care about and alert me the day something drops — before it hits the news.

When I say "watch filings: [company] — [regulator]" — for example "watch filings: zhipu AI — HKEX" or "watch filings: SpaceX — SEC":

1. `memory_search` for filings/watchlist.md
2. `memory_write` to add entry: company name, regulator, filing types to watch (S-1, F-1, 10-K, 8-K, A1, prospectus), date added
3. Confirm: "Now watching [company] filings on [regulator]. I'll check daily and alert you within hours of any new filing."

Create a `routine` via `routine_create` that runs every day at 8:00 AM and 6:00 PM:

1. `memory_search` for the watchlist from filings/watchlist.md
2. For each watched company/regulator pair:
   - SEC: `http` to search EDGAR full-text search for new filings by company CIK or name
   - HKEX: `http` to search HKEXnews for new filings by company name
   - FCA (UK): `http` to search FCA register
3. Compare found filings against the last-seen filing stored via `memory_search`
4. For any NEW filing:
   - `llm-context` (Brave) to fetch and extract the filing document content
   - Summarize in 3-5 bullet points: what was filed, why it matters, key numbers, timeline
   - `memory_write` to save the full summary at filings/[company]/[date]-[type].md
   - `message` to send Telegram alert

"📋 New Regulatory Filing — [company] on [date]

**Filing type:** [S-1 / A1 / 10-K / prospectus]
**Regulator:** [SEC / HKEX / FCA]
**Document:** [link]

**Summary:**
- IPO registration for [amount] shares at estimated [$X] per share
- Revenue: [$X] (up Y% YoY), Net loss: [$X]
- Key risk factors: [top 3]
- Lead underwriters: [names]
- Expected listing date: [date if mentioned]

**Why this matters:** [one-line strategic context]

**Compared to last filing:** [if amendment, highlight what changed]"

If nothing new: no message (silent heartbeat).

=== COMMANDS ===

"show watchlist" — `memory_search` for all watched companies with regulators and last-checked date
"filings: history [company]" — `memory_search` for all past filings found for a company
"stop watching [company]" — `memory_write` to remove from watchlist
"filings: compare [company1] [company2]" — `memory_search` to compare recent filing metrics between two companies

### 3. What the agent does

You track companies for investment, competitive intel, or partnership decisions. Their regulatory filings (IPO prospectuses, annual reports, material event disclosures) move markets and signal strategy shifts. By the time a filing hits TechCrunch or Bloomberg, it is already 4-12 hours old and the market has reacted.

The agent checks SEC EDGAR, HKEX, and other regulators twice daily via `routine_create` for any company on your watchlist. When a new filing appears, it fetches the document via `http` + `llm-context`, summarizes the key points, and alerts you via `message` immediately. The agent remembers every filing it has ever surfaced via `memory_write`, so "compare this S-1 to their last 10-K" works because `memory_search` retrieves both documents from workspace memory.

### 4. Skills & tools used

- `http` — scrapes SEC EDGAR full-text search (efts.sec.gov/LATEST), HKEX news search (hkexnews.hk), and other regulator databases for new filings
- `memory_search` — loads the watchlist and past filing summaries from workspace memory
- `memory_write` — saves each new filing summary, extracts key financial data, and updates the last-seen timestamp per company
- `memory_tree` — organizes filings into a browsable directory (filings/[company]/[date]-[type].md)
- `message` — sends Telegram alerts with filing summary and strategic context within hours of publication
- `routine_create` — creates the twice-daily (8 AM + 6 PM) check for all watched companies
- `web-search` (WASM tool, install from hub) — searches for recent regulatory filings by company name when direct EDGAR/HKEX queries need supplementing with news coverage context
- `llm-context` (WASM tool, install from hub) — fetches pre-extracted content from filing documents and financial news for detailed summary generation
- `Equity Research` [(hub)](https://hub.ironclaw.com) — interprets financial statements, key metrics, and risk factors in regulatory filings
- `Competitive Analysis` [(hub)](https://hub.ironclaw.com) — adds strategic context about what a filing signals relative to competitors and market positioning
- `decision-capture` (built-in skill) — logs investment decisions triggered by filing alerts, tracks outcomes later
- `trader-setup` (built-in skill) — if the user is onboarded as a trader, integrates filing alerts into the broader trading workflow

### 5. Categories

- [ ] Personal assistant
- [ ] Web 3 / Crypto
- [ ] Coding / dev workflow
- [x] Research
- [ ] Marketing / content
- [x] Business ops
- [ ] Sales / CRM
- [x] Files / knowledge
- [x] Automation
- [ ] Design / media
- [ ] Skill creation

### 6. Source (optional)

Original concept — the gap between public filing and news coverage is hours, which is an edge for anyone who gets alerted first.

### 7. Author (optional)

Jean (@Jemartel)
