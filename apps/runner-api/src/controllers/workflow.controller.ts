import { Hono } from "hono";
import { surveyWorkflowService } from "@surveychamp/backend-core";
import { upstashRedis } from "@surveychamp/redis";
import type { Context } from "hono";

// In-memory map to handle request coalescing (thundering herd protection)
const pendingWorkflowLookups = new Map<string, Promise<any>>();

export const surveyWorkflowController = {
  getLatestWorkflow: async (c: Context) => {
    try {
      const { surveyId } = c.req.param() as { surveyId: string };
      if (!surveyId) {
        return c.json({ message: "Survey ID is required" }, 400);
      }

      const cacheKey = `workflow_latest:${surveyId}`;

      // 1. Try Cache
      const cached = await upstashRedis.get(cacheKey);
      if (cached) {
        return c.json({ data: typeof cached === 'string' ? JSON.parse(cached) : cached });
      }

      // 2. Request Coalescing
      if (pendingWorkflowLookups.has(surveyId)) {
        console.log(`Coalescing request for survey: ${surveyId}`);
        const workflow = await pendingWorkflowLookups.get(surveyId);
        return c.json({ data: workflow });
      }

      // 3. Fallback to DB (only one request gets here)
      const lookupPromise = (async () => {
        try {
          console.log(`Cache Miss: Fetching workflow for ${surveyId} from DB`);
          const workflow = await surveyWorkflowService.getLatestWorkflowBySurveyId(surveyId);
          
          if (workflow) {
            await upstashRedis.set(cacheKey, JSON.stringify(workflow), { ex: 3600 }); // 1 hour TTL
          }
          return workflow;
        } finally {
          pendingWorkflowLookups.delete(surveyId);
        }
      })();

      pendingWorkflowLookups.set(surveyId, lookupPromise);
      const workflow = await lookupPromise;

      if (!workflow) {
        return c.json({ data: null, message: "No workflow found for this survey" }, 404);
      }

      return c.json({ data: workflow });
    } catch (error) {
      console.error(error);
      return c.json({ message: "Internal Server Error" }, 500);
    }
  }
};
