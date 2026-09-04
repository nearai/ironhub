---
name: airtable
version: 0.2.1
description: Read, write and update Airtable records (CRUD without delete) for Ironclaw via the Airtable REST API. Query a table with views/filters/sort/paging, fetch one record, create or partial-update up to 10 records, and list a base's tables and fields. The host injects a Personal Access Token as a Bearer token — the tool or LLMs never see the raw secret.
use_cases:
  - Maintain a shared findings / vulnerability tracker an agent and analysts both edit
  - Query a curated asset inventory or IOC / threat-intel list
  - Append to an engagement / audit log and update record status
value_prop: "Turn an Airtable base into a shared, human-in-the-loop workspace the agent can read and write — secrets stay host-side, never in the tool or LLM."
value_tags:
  - Database
  - Productivity
  - Security
---

# Airtable Tool

## Install and configure

Install the tool from IronHub. For a manual package import, open **Extensions →
Registry → Import**, select the tool archive, and click **Install**.

Open **Configure** and store an Airtable Personal Access Token. Create it at
https://airtable.com/create/tokens with `data.records:read`, `data.records:write`, and
optionally `schema.bases:read`. IronClaw injects it as a Bearer token only for
`api.airtable.com`.

Each operation is exposed as a named capability with its own input schema. Use
only the parameters shown for that capability in the examples below.

Credentials are stored by IronClaw and injected only at the declared HTTP boundary; they
are not included in model input or exposed to the WASM component.


A sandboxed WASM tool that lets an IronClaw agent operate an
[Airtable](https://airtable.com/developers/web/api) base as a shared,
human-in-the-loop workspace: a findings tracker, asset inventory, IOC list,
audit log, or playbook. Humans triage in the Airtable UI; the agent reads and
writes the same records.

The host injects the Personal Access Token as a Bearer token — the tool code
never sees the raw secret — and network access is restricted to
`api.airtable.com` as declared in `manifest.toml`; the Rust adapter retains route and method validation.

Airtable is the right tool for the *curated, collaborative, structured* layer.

## Base & table are supplied per call

The WASM sandbox cannot read host-stored config, so the target base and table
travel as call params (the same way the firecrawl tool takes a `url`). Either:

- pass `base_id` (an `app…` id) and `table` (a `tbl…` id or a table name), or
- paste an Airtable URL as `base_url` — the tool extracts the `app…`/`tbl…`/`viw…`
  ids from it.

Seed the base once into your agent's instructions, e.g. *"Your Airtable base is
`appWsWZ4C1xxxxx`, findings table `tblI3bH6Lp5xxxxra`."*

## Capabilities
| Capability | Required | Optional | Description |
|--------|----------|----------|-------------|
| `list_records` | base + table | `view`, `fields`, `filter`, `filter_by_formula`, `sort`, `page_size`, `max_records`, `offset` | Query a table. Returns records + an `offset` token when more pages exist. |
| `get_record` | base + table + `record_id` | — | Fetch one record by id. |
| `create_records` | base + table + `records` | `typecast` | Create up to 10 records (`records` = array of field objects). |
| `update_records` | base + table + `records` | `typecast` | **Partial** update (PATCH) up to 10 records (`records` = array of `{id, fields}`). |
| `get_schema` | base | — | List the base's tables and fields. Needs the optional `schema.bases:read` scope. |

There is intentionally **no delete** action, only update action.

Notes:
- `page_size` is clamped to Airtable's max of 100. Page with the returned `offset`.
- `view` applies a human-curated filter/sort/hidden-columns server-side — prefer it
  for reads. `filter` is a safe `{field=value}` equality test (the value is escaped);
  `filter_by_formula` is raw power use.
- `get_schema` is optional. Without `schema.bases:read` it returns an actionable
  message and the other actions still work — field names appear as the keys of each
  record's `fields`.

## Examples

```jsonc
// List the "Open Critical" view
// Capability: airtable.list_records
{ "base_id": "appWsWZ4C1Xxxxxx", "table": "Findings", "view": "Open Critical" }

// Or seed base + table by pasting a URL
// Capability: airtable.list_records
{ "base_url": "https://airtable.com/appWsWZ4C1Xxxxxx/tblI3bH6Lp5mZSVra/viw2Yh2TDvZQScvDK" }

// Safe equality filter (value is escaped)
// Capability: airtable.list_records
{ "base_id": "appWsWZ4C1Xxxxxx", "table": "IOCs", "filter": { "field": "Type", "value": "ip" } }

// One record
// Capability: airtable.get_record
{ "base_id": "appWsWZ4C1Xxxxxx", "table": "Findings", "record_id": "rec0123456789ABCD" }

// Create
// Capability: airtable.create_records
{ "base_id": "appWsWZ4C1Xxxxxx", "table": "Findings", "records": [ { "Title": "Exposed .git", "Severity": "High" } ] }

// Partial update (only changes Status)
// Capability: airtable.update_records
{ "base_id": "appWsWZ4C1Xxxxxx", "table": "Findings", "records": [ { "id": "rec0123456789ABCD", "fields": { "Status": "Fixed" } } ] }

// Discover tables and fields (FULL mode)
// Capability: airtable.get_schema
{ "base_id": "appWsWZ4C1Xxxxxx" }
```

## API mapping

| Capability | Airtable endpoint |
|--------|-------------------|
| `list_records` | `GET /v0/{baseId}/{table}` |
| `get_record` | `GET /v0/{baseId}/{table}/{recordId}` |
| `create_records` | `POST /v0/{baseId}/{table}` |
| `update_records` | `PATCH /v0/{baseId}/{table}` |
| `get_schema` | `GET /v0/meta/bases/{baseId}/tables` |
