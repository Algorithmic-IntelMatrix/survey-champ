import { Router } from "express";
import { surveyResponseController } from "../controllers/response.controller";

const router = Router();

// Public routes for Runner
router.post("/start", surveyResponseController.startResponse);
router.put("/:id", surveyResponseController.updateResponse);
router.post("/:id/heartbeat", surveyResponseController.heartbeat);

// Metrics/lists typically require auth in Builder, but if Runner needs them (e.g. shared results), 
// we might expose them public or check for a specific 'result' token.
// For now, I will expose them but note that they might need protection.
// If the runner frontend calls them, it likely expects them to work.
router.get("/metrics/:surveyId", surveyResponseController.getMetricsBySurveyId);
router.get("/responses/:surveyId", surveyResponseController.getResponsesBySurveyId);
// router.get("/all", surveyResponseController.getAllResponsesForUser); // Only valid if authenticated

export default router;
