# CoinGecko: list_categories

Run the legacy list categories operation. See the prompt and input schema for its exact contract.

Legacy tool context: Universal cryptocurrency crypto price and market tool for CoinGecko. Support for both free Demo API key (api.coingecko.com) and Pro API key (pro-api.coingecko.com).

## Inputs

- `order` (optional): Sort order. Default is 'market_cap_desc'.
- `pro` (optional): Set to true to use the Pro API domain. Default is false.

The operation is selected by IronClaw as `coingecko.list_categories`. Do not send the private `action` selector.
