---
name: dca-strategist
version: 1.0.0
description: Build dollar cost averaging plans for long-term crypto accumulation with schedule and sizing optimization
activation:
  keywords:
    - "DCA"
    - "dollar cost average"
    - "accumulate"
    - "buy regularly"
    - "long term buying"
    - "weekly buy"
    - "monthly buy"
    - "stack sats"
    - "accumulation plan"
  patterns:
    - "(?i)(DCA|dollar.?cost.?averag).*(plan|strategy|into|bitcoin|eth)"
    - "(?i)(accumulate|stack|build position).*(slowly|over time|long term)"
    - "(?i)(buy|invest).*(weekly|monthly|every|regularly).*(bitcoin|eth|crypto)"
  tags:
    - "trading"
    - "strategy"
    - "long-term"
  max_context_tokens: 2000
---

# DCA Strategist Skill

Designs disciplined dollar cost averaging plans for long-term crypto accumulation — optimizing schedule, sizing, and asset selection for consistent wealth building.

## When to Use

- User wants a long-term accumulation strategy
- User asks how to DCA into Bitcoin, ETH, or other assets
- User wants to invest regularly without timing the market
- User wants to optimize their existing DCA strategy

## Core Knowledge

### Key Principles

1. **Time in market > timing the market** — consistent buying over time beats trying to pick bottoms
2. **Automate to remove emotion** — set the plan and execute mechanically; don't let fear stop a buy
3. **DCA is not passive — optimize it** — value averaging and bear market acceleration improve returns
4. **Asset selection matters most** — DCA into a dying asset doesn't work; choose wisely

### DCA Strategy Types

**Standard DCA (simplest)**
- Buy a fixed dollar amount on a fixed schedule (weekly/monthly)
- No market timing, fully automated
- Best for: beginners, busy investors, pure long-term holders

**Value Averaging DCA (smarter)**
- Set a target portfolio value growth per period (e.g., +$500/month)
- Buy MORE when price is down (to hit the target), buy LESS when price is up
- Result: automatically buys more in bear markets, less in bull markets
- Best for: investors who can vary their monthly investment

**Bear Market Acceleration**
- Standard DCA baseline every month
- Additional buy when asset drops >20% from recent high
- Additional buy when asset drops >40% from recent high
- Best for: investors with cash reserves watching for dips

### DCA Plan Template

```
ASSET: [BTC / ETH / Other]
TOTAL MONTHLY BUDGET: $[Amount]
STRATEGY: Standard / Value Averaging / Accelerated

SCHEDULE:
  Weekly: $[Amount] every [Day] — [Platform]
  Monthly: $[Amount] on [Date] — [Platform]

DIP ACCELERATION:
  -20% from ATH: Buy extra $[Amount]
  -40% from ATH: Buy extra $[Amount]
  -60% from ATH: Buy extra $[Amount] (maximum conviction)

REBALANCING:
  Frequency: [Quarterly/Annually]
  Rule: If any asset >X% of portfolio, trim back to target

STOP BUYING IF:
  [Fundamental thesis broken] — define what would make you stop
```

### Asset Allocation for DCA

**Conservative long-term**
- 70% BTC, 30% ETH

**Moderate long-term**
- 50% BTC, 30% ETH, 20% select altcoins

**Aggressive long-term**
- 40% BTC, 30% ETH, 30% high-conviction altcoins

**NEAR ecosystem focus**
- 40% BTC, 30% ETH, 30% NEAR/ecosystem tokens

### DCA Platforms

| Platform | Type | Notes |
|----------|------|-------|
| Coinbase | CEX | Auto-buy feature built in |
| Swan Bitcoin | BTC only | Best for BTC-only DCA |
| Binance | CEX | Recurring buy available |
| Strike | BTC only | Low fees, lightning network |
| DeFi (self-custody) | Manual | More control, more effort |

### Mistakes to Avoid

- Don't pause DCA during bear markets — that's when it matters most
- Don't DCA into assets with broken fundamentals
- Don't forget to account for fees — frequent small buys can have high fee impact
- Don't DCA without a thesis — know WHY you're accumulating this asset

## Guidelines

- Always ask: budget, timeframe, risk tolerance, and target assets
- Output a specific weekly/monthly schedule with dollar amounts
- Include a dip-buying acceleration rule in every plan
- Remind user: DCA is a marathon — measure success in years, not weeks
