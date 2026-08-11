# ironhub

Use cases, WASM tools, and SKILL.md skills for the IronClaw agent runtime.

## Currently shipped

- `tools/attio`. Attio CRM API v2 read and write integration covering records (query, get, create, update, assert, delete) for any object, object and attribute schemas, lists and list entries, and notes and tasks, plus a raw escape-hatch action for arbitrary v2 endpoints bounded by the same host allowlist. Workspace API key via Bearer.
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
- `tools/bluesky-analytics`. Read-only AT Protocol analytics for profiles, feeds, post threads, social graphs, engagement, and account discovery. No authentication required.
- `tools/coingecko`. Cryptocurrency prices, markets, metadata, historical charts, OHLC candles, and trending assets through CoinGecko Demo or Pro APIs.
- `tools/crypto-ta-engine`. Deterministic Binance spot technical analysis with multi-timeframe indicators, confluence scoring, and ATR-based risk levels. No authentication required.
- `tools/defillama`. Free DeFi analytics across protocol and chain TVL, token prices, stablecoins, yield pools, DEX volumes, fees, and revenue.
- `tools/etherscan`. Etherscan v2 access across 60+ EVM networks for balances, transactions, token transfers, contract metadata, and execution status.
- `tools/firecrawl`. Firecrawl v2 web scraping, search, site mapping, and recursive crawling with host-injected Bearer authentication.
- `tools/frankfurter-fx`. Open central-bank foreign exchange rates, conversions, multi-currency batches, and historical trend analysis.
- `tools/jina`. Jina Reader, screenshot, web search, academic search, and image search with host-injected Bearer authentication.
- `tools/messari`. Messari crypto market data, token unlocks, fundraising, DeFi metrics, news, research, and AI-assisted synthesis.
- `tools/nearcatalog`. Public NEAR ecosystem discovery for projects, trends, categories, contributors, related projects, and open-source libraries.
- `tools/pikespeak`. NEAR indexer and portfolio analytics for balances, transfers, validators, transactions, and DeFi positions.
- `tools/serper`. Structured Google web, news, image, video, places, and shopping results through Serper.dev.
- `tools/tavily`. LLM-oriented web and social search, URL extraction, site crawling, and site mapping through Tavily.
- `tools/wordpress`. WordPress and WooCommerce operations for posts, media, comments, products, orders, and customers with host-injected credentials.
- `tools/youtube`. YouTube Data API v3 analytics plus transcript extraction for videos, comments, channels, uploads, and search.
- `tools/grafana`. Grafana HTTP API read integration covering firing alert instances, alert rule definitions, dashboard and folder search, full dashboard JSON, data sources, and PromQL queries. The target host is pinned at install, so Grafana Cloud and self-hosted instances are both supported. Service account token via Bearer.
- `tools/irm`. Grafana IRM incident read integration over the Incident JSON RPC API covering incident query and retrieval, the activity timeline, and custom incident fields. Shares the host configuration and service account token of the `grafana` tool.
- `tools/zulip`. Zulip REST integration covering message search through narrow operators, anchored incremental fetch, channels, topics, and realm members. Bot email and realm host pinned at install; HTTP Basic assembled host-side.
- `tools/request-finance`. Request Finance read integration covering invoices and payment requests with search, status, variant, and direction filters, single invoice retrieval, and the client directory. Workspace API key sent as the raw Authorization value.
- `tools/juro`. Juro v3 REST read integration covering contracts filtered by team, template, and update window, single contract retrieval, and the template library. Update-window filters make contract listing a cursor for incremental reads. API key via the `x-api-key` header.
- `tools/google-meet`. Google Meet REST API v2 read integration covering conference records, participants, recordings, transcripts, and the transcript entries carrying spoken text with speaker attribution. OAuth scoped to `meetings.space.readonly`.
- `skills/microsoft-365-workflow`. Business workflow patterns for the agent when operating inside the Microsoft 365 surface.
- `skills/engineering-reconciliation`. Reconciles Zulip discussion with the GitHub pull requests, issues, and CI state it references, reporting on the join. Groups output by decision, progress, blocker, and ownership with a source link on every claim, and surfaces discussion with no code alongside code with no discussion.
- `skills/alert-triage`. Deduplicates firing Grafana alerts by underlying fault, pairs each with its defining rule and a confirming metric query, and checks Grafana IRM for an incident already covering it. Separates uncovered from covered and noise, with a stated reason for every item classified as noise.
- `skills/meeting-processing`. Extracts decisions, actions, and open questions from a finished Google Meet conference, quoting the supporting utterance and attributing it to the speaker. Reads transcript entries rather than the transcript resource, and separates decided from proposed.
- `skills/invoice-reconciliation`. Compares Request Finance invoices against the Juro contracts meant to govern them, returning match, mismatch, duplicate, missing agreement, or abstain with the compared field values. Abstains with candidates listed when the governing contract cannot be determined.
- `skills/workflow-completeness-reviewer`. Reviews a workflow specification for what it fails to state by walking a fixed set of dimensions covering states, transitions, permissions, evidence, failure paths, scope, and ownership. Returns a gap report with a named consequence per entry plus observable acceptance criteria. No connector required.
- `skills/perk-travel-expense`. Drives the first-party Perk MCP for trips, expenses, travel invoices, policy, events, and pending card transactions. Ships as a skill because Perk serves expense data only through its MCP, and records the freshness of each source.
- `skills/pr-triage-digest`. Cross-repo GitHub PR triage. Scores every open PR on CI, mergeability, staleness, size, and review state, then emits a single ranked digest grouped into Blockers, Quick wins, First contributors, Aging, and Normal. Silent-tier; uses the built-in `http` tool — no new tool dependency. Ships a deterministic Node.js reference implementation.

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
