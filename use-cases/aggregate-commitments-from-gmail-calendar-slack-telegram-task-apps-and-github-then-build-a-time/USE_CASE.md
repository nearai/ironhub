### 1. Title

Aggregate commitments from Gmail, calendar, Slack / Telegram, task apps, and GitHub, then build a time-blocked daily schedule — preview the night before, finalize in the morning, optionally create calendar events

### 2. Example prompt

Every night, scan my Gmail, calendar, Slack, Telegram, task apps, and GitHub for anything that looks like a commitment or deadline for tomorrow. Build me a time-blocked schedule I can review before bed, then send me a finalized version in the morning. If something is clearly a meeting or call, ask me before creating a calendar event for it.

### 3. What the agent does

On first run the agent asks the user:
- **
- **(1)** ** which sources to aggregate — any combination of Gmail, Google Calendar, Slack, Telegram, task apps (Todoist / Trello / Notion / Asana), and GitHub, with the understanding that the user can add more sources later through additional MCPs or Zapier connections without rewriting the use case.
- **
- **(2)** ** The default working hours for the time-blocked view (e.g. 6:00 AM to 10:00 PM) and the user's preferred daypart blocks (focus block, meeting block, admin block, family / personal block) — the user can keep the agent's defaults or define their own.
- **
- **(3)** ** Cadence — the agent runs the schedule build twice a day: a night-before preview (default 9:00 PM, user picks) and a same-morning finalization (default 6:30 AM, user picks).
- **
- **(4)** ** Calendar event creation mode — propose (the agent shows the proposed event and asks for one-tap approval before creating), auto (the agent creates the event directly when the commitment is high-confidence and the time slot is open, and asks only on conflict), or skip (the agent lists commitments in the schedule view but never touches the calendar).
- **
- **(5)** ** Delivery channel for the schedule (Slack, Telegram, or email — single channel).

These preferences are stored.

On every fire the agent pulls the next 24 hours of activity from each enabled source: Gmail (search for date / time / "tomorrow" / "let's meet" / "by <day>" mentions plus the user's starred items), Google Calendar (existing events as the schedule anchor), Slack and Telegram (recent messages containing commitments or deadlines), task apps (items due tomorrow or with no due date but recent activity), and GitHub (PR review requests, issue milestones, release dates).

The agent runs a single AI pass that
- **
- **(a)** ** extracts every commitment with a time or deadline,
- **
- **(b)** ** anchors them to the existing calendar,
- **
- **(c)** ** fills the gaps between fixed events with the user's configured blocks (focus, admin, personal),
- **
- **(d)** ** detects conflicts (two meetings at the same time, or a task deadline that collides with a fixed event), and
- **
- **(e)** ** flags anything that needs the user's attention.

The output is a time-blocked daily schedule with: a one-line TL;DR on top ("3 meetings, 2 deadlines, 1 conflict"), a chronological list of fixed events pulled from the calendar, a list of extracted commitments with their source (e.g. "Gmail — John asked to sync at 3 PM"), the proposed / auto-created / skipped calendar events for those commitments per the user's mode, a conflict section, and the proposed focus / admin / personal blocks for the gaps. The agent always asks before creating a calendar event on the user's behalf (in propose mode this is explicit, in auto mode only on conflict). In the morning fire the agent re-pulls sources to catch anything that landed overnight, refreshes the schedule, and sends a finalized version to the same channel.

The user can at any time ask the agent for an on-demand rebuild ("rebuild my schedule", "what's left for the rest of today", "show me next week's commitments across all sources"), change the working hours, add or remove a source, or switch the calendar-creation mode.

### 4. Skills & tools used

- Zapier MCP — required. Connects Gmail (action: Search Emails), Google Calendar (action: List / Create Event), Slack (action: List Channel Messages), Telegram (action: Read Messages), the chosen task app (Todoist / Trello / Notion / Asana), and GitHub (action: List Issues / PRs / Milestones), plus the chosen delivery channel. The user must install Zapier MCP and connect the relevant accounts before first use.
- Composio — optional alternative to Zapier for any of the source reads and the calendar create action.
- Google Calendar MCP — optional but recommended for native event creation when the user prefers it over Zapier.
- Slack MCP — required if Slack is both a source and the delivery channel.
- Telegram MCP — required if Telegram is both a source and the delivery channel.
- Gmail MCP — required if Gmail is a source and email is the delivery channel.

### 5. Categories

- [x] Personal assistant
- [ ] Web 3 / Crypto
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

Inspired by Kent's "auto-read all apps (Gmail / Telegram / calendar events / ...) then aggregate into a daily schedule" pattern — the action-side counterpart to the morning digest: it doesn't summarise, it builds a time-blocked agenda and optionally creates calendar events.

### 7. Author (optional)

kent
