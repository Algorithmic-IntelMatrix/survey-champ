import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.route";
import surveyRoutes from "./routes/survey.route";
import { surveyWorkflowRouter } from "./routes/surveyWorkflow.route";
import surveyResponseRoutes from "./routes/surveyResponse.route";
import { storageRouter } from "./routes/storage.route";
import { SYSTEM_CONFIG } from "@surveychamp/common";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { surveySubmissionQueue } from "@surveychamp/queue";

const app = express();
const PORT = process.env.PORT || 4000;


app.use(cors({
    origin: [SYSTEM_CONFIG.APP_URL, SYSTEM_CONFIG.SURVEY_URL],
    credentials: true,
}));
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false, // BullBoard needs this to load its UI
}));
app.use(cookieParser());
app.use(express.json());


app.get("/", (req, res) => {
  res.json({ service: "builder-api", status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/surveys", surveyRoutes);
app.use("/api/workflows", surveyWorkflowRouter);
app.use("/api/responses", surveyResponseRoutes);
app.use("/api/storage", storageRouter);

// BullBoard Queue Interface
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

createBullBoard({
  queues: [new BullMQAdapter(surveySubmissionQueue)],
  serverAdapter: serverAdapter,
});

app.use("/admin/queues", serverAdapter.getRouter());


app.listen(PORT, () => {
  console.log(`Builder API listening on port ${PORT}`);
});
