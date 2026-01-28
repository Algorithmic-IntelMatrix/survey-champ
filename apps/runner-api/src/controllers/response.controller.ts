import { ResponseStatus, Mode } from "@surveychamp/db"; 
import { upstashRedis } from "@surveychamp/redis";
import { v4 as uuidv4 } from 'uuid';
import type { Context } from "hono";

export const surveyResponseController = {
    getMetricsBySurveyId: async (c: Context) => {
        const { surveyId } = c.req.param() as { surveyId: string };
        try {
            const cacheKey = `metrics:${surveyId}`;
            const cached = await upstashRedis.get(cacheKey);
            if (cached) return c.json({ data: typeof cached === 'string' ? JSON.parse(cached) : cached });
            
            return c.json({ data: [] }); 
        } catch (error) {
            return c.json({ error: "Internal Server Error" }, 500);
        }
    },

    getResponsesBySurveyId: async (c: Context) => {
        const { surveyId } = c.req.param() as { surveyId: string };
        try {
            const cacheKey = `responses:${surveyId}`;
            const cached = await upstashRedis.get(cacheKey);
            if (cached) return c.json({ data: typeof cached === 'string' ? JSON.parse(cached) : cached });
            
            return c.json({ data: [] });
        } catch (error) {
            return c.json({ error: "Internal Server Error" }, 500);
        }
    },

    startResponse: async (c: Context) => {
        try {
            const { id, surveyId, mode, respondentId } = await c.req.json();
            if (!surveyId) return c.json({ error: "surveyId is required" }, 400);

            const responseId = id || uuidv4();
            const currentMode = mode || Mode.TEST;

            // Push "start" event and store session in a single pipeline
            await upstashRedis.pipeline()
                .lpush("survey-submissions-buffer", JSON.stringify({
                    name: "start-response",
                    data: {
                        id: responseId,
                        surveyId,
                        mode: currentMode,
                        status: ResponseStatus.CLICKED,
                        respondentId: respondentId || undefined,
                        timestamp: new Date().toISOString()
                    }
                }))
                .set(`session:${responseId}`, JSON.stringify({ surveyId, mode: currentMode }), { ex: 86400 })
                .exec();

            return c.json({ 
                data: { 
                    id: responseId, 
                    surveyId, 
                    mode: currentMode,
                    status: ResponseStatus.IN_PROGRESS 
                } 
            }, 201);
        } catch (error) {
            console.error("Error starting response:", error);
            return c.json({ error: "Internal Server Error" }, 500);
        }
    },

    updateResponse: async (c: Context) => {
        try {
            const { id } = c.req.param() as { id: string };
            const { response: responseJson, status, respondentId, outcome, redirectUrl: customRedirectUrl } = await c.req.json();

            if (!id) return c.json({ error: "Response ID is required" }, 400);

            const sessionData = await upstashRedis.get(`session:${id}`);
            const { surveyId, mode } = sessionData ? (typeof sessionData === 'string' ? JSON.parse(sessionData) : sessionData) : { surveyId: null, mode: Mode.TEST };

            // Queue the update
            await upstashRedis.lpush("survey-submissions-buffer", JSON.stringify({
                name: "update-response",
                data: {
                    id,
                    surveyId,
                    mode,
                    response: responseJson,
                    status,
                    outcome,
                    respondentId,
                    timestamp: new Date().toISOString()
                }
            }));

            // Resolve Redirect URL
            let finalRedirectUrl = customRedirectUrl;
            
            if (!finalRedirectUrl && status && status !== ResponseStatus.IN_PROGRESS && surveyId) {
                const surveyCache = await upstashRedis.get(`survey:${surveyId}`);
                if (surveyCache) {
                    const survey = typeof surveyCache === 'string' ? JSON.parse(surveyCache) : surveyCache;
                    if (status === ResponseStatus.DROPPED) finalRedirectUrl = survey.redirectUrl;
                    else if (status === ResponseStatus.OVER_QUOTA) finalRedirectUrl = survey.overQuotaUrl;
                    else if (status === ResponseStatus.SECURITY_TERMINATE) finalRedirectUrl = survey.securityTerminateUrl;
                }
            }

            if (finalRedirectUrl) {
                finalRedirectUrl = finalRedirectUrl
                    .replace(/\[%%PID%%\]/gi, id)
                    .replace(/\[%%transactionid%%\]/gi, id);
            }

            return c.json({ 
                success: true,
                redirectUrl: finalRedirectUrl || null
            });

        } catch (error: any) {
            console.error(error);
            return c.json({ error: "Internal Server Error" }, 500);
        }
    },

    heartbeat: async (c: Context) => {
        try {
            const { id } = c.req.param() as { id: string };
            
            const sessionData = await upstashRedis.get(`session:${id}`);
            const { surveyId, mode } = sessionData ? (typeof sessionData === 'string' ? JSON.parse(sessionData) : sessionData) : { surveyId: null, mode: Mode.TEST };

            await upstashRedis.lpush("survey-submissions-buffer", JSON.stringify({
                name: "heartbeat",
                data: { id, surveyId, mode, timestamp: new Date().toISOString() }
            }));

            return c.json({ status: "ok" });
        } catch (error) {
            console.error("Heartbeat error:", error);
            return c.json({ error: "Heartbeat failed" }, 500);
        }
    }
};
