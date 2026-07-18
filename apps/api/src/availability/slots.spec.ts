import { describe, it, expect } from 'vitest';
import { computeAvailableSlots, weekdayFor, WorkingInterval } from './slots';

// A fixed "now" far in the past so no slot is dropped as past, unless a test
// overrides it. 2026-08-01 is a Saturday.
const PAST = new Date('2000-01-01T00:00:00.000Z');
const TZ = 'Europe/Brussels'; // UTC+2 in August (CEST), UTC+1 in winter (CET).

const hours = (weekday: number, startTime: string, endTime: string): WorkingInterval => ({
  weekday,
  startTime,
  endTime,
});

describe('weekdayFor', () => {
  it('maps Sunday to 0 and Saturday to 6', () => {
    expect(weekdayFor('2026-08-02', TZ)).toBe(0); // Sunday
    expect(weekdayFor('2026-08-01', TZ)).toBe(6); // Saturday
    expect(weekdayFor('2026-07-20', TZ)).toBe(1); // Monday
  });
});

describe('computeAvailableSlots', () => {
  it('slices the working interval into duration-sized slots', () => {
    const slots = computeAvailableSlots({
      date: '2026-08-01', // Saturday
      timezone: TZ,
      workingHours: [hours(6, '09:00', '10:30')],
      durationMinutes: 30,
      busy: [],
      isDayOff: false,
      now: PAST,
    });
    // 09:00, 09:30, 10:00 local == 07:00, 07:30, 08:00 UTC (CEST = UTC+2).
    expect(slots.map((s) => s.startAt.toISOString())).toEqual([
      '2026-08-01T07:00:00.000Z',
      '2026-08-01T07:30:00.000Z',
      '2026-08-01T08:00:00.000Z',
    ]);
    expect(slots[0].endAt.toISOString()).toBe('2026-08-01T07:30:00.000Z');
  });

  it('does not emit a slot that would run past closing time', () => {
    const slots = computeAvailableSlots({
      date: '2026-08-01',
      timezone: TZ,
      workingHours: [hours(6, '09:00', '10:00')],
      durationMinutes: 45, // 09:00-09:45 fits; 09:45-10:30 does not.
      busy: [],
      isDayOff: false,
      now: PAST,
    });
    expect(slots).toHaveLength(1);
    expect(slots[0].startAt.toISOString()).toBe('2026-08-01T07:00:00.000Z');
  });

  it('returns nothing on a day off', () => {
    const slots = computeAvailableSlots({
      date: '2026-08-01',
      timezone: TZ,
      workingHours: [hours(6, '09:00', '18:00')],
      durationMinutes: 30,
      busy: [],
      isDayOff: true,
      now: PAST,
    });
    expect(slots).toEqual([]);
  });

  it('returns nothing when there are no working hours for that weekday', () => {
    const slots = computeAvailableSlots({
      date: '2026-08-02', // Sunday
      timezone: TZ,
      workingHours: [hours(6, '09:00', '18:00')], // Saturday only
      durationMinutes: 30,
      busy: [],
      isDayOff: false,
      now: PAST,
    });
    expect(slots).toEqual([]);
  });

  it('removes slots overlapping an existing booking', () => {
    const slots = computeAvailableSlots({
      date: '2026-08-01',
      timezone: TZ,
      workingHours: [hours(6, '09:00', '11:00')],
      durationMinutes: 30,
      // Booking 09:30-10:00 local == 07:30-08:00 UTC.
      busy: [
        {
          startAt: new Date('2026-08-01T07:30:00.000Z'),
          endAt: new Date('2026-08-01T08:00:00.000Z'),
        },
      ],
      isDayOff: false,
      now: PAST,
    });
    // 09:00, [09:30 taken], 10:00, 10:30 → three free slots.
    expect(slots.map((s) => s.startAt.toISOString())).toEqual([
      '2026-08-01T07:00:00.000Z',
      '2026-08-01T08:00:00.000Z',
      '2026-08-01T08:30:00.000Z',
    ]);
  });

  it('treats boundary-touching bookings as non-overlapping', () => {
    const slots = computeAvailableSlots({
      date: '2026-08-01',
      timezone: TZ,
      workingHours: [hours(6, '09:00', '10:00')],
      durationMinutes: 30,
      // Booking ends exactly when the 09:30 slot starts — no overlap.
      busy: [
        {
          startAt: new Date('2026-08-01T07:00:00.000Z'),
          endAt: new Date('2026-08-01T07:30:00.000Z'),
        },
      ],
      isDayOff: false,
      now: PAST,
    });
    // 09:00-09:30 overlaps the booking (removed); 09:30-10:00 touches it (kept).
    expect(slots.map((s) => s.startAt.toISOString())).toEqual([
      '2026-08-01T07:30:00.000Z',
    ]);
  });

  it('drops slots that start in the past for today (barber timezone)', () => {
    const slots = computeAvailableSlots({
      date: '2026-08-01',
      timezone: TZ,
      workingHours: [hours(6, '09:00', '11:00')],
      durationMinutes: 30,
      busy: [],
      isDayOff: false,
      // 09:20 local (07:20 UTC): the 09:00 slot is past, 09:30 onward remain.
      now: new Date('2026-08-01T07:20:00.000Z'),
    });
    expect(slots.map((s) => s.startAt.toISOString())).toEqual([
      '2026-08-01T07:30:00.000Z',
      '2026-08-01T08:00:00.000Z',
      '2026-08-01T08:30:00.000Z',
    ]);
  });

  it('converts using winter offset (CET = UTC+1) when the date is in winter', () => {
    const slots = computeAvailableSlots({
      date: '2026-01-10', // Saturday, CET
      timezone: TZ,
      workingHours: [hours(6, '09:00', '09:30')],
      durationMinutes: 30,
      busy: [],
      isDayOff: false,
      now: PAST,
    });
    // 09:00 CET == 08:00 UTC (not 07:00 as in summer).
    expect(slots.map((s) => s.startAt.toISOString())).toEqual([
      '2026-01-10T08:00:00.000Z',
    ]);
  });

  it('supports multiple working intervals in one day (lunch break)', () => {
    const slots = computeAvailableSlots({
      date: '2026-08-01',
      timezone: TZ,
      workingHours: [hours(6, '09:00', '10:00'), hours(6, '13:00', '14:00')],
      durationMinutes: 30,
      busy: [],
      isDayOff: false,
      now: PAST,
    });
    expect(slots.map((s) => s.startAt.toISOString())).toEqual([
      '2026-08-01T07:00:00.000Z',
      '2026-08-01T07:30:00.000Z',
      '2026-08-01T11:00:00.000Z',
      '2026-08-01T11:30:00.000Z',
    ]);
  });
});
