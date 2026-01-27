import { prisma } from "@surveychamp/db";
import type { CreateSurveyWorkflowData, UpdateSurveyWorkflowData } from "@surveychamp/common";

export const surveyWorkflowService = {
    /**
     * Create a new workflow version for a survey
     */
    createSurveyWorkflow: async (data: CreateSurveyWorkflowData) => {
        const workflow = await prisma.surveyWorkflow.create({
            data: {
                surveyId: data.surveyId,
                runtimeJson: data.runtimeJson as any, // Prisma expects specific Json type
                designJson: data.designJson as any,
            },
        });
        return workflow;
    },

    /**
     * Get all workflows for a specific survey (e.g. for version history)
     */
    getWorkflowsBySurveyId: async (surveyId: string) => {
        const workflows = await prisma.surveyWorkflow.findMany({
            where: {
                surveyId: surveyId,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        return workflows;
    },

    /**
     * Get the latest workflow for a survey
     */
    getLatestWorkflowBySurveyId: async (surveyId: string) => {
        const workflow = await prisma.surveyWorkflow.findFirst({
            where: {
                surveyId: surveyId,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        return workflow;
    },

    /**
     * Get a specific workflow by its ID
     */
    getSurveyWorkflowById: async (id: string) => {
        const workflow = await prisma.surveyWorkflow.findUnique({
            where: {
                id: id,
            },
        });
        return workflow;
    },

    /**
     * Update an existing workflow record (if not using immutable versioning)
     */
    updateSurveyWorkflow: async (id: string, data: UpdateSurveyWorkflowData) => {
        const workflow = await prisma.surveyWorkflow.update({
            where: {
                id: id,
            },
            data: {
                ...(data.runtimeJson && { runtimeJson: data.runtimeJson as any }),
                ...(data.designJson && { designJson: data.designJson as any }),
                ...(data.status && { status: data.status }),
            },
        });
        return workflow;
    },
    
    deleteSurveyWorkflow: async (id: string) => {
        return await prisma.surveyWorkflow.delete({
            where: { id }
        });
    }
};
