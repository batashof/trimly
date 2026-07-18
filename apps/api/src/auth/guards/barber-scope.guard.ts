import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../types';

/**
 * Resolves the barber profile owned by the authenticated caller and pins it on
 * the request as `barberId`. Every admin endpoint that touches barber-owned data
 * (services, working hours, days off, bookings) runs behind this guard so the
 * scope comes from the JWT — never from a client-supplied `barberId` — which is
 * what stops one barber from reading or modifying another's data.
 *
 * Must run after JwtAuthGuard (it needs `req.user`). Reject with 403 when the
 * account has no linked barber profile: it is authenticated but cannot act as a
 * barber. See docs/decisions-log.md (2026-07-18 — per-barber authorization scoping).
 */
@Injectable()
export class BarberScopeGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const request = ctx.switchToHttp().getRequest<Request & { user?: AuthUser; barberId?: string }>();
    const user = request.user;
    if (!user) {
      throw new UnauthorizedException();
    }

    const barber = await this.prisma.barber.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!barber) {
      throw new ForbiddenException('No barber profile is linked to this account');
    }

    request.barberId = barber.id;
    return true;
  }
}
