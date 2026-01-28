-- AlterTable
ALTER TABLE "surveys" ADD COLUMN     "globalQuota" INTEGER,
ADD COLUMN     "overQuotaUrl" TEXT,
ADD COLUMN     "securityTerminateUrl" TEXT;

-- CreateTable
CREATE TABLE "survey_quotas" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "rule" JSONB NOT NULL,
    "limit" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "survey_quotas_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "survey_quotas" ADD CONSTRAINT "survey_quotas_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "surveys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
