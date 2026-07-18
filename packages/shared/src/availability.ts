import { z } from 'zod';

/** A calendar date in the barber's timezone, e.g. "2026-08-01". */
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected a date in YYYY-MM-DD format');

/**
 * Query for GET /barbers/:id/availability. `date` is a calendar day in the
 * barber's timezone; `serviceId` selects the duration that sizes the slots.
 */
export const availabilityQuerySchema = z.object({
  date: isoDateSchema,
  serviceId: z.string().min(1),
});

export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;

/** A single bookable slot. Both instants are ISO-8601 UTC. */
export const slotSchema = z.object({
  startAt: z.string().datetime({ offset: false }),
  endAt: z.string().datetime({ offset: false }),
});

export type Slot = z.infer<typeof slotSchema>;

/**
 * Response for GET /barbers/:id/availability. `timezone` is echoed back so the
 * frontend can render the UTC slots in the barber's local time.
 */
export const availabilityResponseSchema = z.object({
  barberId: z.string(),
  serviceId: z.string(),
  date: isoDateSchema,
  timezone: z.string(),
  slots: z.array(slotSchema),
});

export type AvailabilityResponse = z.infer<typeof availabilityResponseSchema>;
