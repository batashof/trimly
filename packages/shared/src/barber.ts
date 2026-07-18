import { z } from 'zod';

/**
 * Public barber profile shown on the booking page header. Mirrors the fields the
 * API returns from GET /barbers/:id that a client is allowed to see — no internal
 * flags. `timezone` is the IANA string used to render slots in the barber's local
 * time (see docs/business-logic.md).
 */
export const barberPublicSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  bio: z.string().nullable(),
  photoUrl: z.string().nullable(),
  timezone: z.string(),
});

export type BarberPublic = z.infer<typeof barberPublicSchema>;

/**
 * Public service shown on the booking page. Returned by GET /barbers/:id/services
 * (active services only). `price` is a Prisma `Decimal`, which serializes to a
 * string over JSON — accept a number too so callers stay resilient.
 */
export const servicePublicSchema = z.object({
  id: z.string(),
  barberId: z.string(),
  name: z.string(),
  durationMinutes: z.number().int().positive(),
  price: z.union([z.string(), z.number()]),
});

export type ServicePublic = z.infer<typeof servicePublicSchema>;
