import express from "express";
import cors from "cors";
import helmet from "helmet";
import { surveySubmissionQueue } from "@surveychamp/queue";
import { surveySubmissionSchema } from "@surveychamp/common";
import { prisma } from "@surveychamp/db"; // Only for initial read, eventually replaced by cache
import { redis } from "@surveychamp/redis";

const app = express();
const PORT = process.env.PORT || 4001;

app.use(cors({ origin: true, credentials: true })); 
app.use(helmet());
app.use(express.json());


const CACHE_TTL = 3600; // 1 hour

app.get("/", (req, res) => {
  res.json({ service: "runner-api", status: "ok" });
});

// Get Survey Endpoint (Cache-Aside)
app.get("/survey/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `survey:${id}`;

    // 1. Try Cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log(`Cache Hit: ${id}`);
      return res.json(JSON.parse(cached));
    }

    // 2. Fallback to DB
    console.log(`Cache Miss: ${id}`);
    const survey = await prisma.surveys.findUnique({
      where: { id },
      include: {
        surveyWorkflow: true,
        surveyQuotas: true,
      },
    });

    if (!survey) {
      return res.status(404).json({ error: "Survey not found" });
    }

    // 3. Update Cache
    await redis.set(cacheKey, JSON.stringify(survey), "EX", CACHE_TTL);

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

    // Push to Queue
    await surveySubmissionQueue.add("submission", {
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
