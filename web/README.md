# IronClaw Skills Web

Next.js catalog UI for the Skills and Tools in this repository.

## Structure

- `app/` contains route entry points only.
- `components/ironhub/` contains product-specific UI.
- `components/ironhub/agents/` contains the agent-builder flow sections.
- `components/ui/` contains the shadcn primitives currently used by the app.
- `hooks/` contains stateful client logic shared by components.
- `lib/catalog*.ts` contains server-side catalog loading, parsing, and inference.
- `lib/iliad-public-skills*.ts` contains the server-side Iliad public catalog client.
- `lib/agent-*.ts` contains agent-builder types, presets, export formatting, and pure helpers.
- `public/` contains favicons and catalog artwork.

## Iliad public skills

Set `ILIAD_BASE_URL` and `ILIAD_X_API_KEY` in `web/.env` or the
deployment environment. The browser never receives these values; Next route
handlers proxy Iliad catalog requests at:

- `GET /api/public-skills`
- `GET /api/public-skills/:userId/:name/:version`

## Commands

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm build
```

## Adding UI

Use the project package runner for shadcn:

```bash
pnpm dlx shadcn@latest add button
```

Keep generated primitives under `components/ui/`, and remove primitives again when
no routed surface imports them.

