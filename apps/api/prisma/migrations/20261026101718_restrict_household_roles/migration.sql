BEGIN;

-- Convert stored roles while the column is text, then replace the PostgreSQL enum.
-- Existing ADMIN memberships become OWNER so no member loses household access.
ALTER TABLE "household_member" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "household_member"
  ALTER COLUMN "role" TYPE TEXT USING "role"::TEXT;

UPDATE "household_member"
SET "role" = 'OWNER'
WHERE "role" = 'ADMIN';

CREATE TYPE "household_role_new" AS ENUM ('OWNER', 'MEMBER', 'VIEWER');

ALTER TABLE "household_member"
  ALTER COLUMN "role" TYPE "household_role_new"
  USING "role"::"household_role_new";

DROP TYPE "household_role";
ALTER TYPE "household_role_new" RENAME TO "household_role";

ALTER TABLE "household_member" ALTER COLUMN "role" SET DEFAULT 'MEMBER';

COMMIT;
