-- CreateEnum
CREATE TYPE "household_invitation_status" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

-- CreateTable
CREATE TABLE "household_invitation" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "invitedByUserId" TEXT NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "normalizedEmail" VARCHAR(254) NOT NULL,
    "role" "household_role" NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "status" "household_invitation_status" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "household_invitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "household_invitation_tokenHash_key" ON "household_invitation"("tokenHash");

-- The lifecycle status is maintained transactionally by the API. Expired rows are
-- transitioned out of PENDING before another invite for the same address is issued.
CREATE UNIQUE INDEX "household_invitation_one_pending_per_address_key"
ON "household_invitation"("householdId", "normalizedEmail")
WHERE "status" = 'PENDING';

-- CreateIndex
CREATE INDEX "household_invitation_householdId_status_expiresAt_idx"
ON "household_invitation"("householdId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "household_invitation_invitedByUserId_createdAt_idx"
ON "household_invitation"("invitedByUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "household_invitation" ADD CONSTRAINT "household_invitation_householdId_fkey"
FOREIGN KEY ("householdId") REFERENCES "household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "household_invitation" ADD CONSTRAINT "household_invitation_invitedByUserId_fkey"
FOREIGN KEY ("invitedByUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
