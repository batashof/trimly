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

## 2026-07-18 — Double-booking protection and timezone handling

**Decision:** `POST /bookings` validates the requested slot against real server-side availability, then performs the `INSERT` inside a **Serializable** Prisma transaction that re-checks for interval overlap. A Postgres serialization failure (`P2034`) at commit is mapped to `409 Conflict`. Slot math lives in a pure, DB-free function (`apps/api/src/availability/slots.ts`) so it can be unit-tested exhaustively; **luxon** does the IANA timezone → UTC conversion.

**Why:** Frontend availability is UX only, never a guarantee (see `business-logic.md`). Two clients can pass the pre-check for the same slot concurrently; the Serializable isolation level makes one of the two commits fail rather than allowing both overlapping rows. Keeping the algorithm as a pure function (no Prisma, no Nest) is what lets the fragile part carry real test coverage — 10 slot cases plus 5 booking cases. Overlap uses half-open intervals `[startAt, endAt)`, so back-to-back bookings that merely touch at the boundary are allowed. luxon handles DST correctly (verified by a winter-vs-summer offset test), which raw `Intl` math does not do ergonomically.

**Alternatives considered:** A unique constraint on `(barberId, startAt)` — rejected because it only catches identical start times, not partial overlaps of differing-duration services; a Postgres exclusion constraint over a `tstzrange` — the cleanest DB-level guard, but requires a `btree_gist` extension and raw SQL migration, deferred as heavier than needed at this volume; a Postgres advisory lock keyed on `barberId` — viable, but Serializable + a re-check is simpler and keeps the logic in application code where it is tested.

**Public vs admin routing:** `GET /barbers/:id/availability` and `POST /bookings` are unguarded (public booking surface) and live in their own controllers (`AvailabilityController`, `BookingsController`), separate from the admin-guarded `BarbersController`/booking list+patch, so the auth boundary is explicit per route rather than per path prefix. Public request bodies/queries are validated with the shared Zod schemas from `@trimly/shared` via a small `ZodValidationPipe`, keeping the contract identical on web and api.

## 2026-07-18 — CI-gated deploys (no direct git auto-deploy)

**Decision:** Git auto-deploy is turned **off** on both platforms (`autoDeploy: false` in `render.yaml`, `git.deploymentEnabled.main: false` in `apps/web/vercel.json`). Production deploys are now fired by a `deploy` job in `.github/workflows/ci.yml` that `needs: build` and runs only on a push to `main`, POSTing a Render deploy hook and a Vercel deploy hook (stored as the GitHub Actions secrets `RENDER_DEPLOY_HOOK` and `VERCEL_DEPLOY_HOOK`).

**Why:** The owner pushes directly to `main`, so there is no PR gate and branch protection wouldn't fit the workflow. With platform git auto-deploy, a push that compiles but fails `lint`/`typecheck`/`test` still shipped to production. Routing deploys through the CI job makes green CI the single precondition for a deploy — a red build never reaches production, while keeping the direct-push flow intact.

