-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "passedScreening" BOOLEAN,
ADD COLUMN     "score" INTEGER,
ADD COLUMN     "scoreSummary" TEXT;

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "screeningPassCount" INTEGER NOT NULL DEFAULT 2;
