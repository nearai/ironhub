### 1. Title

Offline-meeting prep dossier on any person or company, on demand

### 2. Example prompt

I have a meeting with Patrick Collison from Stripe next week — give me a one-page cheat sheet I can skim in 5 minutes, with a deeper dossier I can drill into before I walk in.

### 3. What the agent does

The user gives the agent whatever they have: a company name, a person + company, a LinkedIn URL, or a mix. The agent first asks the meeting context (purpose: sales, partnership, hiring, networking, competitive intel, etc.) and the user's role in the meeting (founder, dev, hiring manager, BD, etc.) so it can tailor the output. It then runs a focused public-web research pass: who they are, what the company does, recent achievements / news in the last 6–12 months, public talks and posts, and any publicly-known sensitivities, controversies, or recent pain points. From that it produces a one-page A4-style cheat sheet — short, scannable, warm, and designed to be re-read 5 minutes before the meeting — covering quick facts, smart openers, and a few "do / don't" cues. The agent then offers a detailed dossier with deeper sections: company overview, person's background and track record, recent milestones, likely goals for this meeting, talking points, things to avoid, and strategic insights.

The user can also opt in to auto-prep: when a new Google Calendar event matches a keyword (e.g. contains "meeting", "call", "sync", or a known contact), the agent proposes to run the same prep flow and only proceeds after the user confirms.

### 4. Skills & tools used

- web-search — Brave Search API for recent achievements, talks, and news
- llm-context — fetch and summarize relevant public pages (LinkedIn public profile, company About / press, conference talks)
- google-calendar — read upcoming events and detect meeting candidates for the optional auto-prep flow
- message — push the cheat sheet to the user's default channel 5 minutes before the meeting
- Person / company resolver — normalize any input (name, company, LinkedIn URL) into a structured "who + where they work" record
- Dossier generator — turn raw research into a clean two-level output (one-page cheat sheet + detailed dossier) with consistent sections
- Sentiment / risk scanner — flag publicly-known controversies, sensitivities, and "don't bring this up" topics from the public corpus

### 5. Categories

- [x] Personal assistant
- [ ] Web 3 / Crypto
- [ ] Coding / dev workflow
- [x] Research
- [ ] Marketing / content
- [x] Business ops
- [x] Sales / CRM
- [ ] Files / knowledge
- [ ] Automation
- [ ] Design / media
- [ ] Skill creation

### 6. Source (optional)

Inspired by Kent's request for a meeting-prep skill that turns a vague "who am I meeting and what should I know" feeling into a concrete, confidence-boosting brief before walking into an offline meeting.

### 7. Author (optional)

kent
