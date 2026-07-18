# Roadmap

1. Monorepo setup (Turborepo), Prisma schema, migrations on Neon
2. Backend: auth (JWT, ADMIN role), CRUD for barbers/services/schedule/days off
3. Backend: slot availability logic + booking creation + double booking protection (`business-logic.md`)
4. Backend: Telegram bot — registration via BotFather, webhook endpoint, deep link flow, sending confirmations (`notifications-telegram.md`)
5. Frontend: public booking page — reached via a per-barber link `/book/[barberId]` (no barber-picker; the barber shares their own link). Flow: service → slot → form → confirmation screen with Telegram button.
6. Frontend: admin panel (booking list with filters, schedule management, services, own profile). The admin account *is* the barber (`Barber.userId` 1:1) — no barber-management UI.
7. Deployment: Vercel (web) + Render (api) + pinger for the api (`architecture.md`)
8. UI polish, basic unit tests for slot logic and double booking
9. Barber self-registration — public `/register` page, email-verified account creation (Resend), password set on `/register/confirm`, auto-login. Turns the app from single-owner into open multi-barber self-signup (see `decisions-log.md`, 2026-07-18 — barber self-registration).

## Required follow-up — per-barber authorization scoping

Opening self-registration made the app multi-barber, but the admin write endpoints are **not yet scoped to the caller's own barber**: `/services`, `/working-hours`, `/day-offs`, and `GET /bookings` take a `barberId` from the client, and `PATCH/DELETE /barbers/:id` and `PATCH /bookings/:id` accept any id. Any logged-in barber can therefore read or modify another barber's data. This was acceptable under the single-owner model but is a cross-tenant access hole now that anyone can register. **Before promoting self-signup to real use**, resolve the caller's barber from the JWT and reject operations on rows they don't own (server-side ownership checks, not a client-supplied `barberId`). Tracked here so it isn't forgotten.

## Deliberately out of scope for the MVP (but accounted for in the architecture, doesn't block adding later)

- Reminder to the client N hours before the appointment (cron + existing Telegram flow)
- Booking cancellation notification via the bot
- Booking confirmation by the barber (`PENDING` status) — auto-confirm for now
- A distinct `BARBER` role (all self-registered barbers are `ADMIN` accounts today; the enum still leaves room for a separate role later)
- Online payment/deposit for a booking
- Multi-shop (several barbershops grouped under one owner/organization) — barbers self-register as independent, unaffiliated profiles; there is no shop/team grouping
