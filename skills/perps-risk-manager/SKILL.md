---
name: perps-risk-manager
version: 1.0.0
description: Enforce disciplined risk management for perpetual futures including position sizing, max drawdown rules, and loss limits
activation:
  keywords:
    - "risk management"
    - "position sizing perps"
    - "how much to risk"
    - "max drawdown"
    - "daily loss limit"
    - "risk per trade"
    - "overtrading"
    - "blown account"
  patterns:
    - "(?i)(risk management|risk per trade|position size).*(perps|futures|leverage)"
    - "(?i)(how much|what percentage).*(risk|bet|put in).*(trade|position)"
    - "(?i)(max drawdown|daily loss|loss limit|account protection)"
  tags:
    - "perps"
    - "risk"
    - "trading"
  max_context_tokens: 2000
---

# Perps Risk Manager Skill

Enforces strict, professional-grade risk management rules for perpetual futures trading to protect capital, prevent account blowups, and ensure long-term survival.

## When to Use

- User wants to know how much to risk per trade
- User is on a losing streak and needs guidance
- User wants to set daily/weekly loss limits
- User wants a risk framework for their perps account

## Core Knowledge

### Key Principles

1. **Capital preservation is rule #1** — you can't trade if you blow up; protect the account above all else
2. **Risk per trade, not position size** — always think in terms of $ at risk, not $ in the position
3. **Drawdown compounds painfully** — a 50% loss requires a 100% gain to recover; avoid deep drawdowns
4. **Consistency beats home runs** — 1% daily compounded beats one 50% win followed by a blowup

### The Core Risk Rules

**Rule 1: Risk 1–2% of account per trade maximum**
```
Account: $10,000
Max risk per trade: $100–$200
If stop loss is 5% away from entry:
Position size = Risk / Stop % = $200 / 0.05 = $4,000
Leverage needed = $4,000 / $10,000 = 0.4x effective leverage
```

**Rule 2: Daily loss limit = 3–5% of account**
- If daily loss limit hit → stop trading for the day, no exceptions
- Revenge trading after hitting the limit is the #1 account killer

**Rule 3: Weekly drawdown limit = 10%**
- If down 10% in a week → reduce position sizes by 50% next week
- If down 20% → stop trading, reassess strategy

**Rule 4: Maximum concurrent positions = 3**
- More positions = more complexity = more mistakes
- Focus on quality setups, not quantity

### Position Sizing Calculator

```
Inputs needed:
- Account size ($)
- Risk per trade (% — default 1%)
- Entry price
- Stop loss price

Formula:
Dollar risk = Account × Risk %
Stop distance = |Entry - Stop| / Entry
Position size = Dollar risk / Stop distance

Example:
Account: $5,000 | Risk: 1% | Entry: $60,000 BTC | Stop: $58,500
Dollar risk = $50
Stop distance = $1,500 / $60,000 = 2.5%
Position size = $50 / 0.025 = $2,000
Leverage = $2,000 / $5,000 = 0.4x (very safe)
```

### Drawdown Recovery Table

| Drawdown | Gain Needed to Recover |
|----------|----------------------|
| 10% | 11.1% |
| 20% | 25% |
| 30% | 42.9% |
| 50% | 100% |
| 70% | 233% |

### Warning Signs of Poor Risk Management

- 🔴 Using more than 10x leverage regularly
- 🔴 Risking more than 5% per trade
- 🔴 No stop loss set on open positions
- 🔴 Adding to losing positions without a plan
- 🔴 Trading after hitting daily loss limit
- 🔴 Emotional entries ("I need to make this back")

### Mistakes to Avoid

- Never increase position size after a loss to "make it back faster"
- Don't move stop losses further away when price approaches them
- Don't skip the stop loss because you "know" the trade will work

## Guidelines

- Always calculate exact position size in dollar terms, not just leverage
- If user mentions they've had multiple consecutive losses, recommend reducing size by 50%
- Enforce the daily loss limit rule strictly — no exceptions in advice
- End every risk conversation with: "Protect the account first. Profits follow discipline."
