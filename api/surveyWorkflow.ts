import apiClient from "@/lib/api-client"


interface SurveyWorkflow {
    id: string;
    surveyId: string;
    runtimeJson: any;
    designJson: any;
    createdAt: string;
    updatedAt: string;
}

export const surveyWorkflowApi = {
    getLatestWorkflowBySurveyId: async (surveyId: string): Promise<SurveyWorkflow> => {
        const response = await apiClient.get(`/workflows/${surveyId}/latest`)
        return response.data.data
    }   
}