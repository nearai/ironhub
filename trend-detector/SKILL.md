---
name: trend-detector
version: 1.0.0
description: Identify bull/bear trends, breakouts, reversals, and market structure shifts across timeframes
activation:
  keywords:
    - "is this bullish"
    - "is this bearish"
    - "trend analysis"
    - "market structure"
    - "breakout"
    - "reversal"
    - "uptrend"
    - "downtrend"
    - "trend change"
    - "higher highs"
    - "lower lows"
  patterns:
    - "(?i)(is (this|it)|are we).*(bullish|bearish|trending|reversing)"
    - "(?i)(breakout|breakdown|reversal|trend change|structure break)"
    - "(?i)(uptrend|downtrend|sideways|consolidation|range)"
  tags:
    - "trading"
    - "technical-analysis"
    - "trend"
  max_context_tokens: 2000
requires:
  tools: []
  credentials: []
  permissions: read-only
---

# Trend Detector Skill

Identifies the prevailing trend direction, detects breakouts and reversals, and determines market structure shifts across multiple timeframes.

## Hard rules

- This skill is **read-only** — it never places orders, executes trades, or moves funds
- Never expose API keys, wallet addresses, or private credentials in any output
- All data is for **informational purposes only** — not financial advice
- Always state data freshness — never present stale data as current
- Do not store or log any user portfolio or financial data
- If asked to execute a trade or place an order, refuse and redirect to a human decision
- Dry-run/read-only behavior by default — no side effects

## When to Use

- User wants to know if a market is in an uptrend or downtrend
- User asks if a breakout or reversal is happening
- User wants to know if the trend is still intact or changing
- User wants multi-timeframe trend analysis

## Core Knowledge

### Key Principles

1. **Trend is your edge** — trading with the trend dramatically improves win rate
2. **Higher timeframe > lower timeframe** — daily trend overrides hourly; always check top-down
3. **Structure defines trend** — higher highs + higher lows = uptrend; lower highs + lower lows = downtrend
4. **Break of structure (BOS) = trend change** — when price breaks a key swing low in an uptrend, the trend may be changing

### Trend Identification Framework

**Step 1: Top-down analysis**
- Start with the Weekly or Daily chart → defines the macro trend
- Then 4h → defines the intermediate trend
- Then 1h/15m → defines the entry-level trend

**Step 2: Define market structure**
- Mark swing highs and swing lows
- Uptrend: each swing high and low is higher than the last
- Downtrend: each swing high and low is lower than the last
- Range/Consolidation: highs and lows are roughly equal

**Step 3: Identify the trend phase**

| Phase | Characteristics |
|-------|----------------|
| Accumulation | Low volatility, sideways, smart money buying |
| Markup (uptrend) | Higher highs, higher lows, increasing volume |
| Distribution | Low volatility at highs, smart money selling |
| Markdown (downtrend) | Lower highs, lower lows, declining bounces |

### Breakout Detection

A valid breakout requires:
- Price closes ABOVE resistance (not just wicks through)
- Volume is significantly higher than average on the breakout candle
- Price retests the broken level and holds (retest = confirmation)

A fake breakout (fakeout) shows:
- Price breaks level but closes back below
- Low volume on the break
- Quick reversal after the break

### Reversal Signals

**Early reversal signals:**
- Break of market structure (BOS) — first lower high in an uptrend
- Bearish/bullish divergence on RSI or MACD
- Shooting star or hammer at key level with volume
- Failed breakout attempt

**Confirmed reversal:**
- Lower high AND lower low established (uptrend to downtrend)
- Price breaks below key moving average (200 EMA) on high volume
- Multiple timeframes align in new direction

### Multi-Timeframe Confluence

| Timeframe | Trend | Action |
|-----------|-------|--------|
| Daily: Up | 4h: Up | 1h: Up | Strong buy |
| Daily: Up | 4h: Up | 1h: Down | Wait for 1h to flip |
| Daily: Up | 4h: Down | 1h: Down | Don't buy, potential reversal |
| Daily: Down | 4h: Down | 1h: Down | Strong sell/short |

### Mistakes to Avoid

- Don't call a trend change from a single timeframe
- Don't confuse a pullback in an uptrend with a reversal
- Don't trade against the higher timeframe trend without strong reason

## Guidelines

- Always analyze at least 2 timeframes before calling a trend
- State clearly: Macro trend (daily) / Intermediate trend (4h) / Short-term trend (1h)
- Flag if timeframes are conflicting — that means wait, not trade
- Identify the nearest key level that would invalidate the current trend
