# pr-triage-digest

> Triage open GitHub PRs across one or more repos. Score each on CI, mergeability, staleness, size, and review state. Emit a single ranked digest grouped into Blockers, Quick wins, First contributors, Aging, and Normal.

This skill answers the question every maintainer has every morning: **what should I review first?** The GitHub UI sorts by recency or opens a flat list. This skill ranks across repos, surfaces blockers and stale work, and respects the rate budget so it never hangs mid-fan-out.

- **Trunk:** built-in `http` tool — no new tool dependency.
- **Tier:** silent (read-only). Never comments, labels, closes, or merges.
- **Composability:** designed to be called by `chief-of-staff` for the morning briefing's "Code activity" section in compact mode.

## What's in this directory

```
skills/pr-triage-digest/
├── SKILL.md                # The skill prompt (source of truth)
├── README.md               # This file
└── reference/
    └── triage.mjs          # Deterministic Node.js reference implementation
```

The SKILL.md prompt is canonical. `reference/triage.mjs` exists so the logic is
reproducible without an LLM — useful for testing, partners porting the
behavior, and verifying the digest format in CI.

## Demo

```sh
# Anonymous (60 req/hr) — fine for one or two small repos
node skills/pr-triage-digest/reference/triage.mjs nearai/ironhub

# Authed (5000 req/hr) — recommended for cross-repo or busy repos
GITHUB_TOKEN=ghp_... node skills/pr-triage-digest/reference/triage.mjs \
  nearai/ironhub nearai/ironclaw
```

See `reference/sample-output.md` for a real digest captured against
`nearai/ironhub`.

## Scoring at a glance

| Dimension | Best (0) | Worst (4) |
|---|---|---|
| CI status | all green | failing |
| Mergeability | mergeable | conflicts |
| Staleness | ≤ 2 days idle | > 30 days idle |
| Size | ≤ 50 LOC, ≤ 2 files | > 2000 LOC or > 30 files |
| Review state | approved | changes requested |

Full rubric and bucketing rules in `SKILL.md`.
