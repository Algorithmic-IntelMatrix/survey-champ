import { v4 as uuidv4 } from 'uuid';
import type { Context } from "hono";
import { getSignedCookie, setSignedCookie } from 'hono/cookie';
import { Redis } from "@upstash/redis/cloudflare";

// Edge-compatible enums (copied from @surveychamp/db)
enum ResponseStatus {
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  DROPPED = "DROPPED",
  OVER_QUOTA = "OVER_QUOTA",
  SECURITY_TERMINATE = "SECURITY_TERMINATE"
}

enum Mode {
  LIVE = "LIVE",
  TEST = "TEST"
}

// Helper to get Redis client
const getRedis = (env: any) => new Redis({
  url: env.UPSTASH_REDIS_REST_URL || "",
  token: env.UPSTASH_REDIS_REST_TOKEN || ""
});

export const surveyResponseController = {
    getMetricsBySurveyId: async (c: Context) => {
        const { surveyId } = c.req.param() as { surveyId: string };
        const env = (c as any).env;
        try {
            const cacheKey = `metrics:${surveyId}`;
            const redis = getRedis(env);
            const cached = await redis.get(cacheKey);
            if (cached) return c.json({ data: typeof cached === 'string' ? JSON.parse(cached) : cached });
            
            return c.json({ data: [] }); 
        } catch (error) {
            return c.json({ error: "Internal Server Error" }, 500);
        }
    },

    getResponsesBySurveyId: async (c: Context) => {
        const { surveyId } = c.req.param() as { surveyId: string };
        const env = (c as any).env;
        try {
            const cacheKey = `responses:${surveyId}`;
            const cached = await getRedis(env).get(cacheKey);
            if (cached) return c.json({ data: typeof cached === 'string' ? JSON.parse(cached) : cached });
            
            return c.json({ data: [] });
        } catch (error) {
            return c.json({ error: "Internal Server Error" }, 500);
        }
    },

    startResponse: async (c: Context) => {
        const env = (c as any).env;
        const cookieSecret = env.JWT_SECRET || "survey_champ_secret";
        try {
            const { id, surveyId, mode, respondentId } = await c.req.json();
            if (!surveyId) return c.json({ error: "surveyId is required" }, 400);

            const responseId = id || uuidv4();
            const currentMode = mode || Mode.TEST;

            // Push "start" event and store session in a single pipeline
            await getRedis(env).pipeline()
                .lpush("survey-submissions-buffer", JSON.stringify({
                    name: "start-response",
                    data: {
                        id: responseId,
                        surveyId,
                        mode: currentMode,
                        status: ResponseStatus.IN_PROGRESS, // Changed from CLICKED - CLICKED is a metric, not a status
                        respondentId: respondentId || undefined,
                        timestamp: new Date().toISOString()
                    }
                }))
                .set(`session:${responseId}`, JSON.stringify({ surveyId, mode: currentMode }), { ex: 86400 })
                .exec();

            // Store stateless session in a signed cookie (removes Redis lookups for future answers)
            await setSignedCookie(c, `sess_${responseId}`, JSON.stringify({ surveyId, mode: currentMode }), cookieSecret, {
                path: '/',
                httpOnly: true,
                secure: true,
                sameSite: 'None',
                maxAge: 86400 // 1 day
            });

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
        const env = (c as any).env;
        const cookieSecret = env.JWT_SECRET || "survey_champ_secret";
        try {
            const { id } = c.req.param() as { id: string };
            const { response: responseJson, status, respondentId, outcome, redirectUrl: customRedirectUrl } = await c.req.json();

            if (!id) return c.json({ error: "Response ID is required" }, 400);

            // 1. Try Stateless Cookie first (Fast, 0 commands)
            let sessionData = await getSignedCookie(c, cookieSecret, `sess_${id}`);
            let surveyId, mode;

            if (sessionData) {
                const parsed = typeof sessionData === 'string' ? JSON.parse(sessionData) : sessionData;
                surveyId = parsed.surveyId;
                mode = parsed.mode;
            } else {
                // 2. Fallback to Redis (1 command)
                const redisSession = await getRedis(env).get(`session:${id}`);
                const parsed = redisSession ? (typeof redisSession === 'string' ? JSON.parse(redisSession) : redisSession) : { surveyId: null, mode: Mode.TEST };
                surveyId = parsed.surveyId;
                mode = parsed.mode;
            }

            // Queue the update (1 command)
            await getRedis(env).lpush("survey-submissions-buffer", JSON.stringify({
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
                const surveyCache = await getRedis(env).get(`survey:${surveyId}`);
                if (surveyCache) {
                    const survey = typeof surveyCache === 'string' ? JSON.parse(surveyCache) : surveyCache;
                    if (status === ResponseStatus.DROPPED) finalRedirectUrl = survey.redirectUrl;
                    else if (status === ResponseStatus.OVER_QUOTA) finalRedirectUrl = survey.overQuotaUrl;
                    else if (status === ResponseStatus.SECURITY_TERMINATE) finalRedirectUrl = survey.securityTerminateUrl;
                }
            }

            if (finalRedirectUrl) {
                // 1. Handle Placeholders
                finalRedirectUrl = finalRedirectUrl
                    .replace(/\[%%PID%%\]/gi, id)
                    .replace(/\[%%transactionid%%\]/gi, id);

                // 2. Handle common empty query params (pid= or transactionid=)
                // This handles cases like ?pid= or &transactionid= followed by nothing or another &
                finalRedirectUrl = finalRedirectUrl
                    .replace(/([?&]pid=)(?=&|$)/gi, `$1${id}`)
                    .replace(/([?&]transactionid=)(?=&|$)/gi, `$1${id}`);
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
        const env = (c as any).env;
        const cookieSecret = env.JWT_SECRET || "survey_champ_secret";
        try {
            const { id } = c.req.param() as { id: string };
            
            // Try cookie first
            let sessionData = await getSignedCookie(c, cookieSecret, `sess_${id}`);
            let surveyId, mode;

            if (sessionData) {
                const parsed = typeof sessionData === 'string' ? JSON.parse(sessionData) : sessionData;
                surveyId = parsed.surveyId;
                mode = parsed.mode;
            } else {
                const redisSession = await getRedis(env).get(`session:${id}`);
                const parsed = redisSession ? (typeof redisSession === 'string' ? JSON.parse(redisSession) : redisSession) : { surveyId: null, mode: Mode.TEST };
                surveyId = parsed.surveyId;
                mode = parsed.mode;
            }

            await getRedis(env).lpush("survey-submissions-buffer", JSON.stringify({
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
