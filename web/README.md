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

## Route flags

Set these to `true` to disable the page and remove its header navigation item.
Unset or `false` keeps the route visible.

- `NEXT_PUBLIC_DISABLE_ACCOUNT_ROUTE`
- `NEXT_PUBLIC_DISABLE_AGENTS_ROUTE`
- `NEXT_PUBLIC_DISABLE_MVP_ROUTE`

## Feature flags

Set to `true` to enable the surface. Unset or `false` keeps it hidden.

- `NEXT_PUBLIC_ENABLE_ILIAD` — shows Iliad-sourced skills and Iliad-branded UI

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

## Local development stack

The private workspace (`/mvp`) needs PostgreSQL and an S3-compatible store. A
single-image dev stack (PostgreSQL 16 + SeaweedFS S3) lives in
`docker/dev-stack` and is wired up via the root `docker-compose.yml`:

```bash
docker compose up -d --build   # run from the repository root
```

Host ports: Postgres on `localhost:5433`, S3 API on `http://localhost:8334`
(bucket `ironhub`, static local credentials — see `web/.env.example` for the
matching `DATABASE_URL` and `S3_*` values). Then:

```bash
cd web
pnpm install
pnpm db:migrate        # apply Prisma migrations
pnpm storage:smoke     # optional: verify S3 upload/download/presign
pnpm dev
```

### Private workspace API overview

- `GET|POST /api/private-artifacts`, `GET|PATCH|DELETE /api/private-artifacts/[id]` — artifact CRUD (org-scoped).
- `PUT|DELETE /api/private-artifacts/[id]/content/[kind]` — blob upload/removal (`wasm`, `capabilities`, `skill_md`; 5 MB cap, stored in S3).
- `POST /api/private-artifacts/[id]/token` — mint a 1-hour install token (requires complete content).
- `GET /api/private-artifacts/manifest/[token]` and `.../content/[kind]/[token]` — public, token-authenticated, rate-limited; downloads 302 to short-lived presigned S3 URLs.
- Organizations use BetterAuth's organization plugin (create, switch, members, roles, invites — no email is ever sent). Custom routes fill plugin gaps: `GET /api/orgs` (roles included) and `/api/orgs/invitations/{pending,[id]/accept,[id]/reject}` for in-app invitations.
