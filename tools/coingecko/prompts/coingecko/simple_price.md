# CoinGecko: simple_price

Run the legacy simple price operation. See the prompt and input schema for its exact contract.

Legacy tool context: Universal cryptocurrency crypto price and market tool for CoinGecko. Support for both free Demo API key (api.coingecko.com) and Pro API key (pro-api.coingecko.com).

## Inputs

- `ids` (required): Comma-separated list of coin IDs (e.g. 'bitcoin,ethereum').
- `vs_currencies` (required): Comma-separated list of target currencies (e.g. 'usd,eur').
- `include_market_cap` (optional): Include market cap. Default is false.
- `include_24hr_vol` (optional): Include 24hr volume. Default is false.
- `include_24hr_change` (optional): Include 24hr price change percentage. Default is false.
- `include_last_updated_at` (optional): Include last updated timestamp. Default is false.
- `pro` (optional): Set to true to use the Pro API domain. Default is false.

The operation is selected by IronClaw as `coingecko.simple_price`. Do not send the private `action` selector.
