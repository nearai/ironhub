### 1. Title

Grant/Funding Deadline Tracker — Monitor grant databases, match eligibility, alert on deadlines

### 2. Example prompt

You are my grant and funding deadline tracker. You monitor grant databases, match them against my project profiles, and alert me before deadlines so I never miss free money.

When I say "profile: [project description]" — for example "profile: open-source NEAR Protocol wallet, Firefox extension, self-custody, privacy-focused":

1. `memory_search` for grants/profiles.md
2. `memory_write` to save the project profile with key attributes: tech stack, ecosystem, stage, team size, location, open-source status
3. Immediately scan known grant sources for matches (see routine below)

Create a `routine` via `routine_create` that runs every Wednesday at 9:00 AM:

1. `memory_search` for all project profiles from grants/profiles.md
2. Scan grant sources using `web-search` (Brave) and `llm-context` (Brave):
   - NEAR Foundation grants (near.org/grants)
   - Web3 Foundation grants (w3f.io)
   - Ethereum Foundation grants (ethereum.org)
   - Gitcoin Grants rounds
   - EU Horizon Europe calls matching tech keywords
   - US SBIR/STTR matching project keywords
   - Mozilla MOSS grants (if open-source)
   - Solana Foundation, Polygon grants (if applicable)
   - Devfolio hackathons with prize pools
3. For each new grant found:
   - Check eligibility against project profiles
   - Calculate match score (0-100) based on: topic alignment, tech stack match, geographic eligibility, stage fit, deadline proximity
   - `memory_write` to save at grants/opportunities/[grant-id].md
4. `message` to send Telegram alert for high-match opportunities (score > 60):

"💰 Grant Opportunity — [match score: 85/100]

**Grant:** [name]
**Source:** [NEAR Foundation / EU Horizon / etc.]
**Amount:** [$X - $Y]
**Deadline:** [date] ([X days away])
**Eligibility:** [requirements]

**Why it matches your profile:**
- [specific alignment point 1]
- [specific alignment point 2]

**Required materials:**
- [ ] Project description (max [X] words)
- [ ] Team background
- [ ] Budget proposal
- [ ] Technical architecture doc
- [ ] Timeline / milestones

**Pre-drafted application outline:**
1. Problem statement: [auto-drafted from profile]
2. Solution: [auto-drafted]
3. Technical approach: [auto-drafted from tech stack]
4. Budget breakdown: [template]
5. Timeline: [template]

Reply 'start application [grant-id]' to begin drafting."

If nothing new: no message (silent heartbeat).

=== COMMANDS ===

"grants: list" — `memory_search` for all tracked opportunities sorted by deadline
"grants: apply [id]" — begin drafting an application using the project profile from `memory_search`
"grants: submitted [id]" — `memory_write` to mark as submitted, log the date and amount requested
"grants: won [id]" — `memory_write` to mark as awarded, log amount and start date
"grants: stats" — `memory_search` for total applied, total awarded, total funding received, success rate

### 3. What the agent does

Billions of dollars in grants go unclaimed every year because nobody knows they exist or misses the deadline by two days. The teams that would qualify are too busy building to monitor grant databases.

The agent monitors grant sources weekly via `routine_create` + `web-search`, matches them against your project profiles stored via `memory_write`, and surfaces only the ones you're eligible for with a pre-drafted application outline. It tracks deadlines, required materials, and submission status. A grant application is 60% boilerplate (team description, project overview, tech stack) that rarely changes. The agent keeps this in `memory_search` and pre-fills it, leaving you to write only the grant-specific 40%.

### 4. Skills & tools used

- `http` — scrapes specific grant program pages (NEAR Foundation, Gitcoin, EU Funding Portal) for structured deadline and requirement data
- `memory_search` — loads project profiles, past applications (for boilerplate reuse), and submission history from workspace memory
- `memory_write` — saves grant opportunities, match scores, application drafts, and submission outcomes
- `memory_tree` — organizes grants into a browsable structure (grants/opportunities/, grants/applications/, grants/profiles/)
- `message` — sends weekly grant opportunity alerts and deadline reminders to Telegram
- `routine_create` — creates the weekly Wednesday 9 AM scan routine and deadline reminders (7 days and 2 days before cutoff)
- `web-search` (WASM tool, install from hub) — searches for new grant opportunities across foundation websites, grant databases, and funding directories
- `llm-context` (WASM tool, install from hub) — fetches pre-extracted content from grant program pages for detailed eligibility requirements and application guidelines
- `gmail` (WASM tool, install from hub) — sends completed applications to grant program email addresses
- `google-docs` (WASM tool, install from hub) — drafts grant applications in Google Docs for collaborative editing with co-founders or team members
- `google-sheets` (WASM tool, install from hub) — tracks grant pipeline: opportunity → drafting → submitted → awarded/rejected, with deadline countdowns
- `Business Plan Writer` [(hub)](https://hub.ironclaw.com) — structures grant applications with proper problem statements, market analysis, and budget justification
- `Technical Writing` [(hub)](https://hub.ironclaw.com) — drafts clear project descriptions, technical architecture sections, and milestone definitions
- `commitment-triage` (built-in skill) — recognizes grant-related commitments and deadlines in conversation, adds them to the commitments workspace
- `decision-capture` (built-in skill) — records the decision to apply (or not apply) for each grant with rationale

### 5. Categories

- [ ] Personal assistant
- [x] Web 3 / Crypto
- [ ] Coding / dev workflow
- [ ] Research
- [ ] Marketing / content
- [x] Business ops
- [ ] Sales / CRM
- [x] Files / knowledge
- [x] Automation
- [ ] Design / media
- [ ] Skill creation

### 6. Source (optional)

Original concept — grant money is free non-dilutive funding that most teams leave on the table because monitoring and applying is too tedious.

### 7. Author (optional)

Jean (@Jemartel)
