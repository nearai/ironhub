---
name: odds-analyzer
version: 1.0.0
description: Identify mispriced Polymarket markets and find value bets through probability analysis
activation:
  keywords:
    - "odds"
    - "mispriced"
    - "value bet"
    - "is this good odds"
    - "polymarket price"
    - "expected value"
    - "market inefficiency"
    - "is this underpriced"
  patterns:
    - "(?i)(mispriced|underpriced|overpriced).*(market|odds|probability)"
    - "(?i)(value|edge|expected value).*(bet|position|market)"
    - "(?i)(are the odds|is the price).*(right|correct|fair|off)"
  tags:
    - "polymarket"
    - "odds"
    - "analysis"
  max_context_tokens: 2000
---

# Odds Analyzer Skill

Evaluates Polymarket odds for mispricing, calculates expected value, and identifies where the market is wrong so the user can find profitable positions.

## When to Use

- User wants to know if a Polymarket price is fair
- User suspects a market is mispriced
- User wants to calculate expected value of a position
- User is comparing multiple markets to find the best bet

## Core Knowledge

### Key Principles

1. **Price ≠ probability** — Polymarket prices reflect crowd sentiment plus liquidity, not always true probability
2. **Expected value is the only metric** — a 10% chance at 20¢ is a good bet; a 90% chance at 95¢ may not be
3. **Liquidity affects price** — thin markets misprice more; deep markets are harder to beat
4. **Crowd anchors to recent news** — overreaction to news creates temporary mispricings

### Expected Value Formula

```
EV = (Probability of YES × Profit if YES) - (Probability of NO × Loss if NO)

Example:
- Market price: 30¢ (implies 30% chance)
- Your estimate: 45% chance
- Bet $100 on YES at 30¢

EV = (0.45 × $233) - (0.55 × $100)
EV = $104.85 - $55 = +$49.85 → POSITIVE EV bet
```

### Mispricing Patterns

| Pattern | What It Looks Like |
|---------|-------------------|
| Recency bias | Market overreacts to recent news, price spikes temporarily |
| Anchoring | Market stays near 50% even when evidence strongly favors one side |
| Low liquidity | Wide spread, price moves easily, easy to find edge |
| Resolution ambiguity | Market prices uncertainty of resolution, not event probability |
| Late information | Breaking news not yet reflected in market price |

### Odds Assessment Framework

1. Form your independent probability estimate (use market-researcher skill)
2. Compare to current market price
3. Calculate implied edge: `(Your estimate - Market price) / Market price × 100`
4. If edge > 10% → investigate further
5. If edge > 20% → strong value signal
6. Check liquidity — edge means nothing if you can't get size in

### Mistakes to Avoid

- Don't bet on markets where you have no informational edge
- Don't ignore the vig (fees) — Polymarket takes a cut on winning positions
- Don't size up on low-liquidity markets — your own order moves the price

## Guidelines

- Always calculate EV before recommending a position
- Flag if the market has <$10k liquidity — edge is harder to capture
- Present: Market price / Your estimate / EV / Recommended position size
- Never recommend betting more than 5% of bankroll on a single market
