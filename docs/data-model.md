# Модель данных

## Prisma-схема

```prisma
enum Role {
  ADMIN
  // BARBER — зарезервировано на будущее: отдельный логин мастера,
  // видит и управляет только своими записями/услугами/расписанием
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
  weekday   Int    // 0-6, 0 = воскресенье
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

## Ключевые решения по модели

**`Barber` не связан с `User`.** В MVP только одна роль — ADMIN, и барберы не логинятся отдельно. `Barber` — это профиль-данные (имя, фото, расписание), которым управляет админ через панель. Это осознанное упрощение: когда понадобится роль `BARBER` с отдельным логином, добавится связь `Barber.userId` — модель это не блокирует.

**`Service` принадлежит конкретному барберу, а не шопу целиком.** У разных мастеров может отличаться цена и длительность одной и той же услуги (например, «стрижка» у одного 30 мин / €20, у другого 45 мин / €25).

**Время хранится в UTC.** У барбера есть `timezone` (по умолчанию `Europe/Brussels`) для корректного построения слотов на фронте и бэке. Важно не потерять эту деталь, если появится барбер в другом часовом поясе.

**`notifyToken`** — случайный уникальный токен, генерируется на каждую запись автоматически. Используется в deep-link на Telegram-бота (`t.me/BotName?start=<notifyToken>`), чтобы бот мог сопоставить `/start` с конкретной записью. Специально не используется сам `booking.id` в качестве публичного токена (см. `notifications-telegram.md`, раздел про безопасность).

**`telegramChatId`** — заполняется только после того, как клиент нажал кнопку и написал боту `/start`. `null` означает, что клиент не подписался на уведомления — это нормальный сценарий, не ошибка.

**Статусы записи (`BookingStatus`)** — без `PENDING`: запись сразу подтверждается при создании (auto-confirm), барбер видит её в панели и может отменить (`CANCELLED`) или отметить выполненной (`COMPLETED`). Ручное подтверждение барбером — осознанно вне MVP (см. `roadmap.md`).
