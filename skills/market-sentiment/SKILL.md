---
name: market-sentiment
version: 1.0.0
description: Gauge crypto market sentiment using fear/greed index, social data, funding rates, and on-chain signals
activation:
  keywords:
    - "market sentiment"
    - "fear and greed"
    - "is the market bullish"
    - "social sentiment"
    - "crowd psychology"
    - "market mood"
    - "are people bearish"
    - "twitter sentiment"
  patterns:
    - "(?i)(market|crypto).*(sentiment|mood|feeling|psychology)"
    - "(?i)(fear (and|&) greed|fear index)"
    - "(?i)(is (the market|everyone|crypto)).*(bullish|bearish|scared|euphoric|greedy)"
  tags:
    - "trading"
    - "sentiment"
    - "research"
  max_context_tokens: 2000
---

# Market Sentiment Skill

Gauges the overall crypto market sentiment by synthesizing fear/greed data, social signals, funding rates, and on-chain behavior into a clear directional bias.

## When to Use

- User wants to know the overall market mood
- User asks if the market is bullish, bearish, or neutral
- User wants to understand crowd psychology before making a trade
- User asks about fear/greed index or social sentiment

## Core Knowledge

### Key Principles

1. **Be fearful when others are greedy** — extreme sentiment readings are contrarian signals
2. **Sentiment leads price at extremes** — peak euphoria precedes tops; peak fear precedes bottoms
3. **Multiple signals > single index** — one indicator can be wrong; 5 aligned signals are powerful
4. **Sentiment shifts before price** — social and on-chain signals often lead price by hours or days

### Sentiment Indicators

**Fear & Greed Index (0–100)**
- 0–25: Extreme Fear → historically good buying opportunity
- 26–45: Fear → cautious accumulation zone
- 46–55: Neutral → no strong directional signal
- 56–75: Greed → be cautious with new longs
- 76–100: Extreme Greed → major caution, potential top signal
- Source: alternative.me/crypto/fear-and-greed-index

**Funding Rates**
- High positive funding → market is overleveraged long → bearish signal
- High negative funding → market is overleveraged short → bullish signal
- Neutral funding → balanced positioning

**Social Sentiment**
- Twitter/X: rising mentions + positive tone = retail FOMO incoming
- Google Trends: search spike for "buy bitcoin" = retail peak interest = contrarian sell signal
- Telegram/Discord: euphoric tone in communities = late stage of rally

**On-Chain Sentiment Signals**
- Exchange inflows rising → people moving to sell → bearish
- Exchange outflows rising → people withdrawing to hold → bullish
- Long-term holders selling → distribution phase
- New wallet addresses surging → new retail interest (late signal)

**Options Market**
- Put/Call ratio >1: more puts than calls → bearish sentiment
- Put/Call ratio <0.5: more calls than puts → bullish/greedy sentiment
- Implied volatility spike → fear or uncertainty

### Sentiment Synthesis

Rate each signal: Bullish (+1) / Neutral (0) / Bearish (-1)

Sum the scores:
- +4 to +5: Strong bullish sentiment
- +2 to +3: Mild bullish
- -1 to +1: Neutral/mixed
- -2 to -3: Mild bearish
- -4 to -5: Strong bearish (potential contrarian buy)

### Contrarian Rules

- Extreme Greed (>80) + overbought RSI + high funding = reduce longs
- Extreme Fear (<20) + oversold RSI + negative funding = consider accumulating
- Never fade sentiment at extremes without price action confirmation

### Mistakes to Avoid

- Don't use sentiment as a standalone trading signal — combine with price action
- Don't assume high fear = immediate bottom — markets can stay fearful
- Don't ignore sentiment because you're convicted in a trade direction

## Guidelines

- Always check at minimum: Fear/Greed index + funding rates + social tone
- Output: Overall sentiment score + individual indicator readings
- State clearly: Bullish sentiment / Bearish sentiment / Mixed sentiment
- For extreme readings, flag as a contrarian signal with ⚠️
