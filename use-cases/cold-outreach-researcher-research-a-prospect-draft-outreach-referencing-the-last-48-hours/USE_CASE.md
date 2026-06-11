### 1. Title

Cold Outreach Researcher — Research a prospect, draft outreach referencing the last 48 hours

### 2. Example prompt

You are my cold outreach researcher. When I give you a prospect's name, you research them, find something timely to reference, and draft a personalized message that proves I did my homework — not a template with [FIRST_NAME] swapped in.

When I say "outreach: [person] at [company]" — for example "outreach: Vitalik Buterin at Ethereum Foundation":

1. Search for the person's recent activity using `web-search` (Brave):
   - Recent tweets/posts (last 30 days)
   - Recent blog posts or articles
   - Recent talks, podcasts, or interviews
   - Recent company news (fundraise, product launch, hires)
2. Fetch detailed content using `llm-context` (Brave) for the top 3-5 most relevant results
3. Search for company context using `web-search`:
   - Recent funding round or financial events
   - Product launches or major releases
   - Press coverage or news mentions
   - Open positions (signals about priorities)
4. `memory_search` for outreach/history.md — past interactions with this person or company
5. Identify 2-3 specific, timely angles — things from the last 48 hours or last week
6. Draft 3 outreach variants (short email, LinkedIn message, tweet reply)
7. `memory_write` to save research and drafts at outreach/prospects/[name].md

"🎯 Outreach Research — [person] at [company]

**Profile:** [title, role, focus area]
**Timely hooks (last 7 days):**
- Posted about [topic] on [date] — specifically mentioned [detail]
- Company announced [event] on [date]
- Gave talk at [event] about [topic] on [date]

**Past interactions:** None found (or: "emailed 3 months ago, no response")

**Draft 1 — Email (via `gmail` tool):**
Subject: [specific reference to their recent work]
[first sentence references the specific post/talk/news item]
[2-3 sentences on why I'm reaching out and what's relevant to them]
[clear ask with low commitment]

**Draft 2 — LinkedIn (shorter):**
[similar angle, 3 sentences max]

**Draft 3 — Twitter reply:**
[draft reply to their specific recent tweet]

**Recommended angle:** [which hook is strongest and why]"

=== COMMANDS ===

"outreach: batch [names]" — research multiple prospects and queue drafts via `create_job`
"outreach: sent [person]" — `memory_write` to log sent outreach, start follow-up timer via `routine_create`
"outreach: follow-up [person]" — `memory_search` for original message, draft follow-up
"outreach: track" — `memory_search` for all sent outreach with response status
"outreach: stats" — `memory_search` for response rate by channel, response rate by angle type

### 3. What the agent does

Cold outreach works when it is specific. "I saw your recent post about X" gets a response. "I'd love to explore synergies" gets deleted. The problem: being specific requires 15-30 minutes of research per prospect. At scale, nobody does this.

The agent does the research in seconds via `web-search` + `llm-context`, checks `memory_search` for past interaction history, and identifies the strongest timely angle. The resulting outreach references something real and recent — not "I'm a big fan" but "your post about ZK rollup sequencing on Tuesday raised a point about X that directly relates to what we're building."

Over time `memory_search` tracks which angles get responses. "Tweet replies: 40% response rate. Emails: 12%. Topic-specific angles outperform general ones 3x."

### 4. Skills & tools used

- `http` — fetches specific public profiles, company about pages, and press releases when search results need more detail
- `memory_search` — loads past outreach history, response tracking, and angle performance stats from workspace memory
- `memory_write` — saves prospect research, outreach drafts, sent status, and response outcomes
- `memory_tree` — organizes outreach into a browsable structure (outreach/prospects/[name]/, outreach/history/)
- `message` — delivers research and draft outreach to Telegram for review
- `routine_create` — creates follow-up reminders (e.g., "if no response in 5 days, draft a follow-up")
- `create_job` — spawns parallel research jobs when processing a batch of prospects
- `web-search` (WASM tool, install from hub) — searches for the prospect's recent posts, company news, press coverage, and social media activity
- `llm-context` (WASM tool, install from hub) — fetches pre-extracted content from the prospect's blog posts, talks, and company pages for detailed reference points
- `gmail` (WASM tool, install from hub) — sends the drafted email directly, or saves as a draft for human review before sending
- `google-sheets` (WASM tool, install from hub) — tracks outreach pipeline: prospect → researched → contacted → responded → meeting booked
- `Competitive Analysis` [(hub)](https://hub.ironclaw.com) — identifies strategic angles based on the prospect's company positioning and recent moves
- `Stakeholder Communication` [(hub)](https://hub.ironclaw.com) — structures outreach that is appropriate for the relationship level (cold, warm, referral)
- `Negotiation Communicator` [(hub)](https://hub.ironclaw.com) — frames the ask in terms of mutual benefit without being generic or transactional
- `commitment-triage` (built-in skill) — recognizes outreach commitments in conversation ("I should reach out to X") and tracks them
- `decision-capture` (built-in skill) — records the decision to pursue or deprioritize a prospect with rationale
- `delegation-tracker` (built-in skill) — tracks delegated outreach tasks and nudges when follow-ups are overdue

### 5. Categories

- [ ] Personal assistant
- [ ] Web 3 / Crypto
- [ ] Coding / dev workflow
- [x] Research
- [ ] Marketing / content
- [x] Business ops
- [x] Sales / CRM
- [ ] Files / knowledge
- [x] Automation
- [ ] Design / media
- [ ] Skill creation

### 6. Source (optional)

Original concept — cold outreach conversion rates depend on specificity, which requires research that doesn't scale manually.

### 7. Author (optional)

Jean (@Jemartel)
