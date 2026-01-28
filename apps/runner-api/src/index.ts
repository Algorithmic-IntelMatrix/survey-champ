import express from "express";
import cors from "cors";
import helmet from "helmet";
import { surveySubmissionQueue } from "@surveychamp/queue";
import { surveySubmissionSchema } from "@surveychamp/common";
import { surveyService } from "@surveychamp/backend-core";
import { redis } from "@surveychamp/redis";
import { v4 as uuidv4 } from "uuid";

import responseRoutes from "./routes/response.route";
import { surveyWorkflowRouter } from "./routes/workflow.route";
import { storageRouter } from "./routes/storage.route";

const app = express();
const PORT = process.env.PORT || 4001;

app.use(cors({ origin: true, credentials: true })); 
app.use(helmet());
app.use(express.json());

const CACHE_TTL = 3600; // 1 hour
const pendingSurveyLookups = new Map<string, Promise<any>>();

app.get("/", (req, res) => {
  res.json({ service: "runner-api", status: "ok" });
});

app.use("/api/responses", responseRoutes);
app.use("/api/workflows", surveyWorkflowRouter);
app.use("/api/storage", storageRouter);

// Get Survey Endpoint (Cache-Aside with Coalescing)
app.get("/survey/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `survey:${id}`;

    // 1. Try Cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    // 2. Request Coalescing
    if (pendingSurveyLookups.has(id)) {
      const survey = await pendingSurveyLookups.get(id);
      return res.json(survey);
    }

    // 3. Fallback to DB (only one request gets here)
    const lookupPromise = (async () => {
      try {
        console.log(`Cache Miss: Fetching survey ${id} from DB`);
        const survey = await surveyService.getSurveyById("PUBLIC_ACCESS", id); // Assuming backend-core handles public check
        
        if (survey) {
          await redis.set(cacheKey, JSON.stringify(survey), "EX", CACHE_TTL);
        }
        return survey;
      } finally {
        pendingSurveyLookups.delete(id);
      }
    })();

    pendingSurveyLookups.set(id, lookupPromise);
    const survey = await lookupPromise;

    if (!survey) {
      return res.status(404).json({ error: "Survey not found" });
    }

    res.json(survey);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch survey" });
  }
});


// Submit Response Endpoint (Producer)
app.post("/submit", async (req, res) => {
  try {
    const validationResult = surveySubmissionSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Invalid submission data", 
        details: validationResult.error.format() 
      });
    }

    const { surveyId, mode, response, status, outcome, respondentId } = validationResult.data;
    const responseId = uuidv4();

    // Push to Queue
    await surveySubmissionQueue.add("submission", {
      id: responseId,
      surveyId,
      mode,
      response,
      status,
      outcome,
      respondentId,
      timestamp: new Date().toISOString(),
    });

    res.json({ success: true, queued: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to submit response" });
  }
});

app.listen(PORT, () => {
  console.log(`Runner API listening on port ${PORT}`);
});
