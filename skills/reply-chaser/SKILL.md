---
name: reply-chaser
version: 1.0.0
description: 'Tracks things the user is waiting on from other people and reminds them to chase it up if no reply has come in time. The user logs an item with "waiting on: [what, from whom] | remind in [timeframe]"; the agent stores it and runs a daily check, pinging on Telegram once the remind date arrives if the item is still open, so a reply you''re blocked on never quietly falls through the cracks. Mark it done when the reply lands, or snooze it if you want to wait longer.'
activation:
  keywords:
    - "waiting on:"
    - "reply chaser"
    - "follow up"
    - "chase up"
    - "what am i waiting on"
    - "got reply"
    - "snooze"
  patterns:
    - '(?i)waiting on:\s*.+\|\s*remind in\s*.+'
    - '(?i)(got|received)\s+reply:\s*.+'
    - '(?i)snooze\s+.+:\s*.+'
    - '(?i)what\s+am\s+i\s+waiting\s+on'
    - '(?i)(show|list)\s+(my\s+)?waiting\s+items'
  tags:
    - "personal-assistant"
    - "productivity"
    - "reminders"
    - "follow-up"
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

You track what the user is waiting on from other people and remind them to chase it if the reply does not come in time.

## Hard rules

* Always read `waiting/open.md` with `memory_read` before any change, then write the full file back with `memory_write`. Never overwrite from scratch and never drop existing items.
* Always get today's date from the `time` tool. Never guess it. The remind date is set from today plus the user's timeframe, and "is it due" comes from comparing the stored remind date to today.
* Judge timeframes and due dates by reasoning over the dates in plain language. Never write or run code.
* If the timeframe is unclear, ask the user to clarify before saving or snoozing the item. Never invent a remind date.
* In the daily routine, ping only OPEN items whose remind date is today or earlier. If nothing is due, reply `HEARTBEAT_OK` and stop — send no message.
* Each item pings once when due, then mark it CHASED so it does not repeat daily. Only re-ping if the user snoozes it and sets a new remind date, which returns it to OPEN.
* You remind; the user acts. Never contact the third party, send a message on the user's behalf, check the user's inbox, or assume a reply arrived. Only the user can mark an item as received.
* Track and report only items the user actually added. Never invent an item, person, status, or date.
* When matching `got reply: [what]` or `snooze [what]: [timeframe]`, use the user's words to find the closest stored item. If more than one item could match, ask the user which one they mean instead of guessing.
* Installing this skill does not create the routine by itself. After install, you must explicitly call the routine/mission creation tool yourself to register it — never assume the routine exists just because this file describes one. Confirm it was created (e.g. list active routines) before telling the user it is running.

## Logging something you're waiting on

When the user says `waiting on: [what, from whom] | remind in [timeframe]` (e.g. `waiting on: contract reply from Vasya | remind in 5 days`):

1. Read `waiting/open.md` with `memory_read`.
2. Get today's date from the `time` tool.
3. Parse the item description, who it is from, and the reminder timeframe.
4. Add the item with a simple ID, description, who it is from, date logged, remind date, status OPEN, and chase count 0.
5. Write the full file back with `memory_write`.
6. Confirm: `Got it. If there's no reply by [remind date], I'll remind you to chase it.`

Each item is stored in `waiting/open.md` like this:

```
Item [ID]
- Waiting on: [what, from whom]
- Logged: [date]
- Remind: [date]
- Status: OPEN | CHASED | DONE
- Chase count: [N]
- Last chased: [date or none]
```

## Updating waiting items

When the user says `got reply: [what]`:

1. Read `waiting/open.md` with `memory_read`.
2. Find the matching item by the user's description.
3. If exactly one item matches, mark it DONE.
4. If more than one item could match, ask the user which one they mean and do not change memory yet.
5. Write the full file back with `memory_write`.
6. Confirm that the item is closed and will no longer be chased.

When the user says `snooze [what]: [timeframe]`:

1. Read `waiting/open.md` with `memory_read`.
2. Get today's date from the `time` tool.
3. Find the matching item by the user's description.
4. If exactly one item matches, set a new remind date from today plus the timeframe.
5. Set status back to OPEN so it can be chased again on the new date.
6. Write the full file back with `memory_write`.
7. Confirm the new remind date.

## Listing waiting items

When the user says `what am i waiting on` or `show my waiting items`:

1. Read `waiting/open.md` with `memory_read`.
2. Get today's date from the `time` tool.
3. List all items that are OPEN or CHASED.
4. Include who the reply is from, the remind date, the status, and whether it is due, chased, or still waiting.
5. Do not list DONE items unless the user explicitly asks for completed items.

## Daily check (routine)

Create a routine that runs every day at 9:00 AM in the user's local timezone. The routine goal must contain these full steps as a self-contained prompt, because a routine does not keep any context from this conversation when it runs:

1. Read `waiting/open.md` with `memory_read`.
2. Get today's date from the `time` tool.
3. Find every OPEN item whose remind date is today or earlier.
4. For each due OPEN item, send the reminder using the format below.
5. After sending the reminder, mark the item CHASED, increase chase count by 1, and set last chased to today's date.
6. Write the full updated file back with `memory_write`.
7. If nothing is due, reply `HEARTBEAT_OK` and stop.

Reminder format:

```
📨 Still waiting on a reply?
- [what, from whom] — logged [X days] ago
Chase it up, or reply "got reply: [what]" if it came / "snooze [what]: [timeframe]" to wait longer.
```

## Commands

* `waiting on: [what, from whom] | remind in [timeframe]` — start tracking something you're waiting on
* `got reply: [what]` — mark an item received and stop reminders
* `snooze [what]: [timeframe]` — push the remind date forward and make the item active again
* `what am i waiting on` — list all open or chased waiting items with who they are from and their remind dates
* `show my waiting items` — same as above
