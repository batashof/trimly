# Client Notifications via Telegram

## Why this approach

Clients need a booking notification, and the budget is €0. Real SMS and Viber Business Messages are paid and require business verification (Viber also has a minimum monthly fee with most providers). Email works but isn't a messenger. The Telegram Bot API is completely free with no limits at our volume — but it has a fundamental limitation: **a bot cannot message a user first**, until the user has sent `/start` to the bot themselves. This isn't our architectural choice but a platform limitation of Telegram — the flow has to be designed around it.

## Flow

1. The client fills out the booking form on the public page → `POST /bookings`.
2. The backend creates a `Booking` with an automatically generated `notifyToken` (a random string, not the same as `booking.id`).
3. The API response includes `telegramDeepLink`: `https://t.me/TrimlyBot?start=<notifyToken>`.
4. On the confirmation screen, the frontend shows a "Get notifications on Telegram" button with this link.
5. If the client taps it — Telegram opens, a chat with the bot starts, and `/start <notifyToken>` is sent automatically.
6. The bot (webhook at `/telegram/webhook`) receives the Update, parses `notifyToken` from the `/start` command payload, and looks up the `Booking` by this token.
7. If found — the backend saves the `chatId` from the Update into `Booking.telegramChatId` and immediately sends a message with the booking details (barber, service, date and time).
8. If the client didn't tap the button — `telegramChatId` stays `null`, which is normal; there's just no automatic notification. The barber still sees the booking in the panel.

## Why webhook, not polling

There are two ways to receive updates from Telegram: long polling (`getUpdates`) or webhook (Telegram calls our URL itself). Since the backend already runs continuously on Render (not serverless — see `architecture.md`), a webhook is the natural choice: no separate poller process needed, updates arrive instantly, less code. This is another argument in favor of not moving the backend to Vercel serverless — hosting a webhook there would require extra work.

## Technical details

- Library: **grammY** (TS-first, actively maintained, simple to integrate as a Nest module).
- The bot token is obtained for free from `@BotFather` on Telegram (create a bot, copy the token) — stored as the `TELEGRAM_BOT_TOKEN` environment variable on Render, never committed to the repository.
- The webhook is protected by a secret header (`secret_token`, set when registering the webhook via `setWebhook`); Telegram sends it with every request — it's checked before processing, so no one else can send us fake updates.

## Security

`notifyToken` is a separate random field, not `booking.id`. If the ID itself were used (especially if predictable/sequential), anyone could subscribe to someone else's booking notifications by enumerating IDs. A random unique token removes that possibility.

## Deliberately out of scope for the MVP (but the flow doesn't block it)

- Reminder N hours before the appointment (needs `@nestjs/schedule` cron — technically simple to add later, since the backend already runs continuously on Render).
- Cancellation notification via the bot (same mechanism, just another message type — easy to add once cancellation exists in the admin panel).
