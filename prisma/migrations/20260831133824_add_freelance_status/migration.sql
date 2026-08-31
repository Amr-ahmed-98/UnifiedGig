-- AlterTable
ALTER TABLE "FreelanceProject" ADD COLUMN     "isOpen" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "postedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "FreelanceProject_postedAt_idx" ON "FreelanceProject"("postedAt");

-- CreateIndex
CREATE INDEX "FreelanceProject_isOpen_idx" ON "FreelanceProject"("isOpen");
