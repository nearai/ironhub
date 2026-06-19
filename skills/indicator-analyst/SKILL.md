---
name: indicator-analyst
version: 1.0.0
description: Read and interpret RSI, MACD, Bollinger Bands, moving averages, and other technical indicators
activation:
  keywords:
    - "RSI"
    - "MACD"
    - "bollinger bands"
    - "moving average"
    - "EMA"
    - "SMA"
    - "overbought"
    - "oversold"
    - "indicator"
    - "stochastic"
    - "volume profile"
  patterns:
    - "(?i)(RSI|MACD|EMA|SMA|stoch|bollinger|VWAP|OBV).*(reading|showing|says|at|level)"
    - "(?i)(overbought|oversold|divergence|crossover|golden cross|death cross)"
    - "(?i)(what (does|is) the).*(indicator|RSI|MACD|EMA).*(say|mean|show)"
  tags:
    - "trading"
    - "technical-analysis"
    - "indicators"
  max_context_tokens: 2000
---

# Indicator Analyst Skill

Reads, interprets, and synthesizes technical indicators including RSI, MACD, Bollinger Bands, and moving averages to assess momentum, trend, and potential reversals.

## When to Use

- User asks about the reading of a specific indicator
- User wants to know if an asset is overbought or oversold
- User asks about indicator crossovers, divergences, or signals
- User wants multiple indicators synthesized into one view

## Core Knowledge

### Key Principles

1. **No indicator is perfect alone** — always combine at least 2–3 indicators for confluence
2. **Indicators lag** — they confirm what already happened; use them to validate, not predict alone
3. **Divergence is powerful** — when price and indicator disagree, the indicator often wins
4. **Context over signals** — an RSI of 70 in a strong uptrend means less than RSI 70 at major resistance

### Indicator Reference Guide

**RSI (Relative Strength Index)**
- Range: 0–100
- >70: Overbought (potential reversal or pullback)
- <30: Oversold (potential bounce or reversal)
- 40–60: Neutral zone
- Bullish divergence: Price makes lower low, RSI makes higher low → reversal signal
- Bearish divergence: Price makes higher high, RSI makes lower high → reversal signal
- Best timeframes: 1h, 4h, Daily

**MACD (Moving Average Convergence Divergence)**
- MACD line crosses above signal line → Bullish momentum
- MACD line crosses below signal line → Bearish momentum
- Histogram growing → momentum strengthening
- Histogram shrinking → momentum weakening
- Divergence between MACD and price = high-value signal

**Bollinger Bands**
- Price touching upper band → overbought in current trend
- Price touching lower band → oversold in current trend
- Band squeeze (bands narrow) → volatility contraction, big move coming
- Band expansion → trend is accelerating
- Price walking the upper band → strong uptrend
- Price walking the lower band → strong downtrend

**Moving Averages**
| MA | Use |
|----|-----|
| 20 EMA | Short-term trend, dynamic support/resistance |
| 50 EMA | Medium-term trend |
| 200 EMA/SMA | Long-term trend, major support/resistance |
| Golden Cross | 50 MA crosses above 200 MA → long-term bullish |
| Death Cross | 50 MA crosses below 200 MA → long-term bearish |

**VWAP (Volume Weighted Average Price)**
- Price above VWAP → bullish bias for the session
- Price below VWAP → bearish bias
- Great for intraday entries — buy near VWAP in uptrend

**Stochastic RSI**
- More sensitive than RSI
- >80: Overbought | <20: Oversold
- Best for short timeframes (15m, 1h)

### Confluence Framework

Strong signal = 3+ indicators agree:
- RSI oversold + MACD bullish cross + price at 200 EMA = strong buy signal
- RSI overbought + MACD bearish cross + price at upper Bollinger = strong sell signal

### Mistakes to Avoid

- Don't act on a single indicator signal — wait for confluence
- Don't use the same type of indicator twice (e.g., RSI + Stoch = two momentum indicators, not confirmation)
- Don't ignore divergence — it's one of the highest-probability signals in technical analysis

## Guidelines

- Always combine: one trend indicator (MA) + one momentum indicator (RSI/MACD) + one volatility indicator (BB)
- State whether indicators agree or conflict — conflict = wait for clarity
- Always specify the timeframe — an RSI reading on 5m means nothing compared to daily
- End with: overall bias (Bullish / Bearish / Neutral) based on indicator confluence
