### 1. Title

GitHub Issues / PRs / Review requests from any repo → instant notification in Slack or Telegram, optional task creation in Todoist / Trello / Notion / Asana

### 2. Example prompt

Watch my GitHub repos and push every new issue, opened PR, PR review request, and merged or closed PR to my Slack channel (or Telegram, or both) with a short AI summary — and if a thread is labeled as actionable, also create a task for me in Todoist / Trello / Notion / Asana.

### 3. What the agent does

On first run the agent asks the user:
- **(1)** which GitHub repos to watch (any repo the user has access to, picked one by one or "all of them"),
- **(2)** which event types matter — Issue opened, PR opened, PR review requested, PR merged or closed (default: all four), and
- **(3)** which notification channel(s) to push to — Slack, Telegram, or both (default: Slack).

Notification channels are treated as a pure distribution layer, not the only destination. The agent also asks whether the user wants the same events to optionally create tasks in a task app (Todoist, Trello, Notion, Asana) when the event is clearly actionable (e.g. Issue with a "bug" / "p0" / "help wanted" label, PR review request addressed to the user, or PR with failing CI). If the user says yes, the agent connects that task app via Zapier MCP or Composio (whichever the user prefers) and stores the default project / board / list. From then on, the agent subscribes to the selected repos using the GitHub tool — no Zapier required for the GitHub → notification path, which keeps this use case free of Zapier task usage for the core flow. On every matching event the agent pulls the issue or PR metadata (title, body, author, labels, assignees, diff stats for PRs) via the GitHub tool, runs a short AI pass to produce a 1–2 line summary plus an "actionable: yes / no" verdict, and pushes a formatted message to each selected channel (Slack "Send Channel Message" or Telegram "Send Message") containing the summary, verdict, and a deep link back to the issue or PR. If actionable is yes and the user opted into task creation, the agent creates a task in the chosen app with the title, summary, due-date hint (if the issue / PR has a milestone or explicit deadline), and a deep link.

The user can at any time ask the agent to reconfigure repos, add or remove event types, switch channels, or toggle task creation — and can also ask on demand for a digest of recent activity (e.g. "what was opened in the last 24h", "show me all PRs waiting on my review").

### 4. Skills & tools used

- GitHub MCP — required. Used for the trigger (new issues, new PRs, review requests, PR state changes) and to pull issue / PR metadata. The user must install and authenticate the GitHub tool.
- Slack MCP — required if Slack is selected as a delivery channel. Used to send formatted notifications.
- Telegram MCP — required if Telegram is selected as a delivery channel. Used to send formatted notifications.
- Zapier MCP — optional. Only needed if the user opts into task creation. Connects to Todoist, Trello, Notion, or Asana for the "Create Task" action.
- Composio — optional alternative to Zapier MCP for the task creation step, if the user prefers. Either Zapier MCP or Composio can be used; not both.

### 5. Categories

- [x] Personal assistant
- [ ] Web 3 / Crypto
- [x] Coding / dev workflow
- [ ] Research
- [ ] Marketing / content
- [ ] Business ops
- [ ] Sales / CRM
- [ ] Files / knowledge
- [x] Automation
- [ ] Design / media
- [ ] Skill creation

### 6. Source (optional)

Inspired by Kent's "GitHub Issues / PRs → Slack/Telegram + task creation (dev / crypto repo focus)" pattern — designed to avoid Zapier cost on the GitHub → notification path while keeping task creation optional and pluggable.

### 7. Author (optional)

kent
