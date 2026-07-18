import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { BarberScopeGuard } from './barber-scope.guard';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../types';

function contextFor(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('BarberScopeGuard', () => {
  let guard: BarberScopeGuard;
  let prisma: { barber: { findUnique: ReturnType<typeof vi.fn> } };
  const user: AuthUser = { id: 'u1', email: 'a@b.co', role: 'ADMIN' as never };

  beforeEach(() => {
    prisma = { barber: { findUnique: vi.fn() } };
    guard = new BarberScopeGuard(prisma as unknown as PrismaService);
  });

  it('pins the resolved barber id on the request', async () => {
    prisma.barber.findUnique.mockResolvedValue({ id: 'b1' });
    const request: Record<string, unknown> = { user };

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.barberId).toBe('b1');
    expect(prisma.barber.findUnique).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      select: { id: true },
    });
  });

  it('rejects an account with no linked barber profile', async () => {
    prisma.barber.findUnique.mockResolvedValue(null);
    await expect(guard.canActivate(contextFor({ user }))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects an unauthenticated request', async () => {
    await expect(guard.canActivate(contextFor({}))).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.barber.findUnique).not.toHaveBeenCalled();
  });
});
