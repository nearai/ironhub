---
name: liquidation-hunter
version: 1.0.0
description: Identify liquidation clusters and trade around them for high-probability entries and exits
activation:
  keywords:
    - "liquidation"
    - "liq cluster"
    - "liquidation map"
    - "liquidation zone"
    - "where are the liquidations"
    - "hunt stops"
    - "stop hunt"
    - "liquidation cascade"
  patterns:
    - "(?i)(liquidation|liq).*(cluster|map|zone|level|cascade)"
    - "(?i)(where are|find|check).*(liquidations|liq levels|stops)"
    - "(?i)(stop hunt|stop loss hunt|wick to)"
  tags:
    - "perps"
    - "trading"
    - "liquidations"
  max_context_tokens: 2000
---

# Liquidation Hunter Skill

Identifies where liquidation clusters sit on the order book and uses that information to anticipate price wicks, stop hunts, and high-probability reversal zones.

## When to Use

- User wants to know where major liquidations are clustered
- User wants to trade around liquidation cascades
- User suspects a stop hunt is occurring
- User wants to set entries near likely liquidation wicks

## Core Knowledge

### Key Principles

1. **Liquidity attracts price** — markets move toward areas of clustered stop losses and liquidations before reversing
2. **Liquidation cascades accelerate moves** — when a liquidation level is hit, forced selling/buying creates momentum
3. **Wicks are opportunities** — price often wicks into a liquidation zone and reverses sharply — good entry point
4. **Large liquidations = large moves** — monitor for $10M+ liquidation events as momentum signals

### How Liquidation Clusters Form

- Traders set stop losses at obvious levels (round numbers, recent highs/lows, support/resistance)
- Market makers and large players know where these stops are
- Price is pushed into those zones to trigger liquidations, collect liquidity, then reverse
- The result: a sharp wick followed by a strong move in the opposite direction

### Reading a Liquidation Map

Use **Coinglass Liquidation Heatmap**:
- **Bright yellow/orange zones** = massive liquidation clusters
- **Price gravitates toward these zones** before reversing
- If price is below a large long liquidation cluster → likely to wick up to it
- If price is above a large short liquidation cluster → likely to wick down to it

### Trading Liquidation Zones

**Strategy 1: Fade the wick**
- Identify a large liquidation cluster above/below current price
- Wait for price to wick into that zone
- Enter the opposite direction as liquidations are triggered
- Stop loss just beyond the cluster

**Strategy 2: Ride the cascade**
- When a liquidation cascade begins (large liquidation event on Coinglass)
- Enter in the direction of the cascade momentum
- Exit quickly — cascades reverse fast after liquidity is consumed

**Strategy 3: Avoid the hunt**
- If your stop loss is at an obvious level (round number, recent high/low)
- Move it slightly beyond or use a mental stop to avoid being hunted

### Key Tools

| Tool | Use |
|------|-----|
| Coinglass Liquidation Heatmap | See clustered liquidation levels |
| Coinglass Liquidations Feed | Real-time large liquidation events |
| Hyblock Capital | Advanced liquidation level analytics |

### Mistakes to Avoid

- Don't place stop losses at round numbers or obvious technical levels — they get hunted
- Don't trade against a liquidation cascade in progress — wait for it to exhaust
- Don't assume every wick into a liq zone will reverse — confirm with volume

## Guidelines

- Always reference Coinglass heatmap data when discussing liquidation levels
- Give specific price levels, not vague zones
- Pair every liquidation trade setup with a stop loss and target
- Remind user: liquidation hunting is high-skill trading — size conservatively
