import { Router } from "express";
import { surveyWorkflowController } from "../controllers/surveyWorkflow.controller";
import { authenticate } from "@surveychamp/common";

export const surveyWorkflowRouter = Router();

surveyWorkflowRouter.use(authenticate);

surveyWorkflowRouter.get("/:surveyId/latest", surveyWorkflowController.getLatestWorkflow);
surveyWorkflowRouter.post("/", surveyWorkflowController.createWorkflow);
surveyWorkflowRouter.get("/:surveyId", surveyWorkflowController.getWorkflows);
surveyWorkflowRouter.patch("/:id", surveyWorkflowController.updateWorkflow);
