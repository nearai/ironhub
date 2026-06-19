---
name: chart-reader
version: 1.0.0
description: Interpret price charts, candlestick patterns, support/resistance levels, and chart structures
activation:
  keywords:
    - "read this chart"
    - "what does the chart say"
    - "candlestick"
    - "support level"
    - "resistance level"
    - "price action"
    - "chart pattern"
    - "double top"
    - "head and shoulders"
    - "bull flag"
  patterns:
    - "(?i)(read|interpret|analyze|look at).*(chart|candle|price action)"
    - "(?i)(support|resistance|level).*(at|around|near)"
    - "(?i)(what (is|does)).*(chart|pattern|candle).*(saying|showing|mean)"
  tags:
    - "trading"
    - "technical-analysis"
    - "charts"
  max_context_tokens: 2000
---

# Chart Reader Skill

Interprets price charts by identifying candlestick patterns, support/resistance levels, chart structures, and what they imply about future price direction.

## When to Use

- User shares a chart or describes price action and wants interpretation
- User asks about support, resistance, or key price levels
- User wants to identify a chart pattern (flag, wedge, head & shoulders, etc.)
- User wants to know if a chart is bullish or bearish

## Core Knowledge

### Key Principles

1. **Price action is the primary signal** — what the candles are doing matters more than any indicator
2. **Support and resistance are zones, not lines** — price respects areas, not exact numbers
3. **Pattern context matters** — a bullish pattern in a downtrend is weaker than in an uptrend
4. **Volume confirms structure** — any breakout or reversal without volume is suspect

### Candlestick Patterns

**Bullish Reversal**
- Hammer: small body, long lower wick — buyers stepped in hard
- Bullish Engulfing: green candle fully engulfs previous red — momentum shift
- Morning Star: 3-candle reversal — indecision → rejection → confirmation
- Doji at support: indecision at key level — potential reversal

**Bearish Reversal**
- Shooting Star: small body, long upper wick — sellers rejected the push
- Bearish Engulfing: red candle fully engulfs previous green — sellers took over
- Evening Star: 3-candle top reversal
- Doji at resistance: indecision at key level — potential rejection

**Continuation**
- Bullish Flag: tight pullback after strong move up — likely to continue up
- Bear Flag: tight bounce after strong move down — likely to continue down
- Inside Bar: consolidation — breakout direction determines next move

### Chart Structures

| Pattern | Implication |
|---------|------------|
| Higher highs + higher lows | Uptrend intact |
| Lower highs + lower lows | Downtrend intact |
| Head & Shoulders | Major top reversal |
| Inverse H&S | Major bottom reversal |
| Double Top | Bearish reversal at resistance |
| Double Bottom | Bullish reversal at support |
| Ascending Triangle | Bullish breakout likely |
| Descending Triangle | Bearish breakdown likely |
| Symmetrical Triangle | Breakout either direction — watch volume |

### Support & Resistance Rules

- Previous highs become resistance; previous lows become support
- The more times a level is tested, the more significant it is
- A level that flips (support becomes resistance or vice versa) is very strong
- Round numbers ($50,000, $100, $1.00) act as psychological S/R

### Mistakes to Avoid

- Don't identify a pattern and ignore the broader trend context
- Don't treat a single candle as a confirmed signal — wait for the close
- Don't draw too many lines — 2–3 key levels are more useful than 20

## Guidelines

- Always identify: timeframe, trend direction, key levels, and nearest pattern
- State the bullish and bearish scenarios — don't just pick one
- Always note: "Wait for candle close to confirm" before calling a pattern complete
- Pair every chart read with a suggested invalidation level
