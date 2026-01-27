import express from "express";
import cors from "cors";
import helmet from "helmet";
import { surveySubmissionQueue } from "@surveychamp/queue";
import { prisma } from "@surveychamp/db"; // Only for initial read, eventually replaced by cache

const app = express();
const PORT = process.env.PORT || 4001;

app.use(cors({ origin: true, credentials: true })); 
app.use(helmet());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ service: "runner-api", status: "ok" });
});

// Submit Response Endpoint (Producer)
app.post("/submit", async (req, res) => {
  try {
    const { surveyId, mode, response, status, outcome, respondentId } = req.body;

    // TODO: Validate payload with Zod Schema from @surveychamp/common

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
