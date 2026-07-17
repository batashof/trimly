# Business Logic

## Calculating available slots

The most fragile part of the system — needs unit tests (Vitest/Jest) first.

Input: `barberId`, `serviceId`, `date`.

1. Take the barber's `WorkingHours` for the weekday of the selected date.
2. Check `DayOff` — if the date is blocked, there are no slots.
3. Slice the working interval into slots sized by the selected service's duration (`Service.durationMinutes`).
4. Subtract overlaps with this barber's existing `Booking`s on that date (interval overlap check on `[startAt, endAt)`).
5. Filter out past slots if the date is today (comparison in the barber's timezone, not the server's).

## Double booking protection

A race is possible if two clients book the same slot at the same time. Availability checking on the frontend is UX only, not a guarantee.

On the backend, on `POST /bookings`:
- Before the `INSERT`, re-check within a transaction that there's no interval overlap for this barber.
- Use a transaction isolation level sufficient to prevent the race (at minimum `SERIALIZABLE` for this specific transaction, or a unique constraint / advisory lock at the barber+time level — details to be finalized during implementation).

## Timezones

- All times in the DB are UTC.
- Each barber has a `timezone` (IANA string, e.g. `Europe/Brussels`).
- Slots are shown and entered on the frontend in the barber's timezone; conversion to UTC happens on the backend when saving.
- Important: don't compare "today" using the server's (Render) time — use the barber's timezone.
