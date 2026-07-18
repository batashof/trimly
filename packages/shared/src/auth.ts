import { z } from 'zod';

/**
 * Shared password rule for account creation. Kept in one place so the register
 * form (frontend) and POST /auth/register/confirm (backend) enforce the same
 * minimum. Matches the seed's ADMIN_PASSWORD floor (min 8 chars).
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(200);

/**
 * Body for POST /auth/register — barber self-registration step 1. Only an email
 * is needed; the account is created unverified and a confirmation link is emailed.
 */
export const registerSchema = z.object({
  email: z.string().trim().email(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Body for POST /auth/register/confirm — step 2. `token` comes from the emailed
 * link; `password` is the one the barber chooses. The frontend also collects a
 * "confirm password" field, but that match check is UI-only and never sent.
 */
export const registerConfirmSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

export type RegisterConfirmInput = z.infer<typeof registerConfirmSchema>;
