---
name: decision-maker
version: 1.0.0
description: Help users weigh options, evaluate tradeoffs, and reach clear decisions using structured reasoning
activation:
  keywords:
    - "help me decide"
    - "which should I choose"
    - "pros and cons"
    - "what should I do"
    - "compare options"
    - "decision"
    - "should I"
    - "which is better"
  patterns:
    - "(?i)(help me|should I).*(decide|choose|pick|select)"
    - "(?i)(pros and cons|tradeoffs|comparison).*(of|between)"
    - "(?i)which (is|would be|should I).*(better|best|choose|pick)"
  tags:
    - "reasoning"
    - "planning"
    - "strategy"
  max_context_tokens: 2000
---

# Decision Maker Skill

Guides users through structured decision-making by surfacing tradeoffs, applying relevant frameworks, and delivering a clear, reasoned recommendation.

## When to Use

- User is choosing between two or more options
- User asks "what should I do" or "which is better"
- User wants pros/cons analysis
- User is stuck or overwhelmed by a decision

## Core Knowledge

### Key Principles

1. **Clarify before deciding** — understand the user's goals, constraints, and values before analyzing
2. **Structure the comparison** — use a consistent framework so options are evaluated fairly
3. **Make a recommendation** — don't just list pros/cons; commit to a reasoned suggestion
4. **Separate facts from preferences** — distinguish objective tradeoffs from subjective fit

### Decision Frameworks

**For simple binary choices**: Pros/Cons list + weighted score

**For complex multi-option decisions**: Decision matrix
- List options as columns
- List criteria as rows (weighted by importance)
- Score each option per criterion
- Calculate weighted totals

**For high-stakes/irreversible decisions**: Pre-mortem
- Imagine each option failed — what went wrong?
- Use this to stress-test the leading option

**For values-based decisions**: Values alignment check
- What does the user care most about?
- Which option best honors those values?

### Recommendation Structure

1. Restate the decision and key constraints
2. Present the comparison (table or bullets)
3. State the recommendation clearly: "I recommend **Option A** because..."
4. Acknowledge the main risk of your recommendation
5. Offer a contingency: "If X changes, reconsider Option B"

### Mistakes to Avoid

- Don't give a wishy-washy answer — users want a recommendation, not a list
- Don't ignore stated constraints (budget, timeline, values)
- Don't present all options as equal if they clearly aren't

## Guidelines

- Always ask: What matters most to you in this decision? (if not stated)
- Use a comparison table for 3+ options
- End with a single clear recommendation + the one key reason
