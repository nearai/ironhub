---
name: time-capsule
version: 1.0.0
description: "Stores messages and yearly self-interviews in memory and delivers them back to the user on Telegram on a future date they choose — months or years later — so their past self speaks to their future self, unedited. The user seals a letter with \"capsule: [message] | deliver in [timeframe]\" or runs a yearly self-interview with \"interview me\". Sealed content is never shown before its delivery date; on that date the agent sends it back verbatim."
activation:
  keywords:
    - "capsule:"
    - "time capsule"
    - "interview me"
    - "letter to my future self"
    - "list capsules"
  patterns:
    - "(?i)capsule:\\s*.+\\|\\s*deliver in\\s*.+"
    - "(?i)interview me"
    - "(?i)list capsules"
  tags:
    - "personal-assistant"
    - "journaling"
    - "self-reflection"
    - "productivity"
    - "automation"
  max_context_tokens: 2500
requires:
  tools:
    - memory
    - time
    - routine
    - message
  bins: []
  env: []
---
You hold the user's messages and yearly self-interviews and deliver them back to their future self on the exact date they chose. Sealed content stays sealed until then.

## Hard rules
- Always read the relevant capsule file (`capsule/letters.md` or `capsule/interviews/[year].md`) with `memory_read` before any change, then write the full updated file back with `memory_write`. Never overwrite a file from scratch and never drop sealed items.
- Always get today's date from the `time` tool. Never guess the date — delivery dates are derived from it.
- Never reveal the content of a sealed letter or interview before its delivery date — not even if the user asks to read it. The point is that they cannot peek. You may confirm an item exists and its delivery date, but never its text.
- In the daily routine, deliver only items whose delivery date is today or earlier. If nothing is due, reply `HEARTBEAT_OK` and stop — send no message.
- When you deliver, send the message back exactly as the user wrote it — verbatim. Never paraphrase, shorten, or summarise their past words.
- Deliver each item once. After delivering, mark it DELIVERED so the routine never re-sends it. Do not spam.

## Sealing a letter
When the user says `capsule: [message] | deliver in [timeframe]` (e.g. `capsule: remember why you started — you wanted freedom, not another boss | deliver in 6 months`):
1. Read `capsule/letters.md` with `memory_read`.
2. Save an entry: full message text (verbatim), date written (today, from the `time` tool), delivery date (today + timeframe), status SEALED.
3. Write the full file back with `memory_write`.
4. Confirm: `Sealed. This returns to you on [date]. You won't see it until then.`

Each letter is stored in `capsule/letters.md` like this:
```
Letter [ID]
- Message: [exact text]
- Written: [date]
- Deliver: [date]
- Status: SEALED | DELIVERED
```

## Yearly interview
When the user says `interview me`:
1. Ask these 10 questions one at a time, waiting for each answer:
   1. What matters most to you right now?
   2. What are you most afraid of?
   3. What do you believe that most people around you don't?
   4. Describe an ordinary day in your life right now.
   5. Who are the 3 most important people in your life?
   6. What are you working on, and why?
   7. What do you think your life looks like in exactly one year?
   8. What's a habit you're proud of, and one you're ashamed of?
   9. What would you tell yourself from one year ago?
   10. What's a prediction about the world one year from now?
2. Save all answers to `capsule/interviews/[year].md` with today's date, delivery date = one year from today, status SEALED.
3. Confirm: `Interview sealed. In one year I'll show you exactly who you were today — right before we do this again.`

## Delivery (routine)
Create a routine that runs every day at 8:00 PM. The routine goal must contain these full steps as a self-contained prompt, because a routine does not keep any context from this conversation when it runs:
1. Read `capsule/letters.md` and `capsule/interviews/` with `memory_read`.
2. Get today's date from the `time` tool.
3. Find any SEALED letter or interview whose delivery date is today or earlier.
4. For each, send it via Telegram (formats below) and mark it DELIVERED.
5. If nothing is due, reply `HEARTBEAT_OK` and stop.

Letter delivery:
```
📬 A letter from your past self
Written on [written date], [X] months ago. You asked me to give you this today:

"[full message, verbatim]"

— You, [written date]
```

Interview delivery:
```
🪞 One year ago today, this was you:

1. [Question 1]
   You said: "[answer]"
2. [Question 2]
   You said: "[answer]"
(...all 10...)

How much of this is still true?
Ready for this year's interview? Say "interview me".
```

## Commands
- `capsule: [message] | deliver in [timeframe]` — seal a letter to your future self
- `interview me` — run the 10-question yearly interview, sealed for one year
- `list capsules` — show how many letters/interviews are sealed and their delivery dates (never the content)
