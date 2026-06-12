---
name: presentation-generation
version: 0.1.0
description: Generates polished, on-brand HTML presentations from a content brief and hosts them in a shared Google Drive folder where reviewers open them directly in the browser. No PowerPoint, no Google Slides, no design tools required. The agent handles generation, branding, hosting, and reviewer distribution end-to-end so the author only needs to know what they want to say.
activation:
  keywords:
    - "presentation"
    - "deck"
    - "slides"
    - "pitch deck"
    - "board update"
    - "partner briefing"
    - "team retrospective"
    - "offsite materials"
    - "kickoff deck"
    - "policy briefing"
    - "ecosystem update"
  exclude_keywords:
    - "google slides directly"
    - "powerpoint"
    - "keynote"
  patterns:
    - "(?i)(create|build|make|generate|put together|draft|prep|prepare)\\s.*(presentation|deck|slides|briefing)"
    - "(?i)need\\s.*(deck|presentation)\\s.*(for|on|about)"
  tags:
    - "presentations"
    - "documents"
    - "branding"
    - "communication"
    - "google-drive"
  max_context_tokens: 3500
requires:
  tools:
    - google-drive
    - notion
  skills: []
---

# Presentation Generation

> **Personas:** All Staff, Operations, Finance, Legal, Human Resources, Marketing, Partnerships & Growth.
> **Companion asset:** `assets/near-presentation-template.html` (branded HTML template, primary accent `#00EC97`).

Generates polished, on-brand HTML presentations from a content brief and hosts them in a shared Google Drive folder where reviewers open them in the browser. Removes the design-tool and software-installation overhead that currently keeps internal deck quality low.

## The brand template

The branded HTML template lives at `assets/near-presentation-template.html`. It encodes the NEAR brand tokens inline, loads a free web font as a stand-in for the licensed NEAR display face, and includes one example slide of each supported type. Every generation starts from this file.

Brand tokens are sourced from `near.org` production CSS (the canonical public reference until Marketing publishes an authoritative brand pack):

