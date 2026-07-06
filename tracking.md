# Tracking

Status of every tool and skill currently in this repository. Updated in the same commit that adds, modifies, or removes an entry.

Last updated: 2026-07-06

## Summary

- 10 tools live
- 2 skills live
- 0 open bugs against shipped integrations

## Tools

| Name | Status | Version | Use Cases | Value Tags | Description | Limits | Author |
|---|---|---|---|---|---|---|---|
| `attio` | live | 0.1.0 | Query and update CRM records, Log notes and tasks against records, Sync deals and companies into agent workflows | Sales / CRM, Business ops | Attio CRM API v2 read and write integration. 16 actions covering record query/get/create/update/assert/delete for any object, object and attribute schemas, lists and list entries, notes, tasks, a token introspection call, and a raw v2 request escape hatch. Record writes take Attio-shaped attribute values; `list_attributes` discovers attribute slugs. Workspace API key via Bearer against api.attio.com. | Record queries return up to 1000 entries per call; page with `offset`. Attio rate-limits reads near 100/s and writes near 25/s, returning HTTP 429 with a `Retry-After` header. Attribute values must follow Attio's per-type value shapes; call `list_attributes` before writing. | Brandon |
| `microsoft-365` | live | 0.1.0 | List recent Outlook emails, Manage OneDrive and SharePoint files, Send Teams channel messages | Automation, Productivity | Microsoft Graph integration. 14 actions across Outlook, Excel, Teams, OneDrive, SharePoint, Calendar, plus Word and PowerPoint document generation. OAuth via Microsoft Entra ID. | Teams actions return 403 on personal Microsoft accounts (Microsoft does not serve Teams business APIs to consumer MSAs). Simple upload capped at 4 MB; chunked upload session not yet implemented. | Brandon |
| `near-rpc` | live | 0.1.0 |  |  | NEAR Protocol JSON-RPC integration. 27 actions covering account state, access keys, contract storage and code, view function calls, blocks, chunks, validators, transaction lifecycle with finality control, state changes, network status, gas and protocol config, and light-client proofs. No credentials required for read actions. | Public RPC endpoints rate-limit aggressively; production deployments should use FastNEAR, Pagoda, or another dedicated provider. Signed-write actions (`send_tx`, `broadcast_tx_async`, `broadcast_tx_commit`) accept a pre-signed base64-encoded `SignedTransaction`; the tool does not perform local signing. Validator-set, state-change, and contract-code responses can be megabytes in size on busy blocks. | Brandon |
| `polymarket` | live | 0.1.0 | Query real-time election odds, Track crypto prediction markets, Feed sentiment data into trading agents | Data Feed, Web3 | Polymarket public market intelligence integration. 36 actions covering markets, events, tags, series, sports, search, orderbooks, prices (single and batch), historical prices, position holdings, user activity, trades, trader leaderboards, profiles, and comments across the Polymarket prediction-market platform. Routes between `gamma-api.polymarket.com` (discovery), `clob.polymarket.com` (market data), and `data-api.polymarket.com` (user-scoped reads). No authentication required. | Public list endpoints cap at 500 entries per request. Batch price endpoints accept up to 500 token IDs per call. WebSocket subscriptions are deferred until the IronClaw runtime exposes a WebSocket primitive to wasm tools. Signed CLOB write operations (post and cancel orders, manage relayer, bridge) live in the separate `polymarket-clob` trunk. | Brandon |
| `bluesky-analytics` | live | 0.1.0 | Audit a Bluesky account's reach — follower/following/post counts and per-post engagement, Read a post's reply (comment) tree or see who liked/reposted it, Discover accounts by keyword and map their social graph | Bluesky, Social, Analytics | Read-only Bluesky (AT Protocol) analytics. Browse public accounts, posts, social graph, and engagement via the unauthenticated AppView. Look up profiles with follower/post counts, read an account's feed with per-post like/repost/reply counts, walk a post's reply (comment) tree, list followers/follows and who liked/reposted a post, and search for accounts. No authentication required. | Posting, replying, liking, reposting, and following are not supported (read-only). Depth default 6, max 100. Limit 1–100, default 50. | Kent |
| `crypto-ta-engine` | live | 0.1.0 | Compute reliable indicator values from live Binance candles, Produce a weighted multi-timeframe (4H/1H/15M) confluence verdict, Return ATR-based stop-loss and scaled take-profit levels | Trading, Crypto, TechnicalAnalysis | Deterministic technical-analysis engine for Ironclaw. Fetches Binance Spot klines and computes EMA/RSI/MACD/StochRSI/ADX/ATR/Bollinger/OBV/CMF/VWAP plus a weighted multi-timeframe confluence verdict with ATR-based stop-loss/take-profit. Moves all TA math out of the LLM. | Read-only: no orders, accounts, or futures. Restricted to api.binance.com and api.binance.us under /api/v3 (GET only). | Kent |
| `firecrawl` | live | 0.1.0 | Scrape a web page into clean LLM-ready markdown, Search the web/news for pages matching a query, Map every URL on a site, or crawl a docs section recursively | WebScraping, Search, Research | Web scraping, search, site-mapping, and crawling for Ironclaw via the Firecrawl v2 API. Extracts clean markdown/HTML from pages, finds pages by query across web/news/images, lists every URL on a site, and runs recursive crawls. The host injects the API key as a Bearer token — the tool never sees the raw secret. | Search limit 1–100 (default 10). Scrape timeout 1000–300000 ms, wait_for ≤ 60000 ms. crawl_status returns at most 25 pages. | Kent |
| `nearcatalog` | live | 0.1.0 | Keyword-search NEAR projects or surface what's trending, Look up a project's full profile and discover related projects, Find people building on NEAR or curated awesome-near OSS libraries | Web3, NEAR, Research | Explore the NEAR ecosystem from public NEAR Catalog data. Keyword-search projects, browse and filter the catalog by status/phase, list trending projects, look up full project profiles and related projects, browse categories, find people building on NEAR, and list awesome-near OSS libraries. No authentication required. | Read-only access to public API endpoints. Limit clamped to 1–100 (default 25). | Kent |
| `nova-submit` | live | 0.1.0 | | | IronClaw Hackathon submission tool. Encrypts a file with AES-256-GCM and uploads to a NOVA group on NEAR. Built as the trunk that the ironclaw-hackathon skill calls to submit hackathon entries. Replicable by any IronClaw hackathon organizer. | Need to create an account at https://nova-sdk.com and collect account-id and api key. | Julien |
| `wordpress` | live | 0.1.2 | Draft, schedule and update WordPress blog posts or pages from an agent, List and fulfil WooCommerce orders and update order status, Create and update Woocommerce products, inspect customers, moderate content | CMS, WordPress, Woocommerce, E-commerce, Productivity | Read and write a self-hosted WordPress + WooCommerce site over REST for Ironclaw. Manage posts, pages, media and comments (WordPress core) and products, orders and customers (WooCommerce), plus a raw wp_request passthrough to any /wp-json/* route. The host injects credentials (Application Password via Basic for WordPress, consumer key/secret via query params for WooCommerce) — the tool and LLM NEVER see the raw secrets. | Requires HTTPS and pretty permalinks (/wp-json/). The target site host is baked into the capabilities file at install via configure.py. Application Password used for WP core routes, consumer key/secret for WooCommerce. | cuongdcdev |

## Skills

| Name | Status | Version | Use Cases | Value Tags | Description | Trunk | Author |
|---|---|---|---|---|---|---|---|
| `microsoft-365-workflow` | live | 1.0.0 | Automate Outlook email drafts and replies, Read and write Excel range data directly, Post status updates to Teams channels | Automation, Productivity | Microsoft 365 business workflow patterns. 18 activation keywords, 6 regex patterns, 6,500 token budget. | `microsoft-365` | Brandon |
| `pr-triage-digest` | live | 1.0.0 | Morning PR-review triage across one or more repos, Cross-repo backlog ranking, Stale-PR sweep before release, First-contributor surfacing for friendly review | Engineering, Productivity, Code-review | Triages open GitHub pull requests across one or more repos. Scores each on CI status, mergeability, staleness, size, and review state, then groups into Blockers, Quick wins, First contributors, Aging, and Normal. Silent-tier (read-only). 19 activation keywords, 6 regex patterns, 4,000 token budget. Ships a deterministic Node.js reference implementation. | `http` | Skytonet2 |

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
