---
name: perps-setup
version: 1.0.0
description: Set up perpetual futures trades including leverage, margin type, and liquidation price calculation
activation:
  keywords:
    - "perps"
    - "perpetual"
    - "futures trade"
    - "leverage trading"
    - "open a position"
    - "long bitcoin"
    - "short eth"
    - "set leverage"
    - "liquidation price"
    - "cross margin"
    - "isolated margin"
  patterns:
    - "(?i)(set up|open|enter).*(perp|perpetual|futures|leveraged).*(trade|position|long|short)"
    - "(?i)(what|calculate).*(liquidation price|liq price|leverage)"
    - "(?i)(cross|isolated).*(margin)"
  tags:
    - "perps"
    - "trading"
    - "futures"
  max_context_tokens: 2000
---

# Perps Setup Skill

Helps users correctly set up perpetual futures positions including leverage selection, margin type choice, and precise liquidation price calculation.

## When to Use

- User wants to open a leveraged long or short position
- User wants to calculate their liquidation price
- User is choosing between cross and isolated margin
- User wants to know safe leverage for their risk tolerance

## Core Knowledge

### Key Principles

1. **Leverage amplifies both gains AND losses** — 10x leverage means a 10% move wipes you out
2. **Isolated margin is safer for beginners** — it caps your loss to the margin allocated
3. **Always know your liquidation price before entering** — not after
4. **Lower leverage = longer survival** — most retail traders blow up using too much leverage

### Liquidation Price Formula

**For Long positions:**
```
Liq Price = Entry Price × (1 - 1/Leverage + Maintenance Margin Rate)

Example: Long BTC at $60,000 with 10x leverage
Liq Price = $60,000 × (1 - 0.1 + 0.005) = $60,000 × 0.905 = $54,300
```

**For Short positions:**
```
Liq Price = Entry Price × (1 + 1/Leverage - Maintenance Margin Rate)

Example: Short BTC at $60,000 with 10x leverage
Liq Price = $60,000 × (1 + 0.1 - 0.005) = $60,000 × 1.095 = $65,700
```

### Leverage Guide by Risk Level

| Risk Tolerance | Max Leverage | Notes |
|---------------|-------------|-------|
| Conservative | 2–3x | Wide stop, slow gains, hard to liquidate |
| Moderate | 5–10x | Standard retail range |
| Aggressive | 10–25x | Requires tight risk management |
| Degen | 25x+ | Near-certain liquidation without precision |

### Margin Types

**Isolated Margin** ✅ Recommended
- Only the margin you allocate can be lost
- Liquidated position doesn't affect rest of account
- Best for: directional bets with defined risk

**Cross Margin** ⚠️ Advanced
- Entire account balance backs the position
- Lower liquidation risk but larger potential loss
- Best for: hedging existing spot holdings

### Exchange-Specific Notes

- **Binance Futures**: Up to 125x, 0.5% maintenance margin
- **Bybit**: Up to 100x, unified margin account available
- **dYdX / GMX**: Decentralized perps, on-chain settlement
- **Hyperliquid**: On-chain perps with CEX-like UX

### Mistakes to Avoid

- Never use max leverage available — exchanges allow it but it's a trap
- Don't set stop loss AFTER entering — set it simultaneously
- Don't ignore funding rates — they compound over time on held positions

## Guidelines

- Always calculate and show liquidation price before recommending entry
- Ask: asset, direction (long/short), entry price, leverage, account size
- Recommend isolated margin by default unless user has a specific reason for cross
- Pair every setup with a stop loss recommendation
