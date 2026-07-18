# Developer data admin

How to inspect and hand-edit the database directly — including user accounts —
outside the app's own admin panel. This is a developer/operator tool, not part
of the product surface.

## Prisma Studio (primary)

Prisma ships a zero-config web UI over every table. Run it from the repo root:

```bash
pnpm --filter @trimly/api db:studio   # alias for `prisma studio`, opens http://localhost:5555
```

It reads `apps/api/.env` (`DATABASE_URL`), so it edits whatever database that
points at — your local/Neon dev DB by default. To browse production, point
`DATABASE_URL` at the production Neon connection string for the session (prefer
a read-only role if you only need to look).

You can create, edit, and delete rows in any model: `User`, `Barber`,
`Service`, `WorkingHours`, `DayOff`, `Booking`. This is how you fix data by
hand — e.g. relink a `Barber` to a `User` (`Barber.userId`), flip
`Barber.isActive`, or clean up a bad booking.

## Passwords: `db:set-password`

Studio can edit any column but **cannot hash a password** — `User.passwordHash`
is a bcrypt hash, not plaintext. Use the helper to set or reset a login:

```bash
pnpm --filter @trimly/api db:set-password -- you@example.com 'new-strong-password'
```

Creates the user if the email doesn't exist (role `ADMIN`), otherwise just
updates the hash. Minimum 8 characters. Source: `apps/api/prisma/set-password.ts`.

## Accounts and barbers

The owner logs in as `ADMIN` and *is* the single barber — `Barber.userId` links
the two (see [data-model.md](data-model.md)). The seed creates both together:

```bash
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=long-password \
ADMIN_DISPLAY_NAME="Alex the Barber" pnpm --filter @trimly/api db:seed
```

If you ever end up with a `Barber` row whose `userId` is empty (e.g. after
deleting and recreating an account), set it in Studio to re-link the profile to
the account — `GET /barbers/me` and the admin panel resolve the profile through
that field.

## Neon console (production, no local setup)

Neon's dashboard has a built-in table view and SQL editor that work against the
production database straight from the browser — nothing to install. Handy for a
quick production read/edit when you don't want to repoint `DATABASE_URL`
locally. Less ergonomic than Studio for editing, but always available.
