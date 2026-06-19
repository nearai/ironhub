---
name: risk-manager
version: 1.0.0
description: Apply professional risk management including position sizing, risk/reward ratios, and drawdown rules
activation:
  keywords:
    - "risk management"
    - "how much to risk"
    - "position size"
    - "risk per trade"
    - "max drawdown"
    - "account protection"
    - "risk reward ratio"
    - "kelly criterion"
  patterns:
    - "(?i)(risk management|risk per trade|position size|account protection)"
    - "(?i)(how much|what percentage|what size).*(risk|trade|invest|put in)"
    - "(?i)(max drawdown|daily loss limit|risk.?reward)"
  tags:
    - "trading"
    - "risk"
    - "strategy"
  max_context_tokens: 2000
---

# Risk Manager Skill

Applies professional-grade risk management across all trade types — calculating position sizes, enforcing loss limits, and protecting capital for long-term survival.

## When to Use

- User wants to know how much to risk on a trade
- User wants position sizing help
- User wants to set up a risk framework for their account
- User is recovering from a drawdown and needs a plan

## Core Knowledge

### Key Principles

1. **Risk a fixed percentage, not a fixed dollar amount** — as account grows or shrinks, risk adjusts automatically
2. **The goal is to stay in the game** — a losing month is recoverable; a blown account is not
3. **Asymmetric risk** — losses hurt more than gains help; avoid large losses above all else
4. **Consistency compounds** — 1% daily at 60% win rate beats inconsistent home runs

### Position Sizing Formula

```
Step 1: Define dollar risk
Dollar Risk = Account Size × Risk % per trade
Example: $10,000 × 1% = $100 at risk

Step 2: Define stop distance
Stop Distance % = |Entry Price - Stop Price| / Entry Price
Example: Entry $50,000, Stop $48,500 → 3% stop distance

Step 3: Calculate position size
Position Size = Dollar Risk / Stop Distance %
Example: $100 / 0.03 = $3,333 position size

Step 4: Verify leverage
Leverage = Position Size / Account Size
Example: $3,333 / $10,000 = 0.33x — very conservative
```

### Risk Per Trade Guidelines

| Account Stage | Risk Per Trade |
|--------------|---------------|
| New / learning | 0.5% |
| Growing / consistent | 1% |
| Experienced / profitable | 1–2% |
| Expert / proven edge | Up to 3% |
| Never | >5% |

### Daily & Weekly Loss Limits

| Limit | Threshold | Action |
|-------|-----------|--------|
| Daily loss limit | 3% of account | Stop trading for the day |
| Weekly loss limit | 7% of account | Reduce size 50% next week |
| Monthly loss limit | 15% of account | Full strategy review |
| Drawdown limit | 20% from peak | Stop, reassess, paper trade |

### Risk/Reward Requirements

- Minimum R:R to take a trade: 1:2
- Target R:R for most trades: 1:3
- High-conviction trades: 1:5+
- Never trade negative expectancy setups (R:R < 1:1)

### Drawdown Recovery Plan

When in a drawdown:
1. At -10%: Reduce position size by 25%
2. At -15%: Reduce position size by 50%
3. At -20%: Stop live trading, review all recent trades
4. At -25%+: Paper trade for 2 weeks before returning

The math of recovery:
- 20% down → need 25% to recover
- 30% down → need 43% to recover
- 50% down → need 100% to recover

### Portfolio-Level Risk

- Max correlated positions: 3 (don't hold 5 altcoins that all move with BTC)
- Max single asset exposure: 20% of account
- Always keep 20–30% cash as dry powder

### Mistakes to Avoid

- Never increase position size to recover losses faster — it accelerates the blowup
- Don't skip the daily loss limit rule — it exists for your worst days
- Don't risk more just because a setup "looks perfect"

## Guidelines

- Always output: Dollar risk / Position size / Leverage / R:R for every trade request
- If user is in a drawdown, assess how deep and apply the recovery plan
- Challenge any trade where the user wants to risk >2% — explain the compounding danger
- End with: "Risk management is not a constraint — it's what keeps you in the game."
