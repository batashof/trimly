# Decision Log

> Format: date — topic, what was decided, why, what alternatives were considered. New decisions are appended at the end; old ones aren't rewritten (if a decision changes, a new entry is added referencing the old one, not edited in place).

## 2026-07-17 — Backend hosting

**Decision:** NestJS as a regular process on Render (free web service), not serverless functions on Vercel.

**Why:** `@nestjs/schedule` doesn't work reliably across cold starts, there's a 10-second limit on Vercel Hobby, and Prisma+Postgres in serverless requires an extra connection pooling driver. For a portfolio it's more valuable to show a "real" Nest server. This decision later also simplified the Telegram webhook integration (see the notifications entry below).

**Alternatives:** Vercel serverless functions, Railway (no longer has a permanent free tier), Fly.io (requires a card).

**Trade-off:** Render free sleeps after 15 min of inactivity (30-50 sec cold start). Solution — a free external pinger (cron-job.org) on `/health`.

## 2026-07-17 — Frontend hosting

**Decision:** Vercel, not GitHub Pages.

**Why:** GitHub Pages is purely static hosting and would require `output: 'export'` in Next.js, which disables Middleware (`/admin` protection would have to move to the client), Image Optimization, and PR preview deployments. At equal cost (€0), Vercel offers more capability.

**Alternatives:** GitHub Pages (proposed by the user).

## 2026-07-17 — Roles and the User/Barber model

**Decision:** Only one role in the MVP — `ADMIN`. `Barber` is an independent entity (data, not an account), not linked to `User`.

**Why:** Barbers don't log in themselves yet; a single admin manages everything. `Role` stays an enum (not a string), so a `BARBER` role with a separate login can be added later without reworking the schema.

**Alternatives:** A model with `OWNER`/`BARBER` and a separate login per barber was initially considered — postponed as excessive for the current stage.

## 2026-07-17 — Client notifications

**Decision:** A Telegram bot with deep-link subscription (`/start <notifyToken>`), not SMS, not Viber, not email.

**Why:** SMS and Viber Business Messages are paid, and Viber additionally requires business verification; most providers also have a minimum monthly fee (~€100-235). Project budget is €0. The Telegram Bot API is free with no limits at our volume. Limitation — the bot can't message first, so the client needs to tap a button once after booking.

**Alternatives considered:** SMS (Twilio) — paid; Viber Business Messages — paid + verification; Email (Resend) — free, but not a messenger, rejected in favor of Telegram per the user's direct request.

Detailed architecture — `notifications-telegram.md`.

## 2026-07-17 — Project name and documentation storage

**Decision:** The project was renamed from BarberBook to **Trimly**. Documentation moved from manual upload to Project knowledge backed by a GitHub repository, connected to the Claude Project as a context source.

**Why:** Manually re-uploading files to Project knowledge after every change is inconvenient — a repository provides versioning and a single source of truth, which is needed for the project's code anyway.

## 2026-07-17 — Barber notifications

**Decision:** Not needed in the MVP; the barber checks bookings in the admin panel.

**Why:** An explicit user decision from the start of the project, reduces MVP scope.

## 2026-07-17 — Documentation and code language

**Decision:** All project documentation, all instructions given to Claude within this project, and everything related to code — code itself, comments, identifiers, commit messages, error/log messages, README files — is now written in **English**. All previously Russian-language docs (`trimly-project-plan.md` and the whole `docs/` folder) were translated to English in place, replacing the old files.

**Why:** The project is a portfolio piece; English is the standard language for code and technical documentation in the industry the user is targeting, and it keeps the repository consistent for any future collaborator or reviewer who doesn't read Russian.

**Alternatives considered:** Keep documentation in Russian with English-only code (rejected — inconsistent, mixes languages within the same repository); maintain bilingual docs (rejected — doubles maintenance effort for no benefit at this stage).

## 2026-07-18 — Neon serverless driver adapter for Postgres

**Decision:** Prisma connects to Neon through the serverless driver adapter (`@prisma/adapter-neon` + `@neondatabase/serverless` over WebSockets on port 443) instead of the default TCP driver on port 5432. Applied in both `PrismaService` (runtime) and `prisma/seed.ts`. Enabled via `previewFeatures = ["driverAdapters"]` in the Prisma schema. The `db:seed` script now runs through `prisma db seed` so `.env` is loaded.

**Why:** The local development network firewalls raw TCP 5432, so the default driver can't reach Neon (`P1001`). The serverless driver tunnels Postgres over HTTPS/443, which the firewall allows, and is fully supported on Render/production too — so the same code path works everywhere. Verified end-to-end locally: login, and barber list/create/delete round-trips against Neon succeed.

**Limitation:** Prisma Migrate (`migrate dev`/`deploy`) still uses the direct TCP connection (`DIRECT_URL`, 5432) and does **not** go through the adapter, so migrations can't be run from a network that blocks 5432 — run them from Render/CI or an unfirewalled network. Runtime queries and seeding are unaffected.

**Alternatives considered:** Keep the plain TCP driver (rejected — unrunnable on the local network); run a local Postgres and sync (rejected — extra moving part, diverges from the Neon-backed production setup).
