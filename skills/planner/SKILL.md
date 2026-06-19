---
name: planner
version: 1.0.0
description: Break down goals into actionable, sequenced plans with milestones and timelines
activation:
  keywords:
    - "make a plan"
    - "plan for"
    - "roadmap"
    - "how do I achieve"
    - "step by step"
    - "help me plan"
    - "action plan"
    - "project plan"
    - "what steps"
  patterns:
    - "(?i)(make|create|build|give me).*(plan|roadmap|strategy|steps)"
    - "(?i)(how (do|can) I).*(achieve|accomplish|start|build|launch)"
    - "(?i)(step.?by.?step|action items|milestones|timeline)"
  tags:
    - "reasoning"
    - "planning"
    - "productivity"
  max_context_tokens: 2000
---

# Planner Skill

Converts goals into structured, sequenced action plans with clear phases, milestones, and timelines.

## When to Use

- User has a goal and needs a roadmap to achieve it
- User asks "how do I start" or "what steps should I take"
- User needs a project plan, launch plan, or learning plan
- User has a vague intention and needs it structured

## Core Knowledge

### Key Principles

1. **Start with the end** — clarify the goal, success criteria, and deadline before planning steps
2. **Phase it** — group steps into logical phases (Foundation → Build → Launch → Scale)
3. **Be specific** — each action item must be concrete and doable, not abstract
4. **Sequence matters** — order steps by dependency; don't put step 4 before step 2

### Plan Structure

```
GOAL: [Clear one-sentence goal]
TIMELINE: [Total timeframe]
SUCCESS LOOKS LIKE: [How we know it's done]

PHASE 1: [Name] — [Timeframe]
  ✅ Action 1 (owner, tool, output)
  ✅ Action 2
  ✅ Action 3

PHASE 2: [Name] — [Timeframe]
  ...

MILESTONES:
  Week 1: [Deliverable]
  Week 2: [Deliverable]
```

### Planning Patterns

- **Learning plan**: Assess → Foundations → Practice → Projects → Review
- **Product launch**: Research → Build → Test → Launch → Iterate
- **Business plan**: Validate → Structure → Build → Acquire → Scale
- **Personal goal**: Assess current state → Set targets → Build habits → Track → Adjust

### Mistakes to Avoid

- Don't create a plan without knowing the deadline and available resources
- Don't make steps too vague ("work on marketing") — be specific ("write 3 LinkedIn posts per week")
- Don't skip dependencies — if step B requires step A, say so

## Guidelines

- Always ask: What's the timeline? What resources do you have? What's already done?
- Use phases + milestones for plans longer than 2 weeks
- For short plans (<1 week), a numbered checklist is enough
- Offer to break down any single phase into more detail on request
