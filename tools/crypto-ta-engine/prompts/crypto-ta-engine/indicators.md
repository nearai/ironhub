# Crypto TA Engine: indicators

Single-timeframe raw indicator snapshot.

Legacy tool context: Deterministic technical-analysis engine. Fetches Binance Spot klines (public market data, no key) and computes indicators + multi-timeframe confluence scoring.

## Inputs

- `symbol` (required): Trading pair, e.g. BTCUSDT. Separators (/, -) are stripped automatically.
- `interval` (required): Single timeframe, e.g. '1h'. Valid: 1m,3m,5m,15m,30m,1h,2h,4h,6h,8h,12h,1d,3d,1w,1M
- `limit` (optional): Candles (default 300, max 1000). Use >=200 for reliable EMA200/ADX/ATR.

The operation is selected by IronClaw as `crypto-ta-engine.indicators`. Do not send the private `command` selector.
