-- Link a Barber profile to the ADMIN User that owns it (one account = one barber).
-- Nullable + SetNull so barber data (and its bookings) survives account deletion.

-- AlterTable
ALTER TABLE "Barber" ADD COLUMN "userId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Barber_userId_key" ON "Barber"("userId");

-- AddForeignKey
ALTER TABLE "Barber" ADD CONSTRAINT "Barber_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
