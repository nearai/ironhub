---
name: funding-rate-watcher
version: 1.0.0
description: Track and interpret perpetual futures funding rates to time long/short entries and avoid funding drain
activation:
  keywords:
    - "funding rate"
    - "funding fee"
    - "positive funding"
    - "negative funding"
    - "funding is high"
    - "when does funding reset"
    - "funding rate arbitrage"
  patterns:
    - "(?i)(funding rate|funding fee).*(high|low|positive|negative|check|watch)"
    - "(?i)(how much|what is).*(funding|funding rate|funding fee)"
    - "(?i)(funding).*(arbitrage|trade|strategy)"
  tags:
    - "perps"
    - "trading"
    - "funding"
  max_context_tokens: 2000
---

# Funding Rate Watcher Skill

Monitors and interprets perpetual futures funding rates to help time entries, avoid costly funding drains, and exploit funding rate arbitrage opportunities.

## When to Use

- User wants to check current funding rates before entering a perp position
- User is paying high funding fees and wants to know if it's worth holding
- User wants to exploit funding rate differentials
- User wants to understand what funding rates signal about market sentiment

## Core Knowledge

### Key Principles

1. **Funding rate = market sentiment gauge** — high positive funding = crowded longs = potential short opportunity
2. **Funding is a cost** — holding a position against the funding direction bleeds money every 8 hours
3. **Extreme funding = mean reversion signal** — when funding is extremely high or low, the market often reverses
4. **Funding arbitrage is real** — spot long + perp short = earn funding with no directional risk

### How Funding Works

- Funding is paid every **8 hours** (most exchanges: 00:00, 08:00, 16:00 UTC)
- **Positive funding**: Longs pay shorts — market is bullish/overleveraged long
- **Negative funding**: Shorts pay longs — market is bearish/overleveraged short
- Rate is typically 0.01% per 8h (0.03%/day) at neutral; can spike to 0.1–0.3%+ in extremes

### Funding Rate Interpretation

| Funding Rate | Signal | Action |
|-------------|--------|--------|
| >0.1% per 8h | Extremely bullish, crowded longs | Consider shorting or avoid new longs |
| 0.01–0.05% | Mild bullish bias | Normal, monitor |
| ~0.00% | Neutral market | No funding edge either way |
| -0.01 to -0.05% | Mild bearish bias | Normal, monitor |
| <-0.05% per 8h | Extremely bearish, crowded shorts | Consider longing or avoid new shorts |

### Funding Rate Arbitrage (Delta Neutral)

**Setup**: Buy spot + Short perp of same asset
**Earn**: Funding payments from longs (when positive)
**Risk**: Exchange risk, liquidation risk if perp moves against margin

```
Daily yield = Funding rate × 3 (paid 3x per day)
Annual yield = Daily yield × 365

Example: 0.05% per 8h funding
Daily = 0.15%, Annual = ~54% on the short margin
```

### Where to Check Funding Rates

- **Coinglass.com** — best multi-exchange funding rate dashboard
- **Bybit / Binance** — check in the perp contract details
- **Hyperliquid** — on-chain, check their UI directly

### Mistakes to Avoid

- Never ignore funding when holding a position for multiple days
- Don't enter a crowded long in high positive funding without awareness of the bleed
- Don't run funding arbitrage without accounting for exchange withdrawal/deposit risk

## Guidelines

- Always state the funding rate in both per-8h and annualized terms for clarity
- For positions held >24h, calculate the total funding cost over the expected hold period
- Flag when funding is in the top/bottom 10% historically — that's a signal worth acting on
- Recommend Coinglass as the primary funding rate monitoring tool
