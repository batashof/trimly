import { z } from 'zod';

/**
 * E.164-ish phone validation, shared by the public booking form (frontend)
 * and the POST /bookings request validation (backend). Kept intentionally
 * permissive: optional leading "+", 8–15 digits, spaces/dashes stripped by
 * the caller before parsing.
 */
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{8,15}$/, 'Enter a valid phone number');

/**
 * Request body for POST /bookings. `startAt` is an ISO-8601 UTC instant;
 * the barber/service determine duration, so `endAt` is computed server-side.
 */
export const createBookingSchema = z.object({
  barberId: z.string().min(1),
  serviceId: z.string().min(1),
  clientName: z.string().trim().min(1, 'Name is required').max(120),
  clientPhone: phoneSchema,
  startAt: z.string().datetime({ offset: false }),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const bookingStatusSchema = z.enum(['CONFIRMED', 'CANCELLED', 'COMPLETED']);
export type BookingStatus = z.infer<typeof bookingStatusSchema>;

/**
 * Response returned by POST /bookings. The frontend uses `telegramDeepLink`
 * directly for the "Get notifications on Telegram" button on the confirmation
 * screen — see docs/notifications-telegram.md.
 */
export const bookingConfirmationSchema = z.object({
  id: z.string(),
  status: bookingStatusSchema,
  startAt: z.string().datetime({ offset: false }),
  endAt: z.string().datetime({ offset: false }),
  telegramDeepLink: z.string().url(),
});

export type BookingConfirmation = z.infer<typeof bookingConfirmationSchema>;

/**
 * Query for GET /bookings (admin). All filters are optional; `from`/`to` bound
 * the booking `startAt` (ISO-8601 UTC), `barberId` narrows to one barber.
 */
export const bookingListQuerySchema = z.object({
  from: z.string().datetime({ offset: false }).optional(),
  to: z.string().datetime({ offset: false }).optional(),
  barberId: z.string().min(1).optional(),
});

export type BookingListQuery = z.infer<typeof bookingListQuerySchema>;

/**
 * Body for PATCH /bookings/:id (admin). The admin can only move a booking to a
 * terminal state — cancel it or mark it completed. See docs/data-model.md.
 */
export const updateBookingSchema = z.object({
  status: z.enum(['CANCELLED', 'COMPLETED']),
});

export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;
