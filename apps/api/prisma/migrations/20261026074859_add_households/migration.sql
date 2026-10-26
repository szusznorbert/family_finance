-- CreateEnum
CREATE TYPE "household_role" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');

-- CreateTable
CREATE TABLE "household" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'RON',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "household_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "household_member" (
    "householdId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "household_role" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "household_member_pkey" PRIMARY KEY ("householdId","userId")
);

-- CreateTable
CREATE TABLE "expense_category" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_category_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "household_createdAt_idx" ON "household"("createdAt");

-- CreateIndex
CREATE INDEX "household_member_userId_createdAt_idx" ON "household_member"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "expense_category_householdId_sortOrder_idx" ON "expense_category"("householdId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "expense_category_householdId_name_key" ON "expense_category"("householdId", "name");

-- AddForeignKey
ALTER TABLE "household_member" ADD CONSTRAINT "household_member_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "household_member" ADD CONSTRAINT "household_member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_category" ADD CONSTRAINT "expense_category_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
