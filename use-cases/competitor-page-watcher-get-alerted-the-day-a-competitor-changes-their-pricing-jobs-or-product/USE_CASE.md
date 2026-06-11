### 1. Title

Competitor Page Watcher — Get alerted the day a competitor changes their pricing, jobs, or product

### 2. Example prompt

You are my competitor page watcher. You monitor specific web pages and tell me the day anything changes — pricing, job postings, product updates.

When I say "watch: [URL] — [what it is]" — for example "watch: https://competitor.com/pricing — their pricing page":
1. Fetch the URL using the http tool
2. Extract the meaningful text content (ignore navigation, footers, scripts)
3. Read memory at competitors/pages.md using memory_read
4. Save: URL, label, a summary of the current content, key facts (prices, plan names, job titles, etc.), date captured
5. Write back to memory
6. Confirm: "Now watching [label]. I'll check daily and alert you on any change."

Create a routine that runs every day at 8:00 AM:

1. Read memory at competitors/pages.md
2. For each watched page:
   - Fetch the current URL content
   - Extract meaningful text
   - Compare against the saved version in memory
3. If meaningful content changed, identify WHAT changed specifically:
   - Price changes (old value → new value)
   - New or removed plan tiers
   - New or removed job postings
   - New product features or announcements
4. Update the saved version in memory with the new content

5. If any page changed, send Telegram alert:

"🔍 Competitor Change Detected — [date]

📄 [Competitor pricing page]
Changed:
- Pro plan: $49/mo → $59/mo (price increase)
- New tier added: 'Enterprise' at $199/mo

📄 [Competitor careers page]
Changed:
- New posting: 'Head of Sales' — they're building a sales team
- Removed: 'Junior Developer'

💡 What this might signal: [one-line interpretation per change]"

6. If nothing changed on any page: reply HEARTBEAT_OK and stop.

=== COMMANDS ===

"show watched pages" — list all monitored URLs with last-change date
"stop watching [URL]" — remove a page from monitoring
"check [URL] now" — force an immediate check of one page

### 3. What the agent does

You give the agent a URL and what it represents — a competitor's pricing page, their careers page, a product changelog. It fetches the page, captures the current content into memory, and from then on checks it every morning. When something changes, you don't get a vague "this page updated" — the agent tells you exactly what moved: a plan that went from $49 to $59, a new "Head of Sales" role that signals they're building a sales team, a new feature shipped on their changelog.

This is competitive intelligence that normally requires someone manually visiting a dozen pages every week — and people never actually do it consistently. The agent does it daily without fail. A competitor raising prices is your opening to win deals on value; a competitor hiring in a new department tells you where they're expanding months before they announce it; a changelog update warns you what they're about to market against you. You find out the same day, not when a customer mentions it.

Each change also comes with a one-line read on what it might signal strategically. The agent holds the previous version of every page in memory, which is the whole point — change detection is impossible without remembering what "before" looked like, and that's exactly what a stateless chatbot can't do.

### 4. Skills & tools used

- http — fetches the current content of each watched competitor URL (works on any public page, no API key required)
- memory_read — reads the previously captured version of each page from competitors/pages.md
- memory_write — saves the current page snapshot and updates it after each detected change
- message — sends Telegram alert detailing exactly what changed on which page
- routine/cron — re-checks every watched page automatically each day at 8:00 AM

### 5. Categories

- [ ] Personal assistant
- [ ] Web 3 / Crypto
- [ ] Coding / dev workflow
- [x] Research
- [ ] Marketing / content
- [x] Business ops
- [ ] Sales / CRM
- [ ] Files / knowledge
- [x] Automation
- [ ] Design / media
- [ ] Skill creation

### 6. Source (optional)

_No response_

### 7. Author (optional)

Evgeny
