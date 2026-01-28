import { Hono } from "hono";
import { surveyResponseController } from "../controllers/response.controller";

const router = new Hono();

// Public routes for Runner
router.post("/start", surveyResponseController.startResponse);
router.put("/:id", surveyResponseController.updateResponse);
router.post("/:id/heartbeat", surveyResponseController.heartbeat);

// Metrics/lists typically require auth in Builder, but if Runner needs them (e.g. shared results), 
// we might expose them public or check for a specific 'result' token.
// For now, I will expose them but note that they might need protection.
router.get("/metrics/:surveyId", surveyResponseController.getMetricsBySurveyId);
router.get("/responses/:surveyId", surveyResponseController.getResponsesBySurveyId);

export default router;
