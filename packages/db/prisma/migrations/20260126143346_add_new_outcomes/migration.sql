-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ResponseStatus" ADD VALUE 'QUALITY_TERMINATE';
ALTER TYPE "ResponseStatus" ADD VALUE 'SECURITY_TERMINATE';

-- AlterTable
ALTER TABLE "survey_metrics" ADD COLUMN     "qualityTerminate" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "securityTerminate" INTEGER NOT NULL DEFAULT 0;
