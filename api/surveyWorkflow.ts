import apiClient from "@/lib/api-client"
import { SurveyWorkflow } from "@/types/survey";

export const surveyWorkflowApi = {
    getLatestWorkflowBySurveyId: async (surveyId: string): Promise<SurveyWorkflow> => {
        const response = await apiClient.get(`/workflows/${surveyId}/latest`)
        return response.data.data
    }   
}