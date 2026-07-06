# Attio

Read and write access to an Attio CRM workspace via the API v2. Use this to query,
fetch, create, update, assert, and delete records for any object, to inspect the
object catalog and attribute schemas, to work with lists, and to manage notes and
tasks.

## How to call

Pass a single `params` object with an `action` field naming the operation, plus that
action's fields. The input schema is a tagged union keyed on `action`, so only the
fields for the chosen action are valid.

Example:

```json
{ "action": "list_records", "object": "companies", "filter": { "name": { "$contains": "Acme" } }, "limit": 25 }
```

## Objects

`object` is an object slug or id. The standard slugs are `people`, `companies`,
`deals`, `users`, and `workspaces`; custom objects use their own slug. Records are
identified by a `record_id`.

## Attribute values

Attio stores each attribute as a typed value, not a flat string. Record writes
(`create_record`, `update_record`, `assert_record`) take a `values` object keyed by
attribute slug, and each value follows Attio's shape for that attribute type. Call
`list_attributes` for an object first to discover its attribute slugs and types
before writing. The tool passes `values` through unchanged under Attio's
`data.values` envelope.

```json
{ "action": "create_record", "object": "people", "values": { "name": [ { "first_name": "Ada", "last_name": "Lovelace" } ], "email_addresses": [ "ada@example.com" ] } }
```

## Actions

- `list_records` - query records for an object with an optional `filter` and `sorts`
  (`object`, `filter`, `sorts`, `limit`, `offset`).
- `get_record` - fetch one record by id (`object`, `record_id`).
- `create_record` - create a record (`object`, `values`).
- `update_record` - patch a record's attribute values (`object`, `record_id`, `values`).
- `assert_record` - upsert a record, matching on one attribute (`object`,
  `matching_attribute`, `values`).
- `delete_record` - delete a record (`object`, `record_id`).
- `list_attributes` - list the attribute schema for an object (`object`).
- `list_objects` - list the workspace's objects.
- `list_lists` - list the workspace's lists.
- `query_list_entries` - query entries in a list (`list`, `filter`, `sorts`,
  `limit`, `offset`).
- `list_notes` - list notes, optionally scoped to a parent record (`parent_object`,
  `parent_record_id`, `limit`, `offset`).
- `create_note` - add a note to a record (`parent_object`, `parent_record_id`,
  `title`, `content`, `format`). `format` is `plaintext` (default) or `markdown`.
- `list_tasks` - list tasks (`limit`, `offset`).
- `create_task` - create a task (`content`, `deadline_at`, `is_completed`,
  `linked_records`, `assignees`).
- `self` - return the token's workspace and permission metadata.
- `attio_request` - raw v2 request for any endpoint not covered above (`method`,
  `path`, `body`). The path must start with `/v2/`.

For `attio_request`, `method` is one of `GET`, `POST`, `PATCH`, `PUT`, `DELETE`.

## Auth

Authentication is injected by the host. An Attio workspace API key is attached as an
`Authorization: Bearer` header on requests to `api.attio.com`. Do not include any
token or credential in `params`.
