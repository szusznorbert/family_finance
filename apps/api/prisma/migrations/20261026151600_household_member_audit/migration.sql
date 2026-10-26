-- Household membership changes are recorded without storing personal or secret data.
CREATE TYPE "household_member_audit_action" AS ENUM (
    'ROLE_CHANGED',
    'MEMBER_REMOVED',
    'MEMBER_LEFT'
);

CREATE TABLE "household_member_audit_event" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "action" "household_member_audit_action" NOT NULL,
    "previousRole" "household_role",
    "newRole" "household_role",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "household_member_audit_event_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "household_member_audit_event_householdId_createdAt_idx"
ON "household_member_audit_event"("householdId", "createdAt");

ALTER TABLE "household_member_audit_event"
ADD CONSTRAINT "household_member_audit_event_householdId_fkey"
FOREIGN KEY ("householdId") REFERENCES "household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
