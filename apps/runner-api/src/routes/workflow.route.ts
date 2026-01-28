import { Hono } from "hono";
import { surveyWorkflowController } from "../controllers/workflow.controller";

const router = new Hono();

// Public read-only access for Runner
router.get("/:surveyId/latest", surveyWorkflowController.getLatestWorkflow);

export default router;
