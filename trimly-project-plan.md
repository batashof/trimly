# Trimly — Project Plan (short context)

> This is the entry point of the project context. Add this file to the Project knowledge of your Claude Project. Details for each section are in the `docs/` folder (add the whole folder to knowledge too).

## 1. Project summary

Portfolio side project: a booking app for a barbershop.

- No monetization, budget — €0. This is a hard constraint that affects the choice of every third-party service.
- There's a barber acquaintance who is potentially willing to use the finished product.
- Two interfaces:
  1. **Public booking page** — no auth, linked from the barber's Instagram. Client picks a barber → service → date/time → must leave name and phone.
  2. **Barbershop admin panel** — with auth. Manages barbers, services, schedule, and bookings.
- MVP scale: designed from the start for multiple barbers (one shop, several masters).
- Clients receive a booking notification via a Telegram bot (see `docs/notifications-telegram.md`). The barber doesn't need separate notifications — they check bookings in the panel.

## 2. Roles

- **ADMIN** — the only role in the MVP. Manages barbers (as data, not accounts), services, schedule, and sees all bookings.
- **Barbers** — don't log in themselves; they are data profiles managed by ADMIN. The model is specifically designed so a `BARBER` role (separate master login, sees only their own bookings) can be added later without reworking the schema.
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
| Roles | ADMIN only for MVP, Barber decoupled from User |
| Client phone | Required field |
| Client notifications | Telegram bot with deep link (not SMS, not Viber, not email) |
| Barber notifications | Not needed in MVP, checked via panel instead |
| Scale | Multi-barber support built in from the start |
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

All project documentation, all instructions given to Claude within this project, and everything related to code — code itself, comments, identifiers, commit messages, error/log messages, README files — must be written in **English**. See `docs/decisions-log.md` (2026-07-17 — Documentation and code language) for the rationale.
