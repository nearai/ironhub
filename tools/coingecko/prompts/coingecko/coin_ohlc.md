# CoinGecko: coin_ohlc

Run the legacy coin ohlc operation. See the prompt and input schema for its exact contract.

Legacy tool context: Universal cryptocurrency crypto price and market tool for CoinGecko. Support for both free Demo API key (api.coingecko.com) and Pro API key (pro-api.coingecko.com).

## Inputs

- `id` (required): The coin ID (e.g. 'bitcoin').
- `vs_currency` (required): Target currency (e.g. 'usd').
- `days` (required): Number of days of data.
- `pro` (optional): Set to true to use the Pro API domain. Default is false.

The operation is selected by IronClaw as `coingecko.coin_ohlc`. Do not send the private `action` selector.