**Alternatives considered:** Branch protection on `main` requiring the CI check before merge (rejected — forces a PR-per-change workflow the owner doesn't use); the platforms' native "wait for CI to pass" toggles (Render/Vercel can wait on GitHub checks, but the setting is dashboard-only, not captured in the repo, and each platform gates independently — the deploy-hook-from-CI approach keeps the whole policy in version control).

## 2026-07-18 — Booking is per-barber link, not a barber picker

**Decision:** The public booking page is reached through a **per-barber link** (`/book/:barberId`) and has no "choose a barber" step. Each barber gets their own link to share; the barber copies it from the admin console ("Copy link" next to their name). Barbers are therefore **not something the client-facing admin manages as a resource** — the barber *is* the admin and only manages their own bookings/schedule/services (a full barber-management UI is deliberately absent from the admin panel). To support the public page, barber **reads** were opened up: `GET /barbers` (active only) and `GET /barbers/:id` are now public (guards moved from the `BarbersController` class down to the write methods), and a new unguarded `PublicServicesController` serves `GET /barbers/:id/services` (active services only), mirroring the existing public `AvailabilityController`.

**Why:** The shop has one barber today and the model is "barber == admin" (see the 2026-07-17 roles entry). A barber picker adds a step with nothing to pick and implies client-facing barber management that doesn't exist. A personal link is the natural share unit (goes in an Instagram bio, a QR code, etc.) and keeps the public flow to service → time → details. Opening only the read endpoints keeps writes ADMIN-only.

**Alternatives considered:** A public `GET /barbers` list feeding a picker as the entry point (rejected — no second barber to choose, and it re-introduces barber management into the client surface); a separate `/public/*` route prefix for the reads (rejected — diverges from the documented `GET /barbers/:id` paths and the existing `AvailabilityController` pattern already lives under `barbers/:id`); vanity slugs instead of the cuid in the link (deferred — cuid link works now, a slug is a later polish).

**Side effect:** the admin's own `GET /barbers` is now active-only too. With no deactivation UI and hard-delete, inactive barbers don't occur in practice; an `includeInactive` flag can be added if that changes.

## 2026-07-18 — Barber linked 1:1 to the admin account

**Decision:** `Barber` now carries `userId String? @unique` referencing `User` (`onDelete: SetNull`), realizing the "barber == admin" model in the schema rather than only in convention. The seed creates the admin `User` and its `Barber` together (idempotent — `ADMIN_DISPLAY_NAME` sets the name, re-seed never overwrites an existing profile). A new `GET /barbers/me` (JWT) resolves the caller's barber from the token. The admin panel dropped the **Barbers** tab (create/list/delete) for a **Profile** tab that edits only that one linked profile; the per-tab barber selectors are hidden while there is a single barber. Web `api.barbers` lost `list`/`create`/`remove` (unused) and gained `me`.

**Why:** The owner logs in as ADMIN and *is* the single barber (see the 2026-07-17 roles entry and the 2026-07-18 per-barber-link entry). Previously the two rows were decoupled and the admin managed barbers as a resource, which contradicted "this is your account." Linking them makes the panel operate on *your* profile with no create/pick step. `GET /barbers/me` (not a `barberId` baked into the JWT) keeps the token stable and avoids staleness if the profile is (re)created after login. `SetNull` + optional `userId` means deleting the account unlinks but preserves barber data and its booking history, and still leaves room for future `BARBER`-role masters with their own login.

**Alternatives considered:** Merge `Barber` fields into `User` and drop the table (rejected — forces rewriting every `barberId` relation and the whole public booking page for no gain, and permanently forecloses multi-barber); a required `userId` (rejected — a `NOT NULL` FK with `Cascade` would delete a barber's entire booking history when an account is removed); baking `barberId` into the JWT payload (rejected — stale tokens after profile changes; a lookup endpoint is simpler). The `POST/PATCH/DELETE /barbers` API endpoints are kept (dev/tests) even though the UI no longer creates or deletes barbers.

## 2026-07-18 — Developer data admin via Prisma Studio

**Decision:** Manual data editing (including user accounts) is done with **Prisma Studio** — `pnpm --filter @trimly/api db:studio` — rather than a bundled admin framework. A small `db:set-password` script (`prisma/set-password.ts`) sets or creates an account's bcrypt-hashed password from the CLI, since Studio can edit any column but can't hash a password. Documented in `docs/dev-admin.md`.

**Why:** Prisma is already a dependency, so Studio is a zero-config, €0 web UI over every table with no code to write, deploy, or secure. It runs locally against the Neon connection string (or Neon's own console works against production directly). A full embedded admin (AdminJS/Forest Admin) would add a dependency, routes, and an auth surface to maintain — overkill for a single-owner portfolio app.

**Alternatives considered:** AdminJS/Forest Admin embedded in NestJS (rejected — extra deploy/auth surface for one user); the Neon console SQL editor only (kept as the production-facing option in the doc, but Studio is friendlier for local edits); a bespoke `/admin/dev` UI (rejected — reinventing Studio).

## 2026-07-18 — Render build goes through Turbo so @trimly/shared is compiled first

**Decision:** The Render `buildCommand` builds the API via `pnpm turbo run build --filter @trimly/api` instead of `pnpm --filter @trimly/api build`. Turbo honours the `^build` dependency in `turbo.json`, so the `@trimly/shared` workspace package is compiled to its `dist/` before `nest build` runs for `@trimly/api`.

**Why:** `@trimly/api` imports `@trimly/shared`, whose `package.json` resolves `main`/`types` to `./dist/index.js` / `./dist/index.d.ts`. On a fresh Render checkout that `dist/` doesn't exist, and `pnpm --filter @trimly/api build` runs `nest build` directly — it never builds the dependency — so the deploy failed with `TS2307: Cannot find module '@trimly/shared'` (plus cascading `TS7006` implicit-any where the missing types left `availability`/`slot` untyped). It passed locally only because a prior `pnpm build` had left `packages/shared/dist` on disk. Routing the build through Turbo makes the dependency ordering explicit and reproducible.

**Alternatives considered:** `pnpm --filter "@trimly/api..." build` (the `...` suffix pulls in dependencies) — works, but Turbo is already the repo's build orchestrator and the `^build` graph lives in `turbo.json`, so going through Turbo keeps one source of truth for build ordering; adding a `prebuild` step to `apps/api` that builds `@trimly/shared` (rejected — duplicates the dependency graph Turbo already models).

## 2026-07-18 — Barber self-registration (email-verified), app becomes multi-barber

**Decision:** Added a public, self-service barber registration flow, which **reverses the single-owner model** (see the 2026-07-17 roles entry and the 2026-07-18 "Barber linked 1:1" entry): anyone can now create their own barber account.

- `POST /auth/register { email }` creates an **unverified** `User` (`passwordHash` is now nullable — the account exists before a password is set), issues an `EmailVerificationToken`, and emails a confirmation link. It always returns a generic `{ ok: true }` so it never leaks whether an email is already registered. The `Barber` profile is **not** created here.
- `POST /auth/register/confirm { token, password }` validates the token, sets the password, marks the account verified, consumes the token, **creates the linked `Barber` profile**, and returns a JWT (same shape as `/auth/login`) so the web app auto-logs-in and drops the new barber into the admin panel. Web pages: `/register` (enter email) and `/register/confirm?token=` (set + confirm password).
- Email is sent through a transactional email REST API over `fetch` (no SDK dependency, €0 free tier). With no API key set the `EmailService` logs the link to the console (dev fallback), so local dev needs no account. (Originally Resend; switched to SendGrid on 2026-07-18 — see the "Email provider" entry below.)

**Why:** Direct user request to let barbers onboard themselves. Email verification is the standard proof-of-ownership for self-signup; a link to a password-set page (rather than sending a password) means we never transmit or store a plaintext credential.

**Security choices:** the token is stored **hashed** (sha256) — the raw token lives only in the email link, so a DB leak yields no usable link; it is single-use (`consumedAt`) and time-boxed (`expiresAt`, 24h). Creating the `Barber` only at confirmation keeps unverified accounts out of the public `GET /barbers` list. Deferring `Barber` creation also means an abandoned registration leaves only an unverified, login-incapable `User` row (cleanup of those is out of scope for now).

**Known limitation — cross-tenant access (must fix before real use):** the admin write endpoints are still **not scoped to the caller's own barber** — `/services`, `/working-hours`, `/day-offs`, and `GET /bookings` accept a client-supplied `barberId`, and `PATCH/DELETE /barbers/:id` / `PATCH /bookings/:id` accept any id. Under one owner this was fine; with open self-signup any logged-in barber can read/modify another's data. Closing this (resolve the barber from the JWT, reject rows the caller doesn't own) is tracked in `roadmap.md` and is a prerequisite to promoting self-signup beyond a portfolio demo.

**Alternatives considered:** a separate `PendingRegistration` table instead of a nullable `passwordHash` (rejected — a nullable password plus a token table is fewer moving parts and reuses the `User` row directly); a vendor email SDK (rejected — one REST call over `fetch` avoids adding a dependency); emailing a temporary password instead of a set-password link (rejected — transmits a credential and forces a later change); creating the `Barber` at register time with `isActive: false` (rejected — `Barber` at confirm time is simpler and leaves no half-built profiles or public-list pollution); revealing "email already registered" on `POST /auth/register` (rejected — enables account enumeration; a generic response is safer).

## 2026-07-18 — Email provider: SendGrid (Single Sender) instead of Resend

**Decision:** Switched barber-registration email from Resend to **SendGrid**, sending via the SendGrid v3 REST API over `fetch`. `EMAIL_FROM` is a **Single Sender-verified** address; `SENDGRID_API_KEY` replaces `RESEND_API_KEY`. The dev fallback (log the link to the console when the key is unset) is unchanged.

**Why:** The app has no owned domain (it runs on a `*.vercel.app` origin, whose DNS we don't control), so we cannot verify a sending domain anywhere. Resend's free path (`onboarding@resend.dev`) only delivers to the account owner's own email — it cannot email real barbers. SendGrid's **Single Sender Verification** verifies one address (e.g. the owner's Gmail) via a click, with no DNS/domain, and then sends to any recipient — 100 emails/day free. That keeps the €0 budget while making registration actually work for third-party barbers.

**Trade-off:** sending `From:` an address on a domain we don't control (e.g. `gmail.com`) means SPF/DKIM don't align with SendGrid, so some mail may land in spam and Gmail/Yahoo bulk-sender rules apply at scale. Acceptable at portfolio volume; a proper fix (own a domain and verify it) is deferred until the project outgrows €0.

**Alternatives considered:** Brevo (also single-sender, 300/day — viable, but SendGrid's API was simpler to drop in); a free domain to verify with Resend (rejected — free registrars like Freenom are effectively dead and offer no reliable DKIM-capable DNS); buying a cheap domain now (rejected — breaks the €0 constraint; revisit later).
