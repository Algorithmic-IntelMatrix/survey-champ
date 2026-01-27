import type { Request, Response } from "express";
import { createSurveySchema, updateSurveySchema } from "@surveychamp/common";
import { surveyService } from "@surveychamp/backend-core";

export const surveyController = {
    createSurvey : async (req : Request, res : Response) =>{
        try {
            const {success, data, error} = createSurveySchema.safeParse(req.body);
            if (!success) {
                return res.status(400).json({message: "Invalid request input", error: error.message});
            }
            const userId = req.user;
            const {name, description, client} = data;

            if(!userId) {
                return res.status(401).json({message: "Unauthorized"});
            }

            const survey = await surveyService.createSurvey(userId, {name, description, client});
            return res.status(201).json({message: "Survey created successfully", survey});
            
        } catch (error) {
            console.error("Error creating survey:", error);
            return res.status(500).json({message: "An error occurred during survey creation"});
        }
    },

    getSurveys : async (req : Request, res : Response) => {
        try {
            const userId = req.user;
            if(!userId) {
                return res.status(401).json({message: "Unauthorized"});
            }
            const surveys = await surveyService.getSurveys(userId);
            return res.status(200).json({surveys});
        } catch (error) {
            console.error("Error fetching surveys:", error);
            return res.status(500).json({message: "An error occurred while fetching surveys"});
        }
    },

    getSurvey : async (req : Request, res : Response) => {
        try {
            const userId = req.user;
            const surveyId = req.params.id as string;
            if(!userId) {
                return res.status(401).json({message: "Unauthorized"});
            }
            const survey = await surveyService.getSurveyById(userId, surveyId);
            if(!survey) {
                console.warn(`Survey not found: surveyId=${surveyId}, userId=${userId}`);
                return res.status(404).json({message: "Survey not found"});
            }
            return res.status(200).json({survey});
        } catch (error) {
            console.error("Error fetching survey:", error);
            return res.status(500).json({message: "An error occurred while fetching survey"});
        }
    },

    updateSurvey : async (req : Request, res : Response) => {
        try {
            const userId = req.user;
            const surveyId = req.params.id as string;
            if(!userId) {
                return res.status(401).json({message: "Unauthorized"});
            }

            const {success, data, error} = updateSurveySchema.safeParse(req.body);
            if (!success) {
                return res.status(400).json({message: "Invalid request input", error: error.message});
            }

            const {name, description} = data;
            const result = await surveyService.updateSurvey(userId, surveyId, name, description);
            
            if (result.count === 0) {
                return res.status(404).json({message: "Survey not found or not owned by user"});
            }

            return res.status(200).json({message: "Survey updated successfully"});
        } catch (error) {
            console.error("Error updating survey:", error);
            return res.status(500).json({message: "An error occurred while updating survey"});
        }
    },

    deleteSurvey : async (req : Request, res : Response) => {
        try {
            const userId = req.user;
            const surveyId = req.params.id as string;
            if(!userId) {
                return res.status(401).json({message: "Unauthorized"});
            }
            const {survey, surveyWorkflow   } = await surveyService.deleteSurvey(userId, surveyId);
            
            if (survey.count === 0) {
                return res.status(404).json({message: "Survey not found or not owned by user"});
            }

            return res.status(200).json({message: "Survey deleted successfully"});
        } catch (error) {
            console.error("Error deleting survey:", error);
            return res.status(500).json({message: "An error occurred while deleting survey"});
        }
    }
}
