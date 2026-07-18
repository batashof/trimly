import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/**
 * Injects the caller's own barber id, resolved from the JWT by BarberScopeGuard.
 * Only valid on routes guarded by BarberScopeGuard — the value is set there.
 */
export const CurrentBarberId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request & { barberId?: string }>();
    // BarberScopeGuard guarantees this is set; the fallback keeps the type honest.
    return request.barberId ?? '';
  },
);
