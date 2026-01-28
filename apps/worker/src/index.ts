import { createSurveySubmissionWorker } from "@surveychamp/queue";
import { Mode, prisma } from "@surveychamp/db";

console.log("🚀 SurveyChamp Worker starting...");

// Batching configuration
const BATCH_SIZE = 50;
const BATCH_INTERVAL_MS = 5000; // 5 seconds

let jobBuffer: any[] = [];
let batchTimeout: any = null;

async function processBatch() {
  if (jobBuffer.length === 0) return;

  const currentBatch = [...jobBuffer];
  jobBuffer = [];
  if (batchTimeout) {
    clearTimeout(batchTimeout);
    batchTimeout = null;
  }

  console.log(`📦 Processing batch of ${currentBatch.length} submissions...`);

  try {
    // 1. Group metrics by surveyId and mode to update them in fewer queries
    const submissionsToCreate: any[] = [];
    const metricsUpdates: Record<string, any> = {};

    for (const job of currentBatch) {
      const { surveyId, mode, status, response, outcome, respondentId } = job.data;
      const jobName = job.name; // "submission" or "process-status-change"

      // 1. If it's a new submission, we need to create the record
      if (jobName === "submission") {
        submissionsToCreate.push({
          surveyId,
          mode,
          response,
          status,
          outcome,
          respondentId,
        });
      }

      // 2. Aggregate metrics for BOTH types of jobs
      const key = `${surveyId}_${mode}`;
      if (!metricsUpdates[key]) {
        metricsUpdates[key] = { 
          surveyId, 
          mode, 
          qualityTerminate: 0,
          securityTerminate: 0,
          completed: 0,
          dropped: 0,
          disqualified: 0,
          overQuota: 0,
          clicked: 0
        };
      }

      if (status === "COMPLETED") metricsUpdates[key].completed++;
      else if (status === "DROPPED") metricsUpdates[key].dropped++;
      else if (status === "DISQUALIFIED") metricsUpdates[key].disqualified++;
      else if (status === "OVER_QUOTA") metricsUpdates[key].overQuota++;
      else if (status === "CLICKED") metricsUpdates[key].clicked++;
      else if (status === "QUALITY_TERMINATE") metricsUpdates[key].qualityTerminate++;
      else if (status === "SECURITY_TERMINATE") metricsUpdates[key].securityTerminate++;
    }

    // 3. Perform Batch DB Operations
    const operations: any[] = [];

    if (submissionsToCreate.length > 0) {
      operations.push(prisma.surveyResponse.createMany({ data: submissionsToCreate }));
    }

    // Add metrics upserts
    for (const update of Object.values(metricsUpdates)) {
       operations.push(
         prisma.surveyMetrics.upsert({
           where: { surveyId_mode: { surveyId: update.surveyId, mode: update.mode as Mode } },
           create: {
             surveyId: update.surveyId,
             mode: update.mode as Mode,
             qualityTerminate: update.qualityTerminate,
             securityTerminate: update.securityTerminate,
             completed: update.completed,
             dropped: update.dropped,
             disqualified: update.disqualified,
             overQuota: update.overQuota,
             clicked: update.clicked,
           },
           update: {
             qualityTerminate: { increment: update.qualityTerminate },
             securityTerminate: { increment: update.securityTerminate },
             completed: { increment: update.completed },
             dropped: { increment: update.dropped },
             disqualified: { increment: update.disqualified },
             overQuota: { increment: update.overQuota },
             clicked: { increment: update.clicked },
           },
         })
       );
    }

    if (operations.length > 0) {
      await prisma.$transaction(operations);
    }

    console.log(`✅ Batch processed successfully`);
  } catch (error) {
    console.error("❌ Error processing batch:", error);
  }
}

const worker = createSurveySubmissionWorker(async (job) => {
  jobBuffer.push(job);

  if (jobBuffer.length >= BATCH_SIZE) {
    await processBatch();
  } else if (!batchTimeout) {
    batchTimeout = setTimeout(processBatch, BATCH_INTERVAL_MS);
  }

  return { status: "buffered" };
});

worker.on("completed", (job) => {
  // Job completed logic if needed
});

worker.on("failed", (job, err) => {
  console.error(`❌ Job ${job?.id} failed:`, err);
});
