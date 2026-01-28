import type { Request, Response } from "express";
import { createSurveyWorkflowSchema, updateSurveyWorkflowSchema } from "@surveychamp/common";
import { surveyWorkflowService, surveyService, validateWorkflow } from "@surveychamp/backend-core";
import { redis } from "@surveychamp/redis";

export const surveyWorkflowController = {
  createWorkflow: async (req: Request, res: Response) => {
    try {
      if (!req.user) {
         res.status(401).json({ message: "Unauthorized" });
         return; 
      }

      const validation = createSurveyWorkflowSchema.safeParse(req.body);

      if (!validation.success) {
         res.status(400).json({
          message: "Validation Error",
          errors: validation.error.issues
        });
        return;
      }

      const { surveyId, runtimeJson, designJson } = validation.data;

      // Validate Workflow Graph
      const graphValidation = validateWorkflow(designJson.nodes as any[], designJson.edges as any[]);
      if (!graphValidation.isValid) {
           res.status(400).json({
               message: "Invalid Workflow Graph",
               error: graphValidation.error
           });
           return;
      }

      // Verify ownership of the survey
      const survey = await surveyService.getSurveyById(req.user, surveyId);
      if (!survey) {
         res.status(404).json({ message: "Survey not found or access denied" });
         return;
      }

      const workflow = await surveyWorkflowService.createSurveyWorkflow({
        surveyId,
        runtimeJson,
        designJson,
      });

      // Invalidate cache for Runner API
      await redis.del(`survey:${surveyId}`);
      await redis.del(`workflow_latest:${surveyId}`);

      res.status(201).json({ message: "Workflow created successfully", data: workflow });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },

  getWorkflows: async (req: Request, res: Response) => {
    try {
      const surveyId = req.params.surveyId as string;
      
      if (!surveyId) {
          res.status(400).json({ message: "Survey ID is required" });
          return;
      }

      // Verify ownership
      const survey = await surveyService.getSurveyById(req.user, surveyId);
      if (!survey) {
         res.status(404).json({ message: "Survey not found or access denied" });
         return;
      }

      const workflows = await surveyWorkflowService.getWorkflowsBySurveyId(surveyId);
      res.status(200).json({ data: workflows });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },

  getLatestWorkflow: async (req: Request, res: Response) => {
    try {
         const surveyId = req.params.surveyId as string;
         
         if (!surveyId) {
             res.status(400).json({ message: "Survey ID is required" });
             return;
         }
   
         // Verify ownership - OPTIONAL for public surveys or shared, but for builder API usually auth is required.
         // Assuming builder-api is for the builder, checking req.user
         if (req.user) {
             const survey = await surveyService.getSurveyById(req.user, surveyId);
             if (!survey) {
                res.status(404).json({ message: "Survey not found or access denied" });
                return;
             }
         } else {
             // If public access is allowed (e.g. preview), we might skip this.
             // But following original code logic, strict check.
             // Original: authenticate middleware used on route?
             // Route file says: /:surveyId/latest is NOT authenticated in original code?
             // "surveyWorkflowRouter.get("/:surveyId/latest", ...)" is BEFORE "use(authenticate)"
             // So it allows public access.
         }
   
         const workflow = await surveyWorkflowService.getLatestWorkflowBySurveyId(surveyId);
         
         if (!workflow) {
             res.status(200).json({ data: null, message: "No workflow found for this survey" });
             return;
         }

         res.status(200).json({ data: workflow });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
  },

  updateWorkflow: async (req: Request, res: Response) => {
      try {
        if (!req.user) {
            res.status(401).json({ message: "Unauthorized" });
            return;
         }

         const id = req.params.id as string; // Workflow ID
         
         // Validation
         const validation = updateSurveyWorkflowSchema.safeParse(req.body);
         if (!validation.success) {
            res.status(400).json({ 
             message: "Validation Error", 
             errors: (validation.error as any).errors 
           });
           return;
         }

         // Graph Validation if designJson is being updated
         if (validation.data.designJson) {
             const designJson = validation.data.designJson;
             const graphValidation = validateWorkflow(designJson.nodes as any[], designJson.edges as any[]);
             if (!graphValidation.isValid) {
                 res.status(400).json({
                     message: "Invalid Workflow Graph",
                     error: graphValidation.error
                 });
                 return;
             }
         }

         const existingWorkflow = await surveyWorkflowService.getSurveyWorkflowById(id);
         if (!existingWorkflow) {
             res.status(404).json({ message: "Workflow not found" });
             return;
         }

         const survey = await surveyService.getSurveyById(req.user, existingWorkflow.surveyId);
         if (!survey) {
             res.status(403).json({ message: "Access denied" });
             return;
         }

         const updatedWorkflow = await surveyWorkflowService.updateSurveyWorkflow(id, validation.data);

         // Invalidate cache for Runner API
         await redis.del(`survey:${existingWorkflow.surveyId}`);
         await redis.del(`workflow_latest:${existingWorkflow.surveyId}`);

         res.status(200).json({ message: "Workflow updated", data: updatedWorkflow });

      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
      }
  }
};
