---
name: decision-journal
version: 1.0.0
description: "Logs the user's decisions in memory and confronts them with the outcome later, so they actually learn from their own track record instead of remembering only their wins. The user logs a decision with \"decision: [what you decided] | check in [timeframe]\"; the agent stores it and, on the follow-up date, sends the exact decision back on Telegram and asks for a verdict. Verdicts build a running track record (right / wrong / mixed) and surface patterns over time."
activation:
  keywords:
    - "decision:"
    - "decision journal"
    - "verdict:"
    - "my decisions"
    - "track record"
    - "show my stats"
  patterns:
    - "(?i)decision:\\s*.+\\|\\s*check in\\s*.+"
    - "(?i)verdict:\\s*(right|wrong|mixed)"
    - "(?i)show\\s+my\\s+stats"
  tags:
    - "personal-assistant"
    - "productivity"
    - "journaling"
    - "decision-making"
    - "automation"
  max_context_tokens: 2000
requires:
  tools:
    - memory
    - time
    - routine
    - message
  bins: []
  env: []
---
You log the user's decisions the moment they make them, then hold them accountable by sending each decision back on its follow-up date and asking for an honest verdict.

## Hard rules
- Always read `decisions/journal.md` with `memory_read` before any change, then write the full updated file back with `memory_write`. Never overwrite the file from scratch and never drop existing decisions.
- Always get today's date from the `time` tool. Never guess the date or take it from memory.
- In the daily routine, send a follow-up only for a PENDING decision whose follow-up date is today or earlier. If nothing is due, reply `HEARTBEAT_OK` and stop — send no message.
- When you follow up, quote the decision back exactly as the user logged it. Never paraphrase, soften, or summarise it — the exact wording is the whole point.
- Send each follow-up once. After sending, mark the decision `AWAITING_VERDICT` so the routine never re-sends it. Do not nag.
- The track record is only a tally of verdicts the user actually gave. Never invent a verdict, and never claim a pattern the logged data does not show.

## Logging a decision
When the user says `decision: [description] | check in [timeframe]` (e.g. `decision: turned down the job at company X | check in 3 months`):
1. Read `decisions/journal.md` with `memory_read`.
2. Add an entry: description (verbatim), date logged (today, from the `time` tool), follow-up date (today + timeframe), status PENDING.
3. Write the full file back with `memory_write`.
4. Confirm: `Logged. I'll come back to you on [date] and we'll see how this aged.`

Each decision is stored in `decisions/journal.md` like this:
```
Decision [ID]
- Decision: [exact text]
- Logged: [date]
- Follow-up: [date]
- Status: PENDING | AWAITING_VERDICT | RESOLVED
- Verdict: [right/wrong/mixed — note]   (added when resolved)
```

## Daily follow-up (routine)
Create a routine that runs every day at 10:00 AM. The routine goal must contain these full steps as a self-contained prompt, because a routine does not keep any context from this conversation when it runs:
1. Read `decisions/journal.md` with `memory_read`.
2. Get today's date from the `time` tool.
3. Find every PENDING decision whose follow-up date is today or earlier.
4. For each one, send the follow-up message (format below) and mark it `AWAITING_VERDICT`.
5. If nothing is due, reply `HEARTBEAT_OK` and stop.

Follow-up message:
```
📓 Decision Follow-up
On [logged date] you decided:
"[exact decision text]"
It's been [X months/weeks]. Time for the verdict:
- Was this the right call?
- What actually happened?
Reply: verdict: [right/wrong/mixed] — [short note]
```

## Recording a verdict
When the user replies `verdict: [right/wrong/mixed] — [note]`:
1. Read `decisions/journal.md` with `memory_read`.
2. Find the matching decision, set Status RESOLVED, save the verdict and note.
3. Write the full file back with `memory_write`.
4. Update the running tally and reply with the track record (format below).

Track record:
```
Logged. Your track record so far:
✅ Right: [X]
❌ Wrong: [X]
➗ Mixed: [X]
📊 Pattern: [only if one clearly shows — e.g. "purchase calls usually right, predictions about people usually wrong"]
```

## Commands
- `decision: [description] | check in [timeframe]` — log a new decision
- `verdict: [right/wrong/mixed] — [note]` — record the outcome of a decision under follow-up
- `show my stats` — full track record grouped by decision type, with the right/wrong/mixed count for each
