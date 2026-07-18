import { randomUUID } from 'crypto';
import { neon } from '@neondatabase/serverless';
import { DateTime } from 'luxon';

/**
 * Seeds the database with demo data so the admin panel and public booking
 * pages have something to show: barbers, services, working hours, days off,
 * and a spread of past/present/future bookings.
 *
 * Uses the Neon serverless (HTTP/443) driver instead of Prisma so it runs in
 * environments where the raw Postgres port (5432) is firewalled.
 *
 * Idempotent: wipes all barber-scoped data (barbers, services, schedule,
 * bookings) and re-creates it. The admin User row is left untouched.
 *
 *   pnpm --filter @trimly/api db:seed:fake
 */
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL must be set to seed demo data');
}
const sql = neon(connectionString);

const TZ = 'Europe/Brussels';
const id = (): string => 'c' + randomUUID().replace(/-/g, '');

// Deterministic RNG (mulberry32) so re-runs produce a stable, sensible layout.
function makeRng(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = makeRng(20260718);
const pick = <T>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];

interface ServiceSeed {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
}
interface BarberSeed {
  id: string;
  displayName: string;
  bio: string;
  photoUrl: string;
  workdays: number[]; // 0=Sun..6=Sat
  startTime: string;
  endTime: string;
  services: ServiceSeed[];
}

function svc(name: string, durationMinutes: number, price: number): ServiceSeed {
  return { id: id(), name, durationMinutes, price };
}

const barbers: BarberSeed[] = [
  {
    id: id(),
    displayName: 'Marco Rossi',
    bio: 'Senior barber with 12 years behind the chair. Specialises in classic cuts and precise skin fades.',
    photoUrl: 'https://i.pravatar.cc/300?img=12',
    workdays: [2, 3, 4, 5, 6], // Tue–Sat
    startTime: '09:00',
    endTime: '18:00',
    services: [
      svc('Classic Haircut', 30, 25),
      svc('Skin Fade', 45, 30),
      svc('Beard Trim', 20, 15),
      svc('Cut + Beard', 50, 38),
    ],
  },
  {
    id: id(),
    displayName: 'Luca Bianchi',
    bio: 'Fast, sharp, and great with kids. Book him for a no-fuss buzz or a proper hot-towel shave.',
    photoUrl: 'https://i.pravatar.cc/300?img=33',
    workdays: [2, 3, 4, 5, 6], // Tue–Sat
    startTime: '09:00',
    endTime: '18:00',
    services: [
      svc('Haircut', 30, 22),
      svc('Buzz Cut', 20, 18),
      svc('Hot Towel Shave', 30, 28),
      svc('Kids Cut', 20, 15),
    ],
  },
  {
    id: id(),
    displayName: 'Sofia Conti',
    bio: 'Styling and colour specialist. Weekends included, mornings off.',
    photoUrl: 'https://i.pravatar.cc/300?img=45',
    workdays: [3, 4, 5, 6, 0], // Wed–Sun
    startTime: '10:00',
    endTime: '19:00',
    services: [
      svc('Ladies Cut', 45, 35),
      svc('Wash & Style', 30, 25),
      svc('Fringe Trim', 15, 10),
      svc('Colour Touch-up', 60, 55),
    ],
  },
];

const clientNames = [
  'Thomas Peeters', 'Emma De Vos', 'Louis Janssens', 'Julie Maes', 'Noah Willems',
  'Lucas Wouters', 'Mila Claes', 'Finn Goossens', 'Nora Dubois', 'Victor Lemmens',
  'Elena Martin', 'Adam Jacobs', 'Lina Mertens', 'Jules Vermeulen', 'Sara Aerts',
  'Daan Peeters', 'Olivia Simon', 'Mohammed El Amrani', 'Robbe Smets', 'Anna Wauters',
];
const phones = (): string =>
  '+324' + Math.floor(10000000 + rng() * 89999999).toString();

// Working-day day-off overrides. A couple of upcoming closures to demo the schedule.
const today = DateTime.now().setZone(TZ).startOf('day');

interface Row {
  [key: string]: string | number | boolean | null;
}

async function insertMany(table: string, columns: string[], rows: Row[]): Promise<void> {
  if (rows.length === 0) return;
  const CHUNK = 200;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const params: (string | number | boolean | null)[] = [];
    const tuples = chunk.map((row) => {
      const placeholders = columns.map((col) => {
        params.push(row[col] as string | number | boolean | null);
        return `$${params.length}`;
      });
      return `(${placeholders.join(', ')})`;
    });
    const colList = columns.map((c) => `"${c}"`).join(', ');
    const text = `INSERT INTO "${table}" (${colList}) VALUES ${tuples.join(', ')}`;
    await sql.query(text, params);
  }
}

