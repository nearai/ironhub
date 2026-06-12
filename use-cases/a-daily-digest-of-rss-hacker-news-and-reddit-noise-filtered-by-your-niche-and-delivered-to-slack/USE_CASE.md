### 1. Title

A daily digest of RSS, Hacker News, and Reddit noise filtered by your niche and delivered to Slack, Notion, Telegram, or email

### 2. Example prompt

Every morning, scan RSS feeds, Hacker News, and Reddit for anything that matters to my niche — crypto, dev tools, AI — and send me a tight 3-7 item digest with a TL;DR and a "why this matters for you" line per item. Balanced filter by default.

### 3. What the agent does

On first run the agent asks the user:
- **(1)** the niche to filter on — defined as any combination of keywords (e.g. "NEAR Protocol", "Rust async", "AI agent frameworks", "WooCommerce"), topics or categories (crypto, dev tools, AI, fintech, gaming, ecommerce, etc.), source handles or feeds to anchor on, and any negative keywords to exclude (e.g. "no memecoin drama", "no NFT shilling").
- **(2)** Which sources to pull from — any combination of RSS feeds (any URLs the user pastes), Hacker News (top stories, best, new, show, ask, with optional keyword filter), and Reddit (any subreddits the user picks, with optional keyword filter).
- **(3)** The filter mode — strict (only items that directly match the niche keywords or topics), balanced (direct matches plus AI-semantic-similar items — this is the default and is recommended for most users), or exploratory (broader than the niche, surfaces adjacent topics the user might want to discover).
- **(4)** The delivery channel — Slack, Notion (written to a database the agent sets up with fields: title, source, summary, link, niche tag, why-it-matters line, posted date), Telegram, or email — the user picks exactly one.
- **(5)** The send time and the user's timezone (no default, the user must pick).

These preferences are stored.

On every fire the agent pulls the last 24 hours of activity from each enabled source (RSS "New Feed Item", Hacker News "Top Stories" + keyword search, Reddit "New Posts" in the picked subreddits + keyword search), runs the user's filter mode against the raw stream, ranks the surviving items by a combination of source weight, recency, and AI confidence that the item matters to the user's niche, and produces a tight digest of 3 to 7 items. Each item carries: the source label (e.g. "Hacker News — front page", "RSS — Stratechery", "Reddit — r/programming"), a 1-line summary, the original link, the matched niche tag, and a 1-line "why this matters for you" written for the user's specific niche.

The digest opens with a 2–4 line TL;DR capturing the dominant themes of the day across all sources, then the item list.

The whole thing is delivered to the chosen channel (Slack "Send Channel Message", Notion "Create Database Item" per row + a single summary message, Telegram "Send Message", or Gmail "Send Email").

The user can at any time ask the agent for an on-demand view ("show me this week's crypto items only", "what was the top AI story today", "expand on the third item"), re-rank the niche weight (boost or mute a keyword), add or remove a source, switch the filter mode, or change the delivery channel.

### 4. Skills & tools used

- Zapier MCP — required. Connects the chosen sources (RSS "New Feed Item" trigger, Reddit "New Post" trigger) and the delivery channel (Slack "Send Channel Message", Notion "Create Database Item", Telegram "Send Message", or Gmail "Send Email"). Hacker News is supported natively by the agent (no Zapier action needed) via direct fetch. The user must install Zapier MCP and connect the relevant accounts before first use.
- Composio — optional alternative to Zapier for the same RSS / Reddit reads and the delivery actions.
- Slack MCP — required if Slack is the delivery channel.
- Telegram MCP — required if Telegram is the delivery channel.
- Notion MCP — optional but recommended when Notion is the delivery channel, for native database writes.
- Web search / fetch — used to enrich summaries and to verify the source link is live before sending.

### 5. Categories

- [x] Personal assistant
- [ ] Web 3 / Crypto
- [ ] Coding / dev workflow
- [x] Research
- [x] Marketing / content
- [ ] Business ops
- [ ] Sales / CRM
- [ ] Files / knowledge
- [x] Automation
- [ ] Design / media
- [ ] Skill creation

### 6. Source (optional)

Inspired by Kent's "Daily Industry / News Digest with AI Filter: RSS + X monitoring → AI filter for your niche → personalized Slack / Notion / Telegram digest" pattern. Pairs with the competitor monitor for the competitive angle and with the morning digest for a personal-briefing companion. X / Twitter monitoring is intentionally out of scope here because the native MCP for X has cost and rate-limit implications for a daily cron — it is left as a follow-on enhancement.

### 7. Author (optional)

kent
