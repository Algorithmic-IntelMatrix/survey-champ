-- CreateEnum
CREATE TYPE "SurveyStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- AlterTable
ALTER TABLE "survey_workflows" ADD COLUMN     "status" "SurveyStatus" NOT NULL DEFAULT 'DRAFT';
