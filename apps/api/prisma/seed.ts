import { PrismaClient, Role } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import * as bcrypt from 'bcrypt';

/**
 * Seeds the first ADMIN user from environment variables. Idempotent: running
 * it again updates the password of the existing admin rather than failing.
 *
 *   pnpm --filter @trimly/api db:seed
 *
 * Uses the Neon serverless driver (WebSockets on 443) for the same reason as
 * PrismaService — so it runs from networks that firewall raw TCP 5432.
 */
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaNeon(pool) });

async function main(): Promise<void> {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

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
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect().then(() => pool.end());
  });
