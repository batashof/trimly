import { Role } from '@prisma/client';

/** Shape of the signed JWT payload. */
export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

/** Authenticated user attached to the request by JwtStrategy.validate(). */
export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}