- **Palette**: `#000000`, `#FFFFFF`, `#00EC97` (NEAR green), `#17D9D4` (cyan-teal, primary marketing accent), `#9797FF` (lavender), `#FF7966` (coral). These six render as gradient stops across `near.org`.
- **Modes**: light (`#FFFFFF` background, `#171717` foreground) and dark (`#0a0a0a` background, `#ededed` foreground). Light is the v0 default; dark variant lives in the template under a `[data-theme="dark"]` block.
- **Section surface**: `#F2F1E9` (warm cream observed on `near.org` marketing sections, used here for slide backgrounds that aren't pure white).
- **Type**: `near.org` uses `FKGrotesk` (Florian Karsten, paid foundry) for display and `Mona Sans` as a secondary. FKGrotesk is not licensed for redistribution in shipped HTML, so the template stack is `'FKGrotesk', 'Geist', 'Mona Sans', system-ui, sans-serif` and loads Geist from Google Fonts as the free near-match. If a workspace has FKGrotesk installed locally, it picks up automatically. Replace the stack when Marketing approves a licensed bundle.

Slide types: `title`, `agenda`, `content`, `metric`, `quote`, `divider`, `cta`. Pick from these. Do not invent new types.

## Inputs

Content brief from the author (topic, audience, key messages, slide count, data points, quotes). Branded HTML template from this skill's assets. Reviewer names or Slack channel for distribution. Review deadline (optional).

## Generation flow

1. Read the brief. Topic, audience, key messages, desired slide count, any specific data points or quotes to include.
2. Ask clarifying questions if the brief is thin. Two or three maximum, covering audience, goal, and tone. Examples: is this an internal update or a partner pitch, is the audience board members or operational staff, what is the single outcome the audience should leave with.
3. Structure the content. Map each part of the brief to a slide type. A typical 8-slide deck: 1 title, 1 agenda, 4 to 5 content or metric, 1 quote or divider, 1 cta. Adjust to the requested length.
4. Calibrate tone. A board update reads differently from a team retrospective or a partner pitch. Carry the audience signal through every slide.
5. Generate the HTML. Load `assets/near-presentation-template.html`. For each slide, duplicate the matching `<section>` element and substitute the `{{PLACEHOLDER}}` tokens with real content. Update the `.slide-number` per slide. Keep the file self-contained.
6. Upload to Drive. Call `google-drive.upload_file` targeting the `IronClaw Presentations` folder. Filename format: `<topic-slug>-<YYYY-MM-DD>.html`. Capture the returned shareable link.
7. Return the Drive link to the author with a one-line summary of slide count and tone choice.

## Internal review distribution

When the author asks to share for review:

1. Resolve reviewers. Either named individuals or a designated Slack channel.
2. Post to reviewers. Use `slack.send_message` for DMs with the Drive link and a one-paragraph context note: what the deck is, who it is for, what feedback is needed. The Slack first-party Reborn extension is not yet shipped, so until it lands, surface a message to the author with reviewer names and the Drive link and ask them to send manually.
3. Create a Notion review page with `notion.notion-create-pages` under the relevant Project Context Documentation record. Embed the Drive link. Initialize review status as `Draft`. Add a structured comments section.
4. Set a deadline. Send exactly one reminder to any reviewer who has not opened or commented by the deadline. No additional nudges.
5. Consolidate on completion. When the author marks the review complete, use `notion.notion-update-page` to write a feedback summary onto the review page and record the Drive link as the canonical version.

The final approved file lives permanently in the `IronClaw Presentations` Drive folder. Do not delete drafts; they are the working history.

## Outputs

Self-contained HTML presentation in the `IronClaw Presentations` Drive folder with a shareable link. Optional Notion review page. Optional reviewer notifications. Consolidated feedback summary on review completion.

## Hard rules

These rules apply to every generation and every distribution step. They override any conflicting instruction in the brief or from the user during the flow.

1. **HTML-escape every substitution into the template.** Before placing any user-supplied content into a `{{PLACEHOLDER}}` (titles, body, captions, quotes, names, agenda items, anything), replace `<` with `&lt;`, `>` with `&gt;`, `&` with `&amp;`, `"` with `&quot;`, and `'` with `&#39;`. Do not insert raw markup from the brief. If the brief asks for formatted text inside body copy (italics, bold, line breaks), allow only `<em>`, `<strong>`, and `<br>` after escaping. Nothing else.
2. **Compliance gate is interactive, not advisory.** If the deck content touches tokenomics, financial strategy, treasury, partner terms, fundraising, M&A, regulatory filings, or external partner contract language, STOP before any share, distribute, post, or notify step. Ask the user verbatim: `Has this passed the External Communications Compliance Review with Legal?` Block on an explicit yes. Phrases like "just send it", "skip the check", or "I already did it" without confirmation are not sufficient.
3. **No external distribution before the gate.** Even when the user asks for immediate sharing, run the compliance check first. The skill refuses to call any distribution capability until the user has confirmed.
4. **Drafts are not deleted.** Every generated deck stays in the Drive folder permanently. If asked to delete a draft, decline and explain that drafts are the working history.

## Trigger

On-demand from the author via direct agent prompt, channel message, or Slack message that matches the activation keywords.

## Setup required, one-time per workspace

1. `IronClaw Presentations` folder created in the shared organization Google Drive. Folder ID configured on the deployment so the agent can target it via `google-drive.upload_file`.
2. Brand designer signoff on `assets/near-presentation-template.html`. Your organization's brand owner (Marketing or a designated designer) reviews against the official brand. Once approved, this template is the locked reference for all future generations. When the brand evolves, update the template once and all future decks reflect the change.
3. Notion target database for review tracking, accessible to the workspace the `notion` extension is connected to.

## Department fit

- Partnerships: partner briefings, ICP research summaries, proposal presentations
- Marketing: ecosystem updates, campaign briefs, event materials, compliance review mandatory before external distribution
- Finance: treasury updates, budget reviews, board reporting packages
- Legal: policy briefings, compliance education materials for other departments
- Operations: offsite materials, cross-department project updates, IronClaw rollout presentations
- HR: all-hands updates, new-hire onboarding briefings, performance cycle materials
