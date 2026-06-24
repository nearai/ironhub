---
name: daily-crypto-briefing
version: 1.0.0
description: "Sends one morning crypto digest to Telegram every day: live prices for the user's coins, profit/loss across their portfolio (positions and entry prices stored in memory), and the top 3 fresh crypto headlines from Reddit. Unlike the threshold alerts, this one is a daily habit — it sends every morning. Set up your positions once and the briefing builds itself from then on."
activation:
  keywords:
    - "daily briefing"
    - "crypto briefing"
    - "morning briefing"
    - "my portfolio"
    - "show briefing"
  patterns:
    - "(?i)(daily|morning|crypto)\\s+briefing"
    - "(?i)show\\s+(my\\s+)?briefing"
    - "(?i)my\\s+portfolio"
  tags:
    - "crypto"
    - "portfolio"
    - "briefing"
    - "automation"
  max_context_tokens: 2200
requires:
  tools:
    - http
    - memory
    - time
    - message
    - routine
  bins: []
  env: []
---
You send the user one crypto briefing every morning: prices, portfolio P&L, and the latest news.

## Hard rules
- Always read `crypto/portfolio.md` with `memory_read` before any change, then write the full file back with `memory_write`. Never overwrite from scratch and never drop positions. On the first run, if the file does not exist, create it with the example portfolio below and tell the user to edit it with their real holdings.
- Work out P&L by reasoning over the positions and fetched prices in plain language. Never write or run code to do the math. For each position: current value vs cost basis, and the percentage gain/loss.
- When computing portfolio totals, go position by position and state each one's cost basis and value before summing. The total invested must equal the sum of every position's cost basis, and total value the sum of every position's value — never skip, merge, or copy a figure between positions. Each position's P&L is computed from its own entry and current price only.
- Get prices with the `http` tool and the date from the `time` tool. Never guess a price or a date.
- Report only prices and headlines you actually fetched. If a price or the news feed fails, note it as unavailable — never invent a number or a headline.
- This briefing sends every day by design — it is not a silent threshold alert. Send the digest on each scheduled run.
- This is a record and digest, not advice. Never tell the user to buy or sell.
- Installing this skill does not create the routine by itself. After install, you must explicitly call the routine/mission creation tool yourself to register it — never assume the routine exists just because this file describes one. Confirm it was created (e.g. list active routines) before telling the user it's running.

## Portfolio
Positions live in `crypto/portfolio.md`. Example (created on first run if missing):
```
My Portfolio
- BTC: 0.5 tokens, entry price $60000
- ETH: 4 tokens, entry price $3000
- NEAR: 1000 tokens, entry price $3.00
```
Map each symbol to its CoinGecko id yourself (BTC=bitcoin, ETH=ethereum, NEAR=near, etc.).

## Daily briefing (routine)
Create a routine that runs every day at 9:00 AM UTC. The routine goal must contain these full steps as a self-contained prompt, because a routine does not keep any context from this conversation when it runs:
1. Read `crypto/portfolio.md` with `memory_read`.
2. Get today's date from the `time` tool.
3. Fetch current prices with the `http` tool: `https://api.coingecko.com/api/v3/simple/price?ids=[ids]&vs_currencies=usd&include_24hr_change=true`.
4. Fetch the latest news with the `http` tool from Reddit RSS: `https://www.reddit.com/r/cryptocurrency/new.rss` — take the top 3 post titles.
5. For each position, work out current value and P&L vs the entry price, then sum the totals position by position as described in the hard rules.
6. Send the briefing (format below).

Briefing format:
```
🌅 Daily Crypto Briefing — [date]
📊 Prices
- BTC: $[price] ([24h %])
- ETH: $[price] ([24h %])
...
💼 Your Positions
Token | Entry | Current | Value | P&L
BTC | $[X] | $[X] | $[X] | [+/-X]%
...
Total invested: $[X] | Current value: $[X] | Total P&L: $[X] ([+/-X]%)
📰 Top crypto news (Reddit)
1. [title]
2. [title]
3. [title]
```

## Commands
- `show briefing` — build and show the full briefing right now
- `show my portfolio` — list the positions stored in memory
