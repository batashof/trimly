import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

/**
 * Seeds the first ADMIN user from environment variables and the barber profile
 * that account owns — the owner logs in as ADMIN and *is* that barber. Idempotent:
 * re-running updates the admin's password and leaves the linked barber in place.
 *
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=long-password \
 *   ADMIN_DISPLAY_NAME="Alex the Barber" pnpm --filter @trimly/api db:seed
 */
const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const displayName = process.env.ADMIN_DISPLAY_NAME?.trim() || 'Barber';

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set to seed the admin user');
  }
  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: Role.ADMIN },
    create: { email, passwordHash, role: Role.ADMIN },
  });

  // eslint-disable-next-line no-console
  console.log(`Seeded admin user: ${admin.email} (${admin.id})`);

  // The barber profile the admin owns. Create it only if this account has none
  // yet — never overwrite an existing profile's name/schedule on re-seed.
  const existing = await prisma.barber.findUnique({ where: { userId: admin.id } });
  if (existing) {
    // eslint-disable-next-line no-console
    console.log(`Admin already has a barber profile: ${existing.displayName} (${existing.id})`);
    return;
  }

  const barber = await prisma.barber.create({
    data: { displayName, userId: admin.id },
  });
  // eslint-disable-next-line no-console
  console.log(`Linked barber profile: ${barber.displayName} (${barber.id})`);
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
