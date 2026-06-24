# Xero tool

Xero Accounting API integration for the IronClaw agent runtime. Compiles to a
`wasm32-wasip2` sandboxed tool that talks to `api.xero.com` with credentials
injected by the host.

## What it does

A single `xero.invoke` capability dispatches a tagged-union action:

- Read: `list_connections`, `get_organisation`, `list_contacts`, `get_contact`,
  `list_invoices`, `get_invoice`, `list_accounts`, `list_payments`,
  `list_bank_transactions`, `list_items`, `list_credit_notes`, `get_report`.
- Write: `create_contact`, `update_contact`, `create_invoice`, `update_invoice`,
  `create_payment`.
- Escape hatch: `xero_request` for any Accounting API endpoint not named above,
  bounded to `/api.xro/2.0/` and `/connections`.

## Multi-tenant

A connected Xero login can reach several organisations. Every action except
`list_connections` requires a `tenant_id`; the tool sets it as the
`Xero-tenant-id` header. Call `list_connections` to discover the ids.

## Auth

Authorization-code OAuth2. The host obtains and refreshes the token (the tool
declares the `offline_access` and granular `accounting.*` scopes) and injects it
as a Bearer header. The tool never sees the token. See
`xero-tool.capabilities.json` for setup.

## Write safety

Invoices are created as `DRAFT` unless an explicit `Status` is supplied; create
actions accept an `idempotency_key`; and validation failures are surfaced as
errors even when Xero returns HTTP 200.

## Build

```sh
cargo build --target wasm32-wasip2 --release
```

The module is emitted at `target/wasm32-wasip2/release/xero_tool.wasm` and is
referenced by `manifest.toml` as `wasm/xero_tool.wasm`.
