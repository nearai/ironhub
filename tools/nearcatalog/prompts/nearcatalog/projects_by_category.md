# NEAR Catalog: projects_by_category

Run the legacy projects by category operation. See the prompt and input schema for its exact contract.

Legacy tool context: Explore the NEAR ecosystem: keyword-search projects, browse/filter the catalog by status and phase, look up full project profiles, find related projects, browse categories and groupings like trending, find people building on NEAR, and list awesome-near OSS libraries. All data sources are public; no authentication required.

## Inputs

- `category` (required): A category slug (e.g. 'ai', 'defi', 'infrastructure') discovered via 'list_categories'. For trending projects use the 'trending' action instead.
- `limit` (optional): Maximum results to return (1-100, default 25).

The operation is selected by IronClaw as `nearcatalog.projects_by_category`. Do not send the private `action` selector.
