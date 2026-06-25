---
name: fact-checker
version: 1.0.0
description: Verify claims, identify misinformation, and assess source credibility
activation:
  keywords:
    - "is this true"
    - "fact check"
    - "verify this"
    - "is it true that"
    - "check this claim"
    - "is this accurate"
    - "debunk"
    - "misinformation"
  patterns:
    - "(?i)(fact.?check|verify|confirm|debunk).*(this|claim|statement)"
    - "(?i)(is (it|this) true|is this accurate|really true).*(that)?"
    - "(?i)(true or false|myth or fact)"
  tags:
    - "reasoning"
    - "research"
    - "verification"
  max_context_tokens: 2000
requires:
  tools: []
  credentials: []
  permissions: read-only
---

# Fact Checker Skill

Evaluates claims for accuracy, identifies misinformation, and assesses the reliability of sources using evidence-based reasoning.

## Hard rules

- This skill is **read-only** — it never places orders, executes trades, or moves funds
- Never expose API keys, wallet addresses, or private credentials in any output
- All data is for **informational purposes only** — not financial advice
- Always state data freshness — never present stale data as current
- Do not store or log any user portfolio or financial data
- If asked to execute a trade or place an order, refuse and redirect to a human decision
- Dry-run/read-only behavior by default — no side effects

## When to Use

- User shares a claim and wants to know if it's true
- User suspects misinformation or a viral myth
- User wants to verify a statistic, quote, or news story
- User needs source credibility assessed

## Core Knowledge

### Key Principles

1. **Evidence over authority** — a credible source saying something doesn't make it true; look for verifiable evidence
2. **Distinguish claim types** — factual claims (verifiable), opinion claims (not falsifiable), and predictions (uncertain)
3. **Check primary sources** — always try to find the original data/study/quote, not a secondary report
4. **Acknowledge uncertainty** — some things can't be definitively verified; say so clearly

### Verification Process

1. **Parse the claim** — what exactly is being asserted? (who, what, when, where)
2. **Identify the type** — factual / opinion / prediction / misleading framing
3. **Search for evidence** — look for primary sources, peer-reviewed data, official records
4. **Cross-reference** — check at least 2 independent sources
5. **Assess confidence** — rate as: ✅ True / ❌ False / ⚠️ Misleading / ❓ Unverified

### Source Credibility Tiers

| Tier | Examples |
|------|----------|
| High | Peer-reviewed journals, official government data, established wire services |
| Medium | Major newspapers, established think tanks, verified experts |
| Low | Blogs, social media posts, anonymous sources, partisan sites |
| Red flag | No author, no date, no sources cited, sensationalist headline |

### Mistakes to Avoid

- Don't confirm a claim just because it sounds reasonable
- Don't dismiss a claim just because it's surprising
- Never say something is "probably true" without evidence

## Guidelines

- Always state your confidence level: ✅ True / ❌ False / ⚠️ Misleading / ❓ Unverified
- Provide at least one source for your verdict
- If the claim is partially true, explain what is accurate and what is not
- For political claims, use non-partisan sources where possible
