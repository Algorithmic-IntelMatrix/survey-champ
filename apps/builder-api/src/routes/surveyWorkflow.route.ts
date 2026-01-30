import { Router } from "express";
import { surveyWorkflowController } from "../controllers/surveyWorkflow.controller";
import { authenticate } from "@surveychamp/common";

export const surveyWorkflowRouter = Router();

// Public route for Runner API
surveyWorkflowRouter.get("/:surveyId/latest", surveyWorkflowController.getLatestWorkflow);

surveyWorkflowRouter.use(authenticate);

surveyWorkflowRouter.post("/", surveyWorkflowController.createWorkflow);
surveyWorkflowRouter.get("/:surveyId", surveyWorkflowController.getWorkflows);
surveyWorkflowRouter.patch("/:id", surveyWorkflowController.updateWorkflow);
