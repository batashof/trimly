# Trimly

A booking app for a barbershop. Portfolio project — see [`trimly-project-plan.md`](./trimly-project-plan.md) for the full context and [`docs/`](./docs) for architecture, data model, API contracts, and business logic.

## Stack

- **Web** (`apps/web`) — Next.js 14 (App Router), TypeScript, TailwindCSS, TanStack Query. Deployed on Vercel.
- **API** (`apps/api`) — NestJS, Prisma, PostgreSQL (Neon). Deployed on Render.
- **Shared** (`packages/shared`) — Zod schemas / types shared by web and api.
- **Monorepo** — Turborepo + pnpm workspaces.

## Prerequisites

- Node.js 22 (see [`.nvmrc`](./.nvmrc))
- pnpm 11 (`corepack enable`)
- A PostgreSQL database — a free [Neon](https://neon.tech) project

## Getting started

```bash
pnpm install

# Configure the API database connection
cp apps/api/.env.example apps/api/.env
# → paste your Neon DATABASE_URL / DIRECT_URL into apps/api/.env

# Configure the web app
cp apps/web/.env.example apps/web/.env.local

# Generate the Prisma client and run the first migration
pnpm --filter @trimly/api prisma:generate
pnpm --filter @trimly/api prisma:migrate

# Run everything in dev
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:3001 (health check at `/health`)

## Common scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Run web + api (+ shared watch) in dev |
| `pnpm build` | Build all packages |
| `pnpm lint` | Lint all packages |
| `pnpm typecheck` | Type-check all packages |
| `pnpm test` | Run tests |

## Roadmap

Development stages are tracked in [`docs/roadmap.md`](./docs/roadmap.md). Current status: **step 1 — monorepo scaffold + Prisma schema** in place; migrations pending a Neon connection string.
