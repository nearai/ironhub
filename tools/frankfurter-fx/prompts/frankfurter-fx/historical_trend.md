# Frankfurter FX: historical_trend

Action discriminator for historical FX analytics.

Legacy tool context: Frankfurter FX & Money Exchange Tool — Foreign Exchange (FX) rates, currency converter, multi-currency portfolio conversion, and historical FX rate analytics powered by Central Bank data via Frankfurter v2. Public API, no authentication required.

## Inputs

- `base` (required): Base currency ISO code (e.g. 'USD').
- `quote` (required): Quote currency ISO code (e.g. 'VND').
- `period` (optional): Relative time period preset (defaults to '30d').
- `from_date` (optional): Start of date range in YYYY-MM-DD format (overrides relative period preset if to_date is also set).
- `to_date` (optional): End of date range in YYYY-MM-DD format.
- `group` (optional): Optional time grouping for downsampling rates ('week' or 'month').

The operation is selected by IronClaw as `frankfurter-fx.historical_trend`. Do not send the private `action` selector.
