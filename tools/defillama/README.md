---
description: DefiLlama DeFi analytics — protocol/chain TVL, token prices, stablecoin circulation, yield/APY pools, DEX volumes, and fees/revenue from the free open API. No API key, no auth setup.
use_cases:
  - Rank protocols/chains by TVL and pull their TVL history
  - Price any token by contract address or CoinGecko id, current or historical
  - Screen 15k+ yield pools by chain/project/symbol and chart a pool's APY
  - Compare DEX volumes, fees, and revenue across protocols and chains
value_prop: "The free DefiLlama dataset as one tool — 25 curated actions over TVL, prices, stablecoins, yields, volumes, and fees, with zero setup."
value_tags:
  - DeFi
  - Analytics
  - Research
---

# DefiLlama Tool

A sandboxed WASM tool that gives an IronClaw agent access to
[DefiLlama](https://defillama.com) — TVL, prices, stablecoins, yields, volumes,
and fees — via the **free open API**. No API key, no credentials, no setup.

> **Why no Pro support?** DefiLlama Pro puts the API key in the **URL path**
> (`pro-api.llama.fi/<KEY>/...` — both official SDKs; no header or query
> alternative exists, verified 2026-07-11), and the IronClaw *tools* lane does
> not substitute `url_path` credential placeholders (`registry.rs` never calls
> `with_credentials()`; `resolve_wasm_tool_credentials` skips `UrlPath` — only
> the *channels* lane wires placeholders). Pro support was built, field-tested,
> and deliberately removed rather than shipped broken. Revisit if DefiLlama
> adds header auth or the host wires tools-lane `url_path` substitution.

## Actions

All list/history outputs are summarized, sorted, and downsampled — several
DefiLlama endpoints return multi-MB payloads (7k+ protocols, 15k+ pools, years
of daily points) that would otherwise flood the model context. `limit` defaults
to 20 (max 100); `points` (time-series length) defaults to 90 (max 500).

### TVL

| Action | Required | Optional | Notes |
|---|---|---|---|
| `list_protocols` | — | `query`, `category`, `chain`, `limit` | Sorted by TVL desc. |
| `get_protocol` | `protocol` | `points` | Metadata + current per-chain TVL + downsampled TVL history. |
| `protocol_tvl` | `protocol` | — | Current TVL as one number. |
| `list_chains` | — | `limit` | All chains by TVL. |
| `chain_tvl_history` | — | `chain`, `points` | Omit `chain` for the all-chains total. |

### Token prices

`coins` is a comma-separated list of `{chain}:{address}` or `coingecko:{id}`,
e.g. `coingecko:ethereum,bsc:0x762539b45a1dcce3d36d080f74d1aed37844b878`.

| Action | Required | Optional |
|---|---|---|
| `current_prices` | `coins` | `search_width` |
| `historical_prices` | `coins`, `timestamp` | `search_width` |
| `price_chart` | `coins` | `start` or `end`, `span`, `period`, `search_width` |
| `price_percentage` | `coins` | `timestamp`, `look_forward`, `period` |
| `first_prices` | `coins` | — |
| `block` | `chain`, `timestamp` | — |

### Stablecoins

| Action | Required | Optional |
|---|---|---|
| `list_stablecoins` | — | `query`, `limit` |
| `get_stablecoin` | `stablecoin_id` (numeric id) | — |
| `stablecoin_history` | — | `chain`, `stablecoin_id`, `points` |
| `stablecoin_chains` | — | — |
| `stablecoin_prices` | — | `points` |

### Yields

| Action | Required | Optional |
|---|---|---|
| `list_pools` | — | `chain`, `project`, `symbol`, `limit` |
| `pool_history` | `pool` (UUID from `list_pools`) | `points` |

### Volumes & fees

| Action | Required | Optional |
|---|---|---|
| `dex_overview` | — | `chain`, `limit` |
| `dex_summary` | `protocol` | — |
| `options_overview` | — | `chain`, `data_type`, `limit` |
| `options_summary` | `protocol` | `data_type` |
| `open_interest_overview` | — | `limit` |
| `fees_overview` | — | `chain`, `data_type`, `limit` |
| `fees_summary` | `protocol` | `data_type` |

`data_type`: options → `dailyPremiumVolume`/`dailyNotionalVolume`; fees →
`dailyFees`/`dailyRevenue`/`dailyHoldersRevenue`.

## Examples

```jsonc
// Top 10 lending protocols on Ethereum
{ "action": "list_protocols", "category": "Lending", "chain": "Ethereum", "limit": 10 }

// ETH price now, and 24h change
{ "action": "current_prices", "coins": "coingecko:ethereum" }
{ "action": "price_percentage", "coins": "coingecko:ethereum" }

// Best USDC pools on Arbitrum
{ "action": "list_pools", "chain": "Arbitrum", "symbol": "USDC", "limit": 10 }

// Which DEX earned the most fees today?
{ "action": "fees_overview", "data_type": "dailyRevenue", "limit": 10 }

// Solana TVL over time
{ "action": "chain_tvl_history", "chain": "Solana", "points": 60 }
```

## Sandbox limits (why responses are shaped the way they are)

Actual IronClaw host defaults (from host source, not the older docs):

| Limit | Default | Where |
|---|---|---|
| WASM linear memory | **10 MB** | env `WASM_DEFAULT_MEMORY_LIMIT` (bytes) or DB setting `wasm.default_memory_limit` (DB shadows env) |
| Fuel (CPU metering) | 500M instructions | env `WASM_DEFAULT_FUEL_LIMIT` or `wasm.default_fuel_limit` |
| HTTP response size | 10 MB default | `max_response_bytes` in `capabilities.json` — this tool sets **6 MB** |
| Timeout | 60 s | `timeout_secs` |

The raw big endpoints are 8-19 MB of JSON (`/protocols` 7.9 MB,
`/protocol/aave` 9.5 MB, `/pools` 10.6 MB, `/stablecoin/1` 19.1 MB) and the
WIT `http-request` returns the body as ONE buffer — no streaming across the
host boundary. How this tool still stays small:

- **Gzip trick.** The host's reqwest is built *without* the gzip feature, so
  it neither sends `Accept-Encoding` nor decompresses. The tool requests
  `Accept-Encoding: gzip` itself; DefiLlama serves 2-3 MB compressed, and
  that is all that ever lands in WASM memory (`/protocols` 2.1 MB, `/pools`
  2.1 MB, `/protocol/aave` 2.9 MB).
- **Incremental inflate + byte-level JSON scanners.** The compressed body is
  inflated 64 KB at a time into scanners (`ArrayItemScanner`,
  `ObjectFieldScanner`) that emit one array row / one wanted field at a time.
  The full decompressed document never exists. Rows are filtered on the fly
  and ranked in a **bounded top-N** (memory O(limit)); `get_protocol` skips
  the multi-MB `chainTvls` block without buffering it.
- **Measured peaks** (tracking allocator on real gzip payloads, 2026-07):
  `list_pools` **2.5 MB**, `list_protocols` **2.8 MB**, `get_protocol` (aave)
  **3.2 MB** — vs ~67 MB for a naive `serde_json::Value` parse.
- **`get_stablecoin` never calls `/stablecoin/{asset}`** (19 MB for USDT);
  per-chain circulation comes from the 84 KB-gzipped `/stablecoins` list.
- `max_response_bytes` is capped at 6 MB so rare whales whose *compressed*
  detail exceeds it (`/protocol/binance-cex` ≈ 9 MB gzipped) fail with a clean
  host error instead of a memory trap — use `protocol_tvl` or the
  `list_protocols` row for those. Everything else fits with ≥ 2× headroom.

If DefiLlama ever stops gzipping (body arrives plain), the scanner path still
works — plain bodies pass through the same pipeline — but the big three would
then need `WASM_DEFAULT_MEMORY_LIMIT` raised; the 6 MB response cap makes that
failure explicit rather than a trap.

**Fuel (verified end-to-end 2026-07-11, real agent + real sandbox):** memory
fits everywhere, but inflating + scanning ~10 MB of JSON costs more than the
**default 500M-instruction fuel limit** — `list_pools`, `list_protocols`, and
`get_protocol` fuel-exhaust on stock settings (all 22 other actions pass).
Operators must set `WASM_DEFAULT_FUEL_LIMIT=3000000000` (3B verified
sufficient; 5B for headroom) in the ironclaw env. Fuel only bounds CPU, not
memory — raising it is safe. Step-by-step:
[docs/reference/raising-wasm-limits.md](../../docs/reference/raising-wasm-limits.md).

## Endpoints used

- `https://api.llama.fi` — protocols, chains, TVL, volumes, fees (free)
- `https://coins.llama.fi` — token prices, blocks (free)
- `https://stablecoins.llama.fi` — stablecoin circulation (free)
- `https://yields.llama.fi` — yield pools (free)

API reference: <https://api-docs.defillama.com/> (`defillama-api.yaml` in this
folder is the OpenAPI spec snapshot).

## Build

```bash
# from tools/defillama/
cargo test                                   # native unit tests
cargo build --target wasm32-wasip2 --release # produces target/wasm32-wasip2/release/defillama_tool.wasm
```

The `wasm32-wasip2` target emits a WebAssembly **component** directly (no
`cargo-component` required).

## Install

```bash
ironclaw tool install tools/defillama --skip-build --name defillama-tool   # after building manually

# Verify:
ironclaw tool list
```

`ironclaw tool install` copies `defillama_tool.wasm` and
`defillama-tool.capabilities.json` into `~/.ironclaw/tools/`. No auth step —
the tool uses only the free API.
