---
name: memecoin-entry
version: 1.0.0
description: Time memecoin entries on pumps and dips using volume, chart structure, and momentum signals
activation:
  keywords:
    - "when to buy"
    - "good entry"
    - "ape in"
    - "entry point"
    - "buy the dip"
    - "memecoin entry"
    - "when to enter"
    - "is now a good time to buy"
  patterns:
    - "(?i)(when|where).*(buy|enter|ape).*(memecoin|token|coin)"
    - "(?i)(good|best).*(entry|time to buy|point to buy)"
    - "(?i)(buy the dip|buy now|ape in)"
  tags:
    - "memecoin"
    - "trading"
    - "entry"
  max_context_tokens: 2000
---

# Memecoin Entry Skill

Helps time memecoin buy entries using momentum signals, chart structure, volume analysis, and narrative strength.

## When to Use

- User wants to know when to enter a memecoin position
- User asks if now is a good time to buy
- User wants to buy a dip but isn't sure where
- User is watching a coin and needs an entry trigger

## Core Knowledge

### Key Principles

1. **Don't chase green candles** — entering after a 5x pump is not an entry, it's a gamble
2. **Volume confirms moves** — a price spike without volume is weak; volume + price = real momentum
3. **Narrative timing** — entry is strongest when the narrative is fresh but not yet mainstream
4. **Risk first** — define max loss before defining entry; never enter without knowing your exit

### Entry Frameworks

**The Dip Entry** (safest for memecoins)
- Coin has pumped and is pulling back
- Wait for 30–50% retrace from local high
- Enter when volume stabilizes (not still falling)
- Confirm with a green candle on 15m or 1h chart

**The Breakout Entry** (momentum play)
- Coin is consolidating at a level
- Wait for breakout above resistance with volume
- Enter on the candle close, not the wick
- Set stop below the breakout level

**The Early Launch Entry** (highest risk/reward)
- New launch on Pump.fun or similar
- Enter when bonding curve is 20–40% filled
- Small position only — high chance of failure
- Exit plan: sell half at 2x, let rest ride

### Entry Checklist

Before entering any memecoin:
- ✅ Rug check passed
- ✅ Liquidity sufficient (>$100k)
- ✅ Volume trending up, not down
- ✅ Narrative still active on social
- ✅ Position size set (max 1–5% of portfolio per memecoin)
- ✅ Exit targets defined

### Mistakes to Avoid

- Never FOMO into a coin already up 10x+ without a pullback
- Don't enter with more than you're willing to lose entirely
- Don't enter without a stop loss or exit plan

## Guidelines

- Always ask: what chain, what coin, what's the current price action?
- Give a specific entry zone, not a vague "buy the dip"
- Always pair entry with an exit plan (see memecoin-exit skill)
- Remind user: memecoins can go to zero — size accordingly
