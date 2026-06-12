### 1. Title

A read-only Telegram user bot (MTProto) for community managers — watch keywords across groups, get daily recaps with cross-group topic detection, and surface unanswered mentions

### 2. Example prompt

I'm a community manager / supporter. Watch the Telegram groups I'm in, flag any message that matches my keywords or mentions my brand, send me a daily recap of the most important threads per group plus a cross-group topic digest, and remind me when something has been sitting unanswered for too long. Read-only — never auto-post, never auto-reply.

### 3. What the agent does

On first run the agent asks the user:
- **(1)** the Telegram account to use — the user authenticates a user-account session via MTProto (the agent explicitly warns the user that Telegram's TOS restricts user bots, that accounts can be banned for abuse, and that the user is responsible for complying with Telegram's rules and with the rules of any group they monitor). The user picks the read-only scope: the agent will view messages, view members, and view reactions, and will not auto-post, auto-translate, auto-join, auto-leave, or auto-reply on the user's behalf.
- **(2)** Which groups to monitor — the user pastes group identifiers or picks from a list of groups the account is already in. The user can pick any number, and can drop or add groups at any time.
- **(3)** The keyword and filter set — the user provides a list of keywords / phrases to watch (brand name, product names, common issue words, language variants), a list of negative keywords to exclude noise, and optional filters by sender, time-of-day, or whether the message contains a question mark or is at least N characters long.
- **(4)** The categorization labels the agent should apply to each match — the agent suggests a default (bug report, feature request, general question, appreciation, spam) and the user can replace or extend the list.
- **(5)** Cadence and delivery for the recap and the cross-group digest (daily or weekly; per-group or rolled-up into one digest; sent to the user's Telegram DM, Slack, or email — user picks one).
- **(6)** Reminder rules — the user picks the unanswered-mention threshold (e.g. "remind me if a question from a non-team member has no reply from any team member after 4 hours"), the engagement threshold (e.g. "flag a post if it crosses 10 reactions and is more than 6 hours old and is not pinned"), and the destination for reminders (Telegram DM, Slack, or email).

These preferences are stored. The agent runs on a polling cadence (the user picks, default every 5-15 minutes) and on every fire reads new messages from each monitored group via the MTProto session, runs the keyword and filter set, applies the categorization labels, and updates a per-group rolling state. When a match lands, the agent pushes a short notification (sender, group, message excerpt, category, link) to the chosen channel if the message is high-signal (e.g. matches a priority keyword, comes from a frequent contributor, or contains a clear question). At the user's chosen recap time, the agent generates a per-group recap of the last 24h (or 7 days) with: the top 3-5 threads, a one-line sentiment summary, the most-asked questions, and a list of items still awaiting a reply, and a cross-group digest that surfaces topics appearing in two or more monitored groups in the same period ("topic X is trending in 5 groups"). Reminders fire on the user's rules — unanswered mention, low-engagement high-potential post, brand mention without a team response, or any other rule the user configures. The agent never auto-sends anything back to any group; every notification is read-only and delivered only to the user's chosen private channel.

The user can at any time ask the agent for an on-demand recap, refine keywords, add or remove a group, tighten or loosen a reminder rule, or pause the monitor entirely.

Hard constraints: the agent is read-only and MUST NOT auto-post, auto-translate, auto-join, auto-leave, or auto-reply on the user's behalf in any monitored group. Every output is observational and delivered only to the user's chosen private channel. The user is responsible for complying with Telegram's TOS, which restricts user bots and can result in account bans for abuse.

### 4. Skills & tools used

- Telegram MTProto client (e.g. TDLib, Pyrogram, Telethon) — required. Used for the read-only operations: view messages, view members, view reactions. The user must run a one-time authentication flow to obtain a session string the agent can use, and must understand the TOS implications of running a user bot.
- Web search / fetch — optional. Used to enrich a flagged message with a link preview or related context when the user asks "what is this about" on a specific match.
- Zapier MCP — required for delivery of recaps, cross-group digests, and reminders to Slack or email (Telegram DM delivery is handled directly by the MTProto client).
- Composio — optional alternative to Zapier for the same delivery actions.
- Slack MCP — required if Slack is the delivery channel.
- Gmail MCP — required if email is the delivery channel.

### 5. Categories

- [x] Personal assistant
- [ ] Web 3 / Crypto
- [ ] Coding / dev workflow
- [x] Research
- [x] Marketing / content
- [x] Business ops
- [ ] Sales / CRM
- [ ] Files / knowledge
- [x] Automation
- [ ] Design / media
- [ ] Skill creation

### 6. Source (optional)

Inspired by Kent's "Telegram user bot for community managers / supporters — monitor groups, recap, and reminder operations" pattern, intentionally scoped to read-only operations to stay within Telegram's TOS. The follow-on "write" use case (auto-post, auto-translate, auto-join, auto-reply) is left as a separate file because Telegram's TOS treats read-only and write-capable user bots very differently in terms of ban risk.

### 7. Author (optional)

kent
