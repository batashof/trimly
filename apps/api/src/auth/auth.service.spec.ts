import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role, User } from '@prisma/client';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user_1',
    email: 'admin@trimly.app',
    passwordHash: 'hash',
    role: Role.ADMIN,
    emailVerifiedAt: new Date(),
    createdAt: new Date(),
    ...overrides,
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    emailVerificationToken: {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    barber: { findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let jwt: { signAsync: ReturnType<typeof vi.fn> };
  let email: { sendRegistrationConfirmation: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    prisma = {
      user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
      emailVerificationToken: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
      barber: { findUnique: vi.fn(), create: vi.fn() },
      // Run the callback against the same prisma mock (single-connection stand-in).
      $transaction: vi.fn((cb) => cb(prisma)),
    };
    jwt = { signAsync: vi.fn().mockResolvedValue('signed.jwt.token') };
    email = { sendRegistrationConfirmation: vi.fn().mockResolvedValue(undefined) };
    const config = { get: vi.fn().mockReturnValue('test-secret') };
    service = new AuthService(
      prisma as unknown as PrismaService,
      jwt as unknown as JwtService,
      config as unknown as ConfigService,
      email as unknown as EmailService,
    );
  });

  describe('validateUser', () => {
    it('returns null when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      expect(await service.validateUser('nobody@trimly.app', 'password123')).toBeNull();
    });

    it('returns null for an unverified account with no password set', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser({ passwordHash: null }));
      expect(await service.validateUser('admin@trimly.app', 'password123')).toBeNull();
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

  describe('register', () => {
    it('creates an unverified user and emails a confirmation link for a new email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(makeUser({ passwordHash: null, emailVerifiedAt: null }));

      await service.register('new@trimly.app');

      expect(prisma.user.create).toHaveBeenCalled();
      expect(prisma.emailVerificationToken.create).toHaveBeenCalled();
      const [to, url] = email.sendRegistrationConfirmation.mock.calls[0];
      expect(to).toBe('new@trimly.app');
      expect(url).toContain('/register/confirm?token=');
    });

    it('does nothing for an already-verified account (no enumeration)', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser({ emailVerifiedAt: new Date() }));

      await service.register('admin@trimly.app');

      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(prisma.emailVerificationToken.create).not.toHaveBeenCalled();
      expect(email.sendRegistrationConfirmation).not.toHaveBeenCalled();
    });

    it('reissues a token for an existing unverified account', async () => {
      prisma.user.findUnique.mockResolvedValue(
        makeUser({ passwordHash: null, emailVerifiedAt: null }),
      );

      await service.register('admin@trimly.app');

      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(prisma.emailVerificationToken.create).toHaveBeenCalled();
      expect(email.sendRegistrationConfirmation).toHaveBeenCalled();
    });
  });

  describe('confirmRegistration', () => {
    it('rejects an unknown token', async () => {
      prisma.emailVerificationToken.findUnique.mockResolvedValue(null);
      await expect(service.confirmRegistration('bad', 'password123')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects an expired token', async () => {
      prisma.emailVerificationToken.findUnique.mockResolvedValue({
        id: 'tok_1',
        userId: 'user_1',
        consumedAt: null,
        expiresAt: new Date(Date.now() - 1000),
        user: makeUser({ passwordHash: null, emailVerifiedAt: null }),
      });
      await expect(service.confirmRegistration('tok', 'password123')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects an already-consumed token', async () => {
      prisma.emailVerificationToken.findUnique.mockResolvedValue({
        id: 'tok_1',
        userId: 'user_1',
        consumedAt: new Date(),
        expiresAt: new Date(Date.now() + 1000),
        user: makeUser({ passwordHash: null, emailVerifiedAt: null }),
      });
      await expect(service.confirmRegistration('tok', 'password123')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('sets the password, creates the barber, and returns a token on success', async () => {
      prisma.emailVerificationToken.findUnique.mockResolvedValue({
        id: 'tok_1',
        userId: 'user_1',
        consumedAt: null,
        expiresAt: new Date(Date.now() + 1000),
        user: makeUser({ email: 'jane@trimly.app', passwordHash: null, emailVerifiedAt: null }),
      });
      prisma.user.update.mockResolvedValue(makeUser({ email: 'jane@trimly.app' }));
      prisma.barber.findUnique.mockResolvedValue(null);

      const result = await service.confirmRegistration('tok', 'new-password');

      expect(prisma.emailVerificationToken.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ consumedAt: expect.any(Date) }) }),
      );
      expect(prisma.barber.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ displayName: 'jane' }) }),
      );
      expect(result.accessToken).toBe('signed.jwt.token');
    });
  });
});
