# CoinGecko: coin_market_chart

Run the legacy coin market chart operation. See the prompt and input schema for its exact contract.

Legacy tool context: Universal cryptocurrency crypto price and market tool for CoinGecko. Support for both free Demo API key (api.coingecko.com) and Pro API key (pro-api.coingecko.com).

## Inputs

- `id` (required): The coin ID (e.g. 'bitcoin').
- `vs_currency` (required): Target currency (e.g. 'usd').
- `days` (required): Number of days of historical data (e.g. '1', '7', '30', 'max').
- `interval` (optional): Data interval (e.g. 'daily'). Optional.
- `pro` (optional): Set to true to use the Pro API domain. Default is false.

The operation is selected by IronClaw as `coingecko.coin_market_chart`. Do not send the private `action` selector.
