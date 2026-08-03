# CoinGecko: coin_details

Run the legacy coin details operation. See the prompt and input schema for its exact contract.

Legacy tool context: Universal cryptocurrency crypto price and market tool for CoinGecko. Support for both free Demo API key (api.coingecko.com) and Pro API key (pro-api.coingecko.com).

## Inputs

- `id` (required): The coin ID (e.g. 'bitcoin').
- `localization` (optional): Include localized languages. Default is false.
- `tickers` (optional): Include exchange tickers. Default is false.
- `market_data` (optional): Include market data. Default is true.
- `community_data` (optional): Include community data. Default is false.
- `developer_data` (optional): Include developer data. Default is false.
- `sparkline` (optional): Include sparkline data. Default is false.
- `pro` (optional): Set to true to use the Pro API domain. Default is false.

The operation is selected by IronClaw as `coingecko.coin_details`. Do not send the private `action` selector.
