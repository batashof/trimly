# Data Model

## Prisma schema

```prisma
enum Role {
  ADMIN
  // BARBER — reserved for the future: a separate master login,
  // sees and manages only their own bookings/services/schedule
}

enum BookingStatus {
  CONFIRMED
  CANCELLED
  COMPLETED
}

model User {
  id                 String                   @id @default(cuid())
  email              String                   @unique
  passwordHash       String?                  // null until the barber sets a password via the email-confirmation link
  role               Role                     @default(ADMIN)
  emailVerifiedAt    DateTime?                // set when the confirmation link is used
  barber             Barber?
  verificationTokens EmailVerificationToken[]
  createdAt          DateTime                 @default(now())
}

model EmailVerificationToken {
  id         String    @id @default(cuid())
  tokenHash  String    @unique // sha256 of the random token; the raw token only ever lives in the email link
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId     String
  expiresAt  DateTime
  consumedAt DateTime? // set once the link is used; a consumed or expired token is rejected
  createdAt  DateTime  @default(now())

  @@index([userId])
}

model Barber {
  id           String         @id @default(cuid())
  user         User?          @relation(fields: [userId], references: [id], onDelete: SetNull)
  userId       String?        @unique
  displayName  String
  bio          String?
  photoUrl     String?
  timezone     String         @default("Europe/Brussels")
  isActive     Boolean        @default(true)
  services     Service[]
  workingHours WorkingHours[]
  dayOffs      DayOff[]
  bookings     Booking[]
  createdAt    DateTime       @default(now())
}

model Service {
  id              String    @id @default(cuid())
  barber          Barber    @relation(fields: [barberId], references: [id])
  barberId        String
  name            String
  durationMinutes Int
  price           Decimal
  isActive        Boolean   @default(true)
  bookings        Booking[]
}

model WorkingHours {
  id        String @id @default(cuid())
  barber    Barber @relation(fields: [barberId], references: [id])
  barberId  String
  weekday   Int    // 0-6, 0 = Sunday
  startTime String // "09:00"
  endTime   String // "18:00"
}

model DayOff {
  id       String   @id @default(cuid())
  barber   Barber   @relation(fields: [barberId], references: [id])
  barberId String
  date     DateTime
  reason   String?
}

model Booking {
  id             String        @id @default(cuid())
  barber         Barber        @relation(fields: [barberId], references: [id])
  barberId       String
  service        Service       @relation(fields: [serviceId], references: [id])
  serviceId      String
  clientName     String
  clientPhone    String
  startAt        DateTime
  endAt          DateTime
  status         BookingStatus @default(CONFIRMED)
  notifyToken    String        @unique @default(cuid())
  telegramChatId String?
  createdAt      DateTime      @default(now())
}
```

## Key modeling decisions

**`Barber` is linked 1:1 to `User` via `Barber.userId`.** Each barber logs in as ADMIN and *is* one `Barber` profile — one account, one profile. Accounts are created by **self-registration** (`POST /auth/register` → email confirmation → set password; see `api-reference.md` and the decisions log entry), which creates the `User` and its linked `Barber` together; the seed still creates the initial owner account the same way. The admin panel edits that one profile (`GET /barbers/me` resolves it from the JWT). The relation is optional (`userId String?`) with `onDelete: SetNull` so barber data and its bookings survive if the account is deleted.

**Self-registration and email verification.** `User.passwordHash` is **nullable**: `POST /auth/register` creates an unverified `User` with no password and issues an `EmailVerificationToken`, so an account can exist before a password is set. `User.emailVerifiedAt` and the token's `consumedAt` are both set when the confirmation link is used, at which point the password is stored and the linked `Barber` profile is created. Unverified users (null `passwordHash`, no `emailVerifiedAt`) therefore **cannot log in** and have **no `Barber` row**, so they never appear in the public `GET /barbers` list. The token is stored **hashed** (sha256) — the raw token only ever travels in the email link — so a database leak can't be turned into a usable confirmation link; tokens also carry an `expiresAt` (24h) and are single-use (`consumedAt`).

**`Service` belongs to a specific barber, not to the shop as a whole.** Different masters can have different prices and durations for the same service (e.g. a "haircut" might be 30 min / €20 with one barber and 45 min / €25 with another).

**Time is stored in UTC.** Each barber has a `timezone` (default `Europe/Brussels`) for correctly building slots on the frontend and backend. Important not to lose this detail if a barber in a different timezone joins.

**`notifyToken`** — a random unique token, generated automatically for every booking. Used in the deep link to the Telegram bot (`t.me/BotName?start=<notifyToken>`) so the bot can match `/start` to a specific booking. `booking.id` is deliberately not used as the public token (see `notifications-telegram.md`, security section).

**`telegramChatId`** — filled in only after the client taps the button and sends `/start` to the bot. `null` means the client hasn't subscribed to notifications — this is a normal scenario, not an error.

**Booking statuses (`BookingStatus`)** — no `PENDING`: a booking is confirmed immediately on creation (auto-confirm), the barber sees it in the panel and can cancel it (`CANCELLED`) or mark it completed (`COMPLETED`). Manual confirmation by the barber is deliberately out of scope for the MVP (see `roadmap.md`).