async function main(): Promise<void> {
  // Wipe barber-scoped data (FK order: children first). User row is preserved.
  await sql`DELETE FROM "Booking"`;
  await sql`DELETE FROM "DayOff"`;
  await sql`DELETE FROM "WorkingHours"`;
  await sql`DELETE FROM "Service"`;
  await sql`DELETE FROM "Barber"`;

  const barberRows: Row[] = [];
  const serviceRows: Row[] = [];
  const workingHoursRows: Row[] = [];
  const dayOffRows: Row[] = [];
  const bookingRows: Row[] = [];

  for (const [bi, barber] of barbers.entries()) {
    barberRows.push({
      id: barber.id,
      displayName: barber.displayName,
      bio: barber.bio,
      photoUrl: barber.photoUrl,
      timezone: TZ,
      isActive: true,
    });

    for (const service of barber.services) {
      serviceRows.push({
        id: service.id,
        barberId: barber.id,
        name: service.name,
        durationMinutes: service.durationMinutes,
        price: service.price,
        isActive: true,
      });
    }

    for (const weekday of barber.workdays) {
      workingHoursRows.push({
        id: id(),
        barberId: barber.id,
        weekday,
        startTime: barber.startTime,
        endTime: barber.endTime,
      });
    }

    // One upcoming day off per barber (a working day next week), staggered.
    const off = today.plus({ days: 5 + bi * 2 });
    const offAligned = barber.workdays.includes(off.weekday % 7)
      ? off
      : off.plus({ days: 1 });
    dayOffRows.push({
      id: id(),
      barberId: barber.id,
      date: offAligned.toFormat('yyyy-MM-dd'),
      reason: pick(['Holiday', 'Training day', 'Personal', 'Doctor appointment']),
    });

    // Bookings from 14 days ago through 14 days ahead.
    for (let dayOffset = -14; dayOffset <= 14; dayOffset++) {
      const date = today.plus({ days: dayOffset });
      const weekday = date.weekday % 7; // luxon: 1=Mon..7=Sun -> 0=Sun..6=Sat
      if (!barber.workdays.includes(weekday)) continue;
      if (offAligned.hasSame(date, 'day')) continue;

      const [sh, sm] = barber.startTime.split(':').map(Number);
      const [eh, em] = barber.endTime.split(':').map(Number);
      let cursorMin = sh * 60 + sm;
      const endMin = eh * 60 + em;

      // 2–4 appointments spread through the day, with gaps between them.
      const count = 2 + Math.floor(rng() * 3);
      for (let n = 0; n < count && cursorMin < endMin; n++) {
        const service = pick(barber.services);
        // Random gap (0–60 min, rounded to 15) before this appointment.
        cursorMin += Math.floor(rng() * 5) * 15;
        if (cursorMin + service.durationMinutes > endMin) break;

        const startLocal = date.set({
          hour: Math.floor(cursorMin / 60),
          minute: cursorMin % 60,
          second: 0,
          millisecond: 0,
        });
        const endLocal = startLocal.plus({ minutes: service.durationMinutes });

        let status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
        if (dayOffset < 0) {
          status = rng() < 0.15 ? 'CANCELLED' : 'COMPLETED';
        } else if (dayOffset === 0) {
          // Earlier today = done, later today = still confirmed.
          status = startLocal < DateTime.now().setZone(TZ) ? 'COMPLETED' : 'CONFIRMED';
        } else {
          status = rng() < 0.08 ? 'CANCELLED' : 'CONFIRMED';
        }

        const withTelegram = status === 'CONFIRMED' && rng() < 0.5;

        bookingRows.push({
          id: id(),
          barberId: barber.id,
          serviceId: service.id,
          clientName: pick(clientNames),
          clientPhone: phones(),
          startAt: startLocal.toUTC().toFormat('yyyy-MM-dd HH:mm:ss'),
          endAt: endLocal.toUTC().toFormat('yyyy-MM-dd HH:mm:ss'),
          status,
          notifyToken: id(),
          telegramChatId: withTelegram ? Math.floor(1e8 + rng() * 9e8).toString() : null,
        });

        cursorMin += service.durationMinutes;
      }
    }
  }

  await insertMany('Barber', ['id', 'displayName', 'bio', 'photoUrl', 'timezone', 'isActive'], barberRows);
  await insertMany('Service', ['id', 'barberId', 'name', 'durationMinutes', 'price', 'isActive'], serviceRows);
  await insertMany('WorkingHours', ['id', 'barberId', 'weekday', 'startTime', 'endTime'], workingHoursRows);
  await insertMany('DayOff', ['id', 'barberId', 'date', 'reason'], dayOffRows);
  await insertMany(
    'Booking',
    ['id', 'barberId', 'serviceId', 'clientName', 'clientPhone', 'startAt', 'endAt', 'status', 'notifyToken', 'telegramChatId'],
    bookingRows,
  );

  // eslint-disable-next-line no-console
  console.log(
    `Seeded demo data: ${barberRows.length} barbers, ${serviceRows.length} services, ` +
      `${workingHoursRows.length} working-hour rows, ${dayOffRows.length} days off, ` +
      `${bookingRows.length} bookings.`,
  );
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exitCode = 1;
  });
