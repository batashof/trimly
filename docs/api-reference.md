# API — Endpoints

Base URL — the Render service address. All protected endpoints require an `Authorization: Bearer <JWT>` header.

## Public

The client booking page is reached through a **per-barber link** (`/book/:barberId` on the web app) — there is no barber-picker, so the public flow starts from a known `barberId` and never needs to list barbers. `GET /barbers` exists (active only) but the booking page doesn't rely on it.

| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Start barber self-registration — send a confirmation email |
| POST | `/auth/register/confirm` | Finish registration — set the password from the emailed token, auto-login |
| GET | `/barbers` | List of active barbers |
| GET | `/barbers/:id` | Single barber's public profile (name, bio, photo, timezone) — booking page header |
| GET | `/barbers/:id/services` | Barber's active services |
| GET | `/barbers/:id/availability?date=&serviceId=` | Available slots for a date |
| POST | `/bookings` | Create a booking |
| GET | `/health` | Health check (for the pinger, to keep Render from sleeping) |

Barber **reads** (`GET /barbers`, `GET /barbers/:id`) are public; barber **writes** stay ADMIN-only (see the Protected table). `GET /barbers/:id/services` is served by a dedicated unguarded controller, mirroring `/barbers/:id/availability`. There is no `POST /barbers` — a `Barber` only ever comes into existence through self-registration (linked 1:1 to its `User`).

### Barber self-registration — `POST /auth/register` and `POST /auth/register/confirm`

A barber creates their own account with a two-step, email-verified flow (see `docs/decisions-log.md`, 2026-07-18 — barber self-registration):

`POST /auth/register` — request (validated by the shared `registerSchema`):

```json
{ "email": "barber@example.com" }
```

Response is always a generic `200` regardless of whether the email was new, unverified, or already registered — the endpoint never reveals whether an address exists:

```json
{ "ok": true }
```

For a new (or still-unverified) email it creates an unverified `User` (no password yet), issues a single-use `EmailVerificationToken` (24h expiry, stored hashed), and emails a link to `${WEB_APP_URL}/register/confirm?token=<rawToken>`. The `Barber` profile is **not** created yet.

`POST /auth/register/confirm` — request (validated by the shared `registerConfirmSchema`):

```json
{ "token": "<rawToken from the email link>", "password": "min-8-chars" }
```

Validates the token (exists, not consumed, not expired), sets the password (bcrypt), marks the account verified, consumes the token, and creates the linked `Barber` profile (display name defaulted from the email local-part). Returns the same shape as `POST /auth/login`, so the web app stores the JWT and lands the new barber straight in the admin panel:

```json
{
  "accessToken": "<jwt>",
  "user": { "id": "user_id", "email": "barber@example.com", "role": "ADMIN" }
}
```

An invalid, expired, or already-used token returns `400`.

### `POST /bookings` — contract

Request (validated by the shared Zod schema from `packages/shared`):

```json
{
  "barberId": "string",
  "serviceId": "string",
  "clientName": "string",
  "clientPhone": "string",
  "startAt": "2026-08-01T09:00:00.000Z"
}
```

`clientPhone` is required, validated against a phone format on both frontend and backend (same Zod schema).

Response:

```json
{
  "id": "booking_id",
  "status": "CONFIRMED",
  "startAt": "2026-08-01T09:00:00.000Z",
  "endAt": "2026-08-01T09:30:00.000Z",
  "telegramDeepLink": "https://t.me/TrimlyBot?start=<notifyToken>"
}
```

The frontend uses `telegramDeepLink` immediately for the "Get notifications on Telegram" button on the confirmation screen — no separate request needed.

## Protected (JWT, ADMIN role)

Every barber-owned endpoint below is **scoped to the caller's own barber**, resolved from the JWT (`BarberScopeGuard`) — the barber id is **never** taken from the request body or query. Create bodies (`/services`, `/working-hours`, `/day-offs`) therefore carry **no** `barberId`, and `GET /bookings` has **no** `barberId` filter. A `:id` that belongs to another barber is reported as **404** (not 403) so ids can't be probed across tenants; the barber-profile writes return **403** when the id isn't the caller's own.

| Method | Path | Description |
|---|---|---|
| POST | `/auth/login` | Login, returns a JWT |
| GET | `/auth/me` | Current user |
| GET | `/barbers/me` | The barber profile owned by the logged-in admin (admin *is* the barber) |
| PATCH/DELETE | `/barbers/:id` | Barber writes — only the caller's own profile (else 403) |
| GET/POST/PATCH/DELETE | `/services` | Service CRUD, scoped to the caller's barber |
| GET/POST/PATCH/DELETE | `/working-hours` | Schedule CRUD, scoped to the caller's barber |
| GET/POST/PATCH/DELETE | `/day-offs` | Day off CRUD, scoped to the caller's barber |
| GET | `/bookings?from=&to=` | List the caller's bookings (date filters only) |
| PATCH | `/bookings/:id` | Cancel / mark completed — only the caller's own booking |

## Service endpoint (Telegram)

| Method | Path | Description |
|---|---|---|
| POST | `/telegram/webhook` | Receives Updates from Telegram. Protected by a secret header `X-Telegram-Bot-Api-Secret-Token` instead of JWT (Telegram adds it to every request itself) |

Details — `notifications-telegram.md`.
