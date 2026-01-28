-- CreateEnum
CREATE TYPE "Mode" AS ENUM ('LIVE', 'TEST');

-- CreateEnum
CREATE TYPE "ResponseStatus" AS ENUM ('COMPLETED', 'FAILED', 'DISQUALIFIED', 'OVER_QUOTA', 'IN_PROGRESS', 'CLICKED');

-- AlterTable
ALTER TABLE "surveys" ADD COLUMN     "redirectUrl" TEXT,
ADD COLUMN     "webhookUrl" TEXT;

-- CreateTable
CREATE TABLE "survey_responses" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "mode" "Mode" NOT NULL DEFAULT 'TEST',
    "response" JSONB NOT NULL,
    "status" "ResponseStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "respondentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "survey_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_metrics" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "mode" "Mode" NOT NULL DEFAULT 'TEST',
    "completed" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "disqualified" INTEGER NOT NULL DEFAULT 0,
    "overQuota" INTEGER NOT NULL DEFAULT 0,
    "clicked" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "survey_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "survey_metrics_surveyId_mode_key" ON "survey_metrics"("surveyId", "mode");

-- AddForeignKey
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "surveys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_metrics" ADD CONSTRAINT "survey_metrics_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "surveys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
