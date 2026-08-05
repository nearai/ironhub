# Crypto TA Engine: analyze

Weighted multi-timeframe confluence verdict.

Legacy tool context: Deterministic technical-analysis engine. Fetches Binance Spot klines (public market data, no key) and computes indicators + multi-timeframe confluence scoring.

## Inputs

- `symbol` (required): Trading pair, e.g. BTCUSDT. Separators (/, -) are stripped automatically.
- `intervals` (optional): Timeframes top-down. Default ['4h','1h','15m']. Valid: 1m,3m,5m,15m,30m,1h,2h,4h,6h,8h,12h,1d,3d,1w,1M
- `limit` (optional): Candles per timeframe (default 300, max 1000). Use >=200 for reliable EMA200/ADX/ATR.

The operation is selected by IronClaw as `crypto-ta-engine.analyze`. Do not send the private `command` selector.
