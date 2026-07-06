# Attio

Read and write access to an Attio CRM workspace via the [API v2](https://docs.attio.com/rest-api/overview).
Query, fetch, create, update, assert, and delete records for any object; read the
object catalog and per-object attribute schemas; list lists and query list entries;
and list and create notes and tasks. A raw `attio_request` action covers any v2
endpoint not exposed as a named action, bounded by the same host allowlist.

## Actions

| Action | Method + path | Purpose |
|---|---|---|
| `list_records` | `POST /v2/objects/{object}/records/query` | Query records with a filter and sorts |
| `get_record` | `GET /v2/objects/{object}/records/{id}` | Fetch one record |
| `create_record` | `POST /v2/objects/{object}/records` | Create a record |
| `update_record` | `PATCH /v2/objects/{object}/records/{id}` | Patch attribute values |
| `assert_record` | `PUT /v2/objects/{object}/records` | Upsert on a matching attribute |
| `delete_record` | `DELETE /v2/objects/{object}/records/{id}` | Delete a record |
| `list_attributes` | `GET /v2/objects/{object}/attributes` | Read an object's attribute schema |
| `list_objects` | `GET /v2/objects` | List the workspace's objects |
| `list_lists` | `GET /v2/lists` | List the workspace's lists |
| `query_list_entries` | `POST /v2/lists/{list}/entries/query` | Query entries in a list |
| `list_notes` | `GET /v2/notes` | List notes, optionally by parent record |
| `create_note` | `POST /v2/notes` | Add a note to a record |
| `list_tasks` | `GET /v2/tasks` | List tasks |
| `create_task` | `POST /v2/tasks` | Create a task |
| `self` | `GET /v2/self` | Token workspace and permission metadata |
| `attio_request` | any `/v2/` endpoint | Raw escape hatch |

## Objects and attribute values

`object` is an object slug or id. Standard slugs are `people`, `companies`, `deals`,
`users`, and `workspaces`; custom objects use their own slug.

Attio stores each attribute as a typed value rather than a flat string. Record write
actions take a `values` object keyed by attribute slug, passed through unchanged
under Attio's `data.values` envelope. Call `list_attributes` for an object to
discover its attribute slugs and shapes before writing.

```json
{
  "action": "create_record",
  "object": "people",
  "values": {
    "name": [{ "first_name": "Ada", "last_name": "Lovelace" }],
    "email_addresses": ["ada@example.com"]
  }
}
```

## Auth

Generate a workspace API key in Attio under **Workspace Settings > Developers** and
store it as the `attio_api_key` secret. The host injects it as an
`Authorization: Bearer` header on requests to `api.attio.com`; the token is never
visible to the tool. Grant the key the record, object-configuration, list, note, and
task scopes the actions you use require.

```sh
export ATTIO_API_KEY=<the key>
ironclaw tool setup attio-tool
```

## Limits

- Record queries return up to 1000 entries per call (`limit`, clamped); page with
  `offset`.
- Attio rate-limits reads near 100 req/s and writes near 25 req/s; bursts return
  HTTP 429 with a `Retry-After` header.
- Write actions (`create_*`, `update_record`, `assert_record`, `delete_record`) run
  under the host's ask-first permission by default.
