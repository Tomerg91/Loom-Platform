-- AlterTable
ALTER TABLE "CoachSession" ADD COLUMN     "somaticAnchor" "BodyZone";

-- CreateTable
CREATE TABLE "_CoachSessionToResource" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_CoachSessionToResource_AB_unique" ON "_CoachSessionToResource"("A", "B");

-- CreateIndex
CREATE INDEX "_CoachSessionToResource_B_index" ON "_CoachSessionToResource"("B");

-- AddForeignKey
ALTER TABLE "_CoachSessionToResource" ADD CONSTRAINT "_CoachSessionToResource_A_fkey" FOREIGN KEY ("A") REFERENCES "CoachSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CoachSessionToResource" ADD CONSTRAINT "_CoachSessionToResource_B_fkey" FOREIGN KEY ("B") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
