# Tracking

Status of every tool and skill currently in this repository. Updated in the same commit that adds, modifies, or removes an entry.

Last updated: 2026-04-30

## Summary

- 3 tools live
- 1 skill live
- 0 open bugs against shipped integrations

## Tools

| Name | Status | Version | Value Prop | Value Tags | Description | Limits | Author |
|---|---|---|---|---|---|---|---|
| `microsoft-365` | live | 0.1.0 | Microsoft 365 business workflow patterns. | Automation, Productivity | Microsoft Graph integration. 14 actions across Outlook, Excel, Teams, OneDrive, SharePoint, Calendar, plus Word and PowerPoint document generation. OAuth via Microsoft Entra ID. | Teams actions return 403 on personal Microsoft accounts (Microsoft does not serve Teams business APIs to consumer MSAs). Simple upload capped at 4 MB; chunked upload session not yet implemented. | Brandon |
| `near-rpc` | live | 0.1.0 | | | NEAR Protocol JSON-RPC integration. 27 actions covering account state, access keys, contract storage and code, view function calls, blocks, chunks, validators, transaction lifecycle with finality control, state changes, network status, gas and protocol config, and light-client proofs. No credentials required for read actions. | Public RPC endpoints rate-limit aggressively; production deployments should use FastNEAR, Pagoda, or another dedicated provider. Signed-write actions (`send_tx`, `broadcast_tx_async`, `broadcast_tx_commit`) accept a pre-signed base64-encoded `SignedTransaction`; the tool does not perform local signing. Validator-set, state-change, and contract-code responses can be megabytes in size on busy blocks. | Brandon |
| `polymarket` | live | 0.1.0 | Real-time prediction market data feed. | Data Feed, Web3 | Polymarket public market intelligence integration. 36 actions covering markets, events, tags, series, sports, search, orderbooks, prices (single and batch), historical prices, position holdings, user activity, trades, trader leaderboards, profiles, and comments across the Polymarket prediction-market platform. Routes between `gamma-api.polymarket.com` (discovery), `clob.polymarket.com` (market data), and `data-api.polymarket.com` (user-scoped reads). No authentication required. | Public list endpoints cap at 500 entries per request. Batch price endpoints accept up to 500 token IDs per call. WebSocket subscriptions are deferred until the IronClaw runtime exposes a WebSocket primitive to wasm tools. Signed CLOB write operations (post and cancel orders, manage relayer, bridge) live in the separate `polymarket-clob` trunk. | Brandon |

## Skills

| Name | Trunk | Status | Version | Value Prop | Value Tags | Description | Author |
|---|---|---|---|---|---|---|---|
| `microsoft-365-workflow` | `microsoft-365` | live | 1.0.0 | Microsoft 365 business workflow patterns. | Automation, Productivity | Microsoft 365 business workflow patterns. 18 activation keywords, 6 regex patterns, 6,500 token budget. | Brandon |

## Open work

Proposed and in-progress tools and skills are tracked as GitHub issues. Filter by label:

- `type:tool`, `type:skill`, `type:bug`
- `status:proposed`, `status:in-progress`, `status:blocked`
- `trunk:<tool-name>` (links a proposed skill to its required trunk)

## Status definitions

- **proposed**: issue filed, no code yet, no claimed author
- **in-progress**: branch exists, work underway
- **live**: merged to main, CI green, included in this table
- **blocked**: dependency or external decision required, named in the issue
- **deprecated**: superseded by a different integration or removed; documented in the relevant PR
