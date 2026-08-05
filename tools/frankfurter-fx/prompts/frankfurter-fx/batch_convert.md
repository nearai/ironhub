# Frankfurter FX: batch_convert

Action discriminator for batch multi-currency conversion.

Legacy tool context: Frankfurter FX & Money Exchange Tool — Foreign Exchange (FX) rates, currency converter, multi-currency portfolio conversion, and historical FX rate analytics powered by Central Bank data via Frankfurter v2. Public API, no authentication required.

## Inputs

- `from` (required): Base currency ISO code (e.g. 'USD').
- `targets` (required): List of target quote currency ISO codes (e.g. ['EUR', 'GBP', 'JPY', 'VND']).
- `amount` (optional): Amount of base currency to convert across all target currencies.

The operation is selected by IronClaw as `frankfurter-fx.batch_convert`. Do not send the private `action` selector.
