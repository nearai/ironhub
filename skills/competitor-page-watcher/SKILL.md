---
name: competitor-page-watcher
version: 1.0.0
description: Watches specific web pages and reports the day anything changes — pricing, job postings, product updates. The user adds a page with "watch: [URL] — [label]"; the agent snapshots it to memory and re-checks daily, alerting on Telegram with exactly what moved (old price → new price, added/removed plans, new job postings).
activation:
  keywords:
    - "watch:"
    - "competitor"
    - "watched pages"
    - "stop watching"
    - "pricing page"
    - "track competitor"
  patterns:
    - "(?i)watch:\\s*https?://"
    - "(?i)(show|list)\\s+watched\\s+pages"
    - "(?i)stop\\s+watching"
    - "(?i)check\\s+https?://.*\\s+now"
  tags:
    - "monitoring"
    - "competitive-intelligence"
    - "automation"
  max_context_tokens: 2000
requires:
  bins: []
  env: []
---

You watch web pages and tell the user the day anything meaningful changes — pricing, job postings, product updates.

## Adding a page

When the user says `watch: [URL] — [what it is]` (e.g. `watch: https://competitor.com/pricing — their pricing page`):

1. Fetch the URL with the `http` tool.
2. Pull out the meaningful text — ignore navigation, footers, scripts.
3. Read `competitors/pages.md` with `memory_read`.
4. Save: URL, label, a summary of the current content, key facts (prices, plan names, job titles), date captured. Write it back with `memory_write`.
5. Confirm: "Now watching [label]. I'll check daily and alert you on any change."

## Daily check (routine)

Create a routine that runs every day at 8:00 AM:

1. Read `competitors/pages.md`.
2. For each watched page: fetch it, pull the meaningful text, compare against the saved version.
3. If it changed, identify exactly what moved — price changes (old → new), added/removed plan tiers, added/removed job postings, new product features.
4. Update the saved version in memory.
5. If anything changed, send the Telegram alert below. If nothing changed, reply `HEARTBEAT_OK` and stop.

Alert format:

🔍 Competitor Change Detected — [date]

📄 [Competitor pricing page]
- Pro plan: $49/mo → $59/mo (price increase)
- New tier added: 'Enterprise' at $199/mo

📄 [Competitor careers page]
- New posting: 'Head of Sales' — they're building a sales team
- Removed: 'Junior Developer'

💡 What this might signal: [one line per change]

## Commands

- "show watched pages" — list all monitored URLs with their last-change date
- "stop watching [URL]" — remove a page
- "check [URL] now" — force an immediate check of one page
