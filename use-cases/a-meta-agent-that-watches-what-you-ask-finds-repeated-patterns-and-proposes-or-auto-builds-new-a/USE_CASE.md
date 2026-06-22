### 1. Title

A meta-agent that watches what you ask, finds repeated patterns, and proposes — or auto-builds — new automations on a weekly recap cadence

### 2. Example prompt

Don't just do what I ask — watch my behavior over time, find the patterns I keep repeating, and propose new automations to take them off my plate. Every week give me a short recap of what you noticed and what you'd like to set up. I approve, you build.

### 3. What the agent does

On first run the agent asks the user:
- **(1)** the domains to monitor — work, personal, and / or family (any combination),
- **(2)** the user's top goals in each enabled domain (e.g. work — "ship faster and reduce meetings"; personal — "sleep more and read more"; family — "less meal-prep chaos"), and
- **(3)** which mode the agent should run in — propose-only (agent suggests, the user approves, the agent sets up) or propose + auto-build (for low-risk simple workflows the agent sets up directly and notifies the user with a one-liner "I created X, say stop to disable").

These preferences are stored. The agent runs a weekly scheduled review (the user picks the day and time — Sunday evening is a common default) on a cron-like cadence, and in every review it scans the last 7 days of activity across the user's interactions with the agent and across any connected sources the user has authorized (Gmail, calendar, task apps, expense log, family shared calendar, etc.). It looks for four classes of signal:
- **(a)** repeated user requests — the same task requested three or more times in the period, even if worded differently;
- **(b)** time-based patterns — "every weekday at 8am the user asks for an email digest", "every Sunday the user manually reviews receipts";
- **(c)** cross-use-case connections — the user is using the invoice digest and the receipt capture separately, and a unified expense view would save time;
- **(d)** goal-based gaps — the user's stated goal of "sleep more" has no workflow attached, so the agent proposes a wind-down reminder or screen-time tracker.

Each finding is packaged into a short weekly recap the user gets in their primary channel (Slack, Telegram, or email — whichever they picked) with: a one-line observation per pattern, a one-line proposed automation, an estimated time saved per week, an effort / risk tag (low / medium / high), and a clear "approve / skip / modify" call to action. In propose-only mode the agent waits for approval before doing anything. In propose + auto-build mode the agent builds any low-risk simple workflow directly and notifies the user with a one-liner plus an easy way to disable. The agent can also be asked on demand at any time ("what patterns did you see this month", "what would you suggest for my work week", "any new automations you would build for the family"). The agent never modifies high-risk or destructive workflows (anything that sends money, deletes data, or messages third parties on the user's behalf) without explicit per-instance approval.

### 4. Skills & tools used

- Zapier MCP — required. Used for the weekly recap delivery (Slack / Telegram / email) and for building the new automations the user approves (e.g. create a scheduled task in Todoist, set up a new recurring reminder in Google Calendar, write a row to a Google Sheet for the unified expense view).
- Composio — optional alternative to Zapier for any of the build actions.
- Google Calendar MCP — optional, used when the proposed automation involves a calendar event or recurring reminder.
- Slack MCP — required if the recap channel is Slack.
- Telegram MCP — required if the recap channel is Telegram.
- Gmail MCP — required if the recap channel is email, and used to scan inbox for repeated request patterns.

### 5. Categories

- [x] Personal assistant
- [ ] Web 3 / Crypto
- [ ] Coding / dev workflow
- [ ] Research
- [ ] Marketing / content
- [x] Business ops
- [ ] Sales / CRM
- [ ] Files / knowledge
- [x] Automation
- [ ] Design / media
- [ ] Skill creation

### 6. Source (optional)

Inspired by Kent's "Brainstorming workflow automation — helps users automatically optimize their life" pattern. This is the meta-layer above all the other use cases — the agent's job is to notice when the user is repeating themselves, when two use cases should be connected, or when a stated goal has no workflow attached, and to propose the missing automation.

### 7. Author (optional)

kent
