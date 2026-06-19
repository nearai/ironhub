---
name: bug-finder
version: 1.0.0
description: Identify, diagnose, and fix bugs in code with root cause analysis
activation:
  keywords:
    - "find the bug"
    - "why is this broken"
    - "not working"
    - "error in my code"
    - "debug this"
    - "fix this bug"
    - "why does this crash"
    - "unexpected behavior"
  patterns:
    - "(?i)(find|spot|fix|debug).*(bug|error|issue|problem)"
    - "(?i)(why|what).*(not working|broken|failing|crashing|wrong)"
    - "(?i)(getting|receiving|throwing).*(error|exception|traceback)"
  tags:
    - "dev"
    - "debugging"
    - "code"
  max_context_tokens: 2000
---

# Bug Finder Skill

Identifies the root cause of bugs, errors, and unexpected behavior in code — then provides a clear fix with explanation.

## When to Use

- User shares code that isn't working as expected
- User pastes an error message or stack trace
- User describes unexpected behavior in their program
- User asks "why does this crash/fail/return wrong output"

## Core Knowledge

### Key Principles

1. **Find the root cause, not the symptom** — don't just fix the line that throws; find why it throws
2. **Reproduce mentally** — trace through the code step by step as if executing it
3. **One bug at a time** — identify the primary bug first; list secondary issues separately
4. **Explain before fixing** — always explain what the bug is and why it happens before showing the fix

### Debugging Process

1. **Read the error** — parse the error type, message, and line number
2. **Locate the failure point** — identify which line/function fails
3. **Trace backwards** — find what leads to that failure (bad input, wrong state, off-by-one, etc.)
4. **Identify root cause** — what is the actual mistake (logic error, type mismatch, async issue, etc.)?
5. **Provide the fix** — show corrected code with comments explaining the change

### Common Bug Categories

| Bug Type | Common Causes |
|----------|--------------|
| Type errors | Wrong data type passed, missing conversion |
| Null/undefined | Missing null check, uninitialized variable |
| Off-by-one | Loop boundary wrong, index starts at 1 not 0 |
| Async bugs | Missing await, race condition, unhandled promise |
| Logic errors | Wrong operator, inverted condition |
| Scope errors | Variable shadowing, closure capture issues |

### Mistakes to Avoid

- Don't guess — trace the code before concluding
- Don't fix without explaining — the user needs to understand
- Don't introduce new bugs while fixing

## Guidelines

- Always show: ❌ Buggy code → ✅ Fixed code, side by side
- If the error message is pasted, parse it first before looking at the code
- If multiple bugs are found, fix the blocking one first, list the rest as follow-ups
