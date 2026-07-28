---
name: voulai-trading
version: 1.0.0
description: >-
  Trade a real on-chain crypto portfolio through the Voulai agent API. One
  per-strategy API key lets you read market data, run backtests, fund the
  strategy with a deposit address, and execute buys and sells that settle
  gaslessly through NEAR Intents into a custody wallet. You can put money in
  and trade it; you can never withdraw it — cashing out stays with the owner.
  Every call you make is logged and shown to them.
use_cases:
  - Run your own trading strategy on real funds without building custody or settlement
  - Screen tokens with prices, candles and z-score indicators, then act on the result
  - Backtest an idea over real price history before risking capital
  - Fund a strategy from NEAR, Ethereum or Solana and wait for the bridge to settle
value_prop: "Your agent trades real on-chain funds; Voulai keeps custody, settlement and the books."
value_tags:
  - Trading
  - Crypto
  - Automation
activation:
  keywords:
    - "voulai"
    - "agent trading"
    - "trading strategy"
    - "trade crypto"
    - "buy token"
    - "sell position"
    - "portfolio balance"
    - "near intents"
    - "custody wallet"
    - "deposit crypto"
    - "backtest strategy"
    - "on-chain trading"
  patterns:
    - "(?i)\\bvoulai\\b"
    - "(?i)(buy|sell|trade|swap)\\s+(some\\s+)?[a-z0-9]{2,10}\\b.*(token|coin|crypto|position)?"
    - "(?i)(my|the)\\s+(portfolio|position|holdings|strategy)\\s+(balance|value|pnl)?"
    - "(?i)(deposit|fund|withdraw|cash\\s*out)\\s+(the\\s+|my\\s+)?(strategy|wallet|portfolio|funds|money|profit)"
    - "(?i)backtest\\s+(a|this|my)?\\s*(idea|strategy)"
  tags:
    - "crypto"
    - "trading"
    - "defi"
    - "automation"
  max_context_tokens: 3000
requires:
  tools:
    - http
  skills: []
---

# Voulai trading skill

You can trade a real on-chain portfolio through the Voulai agent API. The user
who gave you the key created a strategy on Voulai, funded it, and scoped this
key to that one strategy.

## What this key can and cannot do

Can: read market helpers, read the portfolio and its history, execute buys and
sells on the strategy's custody wallet.

Can also: generate a deposit address so the user (or you) can fund the
strategy.

Cannot: withdraw, move funds to any address, touch any other strategy, or
change strategy settings. Those stay with the owner on voulai.xyz. Do not
promise the user you can move money out — you cannot, by construction. Point
them at `links.withdraw` from `/v1/agent/info` instead.

The owner can revoke this key at any moment. If a request returns 401 with a
revoked message, stop trading and tell the user.

## Authentication

Send the key in the `X-Voulai-Key` header on every request. Base URL:

```
https://voulai.xyz/api
```

## Start here

```
GET /v1/agent/info
```

Returns the strategy you are bound to, its `status`, whether the key may trade,
and your remaining budget for the rolling 24h window (swaps and USD notional).
Read it before your first trade and after a 429, so you reason about your limits
instead of discovering them as failures.

Trading requires `status: "running"`. If the owner pauses or stops the strategy,
trades are refused with `403` until they set it Running again — stop and tell
the user rather than retrying.

## Market data: the helper catalog

```
GET /v1/agent/helpers
```

Returns every read-only helper available to you, each with a description and
JSON Schemas for its input and output.

**This catalog is not a stable contract.** Helpers get added, changed and
retired. Call it and use what it returns — never hard-code a helper name, and
never assume a helper you used yesterday still exists. A retired helper answers
`410 Gone`; when that happens, re-read the catalog and adapt rather than retry.

Run one:

```
POST /v1/agent/helpers/run
{ "helper": "market.ohlcv", "input": { "symbol": "BTC", "interval": "1h", "lookback": 200 } }
```

Shape `input` from the helper's own `input_schema` in the catalog response.

The reply always has the same envelope, whatever the helper:

```json
{ "helper": "market.ohlcv", "version": "1.0.0", "output": { "candles": [ ... ] } }
```

**Read your result from `output`.** Its shape is the helper's `output_schema`
from the catalog — so `market.spot` gives `output.prices`,
`indicators.return_zscore_vs_benchmark` gives `output.z`, and so on. A missing
`output` means the call failed, not that the helper returned nothing.

## Funding: you can deposit, you cannot withdraw

You can put money IN. You can never take it out — no endpoint exists, and that
is deliberate: your key lives outside Voulai, so it is never allowed to move
funds past the account's perimeter.

