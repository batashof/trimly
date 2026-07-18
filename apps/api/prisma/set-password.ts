import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

/**
 * Dev-admin helper: set (or create) an account's password from the CLI. Prisma
 * Studio can edit any field but can't hash a password, so use this to reset
 * logins by hand. Creates the user if the email doesn't exist yet.
 *
 *   pnpm --filter @trimly/api db:set-password -- you@example.com 'new-password'
 *
 * See docs/dev-admin.md.
 */
const prisma = new PrismaClient();

async function main(): Promise<void> {
  const [email, password] = process.argv.slice(2);

  if (!email || !password) {
    throw new Error("Usage: db:set-password -- <email> '<password>'");
  }
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash, role: Role.ADMIN },
  });

  // eslint-disable-next-line no-console
  console.log(`Password set for ${user.email} (${user.id})`);
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
