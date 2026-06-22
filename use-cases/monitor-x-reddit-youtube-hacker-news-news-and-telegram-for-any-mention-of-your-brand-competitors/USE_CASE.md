### 1. Title

Monitor X, Reddit, YouTube, Hacker News, news, and Telegram for any mention of your brand, competitors, or keywords — daily sentiment digest plus real-time crisis alerts and AI-drafted replies

### 2. Example prompt

Watch X, Reddit, YouTube, Hacker News, news, and Telegram for any mention of my brand (IronClaw) and my main keywords, give me a daily digest grouped by positive, negative, and neutral sentiment with a one-line "why this matters" per item, and ping me in real time if a negative spike lands — with an AI-drafted reply I can post in one tap.

### 3. What the agent does

On first run the agent asks the user:
- **(1)** what to monitor — the user provides any combination of brand names, brand handles on X, generic keywords, competitor names, and negative keywords to exclude noise (e.g. exclude "IronClaw gym" if the brand is a tech product).
- **(2)** The user picks which sources to scan from a list (X / Twitter mentions, hashtags, and keyword search; Reddit subreddits and keyword search; YouTube comments on a channel or video; Hacker News search; web news / Google Alerts-style fetch; Telegram channels and groups), and the agent then explicitly asks "do you want to add any more sources beyond these?" so the user can plug in niche channels (Discord, a private Slack community, a specific forum) at any time.
- **(3)** The sentiment model the agent should apply — the default buckets each mention into positive, negative, or neutral / question, with neutral treated as a lead-gen or engagement signal. The user can refine what counts as negative (strict — only direct complaints; balanced — default; lenient — anything expressing doubt).
- **(4)** The delivery channel for the daily digest (Slack, Notion, Telegram, or email — single channel) and whether real-time crisis alerts (sentiment spike, sustained negative run, or a single viral negative mention) should be pushed to the same channel the moment they fire.
- **(5)** The reply-draft mode — for every negative or question mention, the agent uses AI to draft a polite on-brand reply; the user can approve in one tap and the agent posts it via Zapier or Composio, or the user can keep it draft-only.
- **(6)** The send time and the user's timezone (no default — the user must pick).

These preferences are stored.

On every fire the agent pulls the last 24 hours of mentions from each enabled source, runs the sentiment model, groups mentions by sentiment, surfaces per-bucket highlights with a one-line "why this matters for you" tied to the user's specific brand and keywords, and tags each item with one or more opportunity flags: engagement (someone is asking for what the user sells), lead-gen (someone complains about a competitor), crisis (sentiment spike or viral negative), influencer (high-follower-count mention), or product feedback (a recurring complaint or feature ask worth turning into a ticket). The daily digest has a one-line headline (e.g. "today: 12 positive, 2 negative, 1 crisis, 4 lead-gen signals"), the highlights per sentiment bucket, the opportunity-flagged items, and a list of drafted replies awaiting one-tap approval. Real-time crisis alerts are short — the mention, the source, the sentiment reason, and the drafted reply.

The user can at any time ask the agent for an on-demand view ("show me this week's negative mentions", "what's our share of voice vs Competitor X", "draft replies for the last 5 question mentions"), refine the keyword list, add a competitor, add a new source, switch sentiment strictness, or change the delivery channel.

### 4. Skills & tools used

- Zapier MCP — required. Connects the chosen sources (X "New Mention" / "New Search Result", Reddit "New Post" matching keywords, YouTube "New Comment", Hacker News search via Zapier-supported actions, web news / Google Alerts via Zapier RSS, Telegram "New Message") and the chosen delivery channel (Slack "Send Channel Message", Notion "Create Database Item", Telegram "Send Message", Gmail "Send Email"), plus the post-reply action for X / Reddit / YouTube / Telegram when reply-draft mode is on. The user must install Zapier MCP and connect the relevant accounts before first use.
- Composio — optional alternative to Zapier for any of the source reads, the delivery actions, and the post-reply action.
- Slack MCP — required if Slack is the delivery channel.
- Telegram MCP — required if Telegram is both a source and the delivery channel.
- Notion MCP — optional but recommended when Notion is the delivery channel.
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

Inspired by Kent's "Social Listening for Brand / Mentions — monitor X / mentions for your brand or keywords, AI summarize sentiment + flag opportunities" pattern. Pairs with the competitor monitor for the strategic angle and with the Google Business reviews use case for the owned-channel feedback counterpart.

### 7. Author (optional)

kent
