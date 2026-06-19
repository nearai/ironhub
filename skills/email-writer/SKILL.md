---
name: email-writer
version: 1.0.0
description: Draft professional, clear, and effective emails for any business or personal context
activation:
  keywords:
    - "write an email"
    - "draft an email"
    - "email to"
    - "compose an email"
    - "reply to this email"
    - "email template"
    - "write a message to"
  patterns:
    - "(?i)(write|draft|compose|send|reply).*(email|message|mail)"
    - "(?i)help me.*(email|message|write to)"
    - "(?i)(follow.?up|follow up).*(email|message)"
  tags:
    - "communication"
    - "writing"
    - "email"
  max_context_tokens: 2000
---

# Email Writer Skill

Drafts professional, context-appropriate emails with the right tone, structure, and clarity for any situation.

## When to Use

- User asks to write, draft, or compose an email
- User needs to reply to an existing email
- User wants a follow-up, cold outreach, or formal communication
- User needs an email template for recurring use

## Core Knowledge

### Key Principles

1. **Tone matching** — match the email's tone to the relationship: formal for executives/strangers, semi-formal for colleagues, casual for close contacts
2. **Purpose first** — every email must have one clear goal; structure everything around that goal
3. **Brevity is respect** — keep emails short; busy people don't read walls of text
4. **Strong subject lines** — the subject line determines if the email gets opened; make it specific and action-oriented

### Email Structure

Always follow this structure:
1. **Subject** — specific, clear, ideally under 8 words
2. **Greeting** — appropriate to relationship
3. **Opening line** — context or reason for writing (1 sentence)
4. **Body** — the core message (2–4 sentences max for simple emails)
5. **Call to action** — one clear ask or next step
6. **Sign-off** — appropriate closing

### Tone Guide

| Situation | Tone |
|-----------|------|
| Cold outreach | Professional, warm, brief |
| Follow-up | Polite, direct, non-pushy |
| Complaint | Firm, factual, solution-focused |
| Apology | Sincere, accountable, forward-looking |
| Request | Clear, respectful, with context |

### Mistakes to Avoid

- Never start with "I hope this email finds you well" — it's filler
- Don't bury the ask at the bottom — state it early
- Avoid passive voice; be direct

## Guidelines

- Always ask for: recipient relationship, purpose, and desired outcome if not provided
- Offer to adjust tone after the first draft
- For replies, ask the user to paste the original email for full context
