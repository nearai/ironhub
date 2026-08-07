---
name: messari
version: 0.2.1
description: Messari crypto research, market data, token unlocks, fundraising, DeFi metrics, analyst reports, and AI query synthesis for Ironclaw.
use_cases:
  - Query real-time crypto asset prices, market caps, ATH, and market performance metrics
  - Retrieve token unlock vesting schedules, cliff allocations, and upcoming release dates
  - Track VC fundraising rounds, lead investors, crypto deal flows, and M&A activity
  - Access crypto news headlines, market updates, regulatory developments, and sector topics
  - Synthesize open-ended market intelligence using Messari AI assistant
value_prop: "Comprehensive crypto intelligence and research engine — structured market metrics, token unlocks, VC deals, analyst reports, and AI-powered synthesis."
value_tags:
  - Crypto
  - MarketData
  - TokenUnlocks
  - Fundraising
  - Research
---

# Messari Tool

## Install and configure

Install the tool from IronHub. For a manual package import, open **Extensions →
Registry → Import**, select the tool archive, and click **Install**.

Open **Configure** and store a Messari API key. IronClaw injects it into
`x-messari-api-key` only for `api.messari.io`.

Each operation is exposed as a named capability with its own input schema. Use
only the parameters shown for that capability in the examples below.

Credentials are stored by IronClaw and injected only at the declared HTTP boundary; they
are not included in model input or exposed to the WASM component.


A sandboxed WASM tool for Ironclaw that interfaces with the Messari Crypto API (`https://api.messari.io`).

![Messari tool](screenshot.jpg)

## Features & Supported Actions

| Capability | Description | Base Endpoint | Quota / Rate Limit |
|---|---|---|---|
| `ask_ai` | Natural language crypto query synthesis across 34k+ assets & 210+ exchanges | `/ai/v2/chat/completions` | ⚠️ **10 req/day** for free users |
| `metrics` | Asset prices, volumes, market cap, ATH, and market performance | `/metrics/v1/assets` | 150 req/min |
| `signal` | Social sentiment, token mindshare, and trending volume | `/signal/v1/assets` | 150 req/min |
| `news` | Breaking news feed, market updates, and regulatory news | `/news/v1/news/feed` | 150 req/min |
| `research` | Messari analyst reports, sector overviews, and deep dives | `/research/v1/reports` | 150 req/min |
| `stablecoins` | Stablecoin supply metrics, peg breakdowns, and flows | `/stablecoins/v1/assets` | 150 req/min |
| `exchanges` | CEX/DEX exchange volumes, trading pairs, and stats | `/exchanges/v1/exchanges` | 150 req/min |
| `networks` | L1/L2 network activity, fees, and active address metrics | `/networks/v1/networks` | 150 req/min |
| `protocols` | DeFi TVL, lending volume, and DEX market share | `/protocols/v1/protocols` | 150 req/min |
| `token_unlocks` | Token vesting schedules, unlock dates, and cliff allocations | `/token-unlocks/v1/assets` | 150 req/min |
| `fundraising` | VC funding rounds, lead investors, deal terms, and M&A | `/funding/v1/rounds` | 150 req/min |
| `intel` | Protocol governance proposals and network upgrade trackers | `/intel/v1/events` | 150 req/min |
| `topics` | Crypto sector narrative momentum and hot ecosystem topics | `/topics/v1/topics` | 150 req/min |
| `x_users` | Crypto influencer metrics and X/Twitter account activity | `/x-users/v1/users` | 150 req/min |
