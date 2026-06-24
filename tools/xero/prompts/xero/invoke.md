# Xero

Read and write access to a Xero organisation via the Accounting API. Use this to
list and fetch contacts, invoices, accounts, payments, bank transactions, items,
and credit notes, to create and update contacts, invoices, and payments, and to
run financial reports.

## Tenancy: call `list_connections` first

A single Xero login can be connected to more than one organisation. Every action
except `list_connections` requires a `tenant_id` that names the organisation to
operate on. Call `list_connections` once to get the authorized organisations and
their `tenantId` values, then pass the right one as `tenant_id` on every other
call.

## How to call

Pass a single `params` object with an `action` field naming the operation, plus
that action's fields. The input schema is a tagged union keyed on `action`, so
only the fields for the chosen action are valid.

Example:

```json
{ "action": "list_invoices", "tenant_id": "f0e1...", "statuses": "AUTHORISED", "page": 1 }
```

## Actions

- `list_connections` - list the organisations the connection can access (no `tenant_id`).
- `get_organisation` - organisation details (`tenant_id`).
- `list_contacts` - page through contacts (`tenant_id`, `page`, `where_filter`, `order`, `search_term`).
- `get_contact` - one contact by id (`tenant_id`, `contact_id`).
- `create_contact` - create a contact (`tenant_id`, `contact`, `idempotency_key`).
- `update_contact` - update a contact (`tenant_id`, `contact_id`, `contact`, `idempotency_key`).
- `list_invoices` - page through invoices (`tenant_id`, `page`, `where_filter`, `order`, `statuses`).
- `get_invoice` - one invoice by id (`tenant_id`, `invoice_id`).
- `create_invoice` - create an invoice (`tenant_id`, `invoice`, `idempotency_key`).
- `update_invoice` - update an invoice (`tenant_id`, `invoice_id`, `invoice`, `idempotency_key`).
- `list_accounts` - chart of accounts (`tenant_id`, `where_filter`, `order`).
- `list_payments` - page through payments (`tenant_id`, `page`, `where_filter`, `order`).
- `create_payment` - record a payment (`tenant_id`, `payment`, `idempotency_key`).
- `list_bank_transactions` - page through bank transactions (`tenant_id`, `page`, `where_filter`, `order`).
- `list_items` - the item catalog (`tenant_id`, `where_filter`, `order`).
- `list_credit_notes` - page through credit notes (`tenant_id`, `page`, `where_filter`, `order`).
- `get_report` - run a financial report (`tenant_id`, `report`, `params`). `report` is one of
  `profit_and_loss`, `balance_sheet`, `trial_balance`, `aged_receivables_by_contact`,
  `aged_payables_by_contact`, `bank_summary`, `executive_summary`. `params` is a map of
  Xero report query parameters such as `fromDate`, `toDate`, or `date`.
- `xero_request` - raw Accounting API request for any endpoint not covered above
  (`tenant_id`, `method`, `path`, `body`). The path must start with `/api.xro/2.0/` or be
  `/connections`; `tenant_id` is required for accounting paths.

The `contact`, `invoice`, and `payment` fields are JSON objects in Xero's own
shape (for example an invoice carries `Type`, `Contact`, `LineItems`, and
`Status`). `where_filter` maps to Xero's `where` query parameter and `order` to
`order`.

## Writing safely

- New invoices are created as `DRAFT` unless the `invoice` object sets `Status`
  explicitly (for example `"AUTHORISED"`). Do not authorise an invoice unless the
  user asked you to finalise it.
- Pass an `idempotency_key` on `create_invoice`, `create_payment`, and
  `create_contact` so that a retried call does not post a duplicate.
- A create or update that fails Xero validation is surfaced as an error even when
  Xero returns HTTP 200; the validation messages are included.

## Auth

Authentication is injected by the host. A user-authorized Xero OAuth2 access token
is attached as an `Authorization: Bearer` header on requests to `api.xero.com`, and
the tool sets the required `Xero-tenant-id` header from `tenant_id`. Do not include
any token or credential in `params`.
