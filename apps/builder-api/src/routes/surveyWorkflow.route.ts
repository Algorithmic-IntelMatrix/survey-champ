import { Router } from "express";
import { surveyWorkflowController } from "../controllers/surveyWorkflow.controller";
import { authenticate } from "@surveychamp/common";

export const surveyWorkflowRouter = Router();

// Apply authentication middleware to all routes except public ones if any.
// Original code had generic public access for latest? 
// "surveyWorkflowRouter.get("/:surveyId/latest", surveyWorkflowController.getLatestWorkflow);"
// But then applied authenticate to ALL others. 

surveyWorkflowRouter.get("/:surveyId/latest", surveyWorkflowController.getLatestWorkflow);

surveyWorkflowRouter.use(authenticate);
surveyWorkflowRouter.post("/", surveyWorkflowController.createWorkflow);
surveyWorkflowRouter.get("/:surveyId", surveyWorkflowController.getWorkflows);
surveyWorkflowRouter.patch("/:id", surveyWorkflowController.updateWorkflow);
