### 1. Title

Fetch GitHub trending every day, filter it by your interests and language, and get a tight digest of 5-10 repos with trend reasoning — plus ready-to-post social angles

### 2. Example prompt

Every morning, give me today's GitHub trending — 5-10 repos that fit my interests (AI agents, developer tools, Rust, crypto) — with a one-line "why it's trending" per repo, and for each one a one-sentence social-post angle I can turn into a tweet or LinkedIn post.

### 3. What the agent does

On first run the agent asks the user:
- **(1)** the source and the filters — the agent fetches GitHub trending from github.com/trending (the native source), and as a fallback when web fetch is restricted the agent pulls the auto-aggregated Top 100 from the open-source repo EvanLi/Github-Ranking README on GitHub. The user picks the time range (daily, weekly, monthly — all on by default with sensible weighting; the user can disable any), the spoken-language filter (English, Vietnamese, Chinese, etc. — applied to the repo's README language), the language filter (any specific language or "all"), and any custom topic or keyword to add on top of the user's interests.
- **(2)** The use case — inspiration only (the user is a developer who wants to learn or hack on trending projects), social posting (the user is a content creator who wants ready-to-post angles for each repo), or both (default — the agent shows the inspiration digest and a one-line social angle per repo).
- **(3)** The interests to filter on (the user lists topics like "AI agents", "developer tools", "WooCommerce", "Rust", "crypto", and any negative keywords to exclude), and the quality bar (default: has a meaningful README, has a license, has commits in the last 30 days, has at least one contributor beyond the author).
- **(4)** The delivery channel (Slack, Telegram, Notion, or email — the user picks one; the agent defaults to the channel the user is most active in), and the send time and timezone (no default, the user must pick).

These preferences are stored.

On every fire the agent fetches today's GitHub trending (with the EvanLi/Github-Ranking README as a fallback or secondary source), applies the time-range, language, and spoken-language filters, runs the interests filter and the quality bar, ranks the surviving repos by a combination of star velocity (stars per day), AI confidence that the repo matches the user's interests, and quality signals, and produces a tight digest of 5 to 10 repos. Each item carries: the repo name and link, a one-line description, the language, the time range it is trending in, stars gained today / this week / this month, top topics, the trend reason (a one-line "why it's trending now" inferred from the description, recent issues, or release notes), and (if the user opted into social posting) a one-sentence social angle with a suggested format — educational, contrarian, hype, or how-to.

The digest opens with a 2–4 line TL;DR capturing the dominant themes of the day across the trending set.

The whole thing is delivered to the chosen channel.

The user can at any time ask the agent for an on-demand view ("show me this week's trending in Rust only", "give me 5 trending repos in AI agents with at least 100 stars today", "draft the LinkedIn post for the third repo"), refine interests, add a new language, switch between the github.com/trending source and the EvanLi/Github-Ranking fallback, change the quality bar, or switch delivery channel.

### 4. Skills & tools used

- Web search / fetch — required for the primary path. Used to fetch github.com/trending and to enrich each repo (README excerpt, recent issues, release notes) for the trend-reason line and the social angle.
- GitHub MCP — required. Used to pull repo metadata, star count, language, topics, and the README directly from the GitHub API, which is more reliable than scraping.
- EvanLi/Github-Ranking — required fallback source. The agent reads the auto-aggregated Top 100 from this README when github.com/trending is rate-limited, blocked, or when the user wants a broader weekly / monthly view.
- Zapier MCP — required for delivery (Slack "Send Channel Message", Telegram "Send Message", Gmail "Send Email", Notion "Create Database Item") and for the optional post-to-social action (Twitter / X "Create Tweet", LinkedIn "Create Post") when the user wants the agent to publish the drafted social angle.
- Composio — optional alternative to Zapier for the delivery and post-to-social actions.
- Slack MCP — required if Slack is the delivery channel.
- Telegram MCP — required if Telegram is the delivery channel.
- Notion MCP — optional but recommended when Notion is the delivery channel.

### 5. Categories

- [ ] Personal assistant
- [ ] Web 3 / Crypto
- [x] Coding / dev workflow
- [x] Research
- [x] Marketing / content
- [ ] Business ops
- [ ] Sales / CRM
- [ ] Files / knowledge
- [x] Automation
- [ ] Design / media
- [ ] Skill creation

### 6. Source (optional)

Inspired by Kent's "daily query GitHub trending repos for inspiration / social posting" pattern, with an explicit EvanLi/Github-Ranking fallback for environments where direct web fetch is restricted. Pairs with the industry news digest for the broader research angle and with the RSS-to-social use case for the content-repurposing counterpart.

### 7. Author (optional)

kent
