---
name: portfolio-analyzer
version: 1.0.0
description: Assess investment portfolios for allocation, risk, diversification, and performance
activation:
  keywords:
    - "portfolio"
    - "my investments"
    - "analyze my holdings"
    - "asset allocation"
    - "investment review"
    - "diversification"
    - "risk assessment"
    - "rebalance"
  patterns:
    - "(?i)(analyze|review|assess|check).*(portfolio|investments|holdings|assets)"
    - "(?i)(asset|portfolio).*(allocation|balance|diversification)"
    - "(?i)(should I|how do I).*(rebalance|diversify|invest)"
  tags:
    - "finance"
    - "investment"
    - "analysis"
  max_context_tokens: 2000
---

# Portfolio Analyzer Skill

Analyzes investment portfolios for allocation health, risk exposure, diversification quality, and actionable rebalancing insights.

## When to Use

- User shares their investment holdings and wants an assessment
- User asks about asset allocation or diversification
- User wants to know if their portfolio is too risky or too conservative
- User wants rebalancing recommendations

## Core Knowledge

### Key Principles

1. **Risk profile first** — never analyze without knowing the user's risk tolerance and time horizon
2. **Allocation is everything** — the mix of assets (stocks/bonds/crypto/cash) drives most of long-term performance
3. **Diversification ≠ many assets** — 20 tech stocks is not diversified; check sector, geography, and asset class spread
4. **Returns in context** — compare performance to a relevant benchmark (S&P 500, BTC, etc.)

### Analysis Framework

**Step 1: Asset Class Breakdown**
- What % is in: equities / bonds / crypto / cash / alternatives?
- Is this appropriate for the user's age and risk tolerance?

**Step 2: Diversification Check**
- Sector concentration (too much tech, energy, etc.)?
- Geographic concentration (US-only vs. global)?
- Single-asset risk (too much in one stock or coin)?

**Step 3: Risk Assessment**
- Volatility level (crypto-heavy = high risk)
- Correlation between assets (do they move together?)
- Downside exposure (what happens in a 30% market drop?)

**Step 4: Rebalancing Recommendation**
- What to trim (overweight positions)?
- What to add (underweight areas)?
- Target allocation vs. current allocation

### Risk Tolerance Guide

| Profile | Typical Allocation |
|---------|-------------------|
| Conservative | 70% bonds, 30% equities |
| Moderate | 60% equities, 40% bonds |
| Aggressive | 80%+ equities/crypto |

### Mistakes to Avoid

- Never give personalized financial advice as fact — always recommend consulting a licensed advisor
- Don't ignore the user's time horizon — a 25-year-old and a 60-year-old need different portfolios
- Don't evaluate crypto and stocks with the same risk lens

## Guidelines

- Always ask: age/timeline, risk tolerance, and goal (growth/income/preservation)
- End every analysis with: "This is for informational purposes only. Consult a licensed financial advisor for personalized advice."
- Use percentages, not just dollar amounts, for allocation analysis
