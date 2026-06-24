---
name: ta-engine
version: 0.1.0
description: Deterministic technical-analysis engine for Ironclaw. Fetches Binance Spot klines and computes EMA/RSI/MACD/StochRSI/ADX/ATR/Bollinger/OBV/CMF/VWAP plus a weighted multi-timeframe confluence verdict with ATR-based stop-loss/take-profit. Moves all TA math out of the LLM.
use_cases:
  - Compute reliable indicator values from live Binance candles
  - Produce a weighted multi-timeframe (4H/1H/15M) confluence verdict
  - Return ATR-based stop-loss and scaled take-profit levels
value_prop: "Numerically correct technical analysis — math runs in sandboxed Rust, not the LLM."
value_tags:
  - Trading
  - Crypto
  - TechnicalAnalysis
---

# TA Engine — Deterministic Technical Analysis for Ironclaw

Pairs with the **binance-ta-expert-v2** skill. The skill decides *what* to analyze and
*narrates* the result; this tool does the *math*.

## Why

LLMs are unreliable at multi-step arithmetic. The v1 trading skill asked the model to compute
EMA/RSI/MACD/ADX/ATR from hundreds of raw candles in-context — slow, token-heavy, and often
numerically wrong. TA Engine moves every calculation into sandboxed Rust and returns a compact,
scored JSON verdict. **Raw candles are fetched and processed inside the tool; they never enter
the LLM context.**

## Commands

### `analyze` — multi-timeframe confluence

```json
{ "command": "analyze", "symbol": "BTCUSDT", "intervals": ["4h","1h","15m"], "limit": 300 }
```

`intervals` defaults to `["4h","1h","15m"]`, `limit` to `300`. Returns per-timeframe indicator
snapshots + component scores (trend/momentum/volume/structure), a weighted overall verdict
(macro timeframes weighted higher), key support/resistance levels, and an ATR-based risk plan.

### `indicators` — single timeframe

```json
{ "command": "indicators", "symbol": "ETHUSDT", "interval": "1h", "limit": 300 }
```

Returns one `TimeframeReport` (indicator values + score) without cross-timeframe aggregation.

## Indicators computed

EMA(9/21/50/200), SMA, RSI(14, Wilder), MACD(12/26/9), Stochastic RSI(14/14/3/3),
ADX(14) + DI±, ATR(14, Wilder), Bollinger(20,2), OBV, CMF(20), VWAP, swing-pivot S/R.

## Scoring

Each component scores −1/0/+1 per the rubric (see skill §6). Confluence = sum, mapped to a
labelled verdict (STRONG BUY … STRONG SELL). Overall = timeframe-weighted (4H=3, 1H=2, 15M=1).

## Security

Binance Spot market-data endpoints are **public** — this tool sends **no credentials** and
declares **no secrets**. The host allowlist restricts it to `api.binance.com` and
`api.binance.us` under `/api/v3`, GET only. Read-only: no orders, accounts, or futures.

## Building

```bash
cargo test                              # native — runs all pure-logic tests
cargo build --release --target wasm32-wasip2
cp target/wasm32-wasip2/release/ta_engine_tool.wasm ./ta_engine_tool.wasm
```

The `.wasm` component sits next to `ta-engine-tool.capabilities.json`.

## Trust note

WASM/MCP tools are stripped from the LLM at the **Installed** trust tier (see findings §4).
Run this tool + skill **Trusted** (placed in a user/workspace skills directory) so the engine
stays callable.
