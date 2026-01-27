import { Router } from "express";
import { surveyController } from "../controllers/survey.controller";
import { authenticate } from "@surveychamp/common";

const router = Router();

// TODO: Port SurveyQuotaController
// import { surveyQuotaController } from "../controllers/surveyQuotaController";

router.post("/", authenticate, surveyController.createSurvey);
router.get("/", authenticate, surveyController.getSurveys);
router.get("/:id", authenticate, surveyController.getSurvey);
router.put("/:id", authenticate, surveyController.updateSurvey);
router.delete("/:id", authenticate, surveyController.deleteSurvey);

// Quota Routes (Commented out until ported)
// router.get("/:surveyId/quotas", authenticate, surveyQuotaController.getQuotas);
// router.post("/:surveyId/quotas", authenticate, surveyQuotaController.createQuota);
// router.delete("/quotas/:id", authenticate, surveyQuotaController.deleteQuota);
// router.patch("/quotas/:id", authenticate, surveyQuotaController.toggleQuota);

export default router;
