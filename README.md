# ironhub

Use cases, WASM tools, and SKILL.md skills for the IronClaw agent runtime.

## Currently shipped

- `tools/clickup`. ClickUp v2 REST integration covering workspaces, spaces, folders, lists, tasks (CRUD plus tagging), and task comments. OAuth via the ClickUp developer console.
- `tools/evm-rpc`. EVM JSON-RPC integration covering account balances, contract code and storage, view function calls, blocks, transactions, receipts, and event logs. Built-in chain shortcuts for Ethereum, Polygon, Arbitrum, Optimism, Base, BNB Chain, and Avalanche; accepts custom RPC URLs. No credentials required.
- `tools/gitlab`. GitLab v4 REST integration covering projects, issues, merge requests, branches, files, search, and pipelines. Personal access token via Bearer.
- `tools/hubspot`. HubSpot CRM v3 read and write integration covering contacts, companies, deals, tickets, contact lists, owners, and per-object property schemas, plus a raw escape-hatch action for arbitrary v3 endpoints bounded by the same host allowlist. Private App access token (Service Key) via Bearer.
- `tools/microsoft-365`. Microsoft Graph integration covering Outlook, Excel, Teams, OneDrive, SharePoint, Calendar, plus Word and PowerPoint document generation. 14 actions, OAuth via Microsoft Entra ID.
- `tools/monday`. monday.com v2 GraphQL read and write integration covering boards, items (search, get, create, update, move), groups, columns, users, workspaces, and updates and comments. Personal API token via the Authorization header.
- `tools/near-rpc`. NEAR Protocol JSON-RPC integration. 27 actions covering account state, access keys, contract storage and code, view function calls, blocks, chunks, validators, transactions with finality control, state changes, network status, gas and protocol config, and light-client proofs. No credentials required for read actions.
- `tools/polymarket`. Polymarket public market intelligence. 36 actions covering markets, events, tags, sports, search, orderbooks, prices, position holdings, user activity, leaderboards, profiles, and comments across the prediction-market platform. No authentication required.
- `tools/wazuh`. Wazuh SIEM/XDR read and control integration. Indexer (OpenSearch) queries for alerts, vulnerabilities, top rule aggregations, cluster health, and index inventory; Server API for agent management (list, summary, add, remove, restart, regroup), active-response triggers (firewall-drop and friends), CDB block/allow list updates, and manager restart. HTTP Basic on the indexer, dynamic Basic to JWT exchange on the Server API.
- `tools/whatsapp`. WhatsApp Cloud API via the Meta Graph API. Send messages (text, template, image, video, document, audio, location, contacts, interactive buttons and lists, reactions, read receipts), manage the business profile, read phone number metadata, and manage message templates. Permanent system-user access token via Bearer.
- `tools/nova-submit`. Self-contained submission tool for IronClaw Hackathon: based on NOVA decentralized file-sharing, it allows the agent to submit to the hackathon in one command using the ironclaw-hackathon skill. Replicable by all NEAR Legion city nodes or any IronClaw hackathon organizer.
- `skills/microsoft-365-workflow`. Business workflow patterns for the agent when operating inside the Microsoft 365 surface.

See `tracking.md` for the full status table.

## Layout

```
tools/                  WASM tool sources, one Cargo crate per tool
skills/                 SKILL.md prompt extensions, one directory per skill
use-cases/              Strict published use-case templates
wit/                    Vendored WIT contract from upstream IronClaw
scripts/                Build and packaging utilities
.github/                Issue templates, PR template, CI
```

## Tree model

A tool is a trunk. Skills are branches that grow from it. The Excel actions (`read_excel_range`, `write_excel_range`) are one trunk; an Excel-driven bookkeeping assistant or research-tracking helper are branches. Multiple skills share the same trunk and new branches do not require new tools.

This shape lives in the directory layout. Tools and skills are siblings, not paired. Coupling is declared in SKILL.md frontmatter, not in directory adjacency.

## Contributing

Issues are lightweight proposals. PRs are the source of truth.

1. Open an issue using the appropriate template: use case, new tool, new skill, or integration bug.
2. Discuss and triage the proposal.
3. Open a PR with the strict repo artifact:
   - `use-cases/<slug>/USE_CASE.md` for use cases
   - `skills/<skill-name>/SKILL.md` for skills
   - `tools/<tool-name>/` for tools
4. CI validates use cases and runs Rust checks for tools.
5. Reviewer merges to `main`.
6. When the integration is ready for upstream IronClaw, run `scripts/pack-for-ironclaw.sh` to produce the upstream layout for a PR into `nearai/ironclaw`.

Full guide in `CONTRIBUTING.md`.

## License

Dual MIT and Apache-2.0. See `LICENSE-MIT` and `LICENSE-APACHE`.
