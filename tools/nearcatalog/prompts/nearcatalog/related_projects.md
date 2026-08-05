# NEAR Catalog: related_projects

Run the legacy related projects operation. See the prompt and input schema for its exact contract.

Legacy tool context: Explore the NEAR ecosystem: keyword-search projects, browse/filter the catalog by status and phase, look up full project profiles, find related projects, browse categories and groupings like trending, find people building on NEAR, and list awesome-near OSS libraries. All data sources are public; no authentication required.

## Inputs

- `slug` (required): Project slug (e.g. 'ref-finance'). Lowercase letters, digits, '-', '_', '.'. Discover slugs with 'list_projects' or 'search'.
- `limit` (optional): Maximum results to return (1-100, default 25).

The operation is selected by IronClaw as `nearcatalog.related_projects`. Do not send the private `action` selector.
