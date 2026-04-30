# Tracking

Status of every tool and skill currently in this repository. Updated in the same commit that adds, modifies, or removes an entry.

Last updated: 2026-04-29

## Summary

- 2 tools live
- 1 skill live
- 0 open bugs against shipped integrations

## Tools

| Name | Status | Version | Description | Limits | Author |
|---|---|---|---|---|---|
| `microsoft-365` | live | 0.1.0 | Microsoft Graph integration. 14 actions across Outlook, Excel, Teams, OneDrive, SharePoint, Calendar, plus Word and PowerPoint document generation. OAuth via Microsoft Entra ID. | Teams actions return 403 on personal Microsoft accounts (Microsoft does not serve Teams business APIs to consumer MSAs). Simple upload capped at 4 MB; chunked upload session not yet implemented. | Brandon |
| `near-rpc` | live | 0.1.0 | NEAR Protocol JSON-RPC integration. 27 actions covering account state, access keys, contract storage and code, view function calls, blocks, chunks, validators, transaction lifecycle with finality control, state changes, network status, gas and protocol config, and light-client proofs. No credentials required for read actions. | Public RPC endpoints rate-limit aggressively; production deployments should use FastNEAR, Pagoda, or another dedicated provider. Signed-write actions (`send_tx`, `broadcast_tx_async`, `broadcast_tx_commit`) accept a pre-signed base64-encoded `SignedTransaction`; the tool does not perform local signing. Validator-set, state-change, and contract-code responses can be megabytes in size on busy blocks. | Brandon |

## Skills

| Name | Trunk | Status | Version | Description | Author |
|---|---|---|---|---|---|
| `microsoft-365-workflow` | `microsoft-365` | live | 1.0.0 | Microsoft 365 business workflow patterns. 18 activation keywords, 6 regex patterns, 6,500 token budget. | Brandon |

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
