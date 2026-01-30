import { Router } from "express";
import { surveyController } from "../controllers/survey.controller";
import { authenticate } from "@surveychamp/common";
import { internalOrUserAuth } from "../middleware/internalAuth.middleware";
import { surveyQuotaController } from "../controllers/surveyQuota.controller";


const router = Router();

router.post("/", authenticate, surveyController.createSurvey);
router.get("/", authenticate, surveyController.getSurveys);

// Quota Routes - Specific routes first
router.get("/:surveyId/quotas", authenticate, surveyQuotaController.getQuotas);
router.post("/:surveyId/quotas", authenticate, surveyQuotaController.createQuota);
router.delete("/quotas/:id", authenticate, surveyQuotaController.deleteQuota);
router.patch("/quotas/:id", authenticate, surveyQuotaController.toggleQuota);



// Public survey endpoint (for runner-api) - now secured with internal secret
router.get("/:id/public", internalOrUserAuth, surveyController.getPublicSurvey);

// Generic ID Routes
router.get("/:id", authenticate, surveyController.getSurvey);
router.put("/:id", authenticate, surveyController.updateSurvey);
router.delete("/:id", authenticate, surveyController.deleteSurvey);

export default router;
