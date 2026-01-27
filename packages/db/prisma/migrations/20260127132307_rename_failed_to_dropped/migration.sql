/*
  Warnings:

  - The values [FAILED] on the enum `ResponseStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `failed` on the `survey_metrics` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ResponseStatus_new" AS ENUM ('COMPLETED', 'DROPPED', 'DISQUALIFIED', 'OVER_QUOTA', 'IN_PROGRESS', 'CLICKED', 'QUALITY_TERMINATE', 'SECURITY_TERMINATE');
ALTER TABLE "public"."survey_responses" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "survey_responses" ALTER COLUMN "status" TYPE "ResponseStatus_new" USING (CASE WHEN "status"::text = 'FAILED' THEN 'DROPPED' ELSE "status"::text END)::"ResponseStatus_new";
ALTER TYPE "ResponseStatus" RENAME TO "ResponseStatus_old";
ALTER TYPE "ResponseStatus_new" RENAME TO "ResponseStatus";
DROP TYPE "public"."ResponseStatus_old";
ALTER TABLE "survey_responses" ALTER COLUMN "status" SET DEFAULT 'IN_PROGRESS';
COMMIT;

-- AlterTable
ALTER TABLE "survey_metrics" RENAME COLUMN "failed" TO "dropped";
