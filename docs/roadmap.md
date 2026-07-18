# Roadmap

1. Monorepo setup (Turborepo), Prisma schema, migrations on Neon
2. Backend: auth (JWT, ADMIN role), CRUD for barbers/services/schedule/days off
3. Backend: slot availability logic + booking creation + double booking protection (`business-logic.md`)
4. Backend: Telegram bot — registration via BotFather, webhook endpoint, deep link flow, sending confirmations (`notifications-telegram.md`)
5. Frontend: public booking page — reached via a per-barber link `/book/[barberId]` (no barber-picker; the barber shares their own link). Flow: service → slot → form → confirmation screen with Telegram button.
6. Frontend: admin panel (booking list with filters, schedule management, services, own profile). The admin account *is* the barber (`Barber.userId` 1:1) — no barber-management UI.
7. Deployment: Vercel (web) + Render (api) + pinger for the api (`architecture.md`)
8. UI polish, basic unit tests for slot logic and double booking

## Deliberately out of scope for the MVP (but accounted for in the architecture, doesn't block adding later)

- Reminder to the client N hours before the appointment (cron + existing Telegram flow)
- Booking cancellation notification via the bot
- Booking confirmation by the barber (`PENDING` status) — auto-confirm for now
- `BARBER` role with a separate login for extra masters (the model already allows this — `Barber.userId` links each profile to its own account)
- Online payment/deposit for a booking
- Multi-shop (several barbershops in one instance) — currently one shop, one barber (the owner)
