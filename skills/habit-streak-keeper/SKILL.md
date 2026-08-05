---
name: habit-streak-keeper
version: 1.0.0
description: "Tracks the user's daily habits as streaks in memory and nudges them on Telegram in the evening when a live streak is about to break. The user marks a habit done with \"did: [habit]\" (e.g. \"did: gym\"); the agent counts consecutive days per habit, and each evening pings any habit done yesterday but not yet today — so a 12-day streak doesn't quietly die from one forgotten day. Stays silent when every active habit is already done for the day."
activation:
  keywords:
    - "did:"
    - "habit"
    - "streak"
    - "my streaks"
    - "habit tracker"
  patterns:
    - "(?i)did:\\s*.+"
    - "(?i)(show|list)\\s+(my\\s+)?(streaks|habits)"
    - "(?i)habit\\s+(streak|tracker)"
  tags:
    - "personal-assistant"
    - "productivity"
    - "habits"
    - "reminders"
    - "automation"
  max_context_tokens: 1800
requires:
  tools:
    - memory
    - time
    - routine
    - message
  bins: []
  env: []
---
You keep the user's daily habits going by tracking a streak for each one and nudging them in the evening when a live streak is about to break.

## Hard rules
- Always read `habits/streaks.md` with `memory_read` before any change, then write the full file back with `memory_write`. Never overwrite from scratch and never drop existing habits.
- Always get today's date from the `time` tool. Never guess it. Whether a streak continued, broke, or is at risk comes from comparing the stored last-done date to today.
- Count streaks by reasoning over the dates in plain language. Never write or run code.
- Mark a habit done only once per day. If it was already marked today, leave the streak unchanged rather than counting it twice.
- A streak continues only if the habit was done yesterday. If a day was missed, the streak resets to 1 on the next `did:` — never keep a streak alive across a skipped day.
- In the evening routine, ping only habits whose streak is alive (done yesterday) but not yet done today. Don't nag habits already done today, and don't nag ones whose streak already broke. If nothing is at risk, reply `HEARTBEAT_OK` and stop — send no message.
- Track and report only habits the user actually added. Never invent a habit, a streak number, or a date.
- Installing this skill does not create the routine by itself. After install, you must explicitly call the routine/mission creation tool yourself to register it — never assume the routine exists just because this file describes one. Confirm it was created (e.g. list active routines) before telling the user it's running.

## Marking a habit done
When the user says `did: [habit]` (e.g. `did: gym`):
1. Read `habits/streaks.md` with `memory_read`.
2. Get today's date from the `time` tool.
3. Find the habit:
   - Not tracked yet → add it with streak 1, last done = today.
   - Already tracked, last done = today → already marked today; leave the streak unchanged.
   - Already tracked, last done = yesterday → increase the streak by one; set last done = today.
   - Already tracked, last done older than yesterday → the streak was broken by the missed day(s); start over at streak 1; set last done = today.
4. Write the full file back with `memory_write`.
5. Confirm with the habit's current streak, e.g. `🔥 gym — 13-day streak. Keep it going.` (or "streak started" on the first day / after a reset).

Each habit is stored in `habits/streaks.md` like this:
```
- [habit] | streak: [N] | last done: [date]
```

## Evening check (routine)
Create a routine that runs every day at 8:00 PM. The routine goal must contain these full steps as a self-contained prompt, because a routine does not keep any context from this conversation when it runs:
1. Read `habits/streaks.md` with `memory_read`.
2. Get today's date from the `time` tool.
3. For each habit, look at its last-done date:
   - last done = today → already done, skip.
   - last done = yesterday → live streak at risk today; include it in the nudge.
   - last done older than yesterday → streak already broken; skip.
4. If any habits are at risk, send the nudge (format below).
5. If none are at risk, reply `HEARTBEAT_OK` and stop.

Nudge format:
```
🔥 Streaks at risk — mark them before the day ends
- [habit]: [N]-day streak — not done yet today
- [habit]: [N]-day streak — not done yet today
Reply "did: [habit]" for each you've done.
```

## Commands
- `did: [habit]` — mark a habit done for today (creates it on first use)
- `show my streaks` — list every habit with its current streak and last-done date
- `delete [habit]` — stop tracking a habit
