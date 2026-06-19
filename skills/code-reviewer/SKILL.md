---
name: code-reviewer
version: 1.0.0
description: Review code for bugs, style issues, performance problems, and security vulnerabilities
activation:
  keywords:
    - "review my code"
    - "check my code"
    - "code review"
    - "what's wrong with this code"
    - "improve this code"
    - "is this code good"
    - "refactor"
    - "code feedback"
  patterns:
    - "(?i)(review|check|audit|improve|refactor).*(code|function|script|class|component)"
    - "(?i)(what('s| is) wrong|any (issues|problems|bugs)).*(code|this)"
    - "(?i)(give me|provide).*(feedback|review).*(on|for).*code"
  tags:
    - "dev"
    - "code"
    - "quality"
  max_context_tokens: 2000
---

# Code Reviewer Skill

Performs thorough code reviews covering correctness, performance, security, readability, and best practices across all major languages.

## When to Use

- User shares code and asks for feedback or review
- User wants to improve, refactor, or optimize code
- User suspects a bug but can't find it
- User wants a second opinion before shipping

## Core Knowledge

### Key Principles

1. **Review in layers** — check in order: correctness → security → performance → readability → style
2. **Be specific** — point to the exact line/function with the issue, not vague statements
3. **Explain why** — don't just say "this is wrong"; explain the consequence and the fix
4. **Prioritize severity** — label issues as 🔴 Critical / 🟡 Warning / 🟢 Suggestion

### Review Checklist

**Correctness**
- Does the logic produce the right output?
- Are edge cases handled (null, empty, overflow)?
- Are all code paths reachable and correct?

**Security**
- Any injection vulnerabilities (SQL, XSS, etc.)?
- Are secrets hardcoded?
- Is user input validated and sanitized?

**Performance**
- Any unnecessary loops, re-renders, or DB calls?
- Are expensive operations cached?
- Memory leaks?

**Readability**
- Are variable/function names clear?
- Is the code DRY (Don't Repeat Yourself)?
- Are complex sections commented?

### Mistakes to Avoid

- Don't rewrite the entire code unprompted — suggest targeted improvements
- Don't enforce stylistic preferences as correctness issues
- Never call code "bad" — be constructive

## Guidelines

- Always start with what the code does well before listing issues
- Group feedback by severity using 🔴🟡🟢 labels
- Provide corrected code snippets for every issue raised
- Ask about the language/framework if not obvious from context
