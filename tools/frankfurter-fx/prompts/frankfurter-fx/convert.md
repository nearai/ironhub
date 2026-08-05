# Frankfurter FX: convert

Action discriminator for currency conversion.

Legacy tool context: Frankfurter FX & Money Exchange Tool — Foreign Exchange (FX) rates, currency converter, multi-currency portfolio conversion, and historical FX rate analytics powered by Central Bank data via Frankfurter v2. Public API, no authentication required.

## Inputs

- `from` (required): Base currency ISO code (e.g. 'USD', 'EUR', 'GBP').
- `to` (required): Quote target currency ISO code (e.g. 'VND', 'JPY', 'EUR').
- `amount` (optional): Amount of base currency to convert (e.g. 169.0).
- `date` (optional): Optional specific historical date in YYYY-MM-DD format (e.g. '2024-01-15'). Defaults to latest rates.

The operation is selected by IronClaw as `frankfurter-fx.convert`. Do not send the private `action` selector.
