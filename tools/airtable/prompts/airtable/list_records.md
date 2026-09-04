# Airtable: list_records

List records with filtering, sorting, fields, and pagination.

Legacy tool context: Read and write Airtable records (CRUD minus delete). Actions: 'list_records' (query a table with view/filter/sort/paging), 'get_record' (one record by id), 'create_records' (add up to 10), 'update_records' (partial-update up to 10 by id), and 'get_schema' (list tables and fields; needs the 'schema.bases:read' PAT scope, optional). The base id and table travel as call params — pass 'base_id'+'table' or paste an Airtable URL as 'base_url'. Authentication uses the 'airtable_pat' Personal Access Token injected by the host as a Bearer token; the tool never sees the raw value.

## Inputs

- `base_id` (optional): Airtable base id (starts with 'app'). Provide this or 'base_url'.
- `base_url` (optional): A pasted Airtable URL; the base/table/view ids are extracted from it. Alternative to base_id+table.
- `table` (optional): Table id (starts with 'tbl') or table name. Required for record actions unless given via base_url.
- `view` (optional): list_records: a view id/name. Airtable applies the view's filter, sort, and hidden columns server-side. Prefer this over filter_by_formula for human-curated reads.
- `fields` (optional): list_records: only return these fields.
- `filter_by_formula` (optional): list_records: a raw Airtable formula. Power use; prefer 'filter' or 'view'. Mutually exclusive with 'filter'.
- `filter` (optional): list_records: safe equality filter {field=value}; the value is escaped. Mutually exclusive with 'filter_by_formula'.
- `sort` (optional): list_records: sort clauses, applied in order.
- `page_size` (optional): list_records: records per page (1-100, clamped to 100).
- `max_records` (optional): list_records: total cap across pages.
- `offset` (optional): list_records: pagination token from a prior list_records 'offset' to fetch the next page.

The operation is selected by IronClaw as `airtable.list_records`. Do not send the private `action` selector.
