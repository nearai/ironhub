### 1. Title

Daily morning digest that pulls from GitHub, Telegram, and Slack and sends one AI summary to the channel you pick

### 2. Example prompt

Every morning at the time I pick, send me one tight digest summarising what happened overnight across my GitHub repos, the Telegram chats and groups I care about, and the Slack channels I care about — all rolled into a single message with a TL;DR on top and a per-source section below.

### 3. What the agent does

On first run the agent asks the user:
- **(1)** the time of day to send the digest, in the user's timezone (no default — the user must pick),
- **(2)** the destination channel — Slack, Telegram, or email (the user picks exactly one; multiple destinations are not the default for this use case), and
- **(3)** which sources to include and what to pull from each.

For each source the user picks the exact scope. GitHub scope: which repos to watch (one, several, or all accessible) and which event types — issues opened, PRs opened, PRs merged or closed, PR review requests, releases. Telegram scope: which chats or groups to watch (saved messages, specific 1:1 chats, specific groups) — the user must explicitly enumerate them. Slack scope: which channels to watch (the user picks by name; DMs are not included by default for privacy).

These preferences are stored.

On every fire the agent pulls the last 24 hours of activity from each configured source using the corresponding MCP — GitHub MCP for issues / PRs / releases, Telegram MCP for messages, Slack MCP for channel messages. It then runs a single AI pass that produces a 1–3 line TL;DR on top capturing the most important things across all sources, followed by one section per source, each section being 3 to 7 bullets with a one-line summary and an "actionable: yes / no" flag per bullet. The whole digest is delivered to the chosen single channel (Slack "Send Channel Message", Telegram "Send Message", or Gmail "Send Email") as one message.

The user can at any time ask the agent to reconfigure the time, swap the destination channel, add or remove sources, change the scope of any source, or request an on-demand digest ("give me one for the last 6 hours", "just from GitHub right now"). If a source has no activity in the lookback window, that section is omitted entirely from the message — the digest only includes sources with something to show.

### 4. Skills & tools used

- GitHub MCP — required if GitHub is a source. Used to pull issues, PRs, review requests, and releases from the user's repos.
- Telegram MCP — required if Telegram is a source. Used to read recent messages from the user's selected chats and groups.
- Slack MCP — required if Slack is a source, and also required if Slack is the chosen destination channel. Used to read channel history and / or to send the digest.
- Gmail MCP — required only if the user picks email as the destination channel. Used to send the digest.

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

Inspired by Kent's "Daily morning digest (GitHub / Telegram / Slack) + AI summary" pattern — pairs naturally with the email-digest and GitHub-event-notification use cases for a full morning briefing.

### 7. Author (optional)

kent
