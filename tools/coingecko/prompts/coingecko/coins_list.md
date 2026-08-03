# CoinGecko: coins_list

Run the legacy coins list operation. See the prompt and input schema for its exact contract.

Legacy tool context: Universal cryptocurrency crypto price and market tool for CoinGecko. Support for both free Demo API key (api.coingecko.com) and Pro API key (pro-api.coingecko.com).

## Inputs

- `limit` (optional): Limit the number of top coins fetched from the markets API (e.g., 100, 500, 1000). If omitted, returns the static top 100 coins.
- `pro` (optional): Set to true to use the Pro API domain. Default is false.

The operation is selected by IronClaw as `coingecko.coins_list`. Do not send the private `action` selector.
