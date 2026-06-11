### 1. Title

Decision Journal with Follow-up — Log decisions, get confronted with results later

### 2. Example prompt

You are my decision journal. Your job is to log my decisions and come back to me later with a reality check — because people remember their wins and forget their mistakes, and never actually learn from their own track record.

When I say "decision: [description] | check in [timeframe]" — for example:
"decision: rejected the job offer from company X, staying at current job | check in 3 months"
"decision: not buying the MacBook at $2000, waiting for a discount | check in 1 month"
"decision: I predict project Y shuts down within a year | check in 12 months"

1. Read memory at decisions/journal.md using memory_read
2. Add the decision with: description, date logged, follow-up date, status PENDING
3. Write back to memory and confirm: "Logged. I'll come back to you on [date] and we'll see how this aged."

Create a routine that runs every day at 10:00 AM:

1. Read all decisions from decisions/journal.md
2. Check if any decision's follow-up date is today or has passed
3. For each due decision, send a Telegram message:

"📓 Decision Follow-up

On [date] you decided:
'[exact decision text]'

It's been [X weeks/months]. Time for the verdict:
- Was this the right call?
- What actually happened?

Reply 'verdict: [right/wrong/mixed] — [short note]' and I'll log the outcome."

When I reply with a verdict:
1. Update the decision status to RESOLVED with the verdict and note
2. Recalculate my overall stats
3. Reply with my updated track record:

"Logged. Your track record so far:
✅ Right: [X] decisions
❌ Wrong: [X] decisions
➗ Mixed: [X] decisions

[If a pattern is visible:]
📊 Pattern: [e.g. 'your purchase-related decisions are right 80% of the time, but your predictions about people are mostly wrong']"

When I say "show my stats": display full track record grouped by decision type with hit rates.

If no follow-ups are due: reply HEARTBEAT_OK and stop.

### 3. What the agent does

You log any decision the moment you make it — career moves, purchases you skipped, predictions, second chances you gave people — along with when to check back. The agent stores it in memory and silently waits. When the follow-up date arrives, it sends you your own decision back, word for word, and asks for a verdict: was it right or wrong? Your answer goes into a growing track record.

Over months this builds something you cannot get any other way: honest statistics about your own judgment. The human brain remembers its wins and quietly buries its mistakes — that's why most people never improve their decision-making. The agent removes that bias: every logged decision gets a verdict day, and that day arrives whether you like it or not. After enough data it surfaces patterns: maybe your purchase decisions are right 80% of the time, but your predictions about people fail constantly. That's self-knowledge with receipts.

No external APIs, no crypto, no market data — this is a pure demonstration of what persistent memory plus scheduled routines make possible. A chatbot forgets your decision the moment the conversation ends. An agent holds you accountable to it months later.

### 4. Skills & tools used

- memory_read — reads the decision journal and track record from decisions/journal.md
- memory_write — logs new decisions, records verdicts, updates statistics
- time — timestamps each decision and calculates when follow-ups are due
- message — sends Telegram follow-up on the verdict date and track record updates
- routine/cron — checks daily at 10:00 AM whether any decision is due for review

### 5. Categories

- [x] Personal assistant
- [ ] Web 3 / Crypto
- [ ] Coding / dev workflow
- [ ] Research
- [ ] Marketing / content
- [ ] Business ops
- [ ] Sales / CRM
- [x] Files / knowledge
- [x] Automation
- [ ] Design / media
- [ ] Skill creation

### 6. Source (optional)

_No response_

### 7. Author (optional)

Evgeny
