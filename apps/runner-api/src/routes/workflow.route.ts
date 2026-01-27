import { Router } from "express";
import { surveyWorkflowController } from "../controllers/workflow.controller";

export const surveyWorkflowRouter = Router();

// Public read-only access for Runner
surveyWorkflowRouter.get("/:surveyId/latest", surveyWorkflowController.getLatestWorkflow);

// Runner usually doesn't create workflows
// surveyWorkflowRouter.post("/", ...); 
