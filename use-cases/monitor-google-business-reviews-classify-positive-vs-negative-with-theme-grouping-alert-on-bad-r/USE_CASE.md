### 1. Title

Monitor Google Business reviews, classify positive vs negative with theme grouping, alert on bad reviews, and draft replies you approve in one tap

### 2. Example prompt

Watch the Google Business reviews for my business, classify them into positive and negative, group them by theme (what to keep doing, what to fix), alert me the moment a 1- or 2-star review lands, and draft a reply I can approve and post with one tap. Daily digest by default, monthly trend report too.

### 3. What the agent does

On first run the agent asks the user:
- **(1)** which Google Business location(s) to watch (the user picks one or several from the locations they own or manage),
- **(2)** any seeded theme list — the user can either let the agent auto-extract themes from review text or seed it with a list they care about (e.g. "parking", "wifi", "staff attitude", "wait time", "pricing"), in which case the agent groups reviews against that list first and auto-discovers new themes for whatever does not match,
- **(3)** response mode — the agent either just classifies (report-only) or also drafts a reply for every negative review using AI and posts it after a one-tap approval from the user (posted via the Google Business Profile API through Zapier or Composio), and
- **(4)** delivery channel (Slack, Telegram, or email — single channel).

The default cadence is a daily digest (user picks the time + timezone) plus a monthly trend report. Real-time negative alerts (1-2 star reviews) are on by default and push to the same channel the moment a bad review lands.

On every fire the agent pulls the latest reviews from the configured location(s) via the Google Business Profile API (Zapier or Composio) and runs them through a single AI pass that
- **(a)** classifies each review into positive (4-5 stars), neutral / mixed (3 stars), or negative (1-2 stars),
- **(b)** groups reviews in each bucket by theme,
- **(c)** for the positive bucket, surfaces the top themes as "what to keep doing" with a one-line evidence quote per theme,
- **(d)** for the negative bucket, surfaces the top themes as "what to fix" with the same one-line evidence quote, and
- **(e)** drafts a polite, on-brand reply for each negative review and a short thank-you reply for each positive review.

The daily digest has four sections: a one-line headline ("today: 5 positive, 1 negative, themes trending — slow service, friendly staff"), the top positive themes with evidence quotes, the top negative themes with evidence quotes, and the list of newly drafted replies awaiting the user's one-tap approval. Real-time negative alerts are short — review text, theme, suggested reply, and the approval tap. The monthly trend report compares the last 30 days against the prior 30, shows which themes are trending up or down (good and bad), and highlights the top 3 actions the user could take to lift their overall rating.

The user can at any time ask the agent for an on-demand view ("show me all reviews about parking this month", "what's my average rating trend", "draft replies for the last 7 negative reviews"), change the cadence, add or remove a location, update the seeded theme list, or switch response mode.

### 4. Skills & tools used

- Zapier MCP — required. Connects the Google Business Profile API (trigger: New Review, action: List Reviews, action: Post Reply) and the chosen delivery channel (Slack "Send Channel Message", Telegram "Send Message", or Gmail "Send Email"). The user must install Zapier MCP and connect the Google Business account with the right location permissions before first use.
- Composio — optional alternative to Zapier for the Google Business Profile reads and the post-reply action, if the user prefers it.
- Slack MCP — required if Slack is the delivery channel.
- Telegram MCP — required if Telegram is the delivery channel.
- Gmail MCP — required if email is the delivery channel.

### 5. Categories

- [ ] Personal assistant
- [ ] Web 3 / Crypto
- [ ] Coding / dev workflow
- [ ] Research
- [x] Marketing / content
- [x] Business ops
- [x] Sales / CRM
- [ ] Files / knowledge
- [x] Automation
- [ ] Design / media
- [ ] Skill creation

### 6. Source (optional)

Inspired by Kent's "Google Business reviews: classify positive and negative, send to the user, goal is the user knows what to improve and what to keep doing" pattern — pairs with the expense capture and family agent use cases as another always-on, feedback-driven workflow.

### 7. Author (optional)

kent
