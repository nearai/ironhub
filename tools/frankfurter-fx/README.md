---
name: frankfurter-fx
version: 0.2.0
description: Foreign exchange (FX) rates, currency conversions, multi-currency portfolio conversion, and historical rate analytics powered by Central Bank data via Frankfurter v2.
use_cases:
  - Convert amounts between global fiat currencies with instant calculation (e.g. $169 USD to VND)
  - Convert 1 base currency amount into multiple quote targets in a single request (batch_convert)
  - Analyze historical exchange rate trends, min/max bounds, averages, and percentage changes over time
  - Search ISO currency codes, currency symbols, and central bank data providers (ECB, FED, BOC, TCMB)
value_prop: "Token-optimized foreign exchange rate calculator and historical analytics engine powered by open central bank data."
value_tags:
  - Finance
  - Forex
  - CurrencyConversion
  - ExchangeRates
  - CentralBank
---

# Frankfurter FX Tool

## Install and configure

Install the tool from IronHub. For a manual package import, open **Extensions →
Registry → Import**, select the tool archive, and click **Install**.

No credential is required; Frankfurter is a public API.

Each operation is exposed as a named capability with its own input schema. Use
only the parameters shown for that capability in the examples below.

This package declares no credentials. Network egress remains restricted to the hosts
declared by each capability.


A sandboxed WASM tool for Ironclaw providing foreign exchange rates, calculations, and analytics using the Frankfurter v2 open-source API (`https://api.frankfurter.dev/v2`).

![Frankfurter tool](screenshot.jpg)

## Capabilities

- **`convert`**: Quick 1-to-1 currency conversion with rate lookup, mathematical calculation (`amount * rate`), and formatted output (e.g. `$169.00 USD = ₫4,301,134.50 VND`).
- **`batch_convert`**: Convert a base currency amount to multiple target quote currencies in 1 HTTP call.
- **`historical_trend`**: Analyze FX historical trends over date ranges or relative presets (`7d`, `30d`, `90d`, `1y`, `ytd`) with min, max, average, and percentage change.
- **`search_currencies`**: Search active and historical ISO currency codes, names, symbols, and central bank data providers.

## Key Highlights

- **Zero Authentication**: Open API, no secrets or API keys required.
- **Token Optimized**: Returns low-token YAML payloads to the agent.
- **Strict WASI Sandboxing**: Network calls strictly limited to `api.frankfurter.dev`.
