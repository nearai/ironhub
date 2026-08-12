# Airtable: get_record

Get one record by ID.

Legacy tool context: Read and write Airtable records (CRUD minus delete). Actions: 'list_records' (query a table with view/filter/sort/paging), 'get_record' (one record by id), 'create_records' (add up to 10), 'update_records' (partial-update up to 10 by id), and 'get_schema' (list tables and fields; needs the 'schema.bases:read' PAT scope, optional). The base id and table travel as call params — pass 'base_id'+'table' or paste an Airtable URL as 'base_url'. Authentication uses the 'airtable_pat' Personal Access Token injected by the host as a Bearer token; the tool never sees the raw value.

## Inputs

- `base_id` (optional): Airtable base id (starts with 'app'). Provide this or 'base_url'.
- `base_url` (optional): A pasted Airtable URL; the base/table/view ids are extracted from it. Alternative to base_id+table.
- `table` (optional): Table id (starts with 'tbl') or table name. Required for record actions unless given via base_url.
- `record_id` (required): get_record: the record id (starts with 'rec').

The operation is selected by IronClaw as `airtable.get_record`. Do not send the private `action` selector.
