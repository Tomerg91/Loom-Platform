-- DropForeignKey
ALTER TABLE "Resource" DROP CONSTRAINT "Resource_coachId_fkey";

-- DropIndex
DROP INDEX "Resource_coachId_idx";

-- AlterTable
ALTER TABLE "ClientProfile" ADD COLUMN     "nextSessionDate" TIMESTAMP(3),
ADD COLUMN     "scheduleDay" INTEGER,
ADD COLUMN     "scheduleTime" TEXT,
ADD COLUMN     "scheduleTimezone" TEXT,
ADD COLUMN     "sessionCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CoachSession" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionNumber" INTEGER,
    "topic" TEXT,
    "privateNotes" TEXT,
    "sharedSummary" TEXT,
    "coachId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,

    CONSTRAINT "CoachSession_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CoachSession" ADD CONSTRAINT "CoachSession_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "CoachProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachSession" ADD CONSTRAINT "CoachSession_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "CoachProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
