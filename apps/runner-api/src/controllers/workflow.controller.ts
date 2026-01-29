import type { Context } from "hono";
import { Redis } from "@upstash/redis/cloudflare";

// In-memory map to handle request coalescing (thundering herd protection)
const pendingWorkflowLookups = new Map<string, Promise<any>>();

const getRedis = () => new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || ""
});

export const surveyWorkflowController = {
  getLatestWorkflow: async (c: Context) => {
    try {
      const { surveyId } = c.req.param() as { surveyId: string };
      if (!surveyId) {
        return c.json({ message: "Survey ID is required" }, 400);
      }

      const redis = getRedis();
      const cacheKey = `workflow_latest:${surveyId}`;

      // 1. Try Cache
      const cached = await redis.get(cacheKey);
      if (cached) {
        return c.json({ data: typeof cached === 'string' ? JSON.parse(cached) : cached });
      }

      // 2. Request Coalescing
      if (pendingWorkflowLookups.has(surveyId)) {
        console.log(`Coalescing request for survey: ${surveyId}`);
        const workflow = await pendingWorkflowLookups.get(surveyId);
        return c.json({ data: workflow });
      }

      // 3. Fallback to builder-api (edge-compatible, no DB dependency)
      const lookupPromise = (async () => {
        try {
          console.log(`Cache Miss: Fetching workflow for ${surveyId} from builder-api`);
          
          const env = (c as any).env;
          const response = await fetch(`${env.BUILDER_API_URL}/api/workflows/survey/${surveyId}/latest`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch workflow: ${response.statusText}`);
          }

          const workflow = await response.json();
          
          if (workflow) {
            await redis.set(cacheKey, JSON.stringify(workflow), { ex: 3600 }); // 1 hour TTL
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
