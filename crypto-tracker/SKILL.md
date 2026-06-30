---
name: crypto-tracker
version: 1.0.0
description: Fetch and interpret cryptocurrency prices, market data, and token analytics
activation:
  keywords:
    - "crypto price"
    - "token price"
    - "bitcoin"
    - "ethereum"
    - "market cap"
    - "coin"
    - "what is BTC"
    - "ETH price"
    - "NEAR price"
    - "crypto market"
  patterns:
    - "(?i)(price|value|worth).*of.*(token|coin|crypto|btc|eth|near)"
    - "(?i)(how much is|what is).*(trading at|worth|priced)"
    - "(?i)(bull|bear|pump|dump|ath|dip).*market"
  tags:
    - "crypto"
    - "finance"
    - "data"
  max_context_tokens: 2000
requires:
  tools: []
  credentials: []
  permissions: read-only
---

# Crypto Tracker Skill

Helps the agent fetch, interpret, and explain cryptocurrency prices, market trends, and token data using real-time tools.

## Hard rules

- This skill is **read-only** — it never places orders, executes trades, or moves funds
- Never expose API keys, wallet addresses, or private credentials in any output
- All data is for **informational purposes only** — not financial advice
- Always state data freshness — never present stale data as current
- Do not store or log any user portfolio or financial data
- If asked to execute a trade or place an order, refuse and redirect to a human decision
- Dry-run/read-only behavior by default — no side effects

## When to Use

- User asks about the price of any cryptocurrency or token
- User wants market cap, volume, or 24h change data
- User mentions specific tokens: BTC, ETH, NEAR, SOL, etc.
- User wants to compare token performance

## Core Knowledge

### Key Principles

1. **Always fetch live data** — never guess or use memorized prices; crypto moves fast
2. **Provide context** — a price alone is useless; include 24h change, market cap, and trend direction
3. **Name the source** — always state where the data came from (CoinGecko, CoinMarketCap, NEAR RPC, etc.)
4. **Explain the numbers** — not all users are traders; briefly interpret what the data means

### Data Points to Include

When reporting on a token, always try to include:
- Current price (USD and relevant pair)
- 24h % change (with 📈 or 📉 indicator)
- Market cap rank
- 24h trading volume
- ATH and % below ATH (if relevant)

### Common Patterns

- For price queries: fetch → format → contextualize
- For trend queries: compare 7d/30d performance, note major events
- For NEAR ecosystem tokens: use NEAR RPC or Ref Finance data where possible

### Mistakes to Avoid

- Never state a price without a timestamp — crypto prices are time-sensitive
- Don't confuse market cap with price
- Avoid making price predictions; present data only

## Guidelines

- Use CoinGecko API for broad market data
- Use NEAR RPC for on-chain NEAR token data
- Always include: "Data as of [timestamp]" at the end of price reports
- If a token is not found, suggest the closest match and ask for confirmation
