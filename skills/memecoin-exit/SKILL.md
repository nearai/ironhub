---
name: memecoin-exit
version: 1.0.0
description: Know when to take profit or cut losses on volatile memecoin positions
activation:
  keywords:
    - "when to sell"
    - "take profit"
    - "exit memecoin"
    - "cut losses"
    - "should I sell"
    - "how to exit"
    - "bag holding"
    - "is it too late to sell"
  patterns:
    - "(?i)(when|should I).*(sell|exit|take profit|cut).*(memecoin|coin|token|bag)"
    - "(?i)(take profit|cut loss|stop loss).*(memecoin|position)"
    - "(?i)(bag holding|bagholder|down bad)"
  tags:
    - "memecoin"
    - "trading"
    - "exit"
  max_context_tokens: 2000
---

# Memecoin Exit Skill

Guides users on when and how to exit memecoin positions — taking profits at the right time and cutting losses before they become catastrophic.

## When to Use

- User is in a memecoin position and unsure when to sell
- User wants a profit-taking strategy
- User is down and considering cutting losses
- User is bag holding and wants advice

## Core Knowledge

### Key Principles

1. **Profits are only real when taken** — unrealized gains mean nothing in memecoins; they evaporate fast
2. **Scale out, don't sell all at once** — take profits in tranches to maximize gains while staying in the trade
3. **Never let a win turn into a loss** — once up significantly, move stop loss to break-even minimum
4. **Cutting losses is a skill** — a 50% loss requires a 100% gain to recover; exit early

### Exit Frameworks

**The Tranche Exit** (recommended)
- Sell 25% at 2x — recover initial investment partially
- Sell 25% at 5x — take meaningful profit
- Sell 25% at 10x — secure major gains
- Let final 25% ride with stop at 5x — moonbag

**The Time-Based Exit**
- Memecoins have a cycle: launch → pump → dump → dead
- If coin hasn't moved in 48–72 hours after initial pump, exit
- Attention moves fast — if narrative fades, so does price

**The Signal-Based Exit**
Sell when you see:
- Volume dropping sharply while price holds (distribution)
- Dev wallet starts moving tokens
- Social mentions dropping off
- Whale wallets selling (check on-chain)
- New competing memecoin stealing the narrative

**The Loss Cut**
- Set a hard stop: if down 30–40% from entry, exit
- Don't average down on memecoins — they can go to zero
- Ask: "Would I buy this today at this price?" If no, sell.

### Mistakes to Avoid

- Never hold waiting to "get back to break-even" — cut and redeploy
- Don't sell 100% too early — use tranches
- Don't ignore on-chain signals because you like the meme

## Guidelines

- Always ask: what's the current P&L, entry price, and position size?
- Give specific price targets for each tranche based on current price
- If user is bag holding at a loss, assess whether the narrative is still alive before advising hold vs. cut
- End with: "Memecoins move fast — set alerts and don't leave positions unmonitored"
