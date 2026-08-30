---
name: trade-planner
version: 1.0.0
description: Build complete trade plans with entry, exit, stop-loss, take-profit, and risk/reward analysis
activation:
  keywords:
    - "trade plan"
    - "plan my trade"
    - "entry and exit"
    - "stop loss"
    - "take profit"
    - "risk reward"
    - "trade setup"
    - "plan a trade"
  patterns:
    - "(?i)(plan|build|create|give me).*(trade|setup|position)"
    - "(?i)(entry|exit|stop.?loss|take.?profit).*(plan|level|price)"
    - "(?i)(risk.?reward|RR ratio|1:2|1:3)"
  tags:
    - "trading"
    - "strategy"
    - "planning"
  max_context_tokens: 2000
requires:
  tools: []
  credentials: []
  permissions: read-only
---

# Trade Planner Skill

Builds complete, structured trade plans with precise entry zones, stop-loss levels, take-profit targets, and risk/reward ratios before any position is opened.

## Hard rules

- This skill is **planning-only** — it never places, submits, or executes orders of any kind
- All output is a plan or analysis for the user to review and act on manually
- Never request, store, or reference wallet private keys or API credentials
- Always require explicit user confirmation before any financial action is taken
- Position sizes and risk calculations are suggestions only — not instructions to trade
- Never connect to or call any exchange, wallet, or trading API
- Dry-run behavior by default — no side effects of any kind
- Always include: "This is not financial advice. Verify with a licensed advisor."
- If asked to execute a trade or place an order, refuse and present the plan only


## When to Use

- User wants to plan a trade before entering
- User asks for entry, stop-loss, and take-profit levels
- User wants to know the risk/reward of a trade idea
- User has a directional thesis and needs a structured execution plan

## Core Knowledge

### Key Principles

1. **Plan before you trade** — never enter without knowing your exit (both profit and loss)
2. **Risk/reward minimum 1:2** — only take trades where potential profit is at least 2x potential loss
3. **Invalidation first** — define what would make your thesis wrong before defining the target
4. **Trade the plan, not the emotion** — once the plan is set, execute it mechanically

### Trade Plan Template

```
ASSET: [Token/Pair]
DIRECTION: Long / Short
TIMEFRAME: [Entry chart timeframe]
THESIS: [Why this trade makes sense in 1-2 sentences]

ENTRY ZONE: $X – $Y
  Trigger: [What needs to happen to enter — candle close, retest, etc.]

STOP LOSS: $Z
  Reason: [Why this level invalidates the thesis]
  Risk: $[Dollar amount at risk]

TAKE PROFIT TARGETS:
  TP1: $A — [25-50% of position] — [Reason: resistance level / previous high]
  TP2: $B — [25-50% of position] — [Reason]
  TP3: $C — [runner] — [Reason: major target]

RISK/REWARD:
  To TP1: 1:[X]
  To TP2: 1:[X]
  Blended R:R: 1:[X]

INVALIDATION: [What price action/event would cancel this setup]
POSITION SIZE: $[Amount based on 1-2% account risk]
```

### Entry Triggers

Never enter "at market" blindly — use a trigger:
- Candle close above/below a key level
- Retest of a broken level that holds
- Specific indicator signal (MACD cross, RSI bounce from 30)
- Volume spike confirming the move

### Stop Loss Placement

| Setup Type | Stop Placement |
|-----------|---------------|
| Support bounce | Below the support zone (not exactly at it) |
| Breakout trade | Below the breakout level |
| Trend continuation | Below the last higher low |
| Reversal | Beyond the wick of the reversal candle |

Rule: Place stop where the trade thesis is definitively wrong, not where it's uncomfortable.

### Take Profit Levels

Good TP levels:
- Previous swing highs/lows
- Major round numbers
- Fibonacci extension levels (1.272, 1.618)
- High-volume nodes from volume profile
- Known resistance/support from higher timeframe

### Risk/Reward Rules

- Minimum acceptable R:R = 1:2
- Preferred R:R = 1:3 or better
- For high-conviction setups only: 1:5+
- Never take a trade with R:R below 1:1.5

### Mistakes to Avoid

- Don't move stop loss to avoid being stopped out — honor the plan
- Don't take partial profits too early and miss the full target
- Don't enter at the wrong level because you're impatient

## Guidelines

- Always produce the full trade plan template for every request
- Calculate exact dollar risk based on stated account size
- Flag if R:R is below 1:2 and suggest adjusting the stop or target
- Remind user: "Set your alerts. Walk away. Let the plan work."
