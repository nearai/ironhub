# IronClaw Skills Web

Next.js catalog UI for the skills and tools in this repository.

## Structure

- `app/` contains route entry points only.
- `components/ironhub/` contains product-specific UI.
- `components/ironhub/agents/` contains the agent-builder flow sections.
- `components/ui/` contains the shadcn primitives currently used by the app.
- `hooks/` contains stateful client logic shared by components.
- `lib/catalog*.ts` contains server-side catalog loading, parsing, and inference.
- `lib/agent-*.ts` contains agent-builder types, presets, export formatting, and pure helpers.
- `public/` contains favicons and catalog artwork.

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
