---
name: order-builder
version: 1.0.0
description: Structure limit, market, stop, and advanced orders correctly across spot and derivatives markets
activation:
  keywords:
    - "limit order"
    - "market order"
    - "stop order"
    - "stop limit"
    - "how to place order"
    - "order type"
    - "OCO order"
    - "trailing stop"
    - "place a buy order"
  patterns:
    - "(?i)(limit|market|stop|OCO|trailing).*(order|buy|sell)"
    - "(?i)(how (do I|to) place|set up).*(order|buy|sell|stop)"
    - "(?i)(what (order|type)).*(should I use|is best)"
  tags:
    - "trading"
    - "execution"
    - "orders"
  max_context_tokens: 2000
requires:
  tools: []
  credentials: []
  permissions: read-only
---

# Order Builder Skill

Structures the correct order type for any trading situation — from simple limit buys to complex OCO and trailing stop orders — across spot and derivatives markets.

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

- User wants to place a buy or sell order and needs help structuring it
- User asks which order type to use in a specific situation
- User wants to set up a stop loss or take profit order
- User wants to understand advanced order types (OCO, trailing stop, etc.)

## Core Knowledge

### Key Principles

1. **Never use market orders for large positions** — market orders cause slippage; use limits
2. **Always have a stop loss order placed** — don't rely on manually watching the price
3. **OCO orders are your best friend** — set profit and stop simultaneously so you can walk away
4. **Post-only orders save fees** — maker orders are cheaper than taker orders on most exchanges

### Order Type Reference

**Market Order**
- Executes immediately at current best price
- Use when: speed matters more than price (news event, urgent exit)
- Risk: slippage on large orders or thin markets
- Never use for: large positions, illiquid assets

**Limit Order** ✅ Default choice
- Executes only at your specified price or better
- Use when: entering at a specific price, patient accumulation
- Benefit: no slippage, often maker fee (cheaper)
- Risk: may not fill if price doesn't reach your level

**Stop Market Order**
- Triggers a market order when price hits your stop level
- Use for: stop losses where getting out fast matters
- Risk: slippage past your stop in fast markets

**Stop Limit Order**
- Triggers a limit order when price hits your stop level
- Use for: stop losses in calmer markets
- Risk: may not fill if price gaps past your limit

**OCO (One-Cancels-the-Other)** ✅ Best for complete trade management
- Places a take-profit limit AND a stop-loss simultaneously
- When one fills, the other is automatically cancelled
- Use for: setting and forgetting a full trade plan

**Trailing Stop**
- Stop level moves with price in your favor, locks in profits
- Use for: riding strong trends while protecting gains
- Example: 5% trailing stop on BTC long — as BTC rises, stop rises with it

**TWAP (Time-Weighted Average Price)**
- Splits large order into smaller pieces over time
- Use for: entering/exiting very large positions without moving the market

### Order Building by Scenario

**Scenario: Entering a long at support**
```
Order: Limit Buy
Price: $X (at or just above support level)
Size: [Calculated from risk management]
```

**Scenario: Full trade with protection**
```
Entry: Limit Buy at $X
Then place OCO:
  Take Profit: Limit Sell at $Y
  Stop Loss: Stop Market at $Z
```

**Scenario: Breakout entry**
```
Order: Stop Limit Buy
Stop trigger: $X (breakout level)
Limit price: $X + 0.5% (to ensure fill above breakout)
```

**Scenario: Scaling out of a winning trade**
```
TP1: Limit Sell 25% at $A
TP2: Limit Sell 25% at $B
TP3: Trailing Stop 5% on remaining 50%
```

### Fee Optimization

- **Maker order** (limit that goes on the book): lower fee (~0.02–0.1%)
- **Taker order** (market or limit that fills immediately): higher fee (~0.04–0.1%)
- Use post-only limit orders when not in a rush — saves fees over hundreds of trades

### Mistakes to Avoid

- Never enter a trade without a stop loss order already placed
- Don't use market orders for >1% of daily volume of an asset
- Don't place stop losses at round numbers — they get hunted

## Guidelines

- Always ask: exchange, asset, direction, entry price, stop, and target
- Output the exact order parameters to copy into the exchange
- For complete trade setups, always include the OCO after entry
- Specify maker vs taker for each order to help user optimize fees
