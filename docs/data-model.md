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
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  role         Role     @default(ADMIN)
  createdAt    DateTime @default(now())
}

model Barber {
  id           String         @id @default(cuid())
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

**`Barber` is not linked to `User`.** In the MVP there's only one role — ADMIN — and barbers don't log in separately. `Barber` is a data profile (name, photo, schedule) managed by the admin through the panel. This is a deliberate simplification: when a `BARBER` role with its own login is needed, a `Barber.userId` relation will be added — the model doesn't block this.

**`Service` belongs to a specific barber, not to the shop as a whole.** Different masters can have different prices and durations for the same service (e.g. a "haircut" might be 30 min / €20 with one barber and 45 min / €25 with another).

**Time is stored in UTC.** Each barber has a `timezone` (default `Europe/Brussels`) for correctly building slots on the frontend and backend. Important not to lose this detail if a barber in a different timezone joins.

**`notifyToken`** — a random unique token, generated automatically for every booking. Used in the deep link to the Telegram bot (`t.me/BotName?start=<notifyToken>`) so the bot can match `/start` to a specific booking. `booking.id` is deliberately not used as the public token (see `notifications-telegram.md`, security section).

**`telegramChatId`** — filled in only after the client taps the button and sends `/start` to the bot. `null` means the client hasn't subscribed to notifications — this is a normal scenario, not an error.

**Booking statuses (`BookingStatus`)** — no `PENDING`: a booking is confirmed immediately on creation (auto-confirm), the barber sees it in the panel and can cancel it (`CANCELLED`) or mark it completed (`COMPLETED`). Manual confirmation by the barber is deliberately out of scope for the MVP (see `roadmap.md`).
