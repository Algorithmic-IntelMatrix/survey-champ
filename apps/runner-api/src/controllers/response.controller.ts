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

            // Store session metadata in Redis for lookups in updateResponse
            await redis.set(`session:${responseId}`, JSON.stringify({ surveyId, mode: currentMode }), "EX", 86400); // 24 hours

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
            const { response: responseJson, status, respondentId, outcome, redirectUrl: customRedirectUrl } = req.body;

            if (!id) return res.status(400).json({ error: "Response ID is required" });

            // 1. Fetch session from Redis to get surveyId and mode
            const sessionData = await redis.get(`session:${id}`);
            const { surveyId, mode } = sessionData ? JSON.parse(sessionData) : { surveyId: null, mode: Mode.TEST };

            // 2. Quota Check (Redis based)
            if (status === ResponseStatus.COMPLETED && surveyId) {
                // ... logic to be refined ...
            }

            // 3. Queue the update
            await surveySubmissionQueue.add("update-response", {
                id,
                surveyId, // Include for worker's convenience
                mode,
                response: responseJson,
                status,
                outcome,
                respondentId,
                timestamp: new Date().toISOString()
            });

            // 4. Resolve Redirect URL
            let finalRedirectUrl = customRedirectUrl;
            
            if (!finalRedirectUrl && status && status !== ResponseStatus.IN_PROGRESS && surveyId) {
                // Cache hit for survey config
                const surveyCache = await redis.get(`survey:${surveyId}`);
                if (surveyCache) {
                    const survey = JSON.parse(surveyCache);
                    if (status === ResponseStatus.DROPPED) finalRedirectUrl = survey.redirectUrl;
                    else if (status === ResponseStatus.OVER_QUOTA) finalRedirectUrl = survey.overQuotaUrl;
                    else if (status === ResponseStatus.SECURITY_TERMINATE) finalRedirectUrl = survey.securityTerminateUrl;
                }
            }

            // Replace placeholders in the redirect URL
            if (finalRedirectUrl) {
                finalRedirectUrl = finalRedirectUrl
                    .replace(/\[%%PID%%\]/gi, id)
                    .replace(/\[%%transactionid%%\]/gi, id);
            }

            return res.status(200).json({ 
                success: true,
                redirectUrl: finalRedirectUrl || null
            });

        } catch (error: any) {
            console.error(error);
            return res.status(500).json({ error: "Internal Server Error" });
        }
    },

    heartbeat: async (req: Request, res: Response) => {
        try {
            const id = req.params.id as string;
            
            // Look up session to get metadata
            const sessionData = await redis.get(`session:${id}`);
            const { surveyId, mode } = sessionData ? JSON.parse(sessionData) : { surveyId: null, mode: Mode.TEST };

            await surveySubmissionQueue.add("heartbeat", { 
                id, 
                surveyId, 
                mode, 
                timestamp: new Date().toISOString() 
            });
            return res.status(200).json({ status: "ok" });
        } catch (error) {
            console.error("Heartbeat error:", error);
            return res.status(500).json({ error: "Heartbeat failed" });
        }
    }
};
