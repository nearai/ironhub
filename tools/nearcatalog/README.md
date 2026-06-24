---
name: nearcatalog
version: 0.1.0
description: Explore the NEAR ecosystem from public NEAR Catalog data. Keyword-search projects, browse and filter the catalog by status/phase, list trending projects, look up full project profiles and related projects, browse categories, find people building on NEAR, and list awesome-near OSS libraries. No authentication required.
use_cases:
  - Keyword-search NEAR projects or surface what's trending
  - Look up a project's full profile and discover related projects
  - Find people building on NEAR or curated awesome-near OSS libraries
value_prop: "A read-only window into the NEAR ecosystem — discover projects, people, and OSS without any API key."
value_tags:
  - Web3
  - NEAR
  - Research
---

# NEAR Catalog Tool

A sandboxed WASM tool that lets an IronClaw agent explore the NEAR ecosystem —
apps/dApps, OSS projects, and the people building on NEAR — using the public
[NEAR Catalog](https://docs.nearcatalog.xyz/) data sources.

No authentication is required. All data comes from public endpoints, and network
access is restricted to the hosts declared in
`nearcatalog-tool.capabilities.json`.

## Actions

The tool exposes a single parameter, `action`, plus a few optional fields.

| Action | Required | Optional | Description |
|--------|----------|----------|-------------|
| `search` | `query` | `limit` | **Server-side** keyword search across project profiles. Best for finding projects by topic. |
| `list_projects` | — | `query`, `status`, `phase`, `limit` | Browse the catalog. `status` (`active`/`inactive`) and `phase` (`mainnet`/`testnet`) filter **server-side**; `query` is a client-side filter over name/tagline/tags. |
| `get_project` | `slug` | — | Full profile (description, tags, links) for one project. |
| `related_projects` | `slug` | `limit` | Projects related to / recommended for a given project slug. |
| `list_categories` | — | — | All catalog categories (`slug` → `label`). |
| `projects_by_category` | `category` | `limit` | Projects within a category slug (e.g. `ai`, `defi`). |
| `trending` | — | `limit` | Currently trending projects in the NEAR ecosystem. |
| `search_people` | — | `query`, `limit` | People building on NEAR. `query` matches name, org, job title, description. |
| `list_oss` | — | `query` | Curated [awesome-near](https://github.com/nearcatalog/awesome-near) OSS frameworks/libraries. `query` keeps matching lines plus section headers. |

`limit` defaults to 25 and is clamped to 1–100.

## Examples

```jsonc
// Keyword-search the catalog (server-side)
{ "action": "search", "query": "privacy", "limit": 10 }

// Browse only active mainnet projects
{ "action": "list_projects", "status": "active", "phase": "mainnet", "limit": 20 }

// Deep-dive one project, then find related ones
{ "action": "get_project", "slug": "ref-finance" }
{ "action": "related_projects", "slug": "ref-finance" }

// What's hot right now
{ "action": "trending", "limit": 15 }

// Browse categories
{ "action": "list_categories" }
{ "action": "projects_by_category", "category": "defi", "limit": 20 }

// Find people and OSS libraries
{ "action": "search_people", "query": "chain abstraction" }
{ "action": "list_oss", "query": "wallet" }
```

## Data sources

- `https://api.nearcatalog.xyz/projects?status=&phase=` — catalog, optional server-side filters
- `https://api.nearcatalog.xyz/search?kw=<keyword>` — keyword search
- `https://api.nearcatalog.xyz/project?pid=<slug>` — single project
- `https://api.nearcatalog.xyz/related-projects?pid=<slug>` — related projects
- `https://api.nearcatalog.xyz/categories` — categories
- `https://api.nearcatalog.xyz/projects-by-category?cid=<slug>` — by category or grouping (e.g. `trending`)
- `https://raw.githubusercontent.com/nearcatalog/nearcatalog-people/main/people-on-near.json` — people
- `https://raw.githubusercontent.com/nearcatalog/awesome-near/master/README.md` — OSS libraries

## Build

```bash
# from tools-src/nearcatalog/
cargo test                                   # native unit tests
cargo build --target wasm32-wasip2 --release # produces target/wasm32-wasip2/release/nearcatalog_tool.wasm
```

The `wasm32-wasip2` target emits a WebAssembly **component** directly (no
`cargo-component` required).

## Install

```bash
# Build + install in one step (requires cargo-component on PATH):
ironclaw tool install tools-src/nearcatalog

# Or build manually (above), then install the prebuilt artifact:
ironclaw tool install tools-src/nearcatalog --skip-build

# Verify and inspect:
ironclaw tool list
```

`ironclaw tool install` copies `nearcatalog_tool.wasm` and
`nearcatalog-tool.capabilities.json` into `~/.ironclaw/tools/`. No
`ironclaw tool auth` step is needed — this tool has no credentials.
