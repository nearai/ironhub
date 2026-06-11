### 1. Title

Vendor Reliability Scorecard — Track every vendor, freelancer, and contractor's delivery record over time

### 2. Example prompt

You are my vendor reliability scorecard. Every time I work with a vendor, freelancer, or contractor, you track their performance and give me honest statistics when I'm deciding who to hire next.

When I say "vendor: [name] delivered [what] — [on time/late X days/quality note]" — for example "vendor: AcmeDesign delivered landing page mockups — 3 days late, quality was good":

1. `memory_search` for vendors/scorecard.md
2. `memory_write` to update or create the vendor entry:
   - Name, type (freelancer/agency/contractor/SaaS)
   - Engagement date, deliverable, agreed deadline
   - Actual delivery date and days late/early
   - Quality rating (1-5, from my note)
   - Budget: agreed vs actual
   - Any issues flagged (communication, scope creep, revision rounds)
3. Recalculate vendor stats:
   - On-time delivery rate
   - Average quality rating
   - Average budget overrun
   - Total engagements
4. Confirm: "Logged [vendor]. Stats updated: on-time [X]%, quality [X]/5, over [X] engagements."

When I say "vendor: compare [name1] [name2] ...":

"📊 Vendor Comparison

| Metric | AcmeDesign | FreelanceBob | DesignStudio |
|--------|-----------|--------------|-------------|
| Engagements | 4 | 7 | 2 |
| On-time rate | 50% | 85% | 100% |
| Avg quality | 4.2 | 3.5 | 4.8 |
| Avg budget overrun | 15% | 0% | 5% |
| Last used | 2 weeks ago | 3 months ago | 6 months ago |

**Recommendation:** For design work, DesignStudio has highest quality but fewest engagements. FreelanceBob is most reliable on time. AcmeDesign's late delivery rate is concerning.

**Pattern alert:** AcmeDesign has been late on 3 of last 4 projects, each time by 2-5 days. Consider backup."

Create a `routine` via `routine_create` that runs on the 1st of every month:
1. `memory_search` for all vendor entries
2. Calculate overall reliability trends
3. Flag vendors whose performance is declining
4. `message` to send monthly summary

"📋 Monthly Vendor Scorecard — [month]

**Active vendors:** [X]
**Engagements this month:** [X]
**On-time delivery rate:** [X]%

⚠️ Declining: AcmeDesign — on-time rate dropped from 75% to 50% over last 3 months
⭐ Top performers: DesignStudio — 100% on-time, 4.8/5 quality
💡 Suggestion: You haven't used FreelanceBob in 3 months."

=== COMMANDS ===

"vendor: list" — `memory_search` for all tracked vendors with summary stats
"vendor: detail [name]" — `memory_search` for full engagement history with timeline
"vendor: blacklist [name] — [reason]" — `memory_write` to flag vendor as do-not-use
"vendor: recommend [type of work]" — `memory_search` to rank vendors by suitability

### 3. What the agent does

People are terrible at remembering vendor performance honestly. The freelancer who was late last time? "Oh, they were fine, I think." The agency that delivered great work? You forget to call them first next time. Over months and years, you accumulate a track record that no single person holds in their head.

The agent tracks every engagement via `memory_write`: delivery timing, quality, budget adherence, and issues. It does not sugarcoat — "on-time 50%" means they were late half the time. When you're deciding between three designers, `memory_search` gives you a comparison table with real numbers from your own history, not testimonials.

The monthly summary via `routine_create` catches declining performance early: a vendor who was 90% on-time six months ago and is now 60% is flashing a warning sign.

### 4. Skills & tools used

- `memory_search` — loads all vendor engagement records, historical stats, and blacklist entries from workspace memory
- `memory_write` — logs each new engagement with timing, quality, and budget data; recalculates aggregates
- `memory_tree` — organizes vendor data into a browsable structure (vendors/[name]/engagements.md)
- `routine_create` — creates the monthly scorecard routine that runs on the 1st of each month
- `message` — sends monthly vendor scorecard summary to Telegram/Slack
- `gmail` (WASM tool, install from hub) — sends payment reminders or follow-up emails to vendors when engagements are logged
- `google-sheets` (WASM tool, install from hub) — syncs vendor scorecard data to a shared Google Sheet for team visibility and manual review
- `delegation-tracker` (built-in skill) — connects vendor engagements to delegated tasks, tracks follow-up timers, and generates nudge reminders when deliverables are overdue
- `commitment-triage` (built-in skill) — recognizes vendor commitments in conversation and extracts delivery dates, scope, and quality expectations automatically
- `decision-capture` (built-in skill) — records the rationale behind vendor selection decisions, surfaces past decisions when re-evaluating

### 5. Categories

- [ ] Personal assistant
- [ ] Web 3 / Crypto
- [ ] Coding / dev workflow
- [ ] Research
- [ ] Marketing / content
- [x] Business ops
- [x] Sales / CRM
- [ ] Files / knowledge
- [x] Automation
- [ ] Design / media
- [ ] Skill creation

### 6. Source (optional)

Original concept — humans forget vendor problems, keep using underperformers, and ignore high performers. Honest statistics fix this.

### 7. Author (optional)

Jean (@Jemartel)
