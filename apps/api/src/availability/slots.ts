import { DateTime } from 'luxon';

/**
 * Pure slot-availability logic. No database, no NestJS — just the algorithm
 * from docs/business-logic.md, so it can be unit-tested exhaustively.
 *
 * All comparisons happen as absolute instants (UTC), but working hours are
 * expressed in the barber's local wall-clock time, so we build each slot in the
 * barber's timezone and convert to UTC before comparing. "Today" is likewise
 * decided in the barber's timezone, never the server's.
 */

/** A working-hours row for the barber. `weekday` is 0-6 with 0 = Sunday. */
export interface WorkingInterval {
  weekday: number;
  startTime: string; // "09:00"
  endTime: string; // "18:00"
}

/** An existing booking that occupies the barber's time, as UTC instants. */
export interface BusyInterval {
  startAt: Date;
  endAt: Date;
}

export interface ComputeSlotsParams {
  /** Calendar day in the barber's timezone, "YYYY-MM-DD". */
  date: string;
  /** IANA timezone, e.g. "Europe/Brussels". */
  timezone: string;
  /** All of the barber's working-hours rows (filtered here by weekday). */
  workingHours: WorkingInterval[];
  /** Selected service duration; also the slot step. */
  durationMinutes: number;
  /** The barber's existing bookings that still hold their time. */
  busy: BusyInterval[];
  /** Whether the barber has a DayOff on this date. */
  isDayOff: boolean;
  /** Current instant, used to drop past slots. */
  now: Date;
}

/** A computed free slot, as UTC instants. */
export interface ComputedSlot {
  startAt: Date;
  endAt: Date;
}

/**
 * Weekday (0 = Sunday … 6 = Saturday) of a calendar date in a given timezone.
 * Luxon uses 1 = Monday … 7 = Sunday; `% 7` maps Sunday (7) to 0.
 */
export function weekdayFor(date: string, timezone: string): number {
  return DateTime.fromISO(date, { zone: timezone }).weekday % 7;
}

function intervalsOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  // Half-open [start, end): touching at the boundary is NOT an overlap.
  return aStart < bEnd && bStart < aEnd;
}

export function computeAvailableSlots(params: ComputeSlotsParams): ComputedSlot[] {
  const { date, timezone, workingHours, durationMinutes, busy, isDayOff, now } = params;

  if (isDayOff || durationMinutes <= 0) {
    return [];
  }

  const weekday = weekdayFor(date, timezone);
  const intervals = workingHours.filter((wh) => wh.weekday === weekday);
  if (intervals.length === 0) {
    return [];
  }

  const nowMs = now.getTime();
  const slots: ComputedSlot[] = [];

  for (const interval of intervals) {
    const open = DateTime.fromISO(`${date}T${interval.startTime}`, { zone: timezone });
    const close = DateTime.fromISO(`${date}T${interval.endTime}`, { zone: timezone });
    if (!open.isValid || !close.isValid || close <= open) {
      continue;
    }

    // Slots are consecutive and duration-sized; each must fit inside [open, close).
    for (
      let slotStart = open, slotEnd = open.plus({ minutes: durationMinutes });
      slotEnd <= close;
      slotStart = slotEnd, slotEnd = slotStart.plus({ minutes: durationMinutes })
    ) {
      const startUtc = slotStart.toUTC().toJSDate();
      const endUtc = slotEnd.toUTC().toJSDate();

      // Drop slots that start now or in the past (in real time).
      if (startUtc.getTime() <= nowMs) {
        continue;
      }

      const clash = busy.some((b) => intervalsOverlap(startUtc, endUtc, b.startAt, b.endAt));
      if (!clash) {
        slots.push({ startAt: startUtc, endAt: endUtc });
      }
    }
  }

  slots.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  return slots;
}
