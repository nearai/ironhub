### 1. Title

Daily or weekly AI email digest pushed to Slack or email — stay on top of your inbox without reading everything

### 2. Example prompt

Every weekday morning, give me a short AI digest of the important emails from the last 24 hours — 3 to 7 items max, each with a one-line summary and a "needs action" flag — and send it to me in Slack (or email, whatever I pick).

### 3. What the agent does

On first run the agent asks the user:
- **(1)** cadence — daily or weekly,
- **(2)** delivery channel — Slack DM, a specific Slack channel, or email-to-self, and
- **(3)** what makes an email "important" to them. For
- **(3)** the user can either spell out intents in plain language (e.g. "emails from my manager and direct clients", "anything mentioning the Q3 launch", "P0/P1 labels only") or say nothing — in which case the agent falls back to a sensible default heuristic: prioritize emails from frequent contacts and known VIPs, emails with urgency signals ("urgent", "ASAP", "by EOD", explicit deadlines), emails containing action items or questions directed at the user, and de-prioritize newsletters, automated notifications, and marketing.

The preferences are stored.

On every fire the agent pulls the recent emails from the user's Gmail inbox via Zapier (lookback window matches cadence: last 24h for daily, last 7 days for weekly), runs the importance filter the user defined (or the default heuristic), and uses AI to summarize each surviving email into one line plus a "needs action" flag (yes / no / wait). The result is a tight bullet digest of 3 to 7 items, sent to the chosen channel via the corresponding Zapier action (Slack "Send Channel Message" or Gmail "Send Email").

The digest is fully conversational — the user can reply to the agent any time asking for a deeper summary of one specific email, the full thread, or a re-run with a different filter ("just from my manager", "only unread", "last 3 days only"). The agent answers those follow-ups on demand without waiting for the next scheduled fire.

### 4. Skills & tools used

- Zapier MCP — required. Connects Gmail (action: List/Search Emails) and the chosen delivery channel (Slack "Send Channel Message" or Gmail "Send Email"). The user must install Zapier MCP and connect Gmail + the destination account before first use.

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

Inspired by Kent's "Stay on top of inbox without reading everything" pattern — pairs with the starred-emails-to-tasks use case for the write-side counterpart.

### 7. Author (optional)

kent
