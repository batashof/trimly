import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Restrict a route to the given roles. Used together with RolesGuard.
 * MVP only has ADMIN, but the decorator is role-agnostic so a future BARBER
 * role needs no changes here — see docs/data-model.md.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
