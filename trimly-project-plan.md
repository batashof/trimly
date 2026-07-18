# Trimly — Project Plan (short context)

> This is the entry point of the project context. Add this file to the Project knowledge of your Claude Project. Details for each section are in the `docs/` folder (add the whole folder to knowledge too).

## 1. Project summary

Portfolio side project: a booking app for a barbershop.

- No monetization, budget — €0. This is a hard constraint that affects the choice of every third-party service.
- There's a barber acquaintance who is potentially willing to use the finished product.
- Two interfaces:
  1. **Public booking page** — no auth, reached via the barber's own link (`/book/:barberId`, shared from Instagram). No barber-picker: service → date/time → must leave name and phone.
  2. **Barbershop admin panel** — with auth. A barber logs in as ADMIN and *is* one `Barber` profile, and manages their own profile, services, schedule, and bookings.
- Scale: barbers **self-register** (public `/register` page, email-verified — see `docs/decisions-log.md`, 2026-07-18), so the app is open multi-barber. Each account maps 1:1 to its own independent `Barber` profile; there is no shop/team grouping. **Known gap:** admin endpoints aren't yet scoped per-barber (`docs/roadmap.md` "Required follow-up") — must be closed before real multi-barber use.
- Clients receive a booking notification via a Telegram bot (see `docs/notifications-telegram.md`). The barber doesn't need separate notifications — they check bookings in the panel.

## 2. Roles

- **ADMIN** — the only role today. Every self-registered barber gets an ADMIN account that links 1:1 to a `Barber` profile via `Barber.userId`. Manages their own profile, services, schedule, and bookings.
- **Barber** — not a separate role today: each barber's account *is* an ADMIN account. The enum keeps room for a distinct `BARBER` role later without reworking the schema — see `docs/data-model.md`.
- **Client** — not authenticated, only interacts with the public page.

## 3. Tech stack (short version — details in `docs/architecture.md`)

- **Frontend**: Next.js 14 (App Router), TypeScript, TailwindCSS + shadcn/ui, TanStack Query, React Hook Form + Zod. Deployed on **Vercel**.
- **Backend**: NestJS, TypeScript, Prisma ORM, Passport-JWT. Deployed on **Render** (free web service, a regular long-running process, not serverless).
- **Database**: PostgreSQL on **Neon** (serverless Postgres, free tier).
- **Notifications**: Telegram Bot API (grammY), webhook on the Render backend. Free with no limits at this volume.
- **Monorepo**: Turborepo (`apps/web`, `apps/api`, `packages/shared`).
- **CI**: GitHub Actions — lint + typecheck + test on every PR.

## 4. Decisions made (don't revisit without reason)

Full log with dates and rationale — `docs/decisions-log.md`. Short version:

| Topic | Decision |
|---|---|
| Backend hosting | Render, not Vercel serverless |
| Frontend hosting | Vercel, not GitHub Pages |
| Roles | ADMIN only; every barber account *is* a barber (`Barber.userId` 1:1) |
| Onboarding | Barbers self-register (public page, email-verified via Resend) |
| Client phone | Required field |
| Client notifications | Telegram bot with deep link (not SMS, not Viber, not email) |
| Barber notifications | Not needed in MVP, checked via panel instead |
| Scale | Open multi-barber self-signup; per-barber endpoint scoping still TODO |
| Documentation & code language | English, for everything |

## 5. Project documentation structure

```
trimly-project-plan.md   ← this file, short context
docs/
├── architecture.md           # stack, infrastructure, monorepo, rationale
├── data-model.md              # Prisma schema + explanations
├── api-reference.md           # endpoints, request/response contracts
├── business-logic.md          # slot calculation, double booking, timezones
├── notifications-telegram.md  # Telegram notification architecture
├── decisions-log.md           # decision log with dates (ADR-style)
└── roadmap.md                 # development stages
```

**Important:** this file and `docs/` are living documents, stored in the [batashof/trimly](https://github.com/batashof/trimly) repository. If a new architectural decision is made during a conversation, or an existing one changes, the updated version of the relevant `docs/` file is proposed again and committed to the repository in place of the old one, plus a new entry is added to `docs/decisions-log.md`.

## 6. Language policy

All project **artifacts** — documentation, code itself, comments, identifiers, commit messages, error/log messages, README files — must be written in **English**. See `docs/decisions-log.md` (2026-07-17 — Documentation and code language) for the rationale.

**Exception — chat conversation:** Claude's chat replies to the owner are written in **Russian**. Claude may reason/think in English to save tokens, but everything it writes into the repository stays English per the rule above.
