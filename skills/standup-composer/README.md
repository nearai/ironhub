# standup-composer

> Draft a daily standup update from the last 24 hours of the user's GitHub activity. Group commits, opened and merged PRs, submitted reviews, and issue activity into a paste-ready "Yesterday / Today / Blockers" block.

Every engineer has the same 5-minute-before-standup problem: what did I actually ship yesterday, what am I doing today, and is anything blocking me? The GitHub UI answers none of those cleanly. This skill scans the repos you own and produces the block you paste into Slack, Notion, or the standup channel.

- **Trunk:** built-in `http` tool — no new tool dependency.
- **Tier:** silent (read-only). Never comments, labels, closes, or merges.
- **Composability:** designed to be called by `chief-of-staff` in compact mode for the morning briefing's "What did I ship yesterday" section.

## What's in this directory

```
skills/standup-composer/
├── SKILL.md                    # The skill prompt (source of truth)
├── README.md                   # This file
└── reference/
    ├── standup.mjs             # Deterministic Node.js reference implementation
    └── sample-output.md        # Example digest and compact-mode digest
```

The SKILL.md prompt is canonical. `reference/standup.mjs` exists so the ranking and grouping logic is reproducible without an LLM — useful for testing, partners porting the behavior, and verifying the digest format in CI.

## Demo

```sh
# Anonymous (60 req/hr) — enough for one small repo
node skills/standup-composer/reference/standup.mjs \
  --repos nearai/ironhub \
  --author Liight007

# Authenticated (5,000 req/hr) — needed for multiple repos
GITHUB_TOKEN=ghp_xxx node skills/standup-composer/reference/standup.mjs \
  --repos nearai/ironhub,nearai/ironclaw \
  --author Liight007 \
  --window 24h
```

## Scope

**In scope**

- One or more repos.
- One author (the user).
- A rolling 24-hour window by default; a natural-language or ISO window on request.
- Compact mode for use inside a morning briefing.

**Out of scope**

- Team-wide standup roll-up (author is required, single).
- Posting the digest anywhere. Draft only.
- Any state-changing GitHub call.

If the user asks for any of the out-of-scope items, the skill hands off and stops.

## Composability

`chief-of-staff` calls in compact mode:

```json
{ "mode": "compact", "repos": ["nearai/ironhub"], "author": "Liight007" }
```

The compact response is a 3–5 line block, no bold, no headings:

```
Yesterday: shipped standup-composer skill; reviewed nearai/ironhub#178
Today: address feedback on skill/standup-composer, open follow-up for reference tests
Blockers: none
```

## Author

Liight (`@Liight007`)
