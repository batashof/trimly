import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Role, User } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import type { AuthUser, JwtPayload } from './types';

export interface LoginResult {
  accessToken: string;
  user: AuthUser;
}

/** How long a self-registration confirmation link stays valid. */
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly email: EmailService,
  ) {}

  /** Returns the user when the email/password pair is valid, otherwise null. */
  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // An unverified account has no password set yet — it cannot log in.
    if (!user || !user.passwordHash) {
      return null;
    }
    const matches = await bcrypt.compare(password, user.passwordHash);
    return matches ? user : null;
  }

  /** Validates credentials and issues a signed JWT. */
  async login(email: string, password: string): Promise<LoginResult> {
    const user = await this.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.issueToken(user);
  }

  /**
   * Barber self-registration, step 1. Creates an unverified account (no password)
   * and emails a confirmation link. Returns nothing observable: to avoid account
   * enumeration the caller always gets the same generic success regardless of
   * whether the email was new, still unverified, or already registered.
   */
  async register(email: string): Promise<void> {
    const existing = await this.prisma.user.findUnique({ where: { email } });

    // Already a full account — don't send a link and don't reveal that it exists.
    if (existing?.emailVerifiedAt) {
      return;
    }

    const user =
      existing ??
      (await this.prisma.user.create({ data: { email, role: Role.ADMIN } }));

    const rawToken = randomBytes(32).toString('hex');
    await this.prisma.emailVerificationToken.create({
      data: {
        tokenHash: this.hashToken(rawToken),
        userId: user.id,
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      },
    });

    const base = (this.config.get<string>('WEB_APP_URL') ?? 'http://localhost:3000').replace(
      /\/$/,
      '',
    );
    const confirmUrl = `${base}/register/confirm?token=${rawToken}`;
    await this.email.sendRegistrationConfirmation(email, confirmUrl);
  }

  /**
   * Barber self-registration, step 2. Validates the emailed token, sets the
   * password, marks the account verified, creates the linked Barber profile, and
   * returns a JWT so the web app auto-logs-in the new barber.
   */
  async confirmRegistration(token: string, password: string): Promise<LoginResult> {
    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash: this.hashToken(token) },
      include: { user: true },
    });

    if (!record || record.consumedAt || record.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Invalid or expired confirmation link');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const displayName = deriveDisplayName(record.user.email);
    const now = new Date();

    const user = await this.prisma.$transaction(async (tx) => {
      // Consume the token first so a concurrent confirm can't reuse it.
      await tx.emailVerificationToken.update({
        where: { id: record.id },
        data: { consumedAt: now },
      });
      const updated = await tx.user.update({
        where: { id: record.userId },
        data: { passwordHash, emailVerifiedAt: now },
      });
      const barber = await tx.barber.findUnique({ where: { userId: updated.id } });
      if (!barber) {
        await tx.barber.create({ data: { userId: updated.id, displayName } });
      }
      return updated;
    });

    return this.issueToken(user);
  }

  /** Signs a JWT for an authenticated user (shared by login and register/confirm). */
  private async issueToken(user: User): Promise<LoginResult> {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('JWT_SECRET'),
      expiresIn: this.config.get<string>('JWT_EXPIRES_IN') ?? '7d',
    });

    return {
      accessToken,
      user: { id: user.id, email: user.email, role: user.role },
    };
  }

  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }
}

/** A friendly default barber name from the email local-part (e.g. "jane.doe"). */
function deriveDisplayName(email: string): string {
  const local = email.split('@')[0]?.trim();
  return local && local.length > 0 ? local : 'Barber';
}
