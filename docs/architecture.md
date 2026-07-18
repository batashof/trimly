# Architecture

## Frontend

- **Next.js 14 (App Router)**, TypeScript
- **TailwindCSS + shadcn/ui** — fast, modern, looks good in a portfolio
- **TanStack Query** — API calls, caching, invalidation
- **React Hook Form + Zod** — forms and validation (schemas shared with the backend via `packages/shared`)
- **date-fns**, **react-day-picker** — date handling, day picker

One Next.js app serves both surfaces: the public booking page (root routes) and the admin panel (`/admin/*`, protected by a JWT check). This simplifies deployment — one Vercel project instead of two.

## Backend

- **NestJS**, TypeScript
- **Prisma ORM**
- **Passport-JWT** — authorization (email + password, bcrypt for hashing)
- **class-validator / class-transformer** — DTO validation
- Guards with the `@Roles(ADMIN)` decorator — structure designed to support adding roles later without rework
- **grammY** — Telegram bot (see `notifications-telegram.md`), runs as a module inside the same Nest process

## Database

**PostgreSQL on Neon** — serverless Postgres, generous free tier, no need to run your own DB server.

## Infrastructure and deployment

### Frontend → Vercel

The standard choice for Next.js, supports everything out of the box: SSR, Middleware (used to protect `/admin` routes), preview deployments on every PR, Image Optimization.

**GitHub Pages was considered** as an alternative (also free). Rejected: GH Pages is purely static hosting, would require `output: 'export'`, which breaks Middleware (admin auth checking would have to move to the client — less reliable), disables Image Optimization, has no PR preview deployments, and the site lives by default at `username.github.io/repo` rather than a root domain. At equal cost (€0), Vercel offers more capability — chosen instead.

### Backend → Render (free web service)

A regular long-running Node process, not serverless. Git auto-deploy is **off** (`autoDeploy: false`); deploys are fired by the CI `deploy` job via a Render deploy hook, only after CI passes (see CI section).

- Downside of the free tier: sleeps after 15 minutes of inactivity → 30-50 second cold start on the first request.
- Solution for demos: a free external pinger (e.g. cron-job.org) hitting the health-check endpoint (`GET /health`) every 10 minutes, so the service doesn't fall asleep before a demo to a recruiter or the barber.

**Why not "everything on Vercel" (serverless functions for Nest):**
- `@nestjs/schedule` (cron) doesn't work reliably across cold starts — and we need it for the Telegram webhook process and potential future reminders.
- 10-second execution limit on the Hobby plan.
- Prisma + Postgres in serverless requires an extra connection pooling driver (Neon serverless driver / Prisma Accelerate) — unnecessary complexity.
- For a portfolio, it's more valuable to show a "real" Nest server than to wrap serverless plumbing around it.

## Monorepo structure (Turborepo)

```
trimly/
├── apps/
│   ├── web/          # Next.js — public page + admin panel
│   └── api/           # NestJS backend (including the Telegram bot)
├── packages/
│   └── shared/         # shared Zod schemas and TS types (frontend + backend)
├── turbo.json
└── package.json
```

`packages/shared` — shared Zod schemas for DTOs (e.g. the booking-creation schema), used by both the frontend (form validation) and the backend (request validation). Avoids duplication and looks good as a portfolio technique.

## CI

GitHub Actions: lint + typecheck + test on every PR. Platform git auto-deploy is turned off on both Vercel and Render; instead a `deploy` job (`needs: build`, runs only on push to `main`) POSTs a Render deploy hook and a Vercel deploy hook, so green CI is the single precondition for a production deploy. See `decisions-log.md` (2026-07-18 — CI-gated deploys).
