import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { createSurveySubmissionWorker } from "@surveychamp/queue";
import { prisma } from "@surveychamp/db";
import authRoutes from "./routes/auth.route";
import surveyRoutes from "./routes/survey.route";
import { surveyWorkflowRouter } from "./routes/surveyWorkflow.route";
import surveyResponseRoutes from "./routes/surveyResponse.route";
import { storageRouter } from "./routes/storage.route";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: true, credentials: true })); // Configure strictly for production
app.use(helmet());
app.use(cookieParser());
app.use(express.json());


app.get("/", (req, res) => {
  res.json({ service: "builder-api", status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/surveys", surveyRoutes);
app.use("/api/workflows", surveyWorkflowRouter);
app.use("/api/response", surveyResponseRoutes);
app.use("/api/storage", storageRouter);

// Initialize Worker
const worker = createSurveySubmissionWorker(async (job) => {
  console.log("Processing submission:", job.id);
  const { surveyId, mode, response, status, outcome, respondentId } = job.data;

  // Transaction: Create Response + Increment Metrics
  await prisma.$transaction([
    prisma.surveyResponse.create({
      data: {
        surveyId,
        mode,
        response,
        status,
        outcome,
        respondentId,
      },
    }),
    prisma.surveyMetrics.upsert({
      where: { surveyId_mode: { surveyId, mode } },
      create: {
        surveyId,
        mode,
        completed: status === "COMPLETED" ? 1 : 0,
        // Add other counters based on status
      },
      update: {
        completed: status === "COMPLETED" ? { increment: 1 } : undefined,
      },
    }),
  ]);

  return { processed: true };
});

app.listen(PORT, () => {
  console.log(`Builder API listening on port ${PORT}`);
});
