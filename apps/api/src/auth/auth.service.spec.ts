import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role, User } from '@prisma/client';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user_1',
    email: 'admin@trimly.app',
    passwordHash: 'hash',
    role: Role.ADMIN,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let prisma: { user: { findUnique: ReturnType<typeof vi.fn> } };
  let jwt: { signAsync: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    prisma = { user: { findUnique: vi.fn() } };
    jwt = { signAsync: vi.fn().mockResolvedValue('signed.jwt.token') };
    const config = { get: vi.fn().mockReturnValue('test-secret') };
    service = new AuthService(
      prisma as unknown as PrismaService,
      jwt as unknown as JwtService,
      config as unknown as ConfigService,
    );
  });

  describe('validateUser', () => {
    it('returns null when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      expect(await service.validateUser('nobody@trimly.app', 'password123')).toBeNull();
    });

    it('returns null when the password does not match', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 4);
      prisma.user.findUnique.mockResolvedValue(makeUser({ passwordHash }));
      expect(await service.validateUser('admin@trimly.app', 'wrong-password')).toBeNull();
    });

    it('returns the user when the password matches', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 4);
      const user = makeUser({ passwordHash });
      prisma.user.findUnique.mockResolvedValue(user);
      expect(await service.validateUser('admin@trimly.app', 'correct-password')).toBe(user);
    });
  });

  describe('login', () => {
    it('throws Unauthorized on invalid credentials', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login('admin@trimly.app', 'whatever1')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('returns a token and the safe user shape on success', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 4);
      prisma.user.findUnique.mockResolvedValue(makeUser({ passwordHash }));

      const result = await service.login('admin@trimly.app', 'correct-password');

      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.user).toEqual({ id: 'user_1', email: 'admin@trimly.app', role: Role.ADMIN });
      expect(jwt.signAsync).toHaveBeenCalledWith(
        { sub: 'user_1', email: 'admin@trimly.app', role: Role.ADMIN },
        expect.objectContaining({ expiresIn: expect.any(String) }),
      );
    });
  });
});
