# Frankfurter FX: search_currencies

Action discriminator for currency metadata search.

Legacy tool context: Frankfurter FX & Money Exchange Tool — Foreign Exchange (FX) rates, currency converter, multi-currency portfolio conversion, and historical FX rate analytics powered by Central Bank data via Frankfurter v2. Public API, no authentication required.

## Inputs

- `query` (optional): Optional search term to filter currency codes, names, or symbols (e.g. 'Dong', 'VND', 'Yen').
- `scope` (optional): Set to 'all' to include historical legacy currencies.

The operation is selected by IronClaw as `frankfurter-fx.search_currencies`. Do not send the private `action` selector.
