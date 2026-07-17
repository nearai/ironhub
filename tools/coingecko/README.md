---
name: coingecko
version: 0.1.0
description: Universal cryptocurrency price and market oracle for Ironclaw via the CoinGecko API. Retrieves current prices, market tables, detailed metadata, historical charts, candles, and trending assets. Supports both free Demo and Pro API keys.
use_cases:
  - Retrieve real-time cryptocurrency exchange rates and prices
  - List coin market data sorted and paginated by market cap
  - Fetch detailed coin descriptions, links, and supply statistics
  - Retrieve historical price charts and candlestick OHLC series
  - Search for coin IDs, exchanges, categories, and NFTs by keyword
value_prop: "Universal cryptocurrency price and market oracle — LLM-optimized outputs, downsampled historical charts, and dynamic Demo/Pro tier support."
value_tags:
  - Crypto
  - PriceFeed
  - MarketOracle
  - Finance
---

# CoinGecko Tool

A sandboxed WASM tool that gives an IronClaw agent access to the [CoinGecko API](https://docs.coingecko.com) for real-time cryptocurrency prices, market statistics, coin details, and historical data.

The host injects the API key at the HTTP boundary — the WASM code never sees the raw secret — and network access is restricted to `api.coingecko.com` and `pro-api.coingecko.com` as declared in `coingecko-tool.capabilities.json`.

![Coingecko tool](screenshot.png)

## Authentication

Configure your CoinGecko API key (Demo or Pro):

```bash
ironclaw tool setup coingecko-tool
```

During execution, the tool automatically uses the correct API key header. If you are using a Pro API key, pass `"pro": true` in your actions to target the Pro host (`pro-api.coingecko.com`).

## Actions

| Action | Required | Optional | Description |
|--------|----------|----------|-------------|
| `ping` | — | `pro` | Verify connection to the CoinGecko API server. |
| `simple_price` | `ids`, `vs_currencies` | `include_market_cap`, `include_24hr_vol`, `include_24hr_change`, `include_last_updated_at`, `pro` | Get current prices of specified coins. |
| `coin_markets` | `vs_currency` | `ids`, `category`, `order`, `per_page`, `page`, `sparkline`, `price_change_percentage`, `pro` | Get detailed market data (price, volume, high/low, etc.). |
| `coin_details` | `id` | `localization`, `tickers`, `market_data`, `community_data`, `developer_data`, `sparkline`, `pro` | Fetch pruned coin metadata (description, links, supply stats). |
| `coin_market_chart` | `id`, `vs_currency`, `days` | `interval`, `pro` | Get historical chart data (prices, caps, volumes) downsampled. |
| `coin_ohlc` | `id`, `vs_currency`, `days` | `pro` | Fetch candlestick OHLC data downsampled. |
| `trending_coins` | — | `pro` | Get trending coins, NFTs, and categories in the last 24h. |
| `list_categories` | — | `order`, `pro` | List all coin categories with market capitalization and volume. |
| `search` | `query` | `pro` | Search for coins, exchanges, categories, and NFTs by keyword. |
| `coins_list` | — | `limit`, `pro` | List supported coins. Queries the markets endpoint for top listings or falls back to a static top 100 list. |

### Key Parameters

*   **`pro`** (`boolean`): Set to `true` if you configured a CoinGecko Pro key. Targets `pro-api.coingecko.com`. Default is `false`.
*   **`days`** (`string`): Historical range. For charts: number of days or `"max"`. For OHLC: `"1"`, `"7"`, `"14"`, `"30"`, `"90"`, `"180"`, `"365"`, or `"max"`.
*   **`limit`** (`integer`): For `coins_list`, limits the dynamic markets query (1–1000). If omitted, returns the top 100 coins instantly using the static fallback list.

## Response Compaction

To operate safely under the **10 MB WASM linear memory limit** and prevent agent prompt token bloat, the tool performs the following optimizations:
- **Pruning**: `coin_details` discards bloated localization and exchange ticker data, returning compact English descriptions, links, market snapshots, and community/developer activity metrics.
- **Downsampling**: `coin_market_chart` and `coin_ohlc` automatically downsample historical series arrays to a maximum of **100 data points**.
- **OOM Mitigation**: The `coins_list` action avoids loading the massive 15,000+ full list in memory. It fetches paginated active listings or falls back to a static array of the top 100 coins.

## Examples

```json
// Ping the API
{ "action": "ping" }

// Get prices of BTC and ETH in USD and EUR
{
  "action": "simple_price",
  "ids": "bitcoin,ethereum",
  "vs_currencies": "usd,eur",
  "include_24hr_change": true
}

// Get top 10 coins by market cap
{
  "action": "coin_markets",
  "vs_currency": "usd",
  "per_page": 10
}

// Fetch detailed metadata for Solana
{
  "action": "coin_details",
  "id": "solana"
}

// Get historical chart for NEAR over last 30 days using a Pro key
{
  "action": "coin_market_chart",
  "id": "near",
  "vs_currency": "usd",
  "days": "30",
  "pro": true
}

// Search for assets matching "gala"
{
  "action": "search",
  "query": "gala"
}

// Get the top 100 coin IDs list instantly
{
  "action": "coins_list"
}
```
