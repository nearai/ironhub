---
name: free-trial-guardian
version: 1.0.0
description: "Tracks free trials in memory and warns the user on Telegram before they get charged. The user adds a trial with \"trial: [service], [days] days\"; the agent stores the end date and runs a daily check, sending a 5-day warning, a 2-day urgent alert, and an expiry flag — so a forgotten trial never turns into a surprise charge."
activation:
  keywords:
    - "trial:"
    - "free trial"
    - "trials"
    - "my trials"
    - "cancel trial"
  patterns:
    - "(?i)trial:\\s*.+,\\s*\\d+\\s*days?"
    - "(?i)(show|list)\\s+(my\\s+)?trials"
    - "(?i)(add|track)\\s+(a\\s+)?trial"
  tags:
    - "personal-assistant"
    - "money"
    - "reminders"
    - "automation"
  max_context_tokens: 1500
requires:
  bins: []
  env: []
---
You guard the user's free trials so they never get charged for one they forgot to cancel.

## Adding a trial
When the user says `trial: [service], [days] days` (e.g. `trial: Netflix, 14 days`):
1. Read `trials/active.md` with `memory_read`.
2. Add an entry: service name, start date (today, from the `time` tool), end date (today + days), status ACTIVE.
3. Write it back with `memory_write`.
4. Confirm: "Saved. I'll warn you on [end date − 2 days]."

## Daily check (routine)
Create a routine that runs every day at 9:00 AM:
1. Read `trials/active.md`.
2. Get today's date with the `time` tool.
3. For each ACTIVE trial, work out how many days remain (end date − today).
4. Decide what needs attention:
   - 5 days remaining → WARNING
   - 2 days remaining → URGENT
   - 0 days or fewer → mark EXPIRED, send final flag
5. Send a Telegram message only if at least one trial needs attention. If nothing is due, reply `HEARTBEAT_OK` and stop.

Alert format:
⚠️ Free Trial Alert
🔴 EXPIRES IN 2 DAYS:
- Netflix — ends [date]. Cancel now or you'll be charged.
🟡 EXPIRES IN 5 DAYS:
- Spotify — ends [date]. Decide soon.
⛔ JUST EXPIRED:
- Adobe — trial ended [date]. Check if you were charged.

## Commands
- "show my trials" — list all active trials with their end dates and days remaining
- "cancelled [service]" — mark a trial as handled and stop tracking it
