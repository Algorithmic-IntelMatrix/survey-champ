import { Router } from "express";
import { surveyResponseController } from "../controllers/surveyResponse.controller";
import { authenticate } from "@surveychamp/common";

const router = Router();

// Authenticated routes for Builder/Admin
router.use(authenticate);

router.get("/latest/:surveyId", surveyResponseController.getLatestSurveyResponse);
router.get("/metrics/:surveyId", surveyResponseController.getMetricsBySurveyId);
router.get("/responses/:surveyId", surveyResponseController.getResponsesBySurveyId);
router.get("/all", surveyResponseController.getAllResponsesForUser);

export default router;
