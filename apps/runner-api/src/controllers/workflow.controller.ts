import type { Request, Response } from "express";
import { surveyWorkflowService } from "@surveychamp/backend-core";
import { redis } from "@surveychamp/redis";

// In-memory map to handle request coalescing (thundering herd protection)
const pendingWorkflowLookups = new Map<string, Promise<any>>();

export const surveyWorkflowController = {
  getLatestWorkflow: async (req: Request, res: Response) => {
    try {
      const surveyId = req.params.surveyId as string;
      if (!surveyId) {
        res.status(400).json({ message: "Survey ID is required" });
        return;
      }

      const cacheKey = `workflow_latest:${surveyId}`;

      // 1. Try Cache
      const cached = await redis.get(cacheKey);
      if (cached) {
        return res.status(200).json({ data: JSON.parse(cached) });
      }

      // 2. Request Coalescing
      if (pendingWorkflowLookups.has(surveyId)) {
        console.log(`Coalescing request for survey: ${surveyId}`);
        const workflow = await pendingWorkflowLookups.get(surveyId);
        return res.status(200).json({ data: workflow });
      }

      // 3. Fallback to DB (only one request gets here)
      const lookupPromise = (async () => {
        try {
          console.log(`Cache Miss: Fetching workflow for ${surveyId} from DB`);
          const workflow = await surveyWorkflowService.getLatestWorkflowBySurveyId(surveyId);
          
          if (workflow) {
            await redis.set(cacheKey, JSON.stringify(workflow), "EX", 3600); // 1 hour TTL
          }
          return workflow;
        } finally {
          pendingWorkflowLookups.delete(surveyId);
        }
      })();

      pendingWorkflowLookups.set(surveyId, lookupPromise);
      const workflow = await lookupPromise;

      if (!workflow) {
        res.status(404).json({ data: null, message: "No workflow found for this survey" });
        return;
      }

      res.status(200).json({ data: workflow });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
};
