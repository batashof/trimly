# API — эндпоинты

Базовый URL — адрес Render-сервиса. Все защищённые эндпоинты требуют заголовок `Authorization: Bearer <JWT>`.

## Публичные

| Метод | Путь | Описание |
|---|---|---|
| GET | `/barbers` | Список активных барберов |
| GET | `/barbers/:id/services` | Услуги барбера |
| GET | `/barbers/:id/availability?date=&serviceId=` | Доступные слоты на дату |
| POST | `/bookings` | Создать запись |
| GET | `/health` | Health-check (для пингера, чтобы Render не засыпал) |

### `POST /bookings` — контракт

Запрос (валидируется общей Zod-схемой из `packages/shared`):

```json
{
  "barberId": "string",
  "serviceId": "string",
  "clientName": "string",
  "clientPhone": "string",
  "startAt": "2026-08-01T09:00:00.000Z"
}
```

`clientPhone` обязателен, валидируется по формату телефона на фронте и на бэке (одна и та же Zod-схема).

Ответ:

```json
{
  "id": "booking_id",
  "status": "CONFIRMED",
  "startAt": "2026-08-01T09:00:00.000Z",
  "endAt": "2026-08-01T09:30:00.000Z",
  "telegramDeepLink": "https://t.me/TrimlyBot?start=<notifyToken>"
}
```

`telegramDeepLink` фронт сразу использует для кнопки «Получать уведомления в Telegram» на экране подтверждения — отдельный запрос не нужен.

## Защищённые (JWT, роль ADMIN)

| Метод | Путь | Описание |
|---|---|---|
| POST | `/auth/login` | Логин, возвращает JWT |
| GET | `/auth/me` | Текущий пользователь |
| GET/POST/PATCH/DELETE | `/barbers` | CRUD барберов |
| GET/POST/PATCH/DELETE | `/services` | CRUD услуг |
| GET/POST/PATCH/DELETE | `/working-hours` | CRUD расписания |
| GET/POST/PATCH/DELETE | `/day-offs` | CRUD выходных |
| GET | `/bookings?from=&to=&barberId=` | Список записей с фильтрами |
| PATCH | `/bookings/:id` | Отменить / отметить выполненной |

## Служебный (Telegram)

| Метод | Путь | Описание |
|---|---|---|
| POST | `/telegram/webhook` | Принимает Update от Telegram. Защищён секретным заголовком `X-Telegram-Bot-Api-Secret-Token`, а не JWT (Telegram сам его добавляет к каждому запросу) |

Подробности — `notifications-telegram.md`.
