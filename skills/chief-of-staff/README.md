# chief-of-staff

Cross-platform executive operations skill for the IronClaw agent. The agent operates as chief of staff to a C-suite executive, coordinating across email, calendar, code, projects, and partner messaging via Google Workspace, GitHub, GitLab, ClickUp, and WhatsApp.

This skill is the orchestration layer for the Cameron executive package: a one-click deployable IronClaw agent for partner demos. It pairs `SKILL.md` prose for the LLM with deterministic Python scripts in `python_scripts/` for the canonical recurring workflows.

## Layout

```
SKILL.md                      Activation criteria, persona, operating
                              principles, routing rules, per-tool
                              conventions, canonical workflows.

python_scripts/               Deterministic workflow logic invoked by
                              the Reborn engine's mission runner.
  __init__.py                 Package exports and runtime contract.
  morning_briefing.py         Calendar + email + tasks + review queue.
  weekly_digest.py            Cross-tool weekly recap.
  pre_call_prep.py            Counterparty brief.
  action_item_router.py       Route a request to the correct system.
  status_broadcast.py         Email + WhatsApp broadcast with drafts.
  cross_tool_search.py        Unified search across all surfaces.
  decision_tracker.py         Append decisions to log; replay history.
  document_review.py          Extract document content; draft follow-ups.
```

## Required tools

The skill orchestrates five tool surfaces, all of which must be installed alongside the skill:

| Tool | Surface |
|---|---|
| `gmail` | Outlook-equivalent email read and send |
| `google-calendar` | Calendar read, create, update |
| `google-drive` | File listing, search, share-link management |
| `google-docs` | Document read and append |
| `google-sheets` | Spreadsheet read and write |
| `google-slides` | Presentation read |
| `github` | Repo, issue, PR, branch, file operations |
| `gitlab` | Project, issue, MR, branch, file operations |
| `clickup` | Workspace, list, task, comment operations |
| `whatsapp` | Send messages, manage templates, business profile |

## Trust model

This skill is **trusted** when placed in the operator's local IronClaw skills directory (`~/.ironclaw/skills/chief-of-staff/`). The full set of tools the agent has access to remain available. Trust attenuates if the skill is loaded from the registry as installed-only.

## Approval discipline

Every side effect goes through the agent's draft-first protocol. Python scripts in `python_scripts/` honor this at the code level: write actions require an explicit `approved=True` flag, and absence of the flag returns the draft only. The skill's `SKILL.md` documents the four approval tiers (silent, draft, explicit, never) the LLM enforces conversationally.

## Reborn engine compatibility

The Python scripts import the runtime tool surface as `from ironclaw.runtime import tools`. The exact import path is provisional pending validation against the Reborn engine API. Workflow logic does not depend on the path; retargeting to whatever Reborn ultimately ships is a one-line change at the top of each module.

Until Reborn lands, the prose in `SKILL.md` is the fallback path: the LLM stitches the tool calls per the canonical-workflow descriptions.

## Activation

Activates on executive-context keywords (morning briefing, weekly digest, prep call, action items, status update, decision tracker, etc.) and pattern matches on the same shapes. The `max_context_tokens` budget is set to 9500 because the skill spans five tool surfaces and the per-tool conventions section is substantive.

## What this skill is NOT

- A replacement for any individual tool. Single-system tasks belong on the tool directly.
- A CRM, accounting, or HR integration. Those surfaces are out of scope.
- A multi-tenant manager. Each demo deploy is single-tenant by design.
