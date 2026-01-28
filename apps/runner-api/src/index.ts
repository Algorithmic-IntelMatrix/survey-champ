import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { Redis } from "@upstash/redis/cloudflare";
import { surveySubmissionSchema } from "@surveychamp/common";
import { v4 as uuidv4 } from "uuid";
import type { Env } from "./env";
import responseRoutes from "./routes/response.route";
import workflowRoutes from "./routes/workflow.route";

const app = new Hono<{ Bindings: Env }>().basePath("/api");

// Middleware
app.use("*", logger());
app.use("*", cors({
  origin: (origin, c) => {
    const env = c.env;
    const allowedOrigins = [env.APP_URL, env.SURVEY_URL];
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
    const env = c.env;
    const redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });
    
    const cacheKey = `survey:${id}`;

    // 1. Try Cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      return c.json(typeof cached === 'string' ? JSON.parse(cached) : cached);
    }

    // 2. Request Coalescing
    if (pendingSurveyLookups.has(id)) {
      const survey = await pendingSurveyLookups.get(id);
      return c.json(survey);
    }

    // 3. Fallback to builder-api (only one request gets here)
    const lookupPromise = (async () => {
      try {
        console.log(`Cache Miss: Fetching survey ${id} from builder-api`);
        
        // Fetch from builder-api instead of direct DB access
        const response = await fetch(`${env.BUILDER_API_URL}/api/surveys/${id}/public`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch survey: ${response.statusText}`);
        }

        const survey = await response.json();
        
        if (survey) {
          await redis.set(cacheKey, JSON.stringify(survey), { ex: CACHE_TTL });
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
    const env = c.env;
    const redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });

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
    await redis.lpush("survey-submissions-buffer", JSON.stringify({
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

// Cloudflare Workers export
export default app;
