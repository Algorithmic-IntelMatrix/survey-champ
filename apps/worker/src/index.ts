import { Mode, prisma, ResponseStatus } from "@surveychamp/db";
import { redis, upstashRedis } from "@surveychamp/redis";

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
      
      // Explicitly add CLICKED if this is a new session start
      if (op.isNew) {
          op.metrics.add(ResponseStatus.CLICKED);
      } else if (!op.metrics.has(ResponseStatus.CLICKED)) {
          // If we never added CLICKED yet, check if this is the first time we're seeing this response
          // This happens when start-response was already consumed before worker restart
          op.metrics.add(ResponseStatus.CLICKED);
      }

      for (const status of op.metrics) {
        // De-duplication: check if this specific status for this responseId was already counted
        const dedupeKey = `metric_counted:${id}:${status}`;
        
        let alreadyCounted = null;
        try {
          alreadyCounted = await upstashRedis.get(dedupeKey);
          console.log(`[DEBUG] Dedup check result: ${alreadyCounted}`);
        } catch (error) {
          console.error(`[DEBUG] Redis GET failed for ${dedupeKey}:`, error);
          // Assume not counted if Redis fails
          alreadyCounted = null;
        }
        
        if (!alreadyCounted) {
            if (status === "COMPLETED") metricsUpdates[mKey].completed++;
            else if (status === "DROPPED") metricsUpdates[mKey].dropped++;
            else if (status === "DISQUALIFIED") metricsUpdates[mKey].disqualified++;
            else if (status === "OVER_QUOTA") metricsUpdates[mKey].overQuota++;
            else if (status === "CLICKED") metricsUpdates[mKey].clicked++;
            else if (status === "QUALITY_TERMINATE") metricsUpdates[mKey].qualityTerminate++;
            else if (status === "SECURITY_TERMINATE") metricsUpdates[mKey].securityTerminate++;
            
            // Mark as counted in Redis (expiry 7 days)
            try {
              await upstashRedis.set(dedupeKey, "1", { ex: 604800 });
            } catch (error) {
              console.error(`[DEBUG] Redis SET failed for ${dedupeKey}:`, error);
            }
        }
      }
    }

    // 3. Perform Final DB Operations
    const operations: any[] = [];
    const terminalIds = new Set<string>();
    const terminalStatuses = [
        ResponseStatus.COMPLETED, 
        ResponseStatus.DROPPED, 
        ResponseStatus.DISQUALIFIED, 
        ResponseStatus.OVER_QUOTA, 
        ResponseStatus.QUALITY_TERMINATE, 
        ResponseStatus.SECURITY_TERMINATE
    ];

    for (const id in responseOperations) {
      const op = responseOperations[id];
      const { id: _, ...dataWithoutId } = op.data;

      if (op.data.status && terminalStatuses.includes(op.data.status as any)) {
          terminalIds.add(id);
      }

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
      
      // Post-Sync Redis Cleanup
      if (terminalIds.size > 0) {
          for (const id of terminalIds) {
              const keysToDelete = [
                  `session:${id}`,
                  ...terminalStatuses.map(s => `metric_counted:${id}:${s}`),
                  `metric_counted:${id}:CLICKED`
              ];
              await upstashRedis.del(...keysToDelete);
          }
      }
    }
  } catch (error) {
    console.error(error);
    if (error instanceof Error) {
      console.error("Error stack:", error.stack);
    }
  }
}

// Background Task: Mark stale responses as DROPPED
import { BackgroundTasksService } from "@surveychamp/backend-core";
setInterval(async () => {
    console.log("🧹 Running stale response cleanup...");
    await BackgroundTasksService.dropStaleResponses();
}, 60000); // Every minute

// Redis Buffer Bridge (Edge -> Worker)
// TCP Redis with BRPOP (blocking, zero idle cost!)
async function pollRedisBuffer() {
  console.log("📥 Redis Buffer Bridge started (TCP Mode with BRPOP)...");

  while (true) {
    try {
      // BRPOP blocks indefinitely until a job arrives (zero command cost while waiting!)
      const result = await redis.brpop("survey-submissions-buffer", 0);
      console.log("📥 Redis Buffer Bridge received job!", result);
      if (result) {
        const [_, payload] = result;
        console.log("📥 Redis Buffer Bridge received job!");
        
        let job;
        try {
          job = JSON.parse(payload);
        } catch (e) {
          console.error("❌ Failed to parse job:", payload, e);
          continue;
        }
        
        jobBuffer.push(job);

        // Immediate trigger if buffer is full
        if (jobBuffer.length >= BATCH_SIZE) {
          await processBatch();
        } else if (!batchTimeout) {
          batchTimeout = setTimeout(processBatch, BATCH_INTERVAL_MS);
        }
      }
    } catch (error) {
      console.error("❌ Error in Redis Buffer Bridge:", error);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

pollRedisBuffer();
