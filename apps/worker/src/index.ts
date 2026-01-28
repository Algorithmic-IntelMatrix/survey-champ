import { createSurveySubmissionWorker } from "@surveychamp/queue";
import { Mode, prisma, ResponseStatus } from "@surveychamp/db";

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
    const responseOperations: Record<string, {
      data: any;
      isNew: boolean;
      metrics: Set<string>;
    }> = {};

    const metricsUpdates: Record<string, any> = {};

    // Sort batch by timestamp to ensure chronological processing
    const sortedBatch = currentBatch.sort((a, b) => 
      new Date(a.data.timestamp).getTime() - new Date(b.data.timestamp).getTime()
    );

    for (const job of sortedBatch) {
      const { id, surveyId, mode, status, response, outcome, respondentId } = job.data;
      const jobName = job.name;

      if (!id) continue;

      if (!responseOperations[id]) {
        responseOperations[id] = {
          data: { id }, // Base data
          isNew: jobName === "start-response" || jobName === "submission",
          metrics: new Set(),
        };
      }

      const op = responseOperations[id];

      // Update data based on job type, but ONLY if fields are present
      // This prevents overwriting existing DB data with undefined/null
      if (surveyId) op.data.surveyId = surveyId;
      if (mode) op.data.mode = mode;
      
      if (jobName === "submission" || jobName === "start-response") {
        if (response !== undefined) op.data.response = response;
        if (status) {
          op.data.status = status;
          op.metrics.add(status);
        }
        if (outcome) op.data.outcome = outcome;
        if (respondentId) op.data.respondentId = respondentId;
      } else if (jobName === "update-response") {
        if (response !== undefined) op.data.response = response;
        if (status) {
          op.data.status = status;
          op.metrics.add(status);
        }
        if (outcome) op.data.outcome = outcome;
        if (respondentId) op.data.respondentId = respondentId;
      } else if (jobName === "heartbeat") {
        op.data.updatedAt = new Date();
      }

      // Aggregate metrics logic (per surveyId and mode)
      // Note: We need surveyId/mode for metrics. If they are missing in this job, 
      // we try to use what we've accumulated so far for this ID.
      const currentSurveyId = op.data.surveyId;
      const currentMode = op.data.mode;

      if (currentSurveyId && currentMode) {
        const mKey = `${currentSurveyId}_${currentMode}`;
        if (!metricsUpdates[mKey]) {
          metricsUpdates[mKey] = { 
            surveyId: currentSurveyId, 
            mode: currentMode,
            qualityTerminate: 0, securityTerminate: 0, completed: 0, 
            dropped: 0, disqualified: 0, overQuota: 0, clicked: 0 
          };
        }
      }
    }

    // Now convert the accumulated status changes into metric increments
    for (const id in responseOperations) {
      const op = responseOperations[id];
      if (!op.data.surveyId || !op.data.mode) continue;

      const mKey = `${op.data.surveyId}_${op.data.mode}`;
      if (!metricsUpdates[mKey]) continue;
      
      op.metrics.forEach(status => {
        if (status === "COMPLETED") metricsUpdates[mKey].completed++;
        else if (status === "DROPPED") metricsUpdates[mKey].dropped++;
        else if (status === "DISQUALIFIED") metricsUpdates[mKey].disqualified++;
        else if (status === "OVER_QUOTA") metricsUpdates[mKey].overQuota++;
        else if (status === "CLICKED") metricsUpdates[mKey].clicked++;
        else if (status === "QUALITY_TERMINATE") metricsUpdates[mKey].qualityTerminate++;
        else if (status === "SECURITY_TERMINATE") metricsUpdates[mKey].securityTerminate++;
      });
    }

    // 3. Perform Final DB Operations
    const operations: any[] = [];

    for (const id in responseOperations) {
      const op = responseOperations[id];
      const { id: _, ...dataWithoutId } = op.data;

      // Use upsert for EVERY response to handle out-of-order jobs (e.g. heartbeat before start)
      operations.push(prisma.surveyResponse.upsert({
        where: { id },
        create: {
          id,
          surveyId: op.data.surveyId || "UNKNOWN", // Should be provided by heartbeat/start
          mode: op.data.mode || Mode.TEST,
          status: op.data.status || ResponseStatus.IN_PROGRESS,
          response: op.data.response || {},
          ...dataWithoutId
        },
        update: dataWithoutId
      }));
    }

    // Add metrics upserts
    for (const update of Object.values(metricsUpdates)) {
       operations.push(
         prisma.surveyMetrics.upsert({
           where: { surveyId_mode: { surveyId: update.surveyId, mode: update.mode as Mode } },
           create: update,
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

// Background Task: Mark stale responses as DROPPED
import { BackgroundTasksService } from "@surveychamp/backend-core";
setInterval(async () => {
    console.log("🧹 Running stale response cleanup...");
    await BackgroundTasksService.dropStaleResponses();
}, 60000); // Every minute

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
