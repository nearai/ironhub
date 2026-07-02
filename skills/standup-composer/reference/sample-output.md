# Sample output

The reference implementation and the SKILL.md prompt should produce output in the shape below. Numbers, PRs, and repos are illustrative — regenerate with a real window against a real author to verify.

## Full mode

```
*Standup — 2026-07-02 — Liight007*

*Yesterday*
• merged nearai/ironhub#412 — skill: standup-composer
• opened nearai/ironhub#413 — follow-up: reference tests for standup-composer
• reviewed nearai/ironhub#178 — reply-chaser follow-ups
• `a91f4c3` skill: fix activation regex whitespace — nearai/ironhub

*Today*
• Address review feedback on skill/standup-composer
• Draft SKILL.md for the release-notes-composer follow-up
• Pair with the docs team on tracking.md conventions

*Blockers*
_none_
```

## Compact mode

Called by `chief-of-staff` from the morning briefing:

```
Yesterday: merged nearai/ironhub#412 — skill: standup-composer; reviewed nearai/ironhub#178 — reply-chaser follow-ups
Today: (fill in)
Blockers: none
```

## Zero-activity window

If the window is empty and no in-flight PRs or assigned issues exist:

```
*Standup — 2026-07-02 — Liight007*

*Yesterday*
_no activity_

*Today*
• _fill in — reference impl does not infer_

*Blockers*
_none_
```

The agent asks the user to confirm the window is right when this shape appears.

## Partial-fan-out

If the rate budget runs out mid-fan-out, the header carries the warning:

```
*Standup — 2026-07-02 — Liight007*   ⚠ partial — 2 of 4 repos scanned; rate-limited

*Yesterday*
• merged nearai/ironhub#412 — skill: standup-composer
…
```

The `_not scanned_` repos are listed in the trailing note the agent prints after the block.
