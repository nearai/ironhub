### 1. Title

Monitor any RSS feed, turn new posts into platform-tailored social drafts in a Notion content queue, learn from your edits, and schedule approved posts

### 2. Example prompt

Watch the RSS feeds I pick, summarise every new article with AI, and drop a social-media draft for each platform I use (Twitter, LinkedIn, Facebook, Instagram, Threads, Mastodon, Bluesky) into my Notion content queue. I'll edit and approve; the agent learns from my edits so the next drafts match my voice.

### 3. What the agent does

On first run the agent asks the user:
- **(1)** which RSS feeds to watch (the user pastes any number of feed URLs — newsletters, blogs, podcasts, news sites),
- **(2)** the destination for the content queue (Notion is the default because it is the most common choice for solo creators, and the agent sets up a database with fields: title, source URL, source published date, AI summary, draft per platform, status — draft / approved / scheduled / posted, scheduled time, posted link, edit diff). The user can pick a different queue (Google Sheets, Airtable) at any time,
- **(3)** which social platforms to support — any combination of Twitter / X, LinkedIn, Facebook, Instagram, Threads, Mastodon, Bluesky. For each platform the user enables, the agent checks whether the corresponding account is connected (via Zapier or Composio). If a platform is not yet connected, the agent still generates a platform-tailored draft (right length, right tone, right format conventions — e.g. a thread for Twitter, a longer reflective post for LinkedIn, an image-led caption for Instagram) and stores it in the queue with the status "draft (platform not connected)" so the user can copy-paste manually.
- **(4)** The voice baseline — the user can either let the agent default to a clean informative tone, paste 3-5 example posts they like, or write a short voice brief in plain language.
- **(5)** Daily or weekly delivery of new drafts to the Notion queue (user picks) and the post-schedule cadence (e.g. 3 posts per day spread across platforms, or only on weekdays, or only LinkedIn on Tuesdays — fully user-configurable).

These preferences are stored.

On every fire the agent pulls the latest entries from each enabled RSS feed, runs a single AI pass to produce a tight summary, then generates one draft per enabled platform with the platform's length, tone, and format conventions applied. Each draft is created as a row in the Notion content queue with the source link and AI summary attached. The user reviews in Notion — they can edit any draft, change the status to approved, and set a scheduled time. The agent then posts the approved draft to the platform via Zapier or Composio at the scheduled time. A feedback loop is built in: after every user edit, the agent stores the diff between the AI draft and the user's final version, and uses that diff to refine its future drafts. A weekly recap shows the user how many drafts were approved with zero edits vs edited, the most common edit patterns (e.g. "user always shortens Twitter drafts by 20%"), and the implied prompt refinements the agent has applied.

The user can at any time ask the agent for an on-demand view ("show me this week's drafts", "what did I edit most", "regenerate the LinkedIn version of this one with my voice"), change the feeds, add or remove a platform, switch the queue, or update the voice baseline.

### 4. Skills & tools used

- Zapier MCP — required. Connects the chosen RSS sources (trigger: New Feed Item, supported for most major blog and newsletter platforms), Notion (action: Create Database Item for the content queue), and the chosen social platforms (Twitter / X "Create Tweet", LinkedIn "Create Post", Facebook "Create Post", Instagram "Create Media Post", Threads "Create Post", Mastodon "Create Post", Bluesky "Create Post"). The user must install Zapier MCP and connect the relevant accounts before first use.
- Composio — optional alternative to Zapier for the Notion and social platform actions, if the user prefers it.
- Notion MCP — optional but recommended for native database reads and writes when the user prefers it over Zapier.

### 5. Categories

- [ ] Personal assistant
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

Inspired by Kent's "RSS Feed → AI Summary → Content Queue → Scheduled Social Posts — starter scenario for solo creators" pattern. Pairs with the email digest when the user wants to capture newsletter content that has no RSS feed, and with the competitor monitor for the competitive content angle.

### 7. Author (optional)

kent