**When the user asks to withdraw or cash out**, do not apologise and do not look
for an endpoint. Give them the link from `GET /v1/agent/info` (`links.withdraw`)
and tell them to withdraw there with their own wallet. That is the whole answer.

### Deposit

```
GET  /v1/agent/deposit/assets
```

What this strategy can be funded with: token references, their chains and
decimals. Read it first — a token reference from anywhere else risks an address
on the wrong chain, and those funds are unrecoverable.

```
POST /v1/agent/intents/deposit/cross-chain
{ "chain": "ethereum", "token": "<token from /deposit/assets>", "amount": "<minimal units>" }
```

Returns a deposit address on the source chain, plus `intent_id`, an expiry and
a quote. Supported chains today: `near`, `ethereum`, `solana`. Send only the
named asset, only on the named chain.

```
GET /v1/agent/intents/deposit/cross-chain/status?id=<intent_id>
```

`pending_deposit` → `bridging` → `success` (or `failed` / `refunded`). Wait for
`success` before you size a trade against the new balance; the funds are not
spendable until the bridge settles.

## Portfolio

```
GET /v1/agent/portfolio
```

Spendable cash in the base asset, plus every open position with quantity and
average cost — reconciled against real custody, not a cached guess.

```
GET /v1/agent/decisions?limit=20
```

Recent decision history, newest first. It includes trades you submitted *and*
any decided by Voulai's own agent, so read it before acting: it is the full
picture of what has happened to this portfolio.

## Trading

```
POST /v1/agent/trade
{ "action": "buy", "asset": "<token id>", "size_usd": 25, "reasoning": "why" }
{ "action": "sell", "asset": "<token id>", "fraction": 1, "reasoning": "why" }
```

- `buy` spends `size_usd` of the strategy's base asset into `asset`.
- `sell` reduces the held position by `fraction` (`1` = full exit).
- Trades are denominated against the base asset. There is no arbitrary
  token-to-token hop, because positions, average cost and PnL are all measured
  against that base.
- `reasoning` is stored and shown to the owner in their feed. Always send a
  real one — a human reads it to decide whether to keep you running.

### Which id to trade

`asset` must be a settlement asset id, and there is exactly one place to get one:

```
GET /v1/agent/assets
```

Use its `token` field verbatim. **Do not** pass ids from the market helpers:
`tokens.list` and `market.spot` speak price-feed ids (`dogecoin`, `shiba-inu`),
which exist for pricing and screening and are not settlement assets. Passing one
is refused with a 400 naming this endpoint.

The two vocabularies line up by `symbol` — that is how you take a candidate you
found with the market helpers and find the id you can actually trade. If a
symbol is not in `/v1/agent/assets`, this strategy cannot trade it at all, no
matter what the helpers report about it; pick another candidate rather than
retrying.

The response carries the execution record. `ok: false` means the swap did not
fill and nothing moved; it does not consume your daily budget.

## Limits

Your key's tier caps three things, all reported by `GET /v1/agent/info` under
`limits`:

- `requests_per_min` — how fast you may call, counted per key.
- `swaps_per_day` — settled swaps in the rolling `window_hours`.
- `daily_notional_usd` — USD traded in the same window.

`limits.used` tells you how much of the last two you have spent. Exceeding any
of them returns `429`. Back off and re-read `/v1/agent/info` rather than
retrying immediately — the reply says which ceiling you hit and how much room is
left.

Pace yourself against `requests_per_min`. It is counted per key, so it is
yours alone and sharing an IP with other agents does not consume it.

## When a dependency is down

`424` with `"code": "upstream_unavailable"` means a service behind us — the
custody/bridge API, the price feed — failed. Your request was fine and nothing
moved. Wait a few seconds and retry; it is the one error class here that is
worth retrying unchanged.

Read the `code`, not the status class: `424` is a `4xx` only because this API
is fronted by a CDN that would otherwise swallow a `5xx` body and replace it
with its own error page. Every other `4xx` here means fix the request.

## You are being logged

Every request you make — reads, trades, and anything refused — is recorded and
shown to the strategy's owner, along with the reason for each refusal. This is
not a reason to be timid; it is a reason to be honest. Send real `reasoning`,
don't retry into a limit, and don't attempt things you were already told no to.

## Hard rules

1. Re-read the helper catalog instead of assuming it. It will change.
2. Send honest `reasoning` on every trade. The owner reads it.
3. On `401`, stop trading — the key is revoked or wrong.
4. On `429`, stop trading until the window frees up.
5. On `424`, wait a few seconds and retry the same call — a dependency blinked.
6. Never claim you can withdraw. Give the user `links.withdraw` and let them
   do it with their own wallet.
