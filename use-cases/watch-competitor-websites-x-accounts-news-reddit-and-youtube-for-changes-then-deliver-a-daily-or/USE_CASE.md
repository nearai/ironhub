### 1. Title

Watch competitor websites, X accounts, news, Reddit, and YouTube for changes, then deliver a daily or weekly intelligence digest with auto lead-gen and price / feature comparison

### 2. Example prompt

Watch my top 5 competitors' websites, their X accounts, news mentions, relevant Reddit threads, and YouTube channels. When something changes — pricing, features, a launch — tell me. Also surface potential leads from people complaining about a competitor or asking for what we sell. Daily digest is fine, weekly is fine — I pick.

### 3. What the agent does

On first run the agent asks the user: (1) what to watch — the user can enable any combination of: competitor websites (any URL, with a per-site focus hint such as "pricing page", "changelog", "blog", "docs"), X / Twitter accounts (specific handles), X keywords and hashtags, news outlets (specific publications or Google News RSS on a topic), Reddit subreddits and search terms, and YouTube channels or search terms.

The user can also paste a list of competitor names and the agent will help discover their canonical handles and URLs. (2) Cadence — daily or weekly digest (the user picks), plus the day / time + timezone, with on-demand always available. (3) Comparison baseline — a side-by-side matrix of the user's product against the watched competitors, with columns the user defines (typical: price tiers, key features, target segment, integrations, free tier). The agent snapshots each competitor's relevant pages and stores the last seen state. (4) Lead-gen targets — the user can enable any of: signal A (people complaining about a competitor on Reddit / X / forums, asking for alternatives, or reporting bugs), signal B (people asking for what the user sells in relevant subreddits / X / forums, even if they don't name a competitor), signal C (new mentions of keywords the user cares about across any monitored source). (5) Where leads land — Google Sheet, Notion database, or directly into a CRM (HubSpot, Pipedrive, etc., re-using the destination plumbing from the form-lead-to-CRM use case). (6) Delivery channel for the digest and the per-event alerts — Slack, Telegram, or email (single channel).

On every fire the agent pulls fresh data from each enabled source using web search / web fetch (Brave search, direct URL fetch, X search, Reddit search, YouTube search) and AI summarization, diffs each competitor's state against the last snapshot, flags any pricing or feature changes for immediate alert, surfaces a "comparison snapshot" section in the digest, and runs lead-gen signal extraction. New leads are pushed to the configured destination with a one-line AI summary of why they qualify. The digest itself has three parts:
- **(a)** a 2–4 line TL;DR of the most important moves across all sources,
- **(b)** a per-competitor change log (pricing / feature / launch / blog / X post), and
- **(c)** a lead-gen section listing the new qualified leads found this period with source link and one-line reasoning.

The user can at any time ask the agent for an on-demand view ("show me this week's pricing changes", "give me all leads complaining about Stripe", "compare us to Competitor X on the price matrix"), reconfigure the watchlist, add or remove sources, or change where leads land.

### 4. Skills & tools used

- Web search / fetch — required. Used to pull competitor pages, X posts, news, Reddit threads, and YouTube data on a schedule. Brave Search is the default web-search provider; direct URL fetch handles competitor site monitoring.
- Zapier MCP — required for delivery (Slack / Telegram / email) and for writing leads into Google Sheets / Notion / a CRM.
- Composio — optional alternative to Zapier for the same lead-write and delivery actions.
- Make.com — optional alternative for the same actions.
- Slack MCP — required if Slack is the delivery channel.
- Telegram MCP — required if Telegram is the delivery channel.
- Gmail MCP — required if email is the delivery channel.

### 5. Categories

- [ ] Personal assistant
- [ ] Web 3 / Crypto
- [ ] Coding / dev workflow
- [x] Research
- [x] Marketing / content
- [x] Business ops
- [x] Sales / CRM
- [ ] Files / knowledge
- [x] Automation
- [ ] Design / media
- [ ] Skill creation

### 6. Source (optional)

Inspired by Kent's "Competitor and trend intelligence monitor — track websites, X, news; price / feature comparison; lead-gen scraping" pattern — pairs with the form-to-CRM use case for the full lead-gen pipeline and with the morning digest for a personal-briefing companion.

### 7. Author (optional)

kent
