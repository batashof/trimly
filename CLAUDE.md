# CLAUDE.md

Guidance for Claude Code when working in this repository. Read the linked docs before making non-trivial changes — they are the source of truth for architecture and decisions.

## What Trimly is

A €0-budget portfolio booking app for a barbershop (multi-barber, one shop). Two surfaces served by one Next.js app: a public booking page (no auth) and an admin panel (`/admin/*`, JWT). Clients get booking notifications via a Telegram bot.

Start here: [trimly-project-plan.md](trimly-project-plan.md) — the project's entry-point context.

## Documentation (source of truth)

- [docs/architecture.md](docs/architecture.md) — stack, hosting, how the pieces fit together.
- [docs/data-model.md](docs/data-model.md) — Prisma schema, entities, enums.
- [docs/api-reference.md](docs/api-reference.md) — endpoints and request/response contracts.
- [docs/business-logic.md](docs/business-logic.md) — slot availability calculation and double-booking protection (the most fragile part; keep it tested).
- [docs/notifications-telegram.md](docs/notifications-telegram.md) — Telegram bot flow (deep link, `notifyToken`, webhook).
- [docs/decisions-log.md](docs/decisions-log.md) — why things are the way they are. Append new decisions here; don't rewrite old ones.
- [docs/roadmap.md](docs/roadmap.md) — build order and what's deliberately out of MVP scope.

When you make a decision worth recording (a trade-off, a rejected alternative), add an entry to `docs/decisions-log.md` rather than only leaving it in code.

## Repo layout

Monorepo — pnpm workspaces + Turborepo.

- `apps/api` — NestJS backend (Prisma + Postgres, deployed on Render).
- `apps/web` — Next.js 14 App Router frontend (public page + admin, deployed on Vercel).
- `packages/*` — shared code (e.g. Zod schemas shared between web and api).

## Commands

Run from the repo root (Turborepo fans out to workspaces):

```bash
pnpm dev         # run all apps in dev
pnpm build       # build all
pnpm lint        # lint
pnpm typecheck   # type-check
pnpm test        # run tests (Vitest)
pnpm format      # prettier
```

Requires Node >= 20 and pnpm (see `packageManager` in `package.json`).

## Conventions

- TypeScript everywhere. Share validation via Zod schemas in `packages/*` so web and api stay in sync — don't duplicate contracts.
- Timezone-sensitive logic (slot calculation) compares in the barber's timezone, not the server's — see [docs/business-logic.md](docs/business-logic.md).
- Keep changes aligned with the roadmap order in [docs/roadmap.md](docs/roadmap.md).
