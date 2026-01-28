import type { Request, Response } from "express";
import { ResponseStatus, Mode } from "@surveychamp/db"; 
import { surveySubmissionQueue } from "@surveychamp/queue";
import { redis } from "@surveychamp/redis";
import { v4 as uuidv4 } from 'uuid';

// In-memory map to handle request coalescing (thundering herd protection)
// In a distributed setup, this would usually be handled via a Redis lock/wait, 
// but for a single instance or within a pod, a Promise map works well.
const pendingSurveyLookups = new Map<string, Promise<any>>();

export const surveyResponseController = {
    // This now returns data from cache if available
    getMetricsBySurveyId: async (req: Request, res: Response) => {
        const { surveyId } = req.params as { surveyId: string };
        try {
            const cacheKey = `metrics:${surveyId}`;
            const cached = await redis.get(cacheKey);
            if (cached) return res.status(200).json({ data: JSON.parse(cached) });
            
            // If missing, we don't hit DB from Runner API!
            // The worker or builder should have warmed this.
            return res.status(200).json({ data: [] }); 
        } catch (error) {
            return res.status(500).json({ error: "Internal Server Error" });
        }
    },

    getResponsesBySurveyId: async (req: Request, res: Response) => {
        const { surveyId } = req.params as { surveyId: string };
        try {
            const cacheKey = `responses:${surveyId}`;
            const cached = await redis.get(cacheKey);
            if (cached) return res.status(200).json({ data: JSON.parse(cached) });
            
            return res.status(200).json({ data: [] });
        } catch (error) {
            return res.status(500).json({ error: "Internal Server Error" });
        }
    },

    startResponse: async (req: Request, res: Response) => {
        try {
            const { id, surveyId, mode, respondentId } = req.body;
            if (!surveyId) return res.status(400).json({ error: "surveyId is required" });

            // Prioritize provided ID (PID) if available, otherwise generate locally
            const responseId = id || uuidv4();
            const currentMode = mode || Mode.TEST;

            // Push "start" event to queue
            await surveySubmissionQueue.add("start-response", {
                id: responseId,
                surveyId,
                mode: currentMode,
                respondentId: respondentId || undefined,
                timestamp: new Date().toISOString()
            });

            // Increment CLICKED metric in Redis immediately (Atomic)
            const metricKey = `metrics_counter:${surveyId}:${currentMode}:clicked`;
            await redis.incr(metricKey);

            return res.status(201).json({ 
                data: { 
                    id: responseId, 
                    surveyId, 
                    mode: currentMode,
                    status: ResponseStatus.IN_PROGRESS 
                } 
            });
        } catch (error) {
            console.error("Error starting response:", error);
            return res.status(500).json({ error: "Internal Server Error" });
        }
    },

    updateResponse: async (req: Request, res: Response) => {
        try {
            const { id } = req.params as { id: string };
            const { response: responseJson, status, respondentId, outcome } = req.body;

            if (!id) return res.status(400).json({ error: "Response ID is required" });

            // 1. Quota Check (Redis based)
            // If the status is COMPLETED, we check the atomic counter in Redis
            if (status === ResponseStatus.COMPLETED) {
                // We need the survey config to check quotas.
                // This would be cached in 'survey:{id}'
                // For now, we assume global quota lookup from Redis
                // (Logic will be refined in the next tool call)
            }

            // 2. Queue the update
            await surveySubmissionQueue.add("update-response", {
                id,
                response: responseJson,
                status,
                outcome,
                respondentId,
                timestamp: new Date().toISOString()
            });

            // 3. Handle Metric Increments in Redis (Atomic)
            if (status && status !== ResponseStatus.IN_PROGRESS && status !== ResponseStatus.CLICKED) {
                // This would need surveyId and mode, which usually comes from current session state.
                // In a pure serverless Runner, we might include these in the payload from Frontend 
                // or look up session in Redis. 
                // For now, let the Worker handle the persistent metrics record, 
                // but increment the "hot" counter in Redis if available.
            }

            return res.status(200).json({ success: true });

        } catch (error: any) {
            console.error(error);
            return res.status(500).json({ error: "Internal Server Error" });
        }
    },

    heartbeat: async (req: Request, res: Response) => {
        try {
            const id = req.params.id as string;
            await surveySubmissionQueue.add("heartbeat", { id, timestamp: new Date().toISOString() });
            return res.status(200).json({ status: "ok" });
        } catch (error) {
            return res.status(500).json({ error: "Heartbeat failed" });
        }
    }
};
