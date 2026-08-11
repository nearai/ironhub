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
| `get_finance_terms` | `GET /v3/contracts/{id}` | Smartfield values, optionally by field title |
| `get_signed_version` | `GET /v3/contracts/{id}` | Signing state and party signature detail |

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

## Comparing terms against an invoice

`get_finance_terms` returns the contract's smartfields, which is where the values a
reconciliation actually compares live: amount, currency, term dates, payment terms. Pass
`field_titles` to narrow it, and a full contract payload collapses to the handful of fields in
question.

```json
{ "action": "get_finance_terms", "contract_id": "c-1",
  "field_titles": ["Total Value", "Payment Terms"] }
```

Matching is case-insensitive and ignores surrounding whitespace. Any requested title that does
not exist on the contract is returned under `requestedFieldsNotFound` rather than silently
dropped, so a typo or a renamed field surfaces instead of looking like an absent value.

Which titles constitute the approved comparison set is a finance policy decision, so the tool
takes them as a parameter rather than hardcoding them.

## Signed documents: provenance, not payload

`get_signed_version` returns the signing state, the per-party signature detail from
`signingSides`, and `signedDocumentPath` naming where the file lives. **It does not return the
document.**

Juro serves the binary at `/v3/contracts/{id}/pdf/binary`, and returns a **ZIP rather than a PDF**
when the contract originated from an uploaded file, so that the original digital signatures are
preserved. Streaming a multi-megabyte binary through the sandbox collides with response size
limits and with this tool's JSON contract, so the document is left where it is. This mirrors
`google-meet`, where a recording is a Drive pointer rather than media.

For "was this signed, by whom, and when", the signing state is the answer and no download is
needed.

## Auth

Retrieve your API key in Juro under **Settings > Integrations > API & webhooks**:

```sh
export JURO_API_KEY=<api key>
```

The host injects it as the `x-api-key` header. The key is never visible to the tool.

## Limits

- One workspace per key, and the key's own permissions apply: contracts outside its teams are
  simply not visible. That is a Juro permission boundary, not a tool limitation.
- **The signed document itself is not returned.** `get_signed_version` reports signing state and
  signature detail; the binary stays in Juro at `/v3/contracts/{id}/pdf/binary`, and is a ZIP
  rather than a PDF for contracts uploaded as files.
- `get_finance_terms` reads whatever smartfields the contract carries. A contract authored
  without smartfields returns an error saying so, rather than an empty result that could be
  mistaken for "no terms".
- Contract *content* is returned as whatever `get_contract` provides; this tool does not parse
  or extract clause-level terms.
- `team_ids` is sent as a repeated `teamIds` query parameter, which is the common REST
  convention but is **not stated in Juro's published reference**. If a multi-team filter comes
  back looking filtered-but-complete, verify against a live workspace before trusting it; a
  server that reads only the last value would narrow results silently.
- No write actions. Drafting, sending, approving, and signing are deliberately out of scope,
  matching the Finance spec's "initial connector is read-only" rule.
