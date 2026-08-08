# Request Finance

Read access to a Request Finance workspace via the [Request Finance API](https://docs.request.finance/).
Lists invoices and payment requests, fetches one by ID, and reads the client directory.

The tool is read-only. It creates no invoices, changes no payment state, and **never executes a
payment**.

## Actions

| Action | Method + path | Purpose |
|---|---|---|
| `list_invoices` | `GET /invoices` | Invoices and payment requests, filtered and paginated |
| `get_invoice` | `GET /invoices/{id}` | One invoice, optionally with share and payment links |
| `list_clients` | `GET /clients` | Customers or suppliers in the workspace |
| `get_client` | `GET /clients/{clientId}` | One client by ID |

## Filtering invoices

`variant` separates ordinary invoices from payroll, and `filter_by` separates payables from
receivables. Both map to Request Finance's own wire values (`rnf_invoice` / `rnf_salary`,
`sent` / `received`).

```json
{
  "action": "list_invoices",
  "filter_by": "received",
  "status": ["pending"],
  "take": 50
}
```

`search` matches transaction hash, invoice number, or company name. Responses always request
`format=paginated`, so the caller gets total counts alongside the page rather than a bare array.

## Auth

Create an API key in the Request Finance dashboard and store it:

```sh
export REQUEST_FINANCE_API_KEY=<api key>
```

The host injects it as the **raw `Authorization` header value with no `Bearer` prefix**, which is
how the Request Finance API expects it. The key is never visible to the tool.

## Limits

- One workspace per API key, so an agent reading two workspaces needs two installations.
- `take` caps at 100 per call (default 25); page with `skip`.
- Request Finance documents OAuth as the more secure production option. This tool supports API
  keys only.
- Date-range filtering (`creationDateRange`) is **not exposed**. The API documents it as an
  ISO 8601 range but does not state the range syntax, and it has not been verified against a live
  workspace. It will be added once confirmed.
- Invoice `status` values are passed through as free strings for the same reason: the documented
  parameter exists but its enum is not enumerated in the published reference. Multiple statuses
  are sent as a repeated `status` query parameter, which is the common REST convention but is
  **not stated in the published reference**. A server that reads only the last value would
  narrow results silently, so verify a multi-status filter against a live workspace before
  trusting it.
- No write actions. Creating invoices, approving, and paying are deliberately out of scope, per
  the Finance spec's rule that payment execution stays outside the agent.
