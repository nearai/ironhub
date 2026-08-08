# Juro

Read access to a Juro workspace via the [Juro v3 API](https://api-docs.juro.com/).
Lists contracts, fetches one by ID, and reads the template library.

Juro calls these records **contracts**; finance and legal workflows often call the same records
**agreements**. They are the same thing.

The tool is read-only. It drafts, edits, sends, and signs nothing.

## Actions

| Action | Method + path | Purpose |
|---|---|---|
| `list_contracts` | `GET /v3/contracts` | Contracts, paginated and filterable |
| `get_contract` | `GET /v3/contracts/{id}` | One contract with its metadata |
| `list_templates` | `GET /v3/templates` | Contract templates |
| `get_template` | `GET /v3/templates/{id}` | One template by ID |

## Incremental reads

`list_contracts` takes `updated_since` and `updated_before`, which makes it a genuine cursor
rather than a repeated full scan. Persist the newest `updated` timestamp you processed and pass
it back as `updated_since` next time.

```json
{
  "action": "list_contracts",
  "updated_since": "2026-08-01T00:00:00Z",
  "limit": 50
}
```

`team_ids` and `template_id` narrow the set further, which matters on a large contract estate.

## Auth

Retrieve your API key in Juro under **Settings > Integrations > API & webhooks**:

```sh
export JURO_API_KEY=<api key>
```

The host injects it as the `x-api-key` header. The key is never visible to the tool.

## Limits

- One workspace per key, and the key's own permissions apply: contracts outside its teams are
  simply not visible. That is a Juro permission boundary, not a tool limitation.
- **Signed-document retrieval is not exposed.** The Finance spec asks for a `get_signed_version`
  capability, and Juro does have signed PDFs, but no read endpoint for them was confirmed in the
  published v3 reference. It will be added once verified rather than guessed.
- Contract *content* is returned as whatever `get_contract` provides; this tool does not parse
  or extract clause-level terms.
- `team_ids` is sent as a repeated `teamIds` query parameter, which is the common REST
  convention but is **not stated in Juro's published reference**. If a multi-team filter comes
  back looking filtered-but-complete, verify against a live workspace before trusting it; a
  server that reads only the last value would narrow results silently.
- No write actions. Drafting, sending, approving, and signing are deliberately out of scope,
  matching the Finance spec's "initial connector is read-only" rule.
