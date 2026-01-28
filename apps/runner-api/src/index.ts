import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { upstashRedis } from "@surveychamp/redis";
import { surveySubmissionSchema } from "@surveychamp/common";
import { surveyService } from "@surveychamp/backend-core";
import { v4 as uuidv4 } from "uuid";
import responseRoutes from "./routes/response.route";
import workflowRoutes from "./routes/workflow.route";

import { SYSTEM_CONFIG } from "@surveychamp/common";

const app = new Hono().basePath("/api");

// Middleware
app.use("*", logger());
app.use("*", cors({
  origin: (origin) => {
    const allowedOrigins = [SYSTEM_CONFIG.APP_URL, SYSTEM_CONFIG.SURVEY_URL];
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:") || origin.match(/^http:\/\/192\.168\.\d+\.\d+:\d+$/)) {
      return origin;
    }
    return null;
  },
  credentials: true,
}));


const CACHE_TTL = 3600; // 1 hour
const pendingSurveyLookups = new Map<string, Promise<any>>();

app.get("/", (c) => {
  return c.json({ service: "runner-api", status: "ok" });
});

// Routes
app.route("/responses", responseRoutes);
app.route("/workflows", workflowRoutes);

// Get Survey Endpoint (Cache-Aside with Coalescing)
app.get("/survey/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const cacheKey = `survey:${id}`;

    // 1. Try Cache
    const cached = await upstashRedis.get(cacheKey);
    if (cached) {
      return c.json(typeof cached === 'string' ? JSON.parse(cached) : cached);
    }

    // 2. Request Coalescing
    if (pendingSurveyLookups.has(id)) {
      const survey = await pendingSurveyLookups.get(id);
      return c.json(survey);
    }

    // 3. Fallback to DB (only one request gets here)
    const lookupPromise = (async () => {
      try {
        console.log(`Cache Miss: Fetching survey ${id} from DB`);
        // Note: Direct DB access from Worker is technically blocked/removed in the plan.
        // For local dev, this might still work if surveyService uses prisma, 
        // but for CF Workers, this should ideally hit a internal API or we rely on cache warming.
        const survey = await surveyService.getSurveyById("PUBLIC_ACCESS", id); 
        
        if (survey) {
          await upstashRedis.set(cacheKey, JSON.stringify(survey), { ex: CACHE_TTL });
        }
        return survey;
      } finally {
        pendingSurveyLookups.delete(id);
      }
    })();

    pendingSurveyLookups.set(id, lookupPromise);
    const survey = await lookupPromise;

    if (!survey) {
      return c.json({ error: "Survey not found" }, 404);
    }

    return c.json(survey);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Failed to fetch survey" }, 500);
  }
});


// Submit Response Endpoint (Producer)
app.post("/submit", async (c) => {
  try {
    const body = await c.req.json();
    const validationResult = surveySubmissionSchema.safeParse(body);

    if (!validationResult.success) {
      return c.json({ 
        error: "Invalid submission data", 
        details: validationResult.error.format() 
      }, 400);
    }

    const { surveyId, mode, response, status, outcome, respondentId } = validationResult.data;
    const responseId = uuidv4();

    // Push to Redis Buffer for Worker processing
    await upstashRedis.lpush("survey-submissions-buffer", JSON.stringify({
      name: "submission",
      data: {
        id: responseId,
        surveyId,
        mode,
        response,
        status,
        outcome,
        respondentId,
        timestamp: new Date().toISOString(),
      }
    }));

    return c.json({ success: true, queued: true });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Failed to submit response" }, 500);
  }
});

const port = Number(process.env.PORT) || 4001;
console.log(`🚀 Runner API (Hono) starting on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
