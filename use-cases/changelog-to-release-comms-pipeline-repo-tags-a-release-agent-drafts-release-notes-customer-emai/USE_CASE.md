### 1. Title

Changelog to Release Comms Pipeline — Repo tags a release, agent drafts release notes, customer email, and tweet thread

### 2. Example prompt

You are my release communications pipeline. When a new tag lands in the repo, you diff the changelog, draft release notes for three different audiences, and present them for review.

When I say "release: [version]" or when a new tag webhook triggers via `event_emit`:

1. Find the previous tag and diff: `shell` runs `git log [prev]..[new]`
2. Categorize every commit/PR using `github` tool for PR details:
   - Breaking changes
   - New features
   - Bug fixes
   - Performance improvements
   - Internal/refactor (skip in public notes)
3. `memory_search` for releases/style-guide.md — the project's past tone and format
4. `memory_search` for releases/past-releases/ — consistency with previous notes
5. Generate three outputs:

**A. GitHub Release Notes** (technical audience):
Release notes format:
**[version] — [date]**
Breaking Changes: [description with migration path]
New Features: [description with PR link]
Bug Fixes: [description with PR link]
Contributors: [list of contributors]

**B. Customer Email** (non-technical, sent via `gmail` tool):
Subject: What's new in [Product] [version]
[2-3 sentence executive summary]
[Feature in customer language, not commit language]
[Fix in terms of the problem it solves, not the technical cause]

**C. Tweet Thread** (sent via `message` for review):
```
🚀 [Product] [version] is live.
[Hook — the single most exciting thing]
🧵 Thread:
1/ [Feature 1 with emoji]
2/ [Feature 2 with emoji]
[Try it: link]
```

6. `memory_write` to save all drafts at releases/[version]/
7. `message` to send to Telegram for review:

"📦 Release [version] ready for review

3 drafts generated: GitHub release notes, customer email, tweet thread.

Reply 'ship github' / 'ship email' / 'ship all' to publish, or send edits."

When I reply "ship all":
- `github` tool to create the GitHub release with notes
- `gmail` tool to send the customer email to the mailing list
- `memory_write` to log the published release

=== COMMANDS ===

"release: preview [version]" — show drafts without publishing
"release: edit tone [more technical/less technical/more casual]" — `memory_write` to update style guide for next release
"release: history" — `memory_search` for past releases with links to published notes

### 3. What the agent does

Every team that ships weekly faces the same problem: the engineer who wrote the code is the worst person to explain what it does to customers. Release notes end up as a dump of PR titles. Customer emails never get written. The tweet just says "shipped v2.5, bug fixes and improvements."

The agent reads the actual diff via `shell`, categorizes changes via `github` PR details, and generates release communications for three audiences. It learns the project's voice from past releases stored in `memory_search` — if the last three release notes used a certain format and tone, the fourth matches.

The human reviews and approves. The agent does the 90% work of turning "fix: resolve race condition in connection pool (#1234)" into "Your dashboard loads faster and no longer disconnects during peak hours."

### 4. Skills & tools used

- `shell` — runs `git log`, `git diff`, and `git shortlog` between the previous and new tag to extract all changes
- `read_file` — reads CHANGELOG.md, package.json version, and any existing release templates from the workspace
- `memory_search` — loads past release style, tone, format, and contributor list from workspace memory
- `memory_write` — saves release drafts and published versions for style consistency across releases
- `memory_tree` — organizes releases into a browsable directory (releases/[version]/)
- `message` — sends drafts to Telegram/Slack for human review and accepts approval commands
- `event_emit` — triggers the release pipeline from GitHub push/tag webhooks
- `github` (WASM tool, install from hub) — fetches PR details (titles, descriptions, labels, authors) for each commit in the release range; creates the GitHub release with the drafted notes
- `gmail` (WASM tool, install from hub) — sends the customer-facing email to the mailing list or distribution group
- `google-docs` (WASM tool, install from hub) — optionally drafts the release notes in a Google Doc for collaborative editing before publishing
- `google-slides` (WASM tool, install from hub) — generates a release deck for all-hands or sales presentations
- `Technical Writing` [(hub)](https://hub.ironclaw.com) — drafts clear, audience-appropriate release notes and documentation
- `Copywriting Frameworks` [(hub)](https://hub.ironclaw.com) — structures customer-facing and social media copy for impact
- `Code Review` [(hub)](https://hub.ironclaw.com) — reads diffs and understands what each change actually does beyond the commit message
- `commitment-triage` (built-in skill) — tracks release commitments and flags if promised features were included or deferred

### 5. Categories

- [ ] Personal assistant
- [ ] Web 3 / Crypto
- [x] Coding / dev workflow
- [ ] Research
- [x] Marketing / content
- [x] Business ops
- [ ] Sales / CRM
- [ ] Files / knowledge
- [x] Automation
- [ ] Design / media
- [ ] Skill creation

### 6. Source (optional)

Original concept — the gap between "code merged" and "users informed" is where most teams drop the ball. This automates the comms pipeline.

### 7. Author (optional)

Jean (@Jemartel)
