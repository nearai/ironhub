# CoinGecko: coin_markets

Run the legacy coin markets operation. See the prompt and input schema for its exact contract.

Legacy tool context: Universal cryptocurrency crypto price and market tool for CoinGecko. Support for both free Demo API key (api.coingecko.com) and Pro API key (pro-api.coingecko.com).

## Inputs

- `vs_currency` (required): Target currency (e.g. 'usd').
- `ids` (optional): Comma-separated list of coin IDs to filter. Optional.
- `category` (optional): Filter by coin category ID. Optional.
- `order` (optional): Sort order. Default is 'market_cap_desc'.
- `per_page` (optional): Total results per page (1-250). Default is 100.
- `page` (optional): Page number. Default is 1.
- `sparkline` (optional): Include sparkline 7-day data. Default is false.
- `price_change_percentage` (optional): Comma-separated timeframes (e.g. '1h,24h,7d'). Optional.
- `pro` (optional): Set to true to use the Pro API domain. Default is false.

The operation is selected by IronClaw as `coingecko.coin_markets`. Do not send the private `action` selector.
