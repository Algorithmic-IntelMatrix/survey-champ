import { Router } from "express";
import { surveyWorkflowController } from "../controllers/surveyWorkflow.controller";
import { authenticate } from "@surveychamp/common";
import { internalOrUserAuth } from "../middleware/internalAuth.middleware";

export const surveyWorkflowRouter = Router();

// Secured route for Runner API (via secret) or User (via JWT)
surveyWorkflowRouter.get("/:surveyId/latest", internalOrUserAuth, surveyWorkflowController.getLatestWorkflow);

surveyWorkflowRouter.use(authenticate);

surveyWorkflowRouter.post("/", surveyWorkflowController.createWorkflow);
surveyWorkflowRouter.get("/:surveyId", surveyWorkflowController.getWorkflows);
surveyWorkflowRouter.patch("/:id", surveyWorkflowController.updateWorkflow);
