import { Router } from "express";
import { surveyResponseController } from "../controllers/surveyResponse.controller";
import { authenticate } from "@surveychamp/common";

const router = Router();


router.get("/latest/:surveyId", surveyResponseController.getLatestSurveyResponse);

// Public route for starting response? Usually yes for respondents.
router.post("/start", surveyResponseController.startResponse);
router.put("/:id", surveyResponseController.updateResponse);
router.post("/:id/heartbeat", surveyResponseController.heartbeat);

// Authenticated routes for Builder/Admin
router.get("/metrics/:surveyId", authenticate, surveyResponseController.getMetricsBySurveyId);
router.get("/responses/:surveyId", authenticate, surveyResponseController.getResponsesBySurveyId);
router.get("/all", authenticate, surveyResponseController.getAllResponsesForUser);

export default router;
