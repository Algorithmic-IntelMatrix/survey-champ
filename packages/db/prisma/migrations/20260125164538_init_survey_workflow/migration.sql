-- CreateTable
CREATE TABLE "survey_workflows" (
    "id" TEXT NOT NULL,
    "runtimeJson" JSONB NOT NULL,
    "designJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "surveyId" TEXT NOT NULL,

    CONSTRAINT "survey_workflows_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "survey_workflows" ADD CONSTRAINT "survey_workflows_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "surveys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
