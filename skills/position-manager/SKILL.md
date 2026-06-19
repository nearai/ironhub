---
name: position-manager
version: 1.0.0
description: Manage Polymarket positions including entry sizing, hedging, scaling, and exit timing
activation:
  keywords:
    - "manage my position"
    - "should I hedge"
    - "scale into"
    - "exit polymarket"
    - "how much to bet"
    - "position size polymarket"
    - "when to exit market"
    - "lock in profit polymarket"
  patterns:
    - "(?i)(manage|size|scale|hedge|exit).*(position|bet|market).*(polymarket)?"
    - "(?i)(how much|how many).*(bet|put in|risk).*(polymarket|market)"
    - "(?i)(lock in|take).*(profit|gains).*(polymarket|market)"
  tags:
    - "polymarket"
    - "position"
    - "risk"
  max_context_tokens: 2000
---

# Position Manager Skill (Polymarket)

Manages Polymarket positions across the full trade lifecycle — from sizing entry bets to scaling, hedging, and exiting at the right time.

## When to Use

- User wants to know how much to bet on a market
- User is in a position and wants to know when/how to exit
- User wants to hedge an existing position
- User wants to scale into a market as new information emerges

## Core Knowledge

### Key Principles

1. **Bankroll management is survival** — never risk ruin on a single market; protect the bankroll first
2. **Scale with conviction** — start small, add as your thesis is confirmed by events
3. **Hedging locks profits** — once significantly up, hedge the opposite side to guarantee a return
4. **Exit before resolution uncertainty** — if the outcome is unclear close to resolution, exit for a guaranteed partial return

### Position Sizing Framework

Use the Kelly Criterion (simplified):

```
Bet Size = (Edge / Odds) × Bankroll

Where:
- Edge = Your probability - Market price
- Odds = (1 - Market price) / Market price

Example:
- Your estimate: 60%, Market: 40¢
- Edge = 0.60 - 0.40 = 0.20
- Odds = 0.60 / 0.40 = 1.5
- Kelly = (0.20 / 1.5) = 13.3% of bankroll

Use half-Kelly for safety: 6.6% of bankroll
```

### Position Lifecycle

**Entry**: Start with 25–50% of intended position. Confirm thesis, then add.

**Scaling in**: Add to position when:
- New information confirms your thesis
- Price moves against you but fundamentals unchanged (dollar cost average)
- Market liquidity improves (better fill prices)

**Hedging**: Buy the opposite side when:
- Position is up >50% and resolution is near
- A binary event could flip the outcome
- You want to lock in a guaranteed return

**Exit**: Sell position when:
- Thesis is broken by new information
- Price has moved to fair value (edge is gone)
- Better opportunity exists elsewhere
- Resolution date is near and outcome is still uncertain

### Mistakes to Avoid

- Never go all-in on a single market — max 10% of bankroll per market
- Don't hold losers hoping for a reversal if your thesis is broken
- Don't forget to account for Polymarket fees in profit calculations

## Guidelines

- Always ask: total bankroll, current position size, entry price, and current market price
- Calculate current P&L and remaining edge before advising
- Provide specific numbers: "Bet $X", not "bet a little more"
- For hedging: calculate the exact opposite position size needed to guarantee a specific return
