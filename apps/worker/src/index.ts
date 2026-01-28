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
          data: { id, surveyId, mode, status: ResponseStatus.IN_PROGRESS },
          isNew: jobName === "start-response" || jobName === "submission",
          metrics: new Set(),
        };
      }

      const op = responseOperations[id];

      // Update data based on job type
      if (jobName === "submission" || jobName === "start-response") {
        op.data = { ...op.data, surveyId, mode, response, status, outcome, respondentId };
        if (status) op.metrics.add(status);
      } else if (jobName === "update-response") {
        if (response !== undefined) op.data.response = response;
        if (status !== undefined) {
          op.data.status = status;
          op.metrics.add(status);
        }
        if (outcome !== undefined) op.data.outcome = outcome;
        if (respondentId !== undefined) op.data.respondentId = respondentId;
      } else if (jobName === "heartbeat") {
        op.data.updatedAt = new Date();
      }

      // Aggregate metrics logic (per surveyId and mode)
      const mKey = `${op.data.surveyId}_${op.data.mode}`;
      if (!metricsUpdates[mKey]) {
        metricsUpdates[mKey] = { 
          surveyId: op.data.surveyId, 
          mode: op.data.mode,
          qualityTerminate: 0, securityTerminate: 0, completed: 0, 
          dropped: 0, disqualified: 0, overQuota: 0, clicked: 0 
        };
      }
    }

    // Now convert the accumulated status changes into metric increments
    for (const id in responseOperations) {
      const op = responseOperations[id];
      const mKey = `${op.data.surveyId}_${op.data.mode}`;
      
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
    const newResponses: any[] = [];
    const updates: any[] = [];

    for (const id in responseOperations) {
      const op = responseOperations[id];
      if (op.isNew) {
        newResponses.push(op.data);
      } else {
        updates.push(op.data);
      }
    }

    if (newResponses.length > 0) {
      operations.push(prisma.surveyResponse.createMany({ 
        data: newResponses,
        skipDuplicates: true // Just in case
      }));
    }

    for (const updateObj of updates) {
      const { id, ...data } = updateObj;
      operations.push(prisma.surveyResponse.update({
        where: { id },
        data: data
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
