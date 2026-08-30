---
name: trade-memory
version: 1.0.0
description: Record trade decisions and outcomes, analyze performance, and surface patterns to improve agent accuracy over time
activation:
  keywords:
    - "remember this trade"
    - "log this trade"
    - "log outcome"
    - "what was my win rate"
    - "review my trades"
    - "how am I performing"
    - "trade history"
    - "performance review"
    - "best signals"
    - "worst signals"
  patterns:
    - "(?i)(log|record|remember|save).*(trade|outcome|result|decision)"
    - "(?i)(win rate|performance|accuracy|review).*(trades|signals|history)"
    - "(?i)(what|which).*(signals|skills|patterns).*(working|best|worst|accurate)"
  tags:
    - "memory"
    - "learning"
    - "performance"
  max_context_tokens: 2000
tools:
  - name: feedback_loop
    path: ./feedback_loop.py
    description: Log trade decisions and outcomes, analyze win rates by signal type
requires:
  tools: []
  credentials: []
  permissions: read-only
---

# Trade Memory Skill

Records every trade decision and its eventual outcome, builds a performance history, and surfaces which signals and skills are working best — enabling continuous improvement of the agent's accuracy over time.

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

- After any trade recommendation — log the decision immediately
- When a trade closes — log the outcome (profit/loss)
- When user asks "how am I performing" or "what's my win rate"
- Weekly performance review to identify which skills to improve

## Core Knowledge

### Key Principles

1. **Log everything, judge later** — record every decision even if you're unsure; patterns emerge over time
2. **Outcomes are ground truth** — what the agent predicted matters less than what actually happened
3. **Signal-level attribution** — always record WHICH skills/signals triggered the trade so you can measure each one
4. **Review beats intuition** — data from 50 trades tells you more than gut feeling from 500

### What to Log Per Trade

**At decision time (entry):**
```json
{
  "id": "trade_001",
  "timestamp": "2025-05-16T10:23:00Z",
  "asset": "ETH",
  "direction": "LONG",
  "entry_price": 2850.00,
  "position_size": 200,
  "skills_triggered": ["chart-reader", "indicator-analyst", "trend-detector"],
  "signals": ["RSI oversold on 4h", "Bull flag on 1h", "Above 200 EMA"],
  "confidence": "HIGH",
  "stop_loss": 2750.00,
  "take_profit": 3100.00,
  "risk_reward": 2.5,
  "outcome": null
}
```

**At close time (outcome):**
```json
{
  "id": "trade_001",
  "exit_price": 3050.00,
  "exit_reason": "TP1 hit",
  "pnl_pct": 7.0,
  "pnl_usd": 14.0,
  "outcome": "WIN",
  "notes": "RSI divergence signal was the strongest predictor here"
}
```

### How to Log (Commands)

**Log a new trade entry:**
> "Log trade: ETH long at $2850, stop $2750, target $3100, signals: RSI oversold + bull flag, confidence HIGH"

**Log a trade outcome:**
> "Log outcome for trade_001: exited at $3050, win, +7%"

**Review performance:**
> "Show my win rate for RSI signals"
> "Which skills have the highest win rate?"
> "Review last 20 trades"

### Performance Metrics to Track

**Per signal type:**
- Win rate (wins / total trades using that signal)
- Average R:R achieved vs. planned
- Average holding time

**Per skill:**
- How often it triggered
- Win rate when it was the primary signal
- Win rate when it was a confirming signal

**Overall:**
- Total win rate
- Average win % vs. average loss %
- Expectancy = (Win rate × Avg win) - (Loss rate × Avg loss)
- Best performing asset
- Best performing timeframe

### Weekly Review Process

Every week, ask the agent:
> "Run weekly performance review"

The agent should:
1. Count total trades logged this week
2. Calculate win rate overall and by signal
3. Identify top 3 performing signals
4. Identify bottom 3 performing signals
5. Recommend which SKILL.md files to update
6. Flag any recurring mistakes

### Learning Actions Based on Data

| Finding | Action |
|---------|--------|
| Signal X win rate > 70% | Increase weight/confidence for signal X in relevant skills |
| Signal Y win rate < 40% | Add to "Mistakes to Avoid" in relevant skill |
| Asset Z underperforming | Remove from watchlist or reduce position size |
| Timeframe T best results | Prioritize that timeframe in chart-reader skill |
| Confidence HIGH but losing | Recalibrate what counts as HIGH confidence |

### Mistakes to Avoid

- Never skip logging a loss — losses teach more than wins
- Don't update SKILL.md based on fewer than 10 trades — too small a sample
- Don't confuse correlation with causation — just because signal X preceded a win doesn't mean it caused it
- Don't log vague signals ("market looked good") — be specific ("RSI < 32 on 4h with volume spike")

## Guidelines

- Log every trade at entry, before the outcome is known — no cherry-picking
- Use `feedback_loop.py` tool for all logging and retrieval operations
- Store logs at: `~/.ironclaw/memory/trade-log.jsonl`
- After every 10 trades, automatically suggest a skill refinement based on patterns found
- Always include the `skills_triggered` array — this is what enables signal-level attribution
